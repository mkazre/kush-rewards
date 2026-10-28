<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Cookie;

/**
 * Session tokens (HANDOVER 5). The client holds a random token; only sha256(token) is stored.
 * Sessions last 7 days and slide forward on use. The mobile app sends it as a Bearer header;
 * the website gets the same token in an HTTP-only cookie so scripts never see it.
 */
final class Auth
{
    public const COOKIE = 'kr_token';
    private const DAYS = 7;

    public static function issue(int $userId): string
    {
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        DB::table('auth_sessions')->insert([
            'id' => hash('sha256', $token),
            'user_id' => $userId,
            'created_at' => now(),
            'last_accessed' => now(),
            'expires_at' => now()->addDays(self::DAYS),
        ]);

        return $token;
    }

    public static function tokenFrom(Request $r): ?string
    {
        $bearer = $r->bearerToken();

        return $bearer ?: ($r->cookie(self::COOKIE) ?: null);
    }

    /** The signed-in user row for this request, or null. */
    public static function resolve(Request $r): ?object
    {
        $token = self::tokenFrom($r);
        if (! $token) {
            return null;
        }
        $id = hash('sha256', $token);
        $session = DB::table('auth_sessions')->where('id', $id)->where('expires_at', '>', now())->first();
        if (! $session) {
            return null;
        }
        // Slide the expiry, at most once an hour to keep writes low.
        if (Carbon::parse($session->last_accessed)->lt(now()->subHour())) {
            DB::table('auth_sessions')->where('id', $id)->update([
                'last_accessed' => now(),
                'expires_at' => now()->addDays(self::DAYS),
            ]);
        }

        return DB::table('users')->where('id', $session->user_id)->first();
    }

    public static function revoke(Request $r): void
    {
        if ($token = self::tokenFrom($r)) {
            DB::table('auth_sessions')->where('id', hash('sha256', $token))->delete();
        }
    }

    public static function cookie(string $token): Cookie
    {
        return Cookie::create(self::COOKIE, $token, now()->addDays(self::DAYS), '/', null, app()->isProduction(), true, false, Cookie::SAMESITE_LAX);
    }

    public static function forgetCookie(): Cookie
    {
        return Cookie::create(self::COOKIE, '', 1, '/', null, app()->isProduction(), true, false, Cookie::SAMESITE_LAX);
    }

    public static function userJson(object $u): array
    {
        return [
            'id' => (int) $u->id,
            'email' => $u->email,
            'displayName' => $u->display_name,
            'avatarUrl' => $u->avatar_url,
            'role' => $u->role,
            'termsAcceptedAt' => Format::date($u->terms_accepted_at),
        ];
    }

    /** Finds the user linked to a Google/Apple account, else links by email, else creates one. */
    public static function findOrCreateOAuthUser(string $provider, string $sub, string $email, string $name, ?string $avatar): object
    {
        $email = mb_strtolower(trim($email));

        return DB::transaction(function () use ($provider, $sub, $email, $name, $avatar) {
            $link = DB::table('oauth_accounts')->where('provider', $provider)->where('provider_user_id', $sub)->first();
            if ($link) {
                return DB::table('users')->where('id', $link->user_id)->first();
            }
            $user = DB::table('users')->where('email', $email)->first();
            if (! $user) {
                $id = DB::table('users')->insertGetId([
                    'email' => $email,
                    'display_name' => mb_substr($name, 0, 100),
                    'avatar_url' => $avatar,
                    'role' => 'user',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $user = DB::table('users')->where('id', $id)->first();
            }
            DB::table('oauth_accounts')->insert([
                'user_id' => $user->id,
                'provider' => $provider,
                'provider_user_id' => $sub,
                'provider_email' => $email,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $user;
        });
    }
}
