<?php

namespace App\Http\Controllers;

use App\Support\ApiException;
use App\Support\Catalog;
use App\Support\ContentFilter;
use App\Support\Format;
use App\Support\Input;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/** Reviews, reporting and blocking (HANDOVER 6.5). */
class ReviewController extends Controller
{
    public function list(Request $r): JsonResponse
    {
        $user = $this->user($r);
        $limit = max(1, min(100, (int) $r->query('limit', 30)));
        $mine = in_array($r->query('mine'), ['1', 'true'], true);

        $q = DB::table('reviews as rv')
            ->join('stores as s', 's.id', '=', 'rv.store_id')
            ->join('users as u', 'u.id', '=', 'rv.user_id')
            ->select('rv.*', 's.name as store_name', 'u.display_name')
            ->orderByDesc('rv.updated_at')->orderByDesc('rv.id')
            ->limit($limit);

        if ($mine) {
            if (! $user) {
                throw new ApiException(401, 'Please sign in to see your reviews.');
            }
            $q->where('rv.user_id', $user->id);
        } else {
            $q->where('rv.status', 'visible')->where('s.status', 'live');
            if ($user) {
                $q->whereNotIn('rv.user_id', DB::table('user_blocks')->where('blocker_id', $user->id)->select('blocked_id'));
            }
        }
        if ($storeId = $r->query('storeId')) {
            $q->where('rv.store_id', (int) $storeId);
        }

        $reviews = $q->get()->map(fn ($rv) => [
            'id' => (int) $rv->id,
            'storeId' => (int) $rv->store_id,
            'storeName' => $rv->store_name,
            'stars' => (int) $rv->stars,
            'tags' => Format::visibleTags($rv->tags),
            'comment' => $rv->comment,
            'createdAt' => Format::date($rv->created_at),
            'updatedAt' => Format::date($rv->updated_at),
            'authorName' => Format::firstName($rv->display_name),
            'isMine' => $user && (int) $rv->user_id === (int) $user->id,
            'isHidden' => $rv->status === 'hidden',
        ]);

        return response()->json(['reviews' => $reviews]);
    }

    public function save(Request $r): JsonResponse
    {
        $user = $this->requirePoster($r);
        $storeId = Input::int($r, 'storeId');
        $stars = Input::int($r, 'stars', 'Pick 1 to 5 stars.');
        if ($stars < 1 || $stars > 5) {
            Input::fail('Pick 1 to 5 stars.');
        }
        $tags = $r->input('tags', []);
        if (! is_array($tags)) {
            Input::fail('Those tags are not valid.');
        }
        $tags = array_values(array_unique($tags));
        if (count($tags) > 6) {
            Input::fail('Pick up to 6 tags.');
        }
        foreach ($tags as $tag) {
            if (! in_array($tag, Catalog::reviewTags(), true)) {
                Input::fail('Those tags are not valid.');
            }
        }
        $comment = Input::optStr($r, 'comment', 500, 'Your comment');
        if ($problem = ContentFilter::contentProblem($comment)) {
            Input::fail($problem);
        }
        if (! DB::table('stores')->where('id', $storeId)->where('status', 'live')->exists()) {
            throw new ApiException(404, "That venue isn't listed any more.");
        }

        $existing = DB::table('reviews')->where('store_id', $storeId)->where('user_id', $user->id)->first();
        if (! $existing) {
            $this->throttle('review:'.$user->id, 10, 3600, "You've posted a lot of reviews. Please try again in an hour.");
        }
        $fields = ['stars' => $stars, 'tags' => json_encode($tags), 'comment' => $comment, 'updated_at' => now()];
        if ($existing) {
            // A hidden review stays hidden after an edit.
            DB::table('reviews')->where('id', $existing->id)->update($fields);
            $id = $existing->id;
        } else {
            $id = DB::table('reviews')->insertGetId([...$fields, 'store_id' => $storeId, 'user_id' => $user->id, 'created_at' => now()]);
        }
        Cache::forget(StoreController::CACHE_KEY);

        return response()->json(['id' => (int) $id]);
    }

    public function report(Request $r): JsonResponse
    {
        $user = $this->requireUser($r);
        $reviewId = Input::int($r, 'reviewId');
        $review = DB::table('reviews')->where('id', $reviewId)->first();
        if (! $review || (int) $review->user_id === (int) $user->id) {
            throw new ApiException(404, "Couldn't report that review.");
        }
        DB::transaction(function () use ($reviewId, $user) {
            $inserted = DB::table('review_reports')->insertOrIgnore([
                'review_id' => $reviewId, 'reported_by' => $user->id, 'created_at' => now(),
            ]);
            if ($inserted) { // a repeat report succeeds without raising the count
                DB::table('reviews')->where('id', $reviewId)->increment('report_count');
            }
        });

        return response()->json(['ok' => true]);
    }

    public function block(Request $r): JsonResponse
    {
        $user = $this->requireUser($r);
        $author = DB::table('reviews as rv')->join('users as u', 'u.id', '=', 'rv.user_id')
            ->where('rv.id', Input::int($r, 'reviewId'))->first(['u.id', 'u.display_name']);
        if (! $author) {
            throw new ApiException(404, "Couldn't find that review.");
        }
        if ((int) $author->id === (int) $user->id) {
            Input::fail("You can't block yourself.");
        }
        DB::table('user_blocks')->insertOrIgnore(['blocker_id' => $user->id, 'blocked_id' => $author->id, 'created_at' => now()]);

        return response()->json(['ok' => true, 'name' => Format::firstName($author->display_name)]);
    }
}
