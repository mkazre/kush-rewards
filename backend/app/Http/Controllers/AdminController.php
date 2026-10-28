<?php

namespace App\Http\Controllers;

use App\Support\ApiException;
use App\Support\Catalog;
use App\Support\Format;
use App\Support\Input;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/** Admin tab (HANDOVER 4.8 and 6.7). Every method checks role = admin. */
class AdminController extends Controller
{
    private const LOGO_TYPES = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp', 'image/gif' => 'gif', 'image/svg+xml' => 'svg'];
    private const LOGO_MAX = 5 * 1024 * 1024;

    public function overview(Request $r): JsonResponse
    {
        $this->requireAdmin($r);

        $since = now()->subDays(30);
        $taps = [];
        foreach (DB::table('contact_taps')->select('store_id', 'kind', 'created_at')->get() as $t) {
            $taps[$t->store_id] ??= ['taps30' => ['whatsapp' => 0, 'call' => 0, 'directions' => 0], 'tapsAll' => ['whatsapp' => 0, 'call' => 0, 'directions' => 0]];
            $taps[$t->store_id]['tapsAll'][$t->kind]++;
            if ($t->created_at >= $since->toDateTimeString()) {
                $taps[$t->store_id]['taps30'][$t->kind]++;
            }
        }
        $zero = ['whatsapp' => 0, 'call' => 0, 'directions' => 0];

        $stores = DB::table('stores')->orderBy('name')->get()->map(fn ($s) => [
            ...Format::store($s),
            'addedBy' => $s->added_by !== null ? (int) $s->added_by : null,
            'taps30' => $taps[$s->id]['taps30'] ?? $zero,
            'tapsAll' => $taps[$s->id]['tapsAll'] ?? $zero,
        ]);

        $submissions = DB::table('store_submissions as ss')->join('users as u', 'u.id', '=', 'ss.submitted_by')
            ->select('ss.*', 'u.display_name', 'u.email')->orderByDesc('ss.created_at')->orderByDesc('ss.id')->limit(100)->get()
            ->map(fn ($s) => [...Format::submission($s), 'submitterName' => $s->display_name, 'submitterEmail' => $s->email]);

        $reports = DB::table('info_reports as ir')->join('stores as s', 's.id', '=', 'ir.store_id')->join('users as u', 'u.id', '=', 'ir.reported_by')
            ->select('ir.*', 's.name as store_name', 'u.display_name')->orderByDesc('ir.created_at')->orderByDesc('ir.id')->limit(100)->get()
            ->map(fn ($x) => [
                'id' => (int) $x->id, 'storeId' => (int) $x->store_id, 'storeName' => $x->store_name,
                'field' => $x->field, 'details' => $x->details, 'status' => $x->status,
                'reportedBy' => (int) $x->reported_by, 'reporterName' => $x->display_name,
                'createdAt' => Format::date($x->created_at), 'resolvedAt' => Format::date($x->resolved_at),
            ]);

        $reviews = DB::table('reviews as rv')->join('stores as s', 's.id', '=', 'rv.store_id')->join('users as u', 'u.id', '=', 'rv.user_id')
            ->select('rv.*', 's.name as store_name', 'u.display_name', 'u.email')
            ->orderByDesc('rv.report_count')->orderByDesc('rv.updated_at')->limit(100)->get()
            ->map(fn ($x) => [
                'id' => (int) $x->id, 'storeId' => (int) $x->store_id, 'storeName' => $x->store_name,
                'userId' => (int) $x->user_id, 'authorName' => $x->display_name, 'authorEmail' => $x->email,
                'stars' => (int) $x->stars, 'tags' => Format::visibleTags($x->tags), 'comment' => $x->comment,
                'status' => $x->status, 'reportCount' => (int) $x->report_count,
                'createdAt' => Format::date($x->created_at), 'updatedAt' => Format::date($x->updated_at),
            ]);

        return response()->json([
            'stores' => $stores, 'submissions' => $submissions, 'reports' => $reports,
            'reviews' => $reviews, 'userCount' => DB::table('users')->count(),
        ]);
    }

