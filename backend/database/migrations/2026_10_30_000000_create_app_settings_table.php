<?php

// Settings edited in Admin → Settings (legal details, support email, Google client IDs).

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $t) {
            $t->string('key', 64)->primary();
            $t->text('value');
            $t->timestamp('updated_at')->useCurrent();
        });

        // Sites already seeded before this table existed must never be re-seeded.
        if (DB::table('stores')->exists()) {
            DB::table('app_settings')->insert(['key' => 'demo_seeded', 'value' => '1', 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
