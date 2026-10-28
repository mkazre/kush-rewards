<?php

namespace Tests\Feature;

use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Covers the HANDOVER 14 acceptance checklist at the API level. */
class ApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
    }

    private function register(string $email = 'jo@example.com', string $name = 'Jo Soap'): string
    {
        return $this->postJson('/api/auth/register_with_password', ['email' => $email, 'password' => 'password123', 'displayName' => $name])
            ->assertOk()->json('token');
    }

    private function as(string $token): static
    {
        return $this->withHeader('Authorization', "Bearer $token");
    }

    private function liveStoreId(): int
    {
        return (int) DB::table('stores')->where('status', 'live')->value('id');
    }

    public function test_store_list_never_exposes_prices(): void
    {
        $stores = $this->getJson('/api/stores/list')->assertOk()->json('stores');
        $this->assertCount(16, $stores);
        foreach ($stores as $s) {
            $this->assertSame([], $s['products']);
            $this->assertArrayNotHasKey('priceLevel', $s);
            $this->assertArrayNotHasKey('addedBy', $s);
        }
    }

    public function test_hidden_venues_are_not_public(): void
    {
        $id = $this->liveStoreId();
        DB::table('stores')->where('id', $id)->update(['status' => 'hidden']);
        cache()->flush();
        $ids = array_column($this->getJson('/api/stores/list')->json('stores'), 'id');
        $this->assertNotContains($id, $ids);
        $this->postJson('/api/stores/tap', ['storeId' => $id, 'kind' => 'whatsapp'])->assertNotFound();
    }

    public function test_session_and_logout(): void
    {
        $token = $this->register();
        $this->as($token)->getJson('/api/auth/session')->assertOk()->assertJsonPath('user.termsAcceptedAt', null);
        $this->as($token)->postJson('/api/auth/logout')->assertOk();
        $this->as($token)->getJson('/api/auth/session')->assertUnauthorized()->assertJsonStructure(['error']);
    }

    public function test_login_lockout_after_five_failures(): void
    {
        $this->register();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login_with_password', ['email' => 'jo@example.com', 'password' => 'wrong'])->assertUnauthorized();
        }
        $this->postJson('/api/auth/login_with_password', ['email' => 'jo@example.com', 'password' => 'password123'])->assertStatus(429);
    }

    public function test_posting_requires_community_rules(): void
    {
        $token = $this->register();
        $review = ['storeId' => $this->liveStoreId(), 'stars' => 5, 'tags' => ['Great vibe'], 'comment' => 'Lovely'];
        $this->as($token)->postJson('/api/reviews/save', $review)->assertForbidden()
            ->assertJsonPath('error', 'Please accept the Community Rules first.');
        $this->as($token)->postJson('/api/account/accept_terms')->assertOk();
        $this->as($token)->postJson('/api/reviews/save', $review)->assertOk();
    }

    public function test_content_filter(): void
    {
        $token = $this->register();
        $this->as($token)->postJson('/api/account/accept_terms');
        $base = ['storeId' => $this->liveStoreId(), 'stars' => 4, 'tags' => []];
        $this->as($token)->postJson('/api/reviews/save', [...$base, 'comment' => 'R80 per gram'])
            ->assertStatus(400)->assertJsonPath('error', 'Please remove prices, contact details, links or offers to buy or sell.');
        $this->as($token)->postJson('/api/reviews/save', [...$base, 'comment' => 'call 072 123 4567'])->assertStatus(400);
        $this->as($token)->postJson('/api/reviews/save', [...$base, 'comment' => 'shit place'])
            ->assertStatus(400)->assertJsonPath('error', 'Please keep it respectful: remove offensive language.');
        $this->as($token)->postJson('/api/reviews/save', [...$base, 'tags' => ['Fair prices']])->assertStatus(400);
    }

    public function test_one_review_per_venue_is_updated(): void
    {
        $token = $this->register();
        $this->as($token)->postJson('/api/account/accept_terms');
        $storeId = $this->liveStoreId();
        $a = $this->as($token)->postJson('/api/reviews/save', ['storeId' => $storeId, 'stars' => 2, 'tags' => ['Long wait'], 'comment' => null])->json('id');
        $b = $this->as($token)->postJson('/api/reviews/save', ['storeId' => $storeId, 'stars' => 5, 'tags' => [], 'comment' => 'Better now'])->json('id');
        $this->assertSame($a, $b);
        $mine = $this->as($token)->getJson('/api/reviews/list?mine=1')->json('reviews');
        $this->assertCount(1, $mine);
        $this->assertSame(5, $mine[0]['stars']);
        $this->assertSame('Jo', $mine[0]['authorName']);
    }

    public function test_report_twice_counts_once_and_block_hides_for_blocker_only(): void
    {
        $token = $this->register();
        $review = DB::table('reviews')->where('status', 'visible')->first();
        $this->as($token)->postJson('/api/reviews/report', ['reviewId' => $review->id])->assertOk();
        $this->as($token)->postJson('/api/reviews/report', ['reviewId' => $review->id])->assertOk();
        $this->assertSame(1, (int) DB::table('reviews')->where('id', $review->id)->value('report_count'));

        $this->as($token)->postJson('/api/reviews/block', ['reviewId' => $review->id])->assertOk()->assertJsonStructure(['name']);
        $mineIds = array_column($this->as($token)->getJson('/api/reviews/list?limit=100')->json('reviews'), 'id');
        $this->assertNotContains($review->id, $mineIds);

        $this->app['auth']->forgetGuards();
        $publicIds = array_column($this->withHeaders(['Authorization' => ''])->getJson('/api/reviews/list?limit=100&storeId='.$review->store_id)->json('reviews'), 'id');
        $this->assertContains($review->id, $publicIds);
    }

    public function test_suggestions_rules(): void
    {
        $token = $this->register();
        $this->as($token)->postJson('/api/account/accept_terms');
        $s = ['name' => 'New Spot', 'type' => 'club', 'suburb' => 'Florida', 'address' => '', 'whatsapp' => null, 'hoursNote' => null, 'isOwner' => false, 'notes' => null];
        $this->as($token)->postJson('/api/submissions/create', $s)->assertStatus(400);
        $s['address'] = '1 Main Rd';
        for ($i = 0; $i < 5; $i++) {
            $this->as($token)->postJson('/api/submissions/create', $s)->assertOk();
        }
        $this->as($token)->postJson('/api/submissions/create', $s)->assertStatus(429);
        $this->assertCount(5, $this->as($token)->getJson('/api/submissions/mine')->json('submissions'));
    }

    public function test_wrong_info_report_accepts_phone_number(): void
    {
        $token = $this->register();
        $this->as($token)->postJson('/api/account/accept_terms');
        $this->as($token)->postJson('/api/reports/create', ['storeId' => $this->liveStoreId(), 'field' => 'Contact', 'details' => 'New number is 072 123 4567'])->assertOk();
    }

    public function test_admin_flow(): void
    {
        $token = $this->register('owner@example.com', 'Owner');
        $this->as($token)->getJson('/api/admin/overview')->assertForbidden()->assertJsonPath('error', 'Only the app owner can do this.');
        DB::table('users')->where('email', 'owner@example.com')->update(['role' => 'admin']);

        $overview = $this->as($token)->getJson('/api/admin/overview')->assertOk()->json();
        $this->assertArrayHasKey('taps30', $overview['stores'][0]);

        $pending = DB::table('store_submissions')->where('status', 'pending')->first();
        $storeId = $this->as($token)->postJson('/api/admin/submission_decide', ['id' => $pending->id, 'action' => 'approve', 'reason' => null])->assertOk()->json('storeId');
        $this->as($token)->postJson('/api/admin/submission_decide', ['id' => $pending->id, 'action' => 'reject', 'reason' => null])->assertStatus(409);
        $store = DB::table('stores')->find($storeId);
        $this->assertSame('live', $store->status);
        $this->assertTrue((bool) $store->is_community);

        $this->as($token)->postJson('/api/admin/store_save', [
            'id' => $storeId, 'name' => 'Renamed', 'type' => 'lounge', 'suburb' => 'Florida', 'address' => '', 'latitude' => -26.17, 'longitude' => 27.9,
            'whatsapp' => null, 'phone' => null, 'hours' => ['mon' => ['open' => '10:00', 'close' => '20:00'], 'sun' => null],
            'hoursNote' => null, 'features' => ['Quiet'], 'isPartner' => true, 'status' => 'hidden', 'logoUrl' => null,
        ])->assertOk();
        $this->assertNotContains($storeId, array_column($this->getJson('/api/stores/list')->json('stores'), 'id'));

        $upload = $this->as($token)->postJson('/api/admin/logo_upload', ['contentType' => 'image/png', 'sizeBytes' => 1000])->assertOk()->json();
        $this->assertStringContainsString('signature=', $upload['presignedUrl']);
    }

    public function test_account_deletion(): void
    {
        $token = $this->register();
        $this->as($token)->postJson('/api/account/accept_terms');
        $this->as($token)->postJson('/api/reviews/save', ['storeId' => $this->liveStoreId(), 'stars' => 5, 'tags' => [], 'comment' => null]);
        $this->as($token)->postJson('/api/account/delete')->assertOk();
        $this->assertSame(0, DB::table('users')->where('email', 'jo@example.com')->count());
        $this->as($token)->getJson('/api/auth/session')->assertUnauthorized();

        $again = $this->register();
        $this->as($again)->getJson('/api/auth/session')->assertJsonPath('user.termsAcceptedAt', null);

        DB::table('users')->where('email', 'jo@example.com')->update(['role' => 'admin']);
        $this->as($again)->postJson('/api/account/delete')->assertStatus(400);
    }
}