    public function storeSave(Request $r): JsonResponse
    {
        $this->requireAdmin($r);
        $id = $r->input('id');
        $lat = $r->input('latitude');
        $lng = $r->input('longitude');
        if (! is_numeric($lat) || ! is_numeric($lng) || $lat < -35 || $lat > -22 || $lng < 16 || $lng > 33) {
            Input::fail('Set a map pin inside South Africa.');
        }

        $fields = [
            'name' => Input::reqStr($r, 'name', 2, 80, 'Enter a venue name (2 to 80 characters).'),
            'type' => Input::oneOf($r, 'type', Catalog::STORE_TYPES, 'Pick a venue type.'),
            'suburb' => Input::reqStr($r, 'suburb', 2, 60, 'Pick a suburb.'),
            'address' => Input::optStr($r, 'address', 200, 'Address') ?? '',
            'latitude' => (float) $lat,
            'longitude' => (float) $lng,
            'whatsapp' => Input::optStr($r, 'whatsapp', 30, 'WhatsApp number'),
            'phone' => Input::optStr($r, 'phone', 30, 'Phone number'),
            'hours' => json_encode($this->validHours($r->input('hours'))),
            'hours_note' => Input::optStr($r, 'hoursNote', 200, 'Hours note'),
            'features' => json_encode($this->validFeatures($r->input('features'))),
            'is_partner' => $r->boolean('isPartner'),
            'status' => Input::oneOf($r, 'status', ['live', 'hidden'], 'Pick Live or Hidden.'),
            'logo_url' => Input::optStr($r, 'logoUrl', 500, 'Logo URL'),
            'updated_at' => now(),
        ];

        if ($id === null) {
            $id = DB::table('stores')->insertGetId([...$fields, 'created_at' => now()]);
        } else {
            $updated = DB::table('stores')->where('id', (int) $id)->exists();
            if (! $updated) {
                throw new ApiException(404, 'Venue not found');
            }
            DB::table('stores')->where('id', (int) $id)->update($fields);
        }
        Cache::forget(StoreController::CACHE_KEY);

        return response()->json(['id' => (int) $id]);
    }

