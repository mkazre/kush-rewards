<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/** Turns database rows into the camelCase JSON shapes in mobile/src/types/api.ts. */
final class Format
{
    public static function date(mixed $value): ?string
    {
        return $value ? Carbon::parse($value, 'UTC')->toIso8601ZuluString('millisecond') : null;
    }

    public static function json(mixed $value, mixed $default = []): mixed
    {
        if (is_array($value)) {
            return $value;
        }
        $decoded = is_string($value) ? json_decode($value, true) : null;

        return $decoded ?? $default;
    }

    /** First word of a display name; public review data never carries surnames (HANDOVER 4.3.1). */
    public static function firstName(?string $name): string
    {
        $first = preg_split('/\s+/', trim((string) $name))[0] ?? '';

        return $first !== '' ? $first : 'KushRewards user';
    }

    public static function visibleTags(mixed $tags): array
    {
        return array_values(array_diff(self::json($tags), Catalog::RETIRED_TAGS));
    }

    /** Venue fields shared by the public list and the admin list. Never includes prices or products. */
    public static function store(object $s): array
    {
        $hours = self::json($s->hours, []);

        return [
            'id' => (int) $s->id,
            'name' => $s->name,
            'type' => $s->type,
            'status' => $s->status,
            'suburb' => $s->suburb,
            'address' => $s->address,
            'latitude' => (float) $s->latitude,
            'longitude' => (float) $s->longitude,
            'whatsapp' => $s->whatsapp,
            'phone' => $s->phone,
            'hours' => $hours === [] ? new \stdClass : $hours,
            'hoursNote' => $s->hours_note,
            'features' => self::json($s->features),
            'isPartner' => (bool) $s->is_partner,
            'isCommunity' => (bool) $s->is_community,
            'logoUrl' => $s->logo_url,
            'createdAt' => self::date($s->created_at),
            'updatedAt' => self::date($s->updated_at),
        ];
    }

    public static function submission(object $s): array
    {
        return [
            'id' => (int) $s->id,
            'name' => $s->name,
            'type' => $s->type,
            'suburb' => $s->suburb,
            'address' => $s->address,
            'whatsapp' => $s->whatsapp,
            'hoursNote' => $s->hours_note,
            'isOwner' => (bool) $s->is_owner,
            'notes' => $s->notes,
            'status' => $s->status,
            'storeId' => $s->store_id !== null ? (int) $s->store_id : null,
            'decisionReason' => $s->decision_reason,
            'decidedAt' => self::date($s->decided_at),
            'submittedBy' => (int) $s->submitted_by,
            'createdAt' => self::date($s->created_at),
        ];
    }
}
