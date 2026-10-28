<?php

namespace App\Support;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/** Verifies Google and Apple ID tokens against their published signing keys (HANDOVER 5). */
final class IdTokens
{
    /** @return array claims, or null when the token is not valid */
    public static function google(string $idToken): ?array
    {
        $audiences = array_filter(config('kush.google_client_ids'));
        $claims = self::decode($idToken, 'https://www.googleapis.com/oauth2/v3/certs', 'google');
        if (! $claims
            || ! in_array($claims['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)
            || ! in_array($claims['aud'] ?? '', $audiences, true)
            || empty($claims['email'])
            || ! filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return null;
        }

        return $claims;
    }

    public static function apple(string $identityToken): ?array
    {
        $audiences = array_filter(config('kush.apple_audiences'));
        $claims = self::decode($identityToken, 'https://appleid.apple.com/auth/keys', 'apple');
        if (! $claims
            || ($claims['iss'] ?? '') !== 'https://appleid.apple.com'
            || ! in_array($claims['aud'] ?? '', $audiences, true)
            || empty($claims['sub'])) {
            return null;
        }

        return $claims;
    }

    private static function decode(string $jwt, string $jwksUrl, string $name): ?array
    {
        try {
            $jwks = Cache::remember("jwks:$name", 3600, fn () => Http::timeout(10)->get($jwksUrl)->throw()->json());
            JWT::$leeway = 60;

            // JWT::decode checks the signature and exp/nbf/iat.
            return (array) JWT::decode($jwt, JWK::parseKeySet($jwks, 'RS256'));
        } catch (Throwable) {
            Cache::forget("jwks:$name"); // keys may have rotated

            return null;
        }
    }
}
