<?php

namespace App\Support;

/**
 * Server copy of mobile/src/lib/contentFilter.ts (HANDOVER 9). The backend is the real gatekeeper.
 * Blocks prices, offers to buy/sell, contact details and links, plus a short offensive-language list.
 */
final class ContentFilter
{
    public const SELLING_MESSAGE = 'Please remove prices, contact details, links or offers to buy or sell.';
    public const OFFENSIVE_MESSAGE = 'Please keep it respectful: remove offensive language.';

    private const SELLING_PATTERNS = [
        '/\bR\s?\d+/i',
        '/\d+\s?(rand|zar)\b/i',
        '/\brands?\b/i',
        '/\bper\s?(gram|g|ounce|oz)\b/i',
        '/\b(price|prices|priced|pricing|cheap|cheaper|cheapest|discount|discounts|special|specials|deal|deals)\b/i',
        '/\b(buy|buying|sell|selling|sells|order|orders|ordering|deliver|delivers|delivery|deliveries|stock|stocks|menu|menus)\b/i',
        '/(\+?27|\b0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/',
        '/https?:\/\/|www\.|\.co\.za\b|\.com\b|\.net\b|\.org\b|\.online\b/i',
        '/(^|\s)@[a-z0-9_.]{3,}/i',
    ];

    // Extend over time; not meant to be exhaustive.
    private const OFFENSIVE = ['fuck', 'shit', 'cunt', 'bitch', 'kaffir', 'poes', 'naai', 'moer', 'faggot', 'nigger'];

    public static function offensiveProblem(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return null;
        }
        foreach (self::OFFENSIVE as $word) {
            if (preg_match('/\b'.preg_quote($word, '/').'/i', $text)) {
                return self::OFFENSIVE_MESSAGE;
            }
        }

        return null;
    }

    public static function contentProblem(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return null;
        }
        foreach (self::SELLING_PATTERNS as $pattern) {
            if (preg_match($pattern, $text)) {
                return self::SELLING_MESSAGE;
            }
        }

        return self::offensiveProblem($text);
    }
}
