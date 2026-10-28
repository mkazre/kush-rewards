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

/** Public venue list and contact taps (HANDOVER 6.4). */
class StoreController extends Controller
{
    public const CACHE_KEY = 'stores:list';

    public function list(): JsonResponse
    {
        $stores = Cache::remember(self::CACHE_KEY, 30, function () {
            $ratings = self::ratings();
            // Explicit columns only; legacy price/product data can never leak (HANDOVER 6.4).
            return DB::table('stores')->where('status', 'live')->orderBy('name')
                ->get(['id', 'name', 'type', 'status', 'suburb', 'address', 'latitude', 'longitude', 'whatsapp', 'phone',
                    'hours', 'hours_note', 'features', 'is_partner', 'is_community', 'logo_url', 'created_at', 'updated_at'])
                ->map(fn ($s) => [...Format::store($s), 'products' => [], 'rating' => $ratings[$s->id] ?? null])
                ->all();
        });

        return response()->json(['stores' => $stores]);
    }

    public function tap(Request $r): JsonResponse
    {
        $storeId = Input::int($r, 'storeId');
        $kind = Input::oneOf($r, 'kind', ['whatsapp', 'call', 'directions'], 'Unknown contact type.');
        if (! DB::table('stores')->where('id', $storeId)->where('status', 'live')->exists()) {
            throw new ApiException(404, 'Venue not found');
        }
        $user = $this->user($r);
        $client = hash('sha256', $r->ip().'|'.$r->userAgent());

        // Same device + venue + button within 10 s counts once, so tap numbers stay credible.
        $recent = DB::table('contact_taps')->where('store_id', $storeId)->where('kind', $kind)
            ->where('client_hash', $client)->where('created_at', '>', now()->subSeconds(10))->exists();
        if (! $recent) {
            DB::table('contact_taps')->insert([
                'store_id' => $storeId, 'kind' => $kind, 'user_id' => $user?->id,
                'client_hash' => $client, 'created_at' => now(),
            ]);
        }

        return response()->json(['ok' => true]);
    }

    /** store_id => { average, count, topTags } from visible reviews only. */
    public static function ratings(): array
    {
        $out = [];
        $rows = DB::table('reviews')->where('status', 'visible')->get(['store_id', 'stars', 'tags']);
        foreach ($rows->groupBy('store_id') as $storeId => $reviews) {
            $tagCounts = [];
            foreach ($reviews as $review) {
                foreach (Format::json($review->tags) as $tag) {
                    if (in_array($tag, Catalog::POSITIVE_TAGS, true)) {
                        $tagCounts[$tag] = ($tagCounts[$tag] ?? 0) + 1;
                    }
                }
            }
            arsort($tagCounts);
            $out[$storeId] = [
                'average' => round($reviews->avg('stars'), 1),
                'count' => $reviews->count(),
                'topTags' => array_slice(array_keys($tagCounts), 0, 3),
            ];
        }

        return $out;
    }
}
