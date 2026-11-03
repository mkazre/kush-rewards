<?php

// Four welcome (splash) screens shown when the app or website opens, edited in Admin → Splash screens.

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('splash_screens', function (Blueprint $t) {
            $t->unsignedTinyInteger('id')->primary(); // slots 1 to 4, shown in this order
            $t->boolean('enabled')->default(true);
            // full = image fills the screen behind the text; block = image as a card above the text;
            // icon = a large icon instead of an image; text = heading and text only.
            $t->enum('layout', ['full', 'block', 'icon', 'text'])->default('icon');
            $t->string('image_url', 500)->nullable();
            $t->string('icon', 30)->nullable();
            $t->string('heading', 80)->nullable();
            $t->string('body', 300)->nullable();
            $t->string('bg_color', 7)->default('#0e1611');
            $t->string('text_color', 7)->default('#e5ebe5');
            $t->string('accent_color', 7)->default('#57b784');
            $t->unsignedTinyInteger('overlay')->default(45); // % darkening over full-screen images, for readable text
            $t->timestamp('updated_at')->useCurrent();
        });

        DB::table('splash_screens')->insert([
            ['id' => 1, 'layout' => 'block', 'image_url' => '/brand/logo.png', 'icon' => null,
                'heading' => 'Welcome to KushRewards', 'body' => 'Your guide to cannabis clubs, lounges and venues across Roodepoort and the West Rand.',
                'bg_color' => '#0e1611', 'text_color' => '#e5ebe5', 'accent_color' => '#57b784'],
            ['id' => 2, 'layout' => 'icon', 'image_url' => null, 'icon' => 'map-pin',
                'heading' => 'Find venues near you', 'body' => 'See what\'s close by on the map, sorted by distance, with opening hours and features.',
                'bg_color' => '#123524', 'text_color' => '#f2f5f0', 'accent_color' => '#e8b245'],
            ['id' => 3, 'layout' => 'icon', 'image_url' => null, 'icon' => 'star',
                'heading' => 'Honest local reviews', 'body' => 'Read what people really think, and rate places you\'ve visited in seconds.',
                'bg_color' => '#1d6842', 'text_color' => '#ffffff', 'accent_color' => '#fcf0d5'],
            ['id' => 4, 'layout' => 'icon', 'image_url' => null, 'icon' => 'message-circle',
                'heading' => 'Message venues directly', 'body' => 'WhatsApp, call or get directions in one tap. For adults 18+. We never sell cannabis or take orders.',
                'bg_color' => '#0e1611', 'text_color' => '#e5ebe5', 'accent_color' => '#57b784'],
        ]);
        DB::table('app_settings')->updateOrInsert(['key' => 'splash_mode'], ['value' => 'first_launch', 'updated_at' => now()]);
    }

    public function down(): void
    {
        Schema::dropIfExists('splash_screens');
    }
};
