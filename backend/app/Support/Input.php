<?php

namespace App\Support;

use Illuminate\Http\Request;

/** Small validation helpers that fail with user-facing messages (shown verbatim in the apps). */
final class Input
{
    public static function fail(string $message, int $status = 400): never
    {
        throw new ApiException($status, $message);
    }

    /** Trimmed string, or '' when missing. */
    public static function str(Request $r, string $key): string
    {
        $v = $r->input($key);

        return is_scalar($v) ? trim((string) $v) : '';
    }

    /** Trimmed string or null when empty. */
    public static function optStr(Request $r, string $key, int $max, string $label): ?string
    {
        $v = self::str($r, $key);
        if (mb_strlen($v) > $max) {
            self::fail("$label must be $max characters or fewer.");
        }

        return $v === '' ? null : $v;
    }

    public static function reqStr(Request $r, string $key, int $min, int $max, string $message): string
    {
        $v = self::str($r, $key);
        $len = mb_strlen($v);
        if ($len < $min || $len > $max) {
            self::fail($message);
        }

        return $v;
    }

    public static function int(Request $r, string $key, string $message = 'Something is missing. Please try again.'): int
    {
        $v = $r->input($key);
        if (! is_numeric($v) || (int) $v != $v) {
            self::fail($message);
        }

        return (int) $v;
    }

    public static function oneOf(Request $r, string $key, array $allowed, string $message): string
    {
        $v = $r->input($key);
        if (! is_string($v) || ! in_array($v, $allowed, true)) {
            self::fail($message);
        }

        return $v;
    }
}
