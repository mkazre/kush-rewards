<?php

namespace App\Support;

/**
 * Fixed lists shared with the apps. Keep identical to mobile/src/lib/storeUtils.ts
 * and mobile/src/lib/reviewTags.ts (HANDOVER 8.9).
 */
final class Catalog
{
    public const STORE_TYPES = ['dispensary', 'club', 'lounge'];

    /** Suburb => [lat, lng] of its centre. Approved suggestions start here. */
    public const SUBURBS = [
        'Roodepoort' => [-26.162, 27.872],
        'Witpoortjie' => [-26.152, 27.826],
        'Lindhaven' => [-26.137, 27.842],
        'Horizon' => [-26.143, 27.866],
        'Florida' => [-26.176, 27.91],
        'Constantia Kloof' => [-26.141, 27.912],
        'Discovery' => [-26.165, 27.893],
        'Ruimsig' => [-26.083, 27.874],
        'Wilgeheuwel' => [-26.098, 27.902],
        'Little Falls' => [-26.104, 27.885],
        'Weltevredenpark' => [-26.124, 27.938],
        'Honeydew' => [-26.077, 27.923],
        'Wilro Park' => [-26.112, 27.86],
        'Randpark' => [-26.11, 27.96],
        'Robin Hills' => [-26.104, 27.98],
        'Randburg' => [-26.094, 28.006],
        'Northcliff' => [-26.145, 27.968],
        'Krugersdorp' => [-26.099, 27.776],
        'Soweto' => [-26.249, 27.854],
    ];

    public const POSITIVE_TAGS = ['Friendly staff', 'Clean & safe', 'Great vibe', 'Comfortable space', 'Knowledgeable staff', 'Quick service', 'Easy parking'];
    public const NEGATIVE_TAGS = ['Long wait', 'Unfriendly staff', 'Not clean', 'Too noisy', 'Hard to find'];
    public const RETIRED_TAGS = ['Good quality', 'Fair prices', 'Pricey', 'Poor quality', 'Out of stock'];

    public const REPORT_FIELDS = ['Hours', 'Closed for good', 'Location', 'Contact', 'Other'];
    public const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    public static function reviewTags(): array
    {
        return [...self::POSITIVE_TAGS, ...self::NEGATIVE_TAGS];
    }

    public static function suburbCentre(string $suburb): array
    {
        return self::SUBURBS[$suburb] ?? self::SUBURBS['Roodepoort'];
    }
}
