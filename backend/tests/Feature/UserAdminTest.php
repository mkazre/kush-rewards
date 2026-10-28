<?php

namespace Tests\Feature;

use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class UserAdminTest extends TestCase
{
    use RefreshDatabase;

    private string $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DemoSeeder::class);
        $this->admin = $this->postJson('/api/auth/register_with_password', ['email' => 'boss@example.com', 'password' => 'password123', 'displayName' => 'Boss'])->json('token');
        DB::table('users')->where('email', 'boss@example.com')->update(['role' => 'admin']);
    }

    private function asAdmin(): static
    {
        return $this->withHeader('Authorization', "Bearer {$this->admin}");
    }

    public function test_only_admins_can_manage_users(): void
    {
        $token = $this->postJson('/api/auth/register_with_password', ['email' => 'x@example.com', 'password' => 'password123', 'displayName' => 'X'])->json('token');
        $this->withHeader('Authorization', "Bearer $token")->getJson('/api/admin/users')->assertForbidden();
    }

    public function test_create_partner_who_can_sign_in(): void
    {
        $storeId = (int) DB::table('stores')->value('id');
        $id = $this->asAdmin()->postJson('/api/admin/user_save', [
            'id' => null, 'displayName' => 'Venue Owner', 'email' => 'Owner@Example.com', 'role' => 'partner',
            'password' => 'secret123', 'partnerStoreId' => $storeId,
        ])->assertOk()->json('id');

        $users = $this->asAdmin()->getJson('/api/admin/users?q=owner')->assertOk()->json('users');
        $this->assertSame($id, $users[0]['id']);
        $this->assertSame('partner', $users[0]['role']);
        $this->assertSame($storeId, $users[0]['partnerStoreId']);
        $this->assertSame(['email'], $users[0]['signInMethods']);

        $this->postJson('/api/auth/login_with_password', ['email' => 'owner@example.com', 'password' => 'secret123'])
            ->assertOk()->assertJsonPath('user.role', 'partner');

        $this->asAdmin()->postJson('/api/admin/user_save', ['id' => null, 'displayName' => 'Dup', 'email' => 'owner@example.com', 'role' => 'user', 'password' => 'secret123'])
            ->assertStatus(409);
    }

    public function test_cannot_remove_own_admin_or_delete_self(): void
    {
        $me = DB::table('users')->where('email', 'boss@example.com')->first();
        $this->asAdmin()->postJson('/api/admin/user_save', ['id' => $me->id, 'displayName' => 'Boss', 'email' => 'boss@example.com', 'role' => 'user'])
            ->assertStatus(400);
        $this->asAdmin()->postJson('/api/admin/user_delete', ['id' => $me->id])->assertStatus(400);
    }

    public function test_delete_user_removes_their_content(): void
    {
        $victim = DB::table('reviews')->value('user_id');
        $this->asAdmin()->postJson('/api/admin/user_delete', ['id' => $victim])->assertOk();
        $this->assertSame(0, DB::table('reviews')->where('user_id', $victim)->count());
    }
}
