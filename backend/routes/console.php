<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

// cPanel cron runs `php artisan schedule:run` every minute (docs/DEPLOYMENT.md).
Schedule::command('kush:deploy')->everyMinute()->withoutOverlapping();

// Housekeeping: expired sessions and old login attempts.
Schedule::call(function () {
    DB::table('auth_sessions')->where('expires_at', '<', now())->delete();
    DB::table('login_attempts')->where('attempted_at', '<', now()->subDay())->delete();
})->daily();
