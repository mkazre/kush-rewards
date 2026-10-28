<?php

namespace App\Console\Commands;

use Database\Seeders\DemoSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Support\Settings;

/**
 * Post-deploy steps for hosting without a terminal. Cron runs it every minute; it does nothing
 * unless there is work: pending migrations, the one-time demo seed (SEED_DEMO=true, empty database),
 * or admins to promote (ADMIN_EMAILS, once those people have signed up).
 */
class Deploy extends Command
{
    protected $signature = 'kush:deploy';

    protected $description = 'Run pending migrations, seed demo data and promote admins';

    public function handle(): int
    {
        $this->call('migrate', ['--force' => true]);

        // Seeds once only: after Admin → Settings → Remove demo data it never comes back.
        if (config('kush.seed_demo') && ! Settings::get('demo_seeded') && DB::table('stores')->doesntExist()) {
            $this->call('db:seed', ['--class' => DemoSeeder::class, '--force' => true]);
            Settings::set(['demo_seeded' => '1']);
        }

        $admins = array_filter(array_map(fn ($e) => mb_strtolower(trim($e)), explode(',', (string) config('kush.admin_emails'))));
        if ($admins) {
            DB::table('users')->whereIn('email', $admins)->where('role', 'user')->update(['role' => 'admin']);
        }

        return self::SUCCESS;
    }
}
