<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Key/value settings edited in Admin → Settings. A setting left empty falls back to .env.
 * The legal keys fill the [[placeholders]] in mobile/src/lib/legalContent.ts (LEGAL_FIELDS).
 */
final class Settings
{
    public const LEGAL_KEYS = ['company_registration', 'physical_address', 'info_officer_name', 'info_officer_email', 'hosting_provider', 'backup_retention'];
    public const EDITABLE = [...self::LEGAL_KEYS, 'support_email', 'google_web_client_id', 'google_client_ids'];
    private const CACHE = 'app_settings';

    public static function all(): array
    {
        return Cache::remember(self::CACHE, 60, fn () => Schema::hasTable('app_settings')
            ? DB::table('app_settings')->pluck('value', 'key')->all()
            : []);
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $v = self::all()[$key] ?? null;

        return ($v === null || $v === '') ? $default : $v;
    }

    public static function set(array $values): void
    {
        foreach ($values as $key => $value) {
            DB::table('app_settings')->updateOrInsert(['key' => $key], ['value' => (string) $value, 'updated_at' => now()]);
        }
        Cache::forget(self::CACHE);
    }

    public static function supportEmail(): string
    {
        return self::get('support_email', config('kush.support_email'));
    }

    public static function googleWebClientId(): string
    {
        return self::get('google_web_client_id', config('kush.google_web_client_id')) ?? '';
    }

    /** Client IDs (web, iOS, Android) whose Google ID tokens we accept: admin settings plus .env. */
    public static function googleClientIds(): array
    {
        $ids = [...config('kush.google_client_ids'), self::googleWebClientId(), ...explode(',', (string) self::get('google_client_ids', ''))];

        return array_values(array_unique(array_filter(array_map('trim', $ids))));
    }

    public static function legal(): array
    {
        return array_map(fn ($k) => self::get($k, ''), array_combine(self::LEGAL_KEYS, self::LEGAL_KEYS));
    }
}
