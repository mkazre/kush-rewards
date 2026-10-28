<?php

namespace App\Http\Controllers;

use App\Support\Input;
use App\Support\Settings;
use Database\Seeders\DemoSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/** Public site config and Admin → Settings. */
class SettingsController extends Controller
{
    /** Public: what the website and apps need at runtime (no secrets here: OAuth client IDs are public). */
    public function config(): JsonResponse
    {
        return response()->json([
            'googleWebClientId' => Settings::googleWebClientId(),
            'supportEmail' => Settings::supportEmail(),
            'legal' => Settings::legal(),
        ]);
    }

    public function show(Request $r): JsonResponse
    {
        $this->requireAdmin($r);
        $values = [];
        foreach (Settings::EDITABLE as $key) {
            $values[$key] = Settings::get($key, '');
        }

        return response()->json([
            'values' => $values,
            // What the site falls back to when a field is left empty (from .env).
            'defaults' => [
                'support_email' => config('kush.support_email'),
                'google_web_client_id' => config('kush.google_web_client_id'),
                'google_client_ids' => implode(',', array_filter(config('kush.google_client_ids'))),
            ],
            'demo' => $this->demoCounts(),
        ]);
    }

    public function save(Request $r): JsonResponse
    {
        $this->requireAdmin($r);
        $input = $r->input('values');
        if (! is_array($input)) {
            Input::fail('Nothing to save.');
        }
        $clean = [];
        foreach ($input as $key => $value) {
            if (! in_array($key, Settings::EDITABLE, true)) {
                continue;
            }
            $value = trim((string) $value);
            if (mb_strlen($value) > 1000) {
                Input::fail('That value is too long.');
            }
            if (in_array($key, ['support_email', 'info_officer_email'], true) && $value !== '' && ! filter_var($value, FILTER_VALIDATE_EMAIL)) {
                Input::fail('Enter a valid email address.');
            }
            $clean[$key] = $value;
        }
        Settings::set($clean);

        return response()->json(['ok' => true]);
    }

    /** Deletes the demo venues and demo reviewers (and, by cascade, their reviews, taps and reports). */
    public function removeDemo(Request $r): JsonResponse
    {
        $this->requireAdmin($r);
        $counts = $this->demoCounts();
        DB::transaction(function () {
            $this->demoStores()->delete();
            DB::table('users')->where('email', 'like', '%@'.DemoSeeder::EMAIL_DOMAIN)->delete();
        });
        Settings::set(['demo_seeded' => '1']); // never seed again
        Cache::forget(StoreController::CACHE_KEY);

        return response()->json(['ok' => true, 'removed' => $counts]);
    }

    private function demoUserIds(): array
    {
        return DB::table('users')->where('email', 'like', '%@'.DemoSeeder::EMAIL_DOMAIN)->pluck('id')->all();
    }

    /** Venues created by the demo seeder (matched by name; community venues only if a demo user added them). */
    private function demoStores()
    {
        $users = $this->demoUserIds();

        return DB::table('stores')->whereIn('name', DemoSeeder::VENUE_NAMES)
            ->where(fn ($q) => $q->where('is_community', false)->orWhereIn('added_by', $users));
    }

    private function demoCounts(): array
    {
        $users = $this->demoUserIds();

        return [
            'venues' => $this->demoStores()->count(),
            'users' => count($users),
            'reviews' => DB::table('reviews')->whereIn('user_id', $users)->count(),
        ];
    }
}
