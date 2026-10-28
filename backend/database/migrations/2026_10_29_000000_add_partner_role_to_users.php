<?php

// Adds the "partner" role (venue owners/managers) and links a partner to their venue.

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->enum('role', ['user', 'partner', 'admin'])->default('user')->change();
            $t->foreignId('partner_store_id')->nullable()->after('role')->constrained('stores')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->dropConstrainedForeignId('partner_store_id');
        });
        Schema::table('users', function (Blueprint $t) {
            $t->enum('role', ['user', 'admin'])->default('user')->change();
        });
    }
};