    public function submissionDecide(Request $r): JsonResponse
    {
        $this->requireAdmin($r);
        $id = Input::int($r, 'id');
        $action = Input::oneOf($r, 'action', ['approve', 'needs_info', 'reject'], 'Unknown decision.');
        $reason = Input::optStr($r, 'reason', 500, 'Note');

        $storeId = DB::transaction(function () use ($id, $action, $reason) {
            $s = DB::table('store_submissions')->where('id', $id)->lockForUpdate()->first();
            if (! $s) {
                throw new ApiException(404, 'Suggestion not found');
            }
            if (in_array($s->status, ['approved', 'rejected'], true)) {
                throw new ApiException(409, 'This submission was already decided.');
            }
            $storeId = null;
            if ($action === 'approve') {
                [$lat, $lng] = Catalog::suburbCentre($s->suburb);
                $storeId = DB::table('stores')->insertGetId([
                    'name' => $s->name, 'type' => $s->type, 'suburb' => $s->suburb, 'address' => $s->address,
                    'latitude' => $lat, 'longitude' => $lng, 'whatsapp' => $s->whatsapp,
                    'hours' => '{}', 'hours_note' => $s->hours_note, 'features' => '[]',
                    'is_community' => true, 'status' => 'live', 'added_by' => $s->submitted_by,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            DB::table('store_submissions')->where('id', $id)->update([
                'status' => ['approve' => 'approved', 'needs_info' => 'needs_info', 'reject' => 'rejected'][$action],
                'decision_reason' => $reason, 'decided_at' => now(), 'store_id' => $storeId,
            ]);

            return $storeId;
        });
        Cache::forget(StoreController::CACHE_KEY);

        return response()->json(['storeId' => $storeId]);
    }

    public function reportResolve(Request $r): JsonResponse
    {
        $this->requireAdmin($r);
        $status = Input::oneOf($r, 'status', ['confirmed', 'dismissed'], 'Unknown status.');
        $n = DB::table('info_reports')->where('id', Input::int($r, 'id'))->update(['status' => $status, 'resolved_at' => now()]);
        if (! $n) {
            throw new ApiException(404, 'Report not found');
        }

        return response()->json(['ok' => true]);
    }

    public function reviewStatus(Request $r): JsonResponse
    {
        $this->requireAdmin($r);
        $status = Input::oneOf($r, 'status', ['visible', 'hidden'], 'Unknown status.');
        $fields = ['status' => $status];
        if ($status === 'visible') {
            $fields['report_count'] = 0;
            DB::table('review_reports')->where('review_id', Input::int($r, 'id'))->delete();
        }
        $n = DB::table('reviews')->where('id', Input::int($r, 'id'))->update($fields);
        if (! $n) {
            throw new ApiException(404, 'Review not found');
        }
        Cache::forget(StoreController::CACHE_KEY);

        return response()->json(['ok' => true]);
    }

    /** Returns a short-lived signed PUT URL on this server (shared hosting has no S3). */
    public function logoUpload(Request $r): JsonResponse
    {
        $this->requireAdmin($r);
        $type = Input::oneOf($r, 'contentType', array_keys(self::LOGO_TYPES), 'Use a PNG, JPG, WEBP, GIF or SVG image');
        if (Input::int($r, 'sizeBytes') > self::LOGO_MAX) {
            Input::fail('Logo must be 5 MB or smaller');
        }
        $name = Str::uuid().'.'.self::LOGO_TYPES[$type];

        return response()->json([
            'presignedUrl' => URL::temporarySignedRoute('logo.put', now()->addMinutes(10), ['name' => $name]),
            'headers' => ['Content-Type' => $type],
            'url' => url('uploads/store-logos/'.$name),
        ]);
    }

    /** PUT target for the signed URL above. */
    public function logoPut(Request $r, string $name): JsonResponse
    {
        if (! preg_match('/^[0-9a-f-]{36}\.(png|jpg|webp|gif|svg)$/', $name)) {
            throw new ApiException(400, 'Bad file name');
        }
        $body = $r->getContent();
        if ($body === '' || strlen($body) > self::LOGO_MAX) {
            throw new ApiException(400, 'Logo must be 5 MB or smaller');
        }
        $ext = pathinfo($name, PATHINFO_EXTENSION);
        if ($ext === 'svg') {
            if (preg_match('/<script|on[a-z]+\s*=|javascript:|<foreignObject|<iframe|<embed|<object/i', $body)) {
                throw new ApiException(400, 'That SVG contains scripts. Please upload a PNG instead.');
            }
        } else {
            $info = @getimagesizefromstring($body);
            $expected = ['png' => IMAGETYPE_PNG, 'jpg' => IMAGETYPE_JPEG, 'webp' => IMAGETYPE_WEBP, 'gif' => IMAGETYPE_GIF][$ext];
            if (! $info || $info[2] !== $expected) {
                throw new ApiException(400, "That file isn't a valid image.");
            }
        }
        $dir = public_path('uploads/store-logos');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        file_put_contents($dir.DIRECTORY_SEPARATOR.$name, $body);

        return response()->json(['ok' => true]);
    }

    private function validHours(mixed $hours): array|\stdClass
    {
        if (! is_array($hours)) {
            return new \stdClass;
        }
        $out = [];
        foreach ($hours as $day => $h) {
            if (! in_array($day, Catalog::DAYS, true)) {
                Input::fail('Opening hours are not valid.');
            }
            if ($h === null) {
                $out[$day] = null;

                continue;
            }
            $re = '/^([01]\d|2[0-3]):[0-5]\d$/';
            if (! is_array($h) || ! preg_match($re, $h['open'] ?? '') || ! preg_match($re, $h['close'] ?? '')) {
                Input::fail('Use HH:MM times for opening hours, e.g. 09:00.');
            }
            $out[$day] = ['open' => $h['open'], 'close' => $h['close']];
        }

        return $out ?: new \stdClass;
    }

    private function validFeatures(mixed $features): array
    {
        if (! is_array($features) || count($features) > 12) {
            Input::fail('Pick up to 12 features.');
        }
        $out = [];
        foreach ($features as $f) {
            $f = is_string($f) ? trim($f) : '';
            if ($f === '' || mb_strlen($f) > 30) {
                Input::fail('Each feature must be 1 to 30 characters.');
            }
            $out[] = $f;
        }

        return array_values(array_unique($out));
    }
}
