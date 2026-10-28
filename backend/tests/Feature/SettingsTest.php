<?php

namespace Tests\Feature;

use App\Support\Settings;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): static
    {
        $token = $this->postJson('/api/auth/register_with_password', ['email' => 'boss@example.com', 'password' => 'password123', 'displayName' => 'Boss'])->json('token');
        DB::table('users')->where('email', 'boss@example.com')->update(['role' => 'admin']);

        return $this->withHeader('Authorization', "Bearer $token");
    }

    public function test_settings_are_saved_and_public_config_uses_them(): void
    {
        $admin = $this->admin();
        $admin->postJson('/api/admin/settings_save', ['values' => [
            'company_registration' => '2026/123456/07',
            'support_email' => 'help@kushrewards.online',
            'google_web_client_id' => 'web-123.apps.googleusercontent.com',
            'not_allowed' => 'ignored',
        ]])->assertOk();

        $this->getJson('/api/config')->assertOk()
            ->assertJsonPath('supportEmail', 'help@kushrewards.online')
            ->assertJsonPath('googleWebClientId', 'web-123.apps.googleusercontent.com')
            ->assertJsonPath('legal.company_registration', '2026/123456/07');
        $this->assertNull(Settings::get('not_allowed'));
        $this->assertContains('web-123.apps.googleusercontent.com', Settings::googleClientIds());

        $admin->postJson('/api/admin/settings_save', ['values' => ['support_email' => 'nope']])->assertStatus(400);
    }

    public function test_settings_are_admin_only(): void
    {
        $this->getJson('/api/admin/settings')->assertUnauthorized();
    }

    public function test_remove_demo_data_keeps_real_data_and_never_reseeds(): void
    {
        config(['kush.seed_demo' => true]);
        Artisan::call('kush:deploy');
        $this->assertSame(16, DB::table('stores')->count());

        $admin = $this->admin();
        $realId = DB::table('stores')->insertGetId([
            'name' => 'Real Venue', 'type' => 'club', 'suburb' => 'Florida', 'latitude' => -26.17, 'longitude' => 27.9,
            'hours' => '{}', 'features' => '[]', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $admin->getJson('/api/admin/settings')->assertJsonPath('demo.venues', 16)->assertJsonPath('demo.users', 12);

        $admin->postJson('/api/admin/demo_remove')->assertOk();
        $this->assertSame([$realId], DB::table('stores')->pluck('id')->all());
        $this->assertSame(0, DB::table('users')->where('email', 'like', '%@'.DemoSeeder::EMAIL_DOMAIN)->count());
        $this->assertSame(1, DB::table('users')->count()); // the admin survives

        DB::table('stores')->delete();
        Artisan::call('kush:deploy');
        $this->assertSame(0, DB::table('stores')->count());
    }
}
