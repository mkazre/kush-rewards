<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SplashTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): static
    {
        $token = $this->postJson('/api/auth/register_with_password', ['email' => 'boss@example.com', 'password' => 'password123', 'displayName' => 'Boss'])->json('token');
        DB::table('users')->where('email', 'boss@example.com')->update(['role' => 'admin']);

        return $this->withHeader('Authorization', "Bearer $token");
    }

    public function test_four_default_screens_are_public(): void
    {
        $res = $this->getJson('/api/splash')->assertOk()->assertJsonPath('mode', 'first_launch');
        $this->assertCount(4, $res->json('screens'));
        $this->assertStringStartsWith('http', $res->json('screens.0.imageUrl')); // built-in logo made absolute for the apps
    }

    public function test_admin_edits_screens_and_version_changes(): void
    {
        $admin = $this->admin();
        $before = $this->getJson('/api/splash')->json('version');
        $screens = $admin->getJson('/api/admin/splash')->assertOk()->json('screens');

        $screens[1] = [...$screens[1], 'layout' => 'full', 'imageUrl' => 'https://kushrewards.online/uploads/splash/x.jpg', 'heading' => 'New look', 'overlay' => 60];
        $screens[3]['enabled'] = false;
        $this->travel(2)->seconds();
        $admin->postJson('/api/admin/splash_save', ['mode' => 'every_launch', 'screens' => $screens])->assertOk();

        $pub = $this->getJson('/api/splash')->assertOk();
        $this->assertSame('every_launch', $pub->json('mode'));
        $this->assertCount(3, $pub->json('screens'));
        $this->assertSame('New look', $pub->json('screens.1.heading'));
        $this->assertNotSame($before, $pub->json('version'));
    }

    public function test_validation(): void
    {
        $admin = $this->admin();
        $screens = $admin->getJson('/api/admin/splash')->json('screens');
        $bad = $screens;
        $bad[0] = [...$bad[0], 'layout' => 'full', 'imageUrl' => null];
        $admin->postJson('/api/admin/splash_save', ['mode' => 'first_launch', 'screens' => $bad])->assertStatus(400);
        $bad = $screens;
        $bad[0]['bgColor'] = 'green';
        $admin->postJson('/api/admin/splash_save', ['mode' => 'first_launch', 'screens' => $bad])->assertStatus(400);

        $off = array_map(fn ($s) => [...$s, 'enabled' => false], $screens);
        $admin->postJson('/api/admin/splash_save', ['mode' => 'first_launch', 'screens' => $off])->assertStatus(400);
        $admin->postJson('/api/admin/splash_save', ['mode' => 'off', 'screens' => $off])->assertOk();
        $this->getJson('/api/splash')->assertJsonPath('screens', []);
    }

    public function test_splash_image_upload_url(): void
    {
        $res = $this->admin()->postJson('/api/admin/logo_upload', ['contentType' => 'image/jpeg', 'sizeBytes' => 1000, 'folder' => 'splash'])->assertOk();
        $this->assertStringContainsString('/uploads/splash/', $res->json('url'));
        $this->assertStringContainsString('/api/uploads/splash/', $res->json('presignedUrl'));
    }
}
