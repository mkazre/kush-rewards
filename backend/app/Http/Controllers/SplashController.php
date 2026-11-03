<?php

namespace App\Http\Controllers;

use App\Support\Input;
use App\Support\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Welcome (splash) screens: public list for the apps and website, and Admin → Splash screens. */
class SplashController extends Controller
{
    public const LAYOUTS = ['full', 'block', 'icon', 'text'];
    public const ICONS = ['leaf', 'map-pin', 'star', 'message-circle', 'shield-check', 'sparkles', 'heart', 'users', 'compass', 'party-popper'];
    public const MODES = ['first_launch', 'every_launch', 'off'];

    /**
     * Public. `version` changes whenever an admin saves, so "first launch" screens show again
     * after they've been changed.
     */
    public function public(): JsonResponse
    {
        $mode = Settings::get('splash_mode', 'first_launch');
        $rows = DB::table('splash_screens')->orderBy('id')->get();
        $screens = $mode === 'off' ? [] : $rows->where('enabled', true)->values()->map(fn ($s) => $this->json($s));

        return response()->json([
            'mode' => $mode,
            'version' => md5($mode.'|'.$rows->max('updated_at').'|'.$rows->count()),
            'screens' => $screens,
        ])->header('Cache-Control', 'public, max-age=60');
    }

    public function show(Request $r): JsonResponse
    {
        $this->requireAdmin($r);

        return response()->json([
            'mode' => Settings::get('splash_mode', 'first_launch'),
            'screens' => DB::table('splash_screens')->orderBy('id')->get()->map(fn ($s) => $this->json($s)),
            'icons' => self::ICONS,
        ]);
    }

    public function save(Request $r): JsonResponse
    {
        $this->requireAdmin($r);
        $mode = Input::oneOf($r, 'mode', self::MODES, 'Pick when the screens show.');
        $screens = $r->input('screens');
        if (! is_array($screens) || count($screens) !== 4) {
            Input::fail('Send all four screens.');
        }

        $rows = [];
        foreach (array_values($screens) as $i => $s) {
            if (! is_array($s)) {
                Input::fail('Screen '.($i + 1).' is not valid.');
            }
            $n = $i + 1;
            $layout = in_array($s['layout'] ?? null, self::LAYOUTS, true) ? $s['layout'] : Input::fail("Pick a layout for screen $n.");
            $image = trim((string) ($s['imageUrl'] ?? '')) ?: null;
            if (in_array($layout, ['full', 'block'], true) && ! $image) {
                Input::fail("Screen $n: upload an image, or pick the Icon or Text layout.");
            }
            if ($image && (mb_strlen($image) > 500 || ! preg_match('#^(https?://|/)#', $image))) {
                Input::fail("Screen $n: the image address is not valid.");
            }
            $icon = in_array($s['icon'] ?? null, self::ICONS, true) ? $s['icon'] : 'leaf';
            foreach (['bgColor', 'textColor', 'accentColor'] as $c) {
                if (! preg_match('/^#[0-9a-fA-F]{6}$/', (string) ($s[$c] ?? ''))) {
                    Input::fail("Screen $n: colours must look like #1d6842.");
                }
            }
            $heading = trim((string) ($s['heading'] ?? ''));
            $body = trim((string) ($s['body'] ?? ''));
            if (mb_strlen($heading) > 80 || mb_strlen($body) > 300) {
                Input::fail("Screen $n: keep the heading under 80 characters and the text under 300.");
            }
            $rows[] = [
                'id' => $n,
                'enabled' => (bool) ($s['enabled'] ?? false),
                'layout' => $layout,
                'image_url' => $image,
                'icon' => $icon,
                'heading' => $heading ?: null,
                'body' => $body ?: null,
                'bg_color' => strtolower($s['bgColor']),
                'text_color' => strtolower($s['textColor']),
                'accent_color' => strtolower($s['accentColor']),
                'overlay' => max(0, min(80, (int) ($s['overlay'] ?? 45))),
                'updated_at' => now(),
            ];
        }
        if ($mode !== 'off' && ! collect($rows)->contains('enabled', true)) {
            Input::fail('Turn on at least one screen, or set "Show" to Never.');
        }

        DB::transaction(function () use ($rows, $mode) {
            foreach ($rows as $row) {
                DB::table('splash_screens')->updateOrInsert(['id' => $row['id']], $row);
            }
            Settings::set(['splash_mode' => $mode]);
        });

        return response()->json(['ok' => true]);
    }

    private function json(object $s): array
    {
        $image = $s->image_url;

        return [
            'id' => (int) $s->id,
            'enabled' => (bool) $s->enabled,
            'layout' => $s->layout,
            // Relative paths (like the built-in logo) become absolute so the apps can load them.
            'imageUrl' => $image && str_starts_with($image, '/') ? url($image) : $image,
            'icon' => $s->icon,
            'heading' => $s->heading,
            'body' => $s->body,
            'bgColor' => $s->bg_color,
            'textColor' => $s->text_color,
            'accentColor' => $s->accent_color,
            'overlay' => (int) $s->overlay,
        ];
    }
}
