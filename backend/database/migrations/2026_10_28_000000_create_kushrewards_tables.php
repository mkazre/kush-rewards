<?php

// KushRewards SA v2 schema (MySQL 5.7+/MariaDB 10.3+; also runs on SQLite for local dev).
// Ported from docs/schema.sql (PostgreSQL). v1 legacy price/product columns are dropped:
// this is a fresh start and v2 never stores or returns prices.
// Foreign keys cascade or null out so deleting a user removes all their content (HANDOVER 6.3).

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $t) {
            $t->id();
            $t->string('email')->unique(); // always stored lower-case
            $t->string('display_name', 100);
            $t->string('avatar_url', 500)->nullable();
            $t->enum('role', ['user', 'admin'])->default('user');
            $t->timestamp('terms_accepted_at')->nullable();
            $t->timestamps();
        });

        Schema::create('user_passwords', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('password_hash');
            $t->timestamp('created_at')->useCurrent();
        });

        Schema::create('oauth_accounts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('provider', 20); // google | apple
            $t->string('provider_user_id');
            $t->string('provider_email');
            $t->timestamps();
            $t->unique(['provider', 'provider_user_id']);
        });

        // Named auth_sessions so it never clashes with Laravel's own "sessions" table.
        Schema::create('auth_sessions', function (Blueprint $t) {
            $t->string('id', 64)->primary(); // sha256(token) hex
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->timestamp('created_at')->useCurrent();
            $t->timestamp('last_accessed')->useCurrent();
            $t->timestamp('expires_at')->index();
        });

        Schema::create('login_attempts', function (Blueprint $t) {
            $t->id();
            $t->string('email');
            $t->timestamp('attempted_at')->useCurrent();
            $t->boolean('success')->default(false);
            $t->index(['email', 'attempted_at']);
        });

        Schema::create('stores', function (Blueprint $t) {
            $t->id();
            $t->string('name', 80);
            $t->enum('type', ['dispensary', 'club', 'lounge'])->default('club');
            $t->string('suburb', 60);
            $t->string('address', 200)->default('');
            $t->double('latitude');
            $t->double('longitude');
            $t->string('whatsapp', 30)->nullable();
            $t->string('phone', 30)->nullable();
            $t->json('hours'); // {"mon":{"open":"10:00","close":"20:00"},"sun":null}
            $t->string('hours_note', 200)->nullable();
            $t->json('features');
            $t->boolean('is_partner')->default(false);
            $t->boolean('is_community')->default(false);
            $t->enum('status', ['live', 'hidden'])->default('live')->index();
            $t->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $t->string('logo_url', 500)->nullable();
            $t->timestamps();
        });

        Schema::create('store_submissions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $t->string('name', 80);
            $t->enum('type', ['dispensary', 'club', 'lounge']);
            $t->string('suburb', 60);
            $t->string('address', 200)->default('');
            $t->string('whatsapp', 30)->nullable();
            $t->string('hours_note', 200)->nullable();
            $t->boolean('is_owner')->default(false);
            $t->text('notes')->nullable();
            $t->enum('status', ['pending', 'needs_info', 'approved', 'rejected'])->default('pending');
            $t->string('decision_reason', 500)->nullable();
            $t->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();
            $t->timestamp('created_at')->useCurrent();
            $t->timestamp('decided_at')->nullable();
        });

        Schema::create('info_reports', function (Blueprint $t) {
            $t->id();
            $t->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $t->foreignId('reported_by')->constrained('users')->cascadeOnDelete();
            $t->string('field', 30);
            $t->text('details');
            $t->enum('status', ['open', 'confirmed', 'dismissed'])->default('open');
            $t->timestamp('created_at')->useCurrent();
            $t->timestamp('resolved_at')->nullable();
        });

        Schema::create('contact_taps', function (Blueprint $t) {
            $t->id();
            $t->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $t->enum('kind', ['whatsapp', 'call', 'directions']);
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->string('client_hash', 64)->nullable(); // sha256(ip + user agent), for 10 s de-duplication only
            $t->timestamp('created_at')->useCurrent();
            $t->index(['store_id', 'created_at']);
        });

        Schema::create('reviews', function (Blueprint $t) {
            $t->id();
            $t->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->unsignedTinyInteger('stars');
            $t->json('tags');
            $t->text('comment')->nullable();
            $t->enum('status', ['visible', 'hidden'])->default('visible');
            $t->unsignedInteger('report_count')->default(0);
            $t->timestamps();
            $t->unique(['store_id', 'user_id']);
            $t->index('updated_at');
        });

        Schema::create('review_reports', function (Blueprint $t) {
            $t->foreignId('review_id')->constrained('reviews')->cascadeOnDelete();
            $t->foreignId('reported_by')->constrained('users')->cascadeOnDelete();
            $t->timestamp('created_at')->useCurrent();
            $t->primary(['review_id', 'reported_by']);
        });

        Schema::create('user_blocks', function (Blueprint $t) {
            $t->foreignId('blocker_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('blocked_id')->constrained('users')->cascadeOnDelete();
            $t->timestamp('created_at')->useCurrent();
            $t->primary(['blocker_id', 'blocked_id']);
        });

        // Laravel's file-free cache store, used by the rate limiter.
        Schema::create('cache', function (Blueprint $t) {
            $t->string('key')->primary();
            $t->mediumText('value');
            $t->integer('expiration');
        });
        Schema::create('cache_locks', function (Blueprint $t) {
            $t->string('key')->primary();
            $t->string('owner');
            $t->integer('expiration');
        });
    }

    public function down(): void
    {
        foreach (['cache_locks', 'cache', 'user_blocks', 'review_reports', 'reviews', 'contact_taps', 'info_reports',
            'store_submissions', 'stores', 'login_attempts', 'auth_sessions', 'oauth_accounts', 'user_passwords', 'users'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
