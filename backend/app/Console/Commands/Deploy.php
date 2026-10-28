<?php

namespace App\Console\Commands;

use Database\Seeders\DemoSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Post-deploy steps for hosting without a terminal. Cron runs it every minute; it does nothing
 * unless there is work: pending migrations, the demo seed (SEED_DEMO=true and no venues yet),
 * or admins to promote (ADMIN_EMAILS, once those people have signed up).
 */
class Deploy extends Command
{
    protected $signature = 'kush:deploy';

    protected $description = 'Run pending migrations, seed demo data and promote admins';

    public function handle(): int
    {
        $this->call('migrate', ['--force' => true]);

        if (config('kush.seed_demo') && Schema::hasTable('stores') && DB::table('stores')->doesntExist()) {
            $this->call('db:seed', ['--class' => DemoSeeder::class, '--force' => true]);
        }

        $admins = array_filter(array_map(fn ($e) => mb_strtolower(trim($e)), explode(',', (string) config('kush.admin_emails'))));
        if ($admins) {
            DB::table('users')->whereIn('email', $admins)->where('role', 'user')->update(['role' => 'admin']);
        }

        return self::SUCCESS;
    }
}
