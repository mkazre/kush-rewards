<?php

namespace Database\Seeders;

use App\Support\Catalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Demo data so the apps have something to show: fictional venues across the West Rand,
 * demo reviewers, reviews, taps, a few suggestions and a wrong-info report.
 * Demo reviewers have no password and can't sign in. Delete or hide the demo venues
 * in Admin before launch.
 */
class DemoSeeder extends Seeder
{
    public const EMAIL_DOMAIN = 'demo.kushrewards.online';

    /** Names of the demo venues; Admin → Settings → Remove demo data deletes these. */
    public const VENUE_NAMES = [
        'Green Room Social Club',
        'Paradise Lounge',
        'The Highveld Collective',
        'Kloof Leaf Lounge',
        'Ruimsig Garden Club',
        'Cloud Nine Dispensary',
        'Little Falls Members Lounge',
        'Welte Wellness Club',
        'Honeydew Hideout',
        'West Rand Botanicals',
        'Northcliff Ridge Social',
        'Randburg Chill Spot',
        'Soweto Roots Club',
        'Horizon Haze Lounge',
        'Discovery Den',
        'Wilro Park Wellness',
    ];

    public function run(): void
    {
        mt_srand(2026);
        $now = now();
        $wk = fn (string $o, string $c) => array_fill_keys(['mon', 'tue', 'wed', 'thu', 'fri'], ['open' => $o, 'close' => $c]);

        $venues = [
            ['Green Room Social Club', 'club', 'Roodepoort', '14 Ontdekkers Rd', true, ['Members only', 'Lounge seating', 'Secure parking', 'Backup power'], $wk('11:00', '22:00') + ['sat' => ['open' => '11:00', 'close' => '00:00'], 'sun' => ['open' => '12:00', 'close' => '18:00']]],
            ['Paradise Lounge', 'lounge', 'Lindhaven', '131 Progress Rd', false, ['Quiet', 'Backup power', 'Wi-Fi'], $wk('07:00', '20:00') + ['sat' => ['open' => '09:00', 'close' => '20:00'], 'sun' => null]],
            ['The Highveld Collective', 'club', 'Florida', '22 Goldman St', true, ['Members only', 'Garden', 'Live music', 'Card payments'], $wk('12:00', '23:00') + ['sat' => ['open' => '12:00', 'close' => '02:00'], 'sun' => ['open' => '12:00', 'close' => '20:00']]],
            ['Kloof Leaf Lounge', 'lounge', 'Constantia Kloof', '5 Constantia Blvd', false, ['Lounge seating', 'Wi-Fi', 'Wheelchair access'], $wk('10:00', '21:00') + ['sat' => ['open' => '10:00', 'close' => '21:00'], 'sun' => ['open' => '10:00', 'close' => '17:00']]],
            ['Ruimsig Garden Club', 'club', 'Ruimsig', 'Plot 44, Hendrik Potgieter Rd', false, ['Garden', 'Secure parking', 'Pool table'], $wk('14:00', '22:00') + ['sat' => ['open' => '11:00', 'close' => '23:00'], 'sun' => ['open' => '11:00', 'close' => '19:00']]],
            ['Cloud Nine Dispensary', 'dispensary', 'Wilgeheuwel', '9 Doreen Ave', true, ['Card payments', 'Secure parking', 'Friendly staff'], $wk('09:00', '18:00') + ['sat' => ['open' => '09:00', 'close' => '14:00'], 'sun' => null]],
            ['Little Falls Members Lounge', 'lounge', 'Little Falls', '3 Nerina St', false, ['Members only', 'Quiet', 'Lounge seating'], $wk('16:00', '23:00') + ['sat' => ['open' => '13:00', 'close' => '00:00'], 'sun' => null]],
            ['Welte Wellness Club', 'club', 'Weltevredenpark', '71 Hendrik Verwoerd Dr', false, ['Quiet', 'Garden', 'Wheelchair access'], $wk('10:00', '19:00') + ['sat' => ['open' => '10:00', 'close' => '16:00'], 'sun' => null]],
            ['Honeydew Hideout', 'lounge', 'Honeydew', '18 Beyers Naude Dr', false, ['Live music', 'Pool table', 'Backup power'], $wk('15:00', '00:00') + ['sat' => ['open' => '12:00', 'close' => '02:00'], 'sun' => ['open' => '12:00', 'close' => '22:00']]],
            ['West Rand Botanicals', 'dispensary', 'Krugersdorp', '40 Commissioner St', false, ['Card payments', 'Friendly staff'], $wk('08:30', '17:30') + ['sat' => ['open' => '09:00', 'close' => '13:00'], 'sun' => null]],
            ['Northcliff Ridge Social', 'club', 'Northcliff', '2 Lower Rd', true, ['Members only', 'Garden', 'Wi-Fi', 'Secure parking'], $wk('12:00', '22:00') + ['sat' => ['open' => '12:00', 'close' => '23:00'], 'sun' => ['open' => '12:00', 'close' => '18:00']]],
            ['Randburg Chill Spot', 'lounge', 'Randburg', '101 Bram Fischer Dr', false, ['Lounge seating', 'Wi-Fi'], $wk('11:00', '22:00')],
            ['Soweto Roots Club', 'club', 'Soweto', '1802 Vilakazi St', false, ['Live music', 'Members only', 'Backup power'], $wk('13:00', '23:00') + ['sat' => ['open' => '12:00', 'close' => '02:00'], 'sun' => ['open' => '12:00', 'close' => '21:00']]],
            ['Horizon Haze Lounge', 'lounge', 'Horizon', '7 Sonop St', false, ['Quiet', 'Lounge seating'], []],
            ['Discovery Den', 'club', 'Discovery', '16 Hull St', false, ['Pool table', 'Secure parking'], $wk('16:00', '23:00')],
            ['Wilro Park Wellness', 'dispensary', 'Wilro Park', '25 Wilro Ave', false, ['Wheelchair access', 'Card payments', 'Quiet'], $wk('09:00', '17:00') + ['sat' => ['open' => '09:00', 'close' => '13:00']]],
        ];

        $reviewers = ['Thato Mokoena', 'Lerato Dlamini', 'Sipho Nkosi', 'Anika van Wyk', 'Kabelo Molefe', 'Zanele Khumalo', 'Ruan Botha', 'Naledi Mahlangu', 'Pieter Steyn', 'Ayesha Patel', 'Bongani Zulu', 'Megan Smith'];
        $userIds = [];
        foreach ($reviewers as $i => $name) {
            $userIds[] = DB::table('users')->insertGetId([
                'email' => 'demo'.($i + 1).'@'.self::EMAIL_DOMAIN,
                'display_name' => $name, 'role' => 'user',
                'terms_accepted_at' => $now->copy()->subDays(60 - $i),
                'created_at' => $now->copy()->subDays(60 - $i), 'updated_at' => $now,
            ]);
        }

        $comments = [
            5 => ['Relaxed lounge, friendly staff and easy parking.', 'Great vibe on a Friday evening, felt safe the whole time.', 'Lovely garden and the staff know their stuff.', 'Clean, comfortable and quiet. Exactly what I wanted.', null],
            4 => ['Comfortable seating and good music. Can get busy on weekends.', 'Nice spot, staff were welcoming.', 'Solid place to unwind after work.', null],
            3 => ['Decent place but parking was tricky.', 'Okay overall, a bit loud for me.', null],
            2 => ['Waited a long time at the door.', 'Hard to find the entrance at night.', null],
            1 => ['Not clean when we visited.'],
        ];

        $storeIds = [];
        foreach ($venues as $i => [$name, $type, $suburb, $address, $partner, $features, $hours]) {
            [$lat, $lng] = Catalog::SUBURBS[$suburb];
            $digits = str_pad((string) (100000 + $i * 7919 % 899999), 7, '0', STR_PAD_LEFT);
            $id = DB::table('stores')->insertGetId([
                'name' => $name, 'type' => $type, 'suburb' => $suburb, 'address' => $address,
                // Nudge pins off the exact suburb centre so they don't overlap on the map.
                'latitude' => $lat + (mt_rand(-60, 60) / 10000), 'longitude' => $lng + (mt_rand(-60, 60) / 10000),
                'whatsapp' => $i === 13 ? null : '+27 7'.($i % 10).' '.substr($digits, 0, 3).' '.substr($digits, 3, 4),
                'phone' => $i % 4 === 0 ? '011 '.substr($digits, 1, 3).' '.substr($digits, 3, 4) : null,
                'hours' => json_encode($hours ?: new \stdClass),
                'hours_note' => $i === 0 ? 'Public holidays 12:00 to 18:00' : null,
                'features' => json_encode($features),
                'is_partner' => $partner, 'is_community' => in_array($i, [4, 14], true),
                'status' => 'live', 'added_by' => in_array($i, [4, 14], true) ? $userIds[$i % count($userIds)] : null,
                'created_at' => $now->copy()->subDays(90 - $i), 'updated_at' => $now->copy()->subDays(mt_rand(0, 20)),
            ]);
            $storeIds[] = $id;

            // Reviews: partners and popular venues get more, skewed positive.
            $count = $i === 13 ? 0 : mt_rand($partner ? 5 : 1, $partner ? 9 : 6);
            $authors = (array) array_rand(array_flip($userIds), min($count, count($userIds)) ?: 1);
            foreach ($count ? $authors : [] as $author) {
                $stars = [5, 5, 5, 4, 4, 4, 3, 2, 1][mt_rand(0, $partner ? 5 : 8)];
                $tags = match (true) {
                    $stars >= 4 => Catalog::POSITIVE_TAGS,
                    $stars <= 2 => Catalog::NEGATIVE_TAGS,
                    default => [...array_slice(Catalog::POSITIVE_TAGS, 0, 4), ...array_slice(Catalog::NEGATIVE_TAGS, 0, 3)],
                };
                shuffle($tags);
                $when = $now->copy()->subDays(mt_rand(0, 45))->subMinutes(mt_rand(0, 1440));
                DB::table('reviews')->insert([
                    'store_id' => $id, 'user_id' => $author, 'stars' => $stars,
                    'tags' => json_encode(array_slice($tags, 0, mt_rand(1, 3))),
                    'comment' => $comments[$stars][array_rand($comments[$stars])],
                    'created_at' => $when, 'updated_at' => $when,
                ]);
            }

            // Contact taps over the last 60 days: what partners pay for.
            $taps = [];
            for ($t = 0, $n = mt_rand($partner ? 80 : 10, $partner ? 220 : 70); $t < $n; $t++) {
                $taps[] = [
                    'store_id' => $id, 'kind' => ['whatsapp', 'whatsapp', 'whatsapp', 'call', 'directions', 'directions'][mt_rand(0, 5)],
                    'user_id' => mt_rand(0, 3) ? null : $userIds[array_rand($userIds)],
                    'created_at' => $now->copy()->subMinutes(mt_rand(0, 60 * 24 * 60)),
                ];
            }
            DB::table('contact_taps')->insert($taps);
        }

        DB::table('store_submissions')->insert([
            ['submitted_by' => $userIds[0], 'name' => 'Mellow Yellow Lounge', 'type' => 'lounge', 'suburb' => 'Witpoortjie', 'address' => '12 Main Reef Rd', 'whatsapp' => '+27 72 555 0101', 'hours_note' => 'Most evenings from 4pm', 'is_owner' => false, 'notes' => 'Opened last month, near the garage.', 'status' => 'pending', 'created_at' => $now->copy()->subDays(1)],
            ['submitted_by' => $userIds[3], 'name' => 'Randpark Ridge Club', 'type' => 'club', 'suburb' => 'Randpark', 'address' => '', 'whatsapp' => '+27 83 555 0199', 'hours_note' => null, 'is_owner' => true, 'notes' => 'I manage this club and would like it listed.', 'status' => 'pending', 'created_at' => $now->copy()->subHours(5)],
            ['submitted_by' => $userIds[5], 'name' => 'Robin Hills Retreat', 'type' => 'lounge', 'suburb' => 'Robin Hills', 'address' => 'Corner of Pendoring and Beyers Naude', 'whatsapp' => null, 'hours_note' => null, 'is_owner' => false, 'notes' => null, 'status' => 'needs_info', 'created_at' => $now->copy()->subDays(4)],
        ]);
        DB::table('store_submissions')->where('status', 'needs_info')->update(['decision_reason' => 'Could you share a contact number? We could not reach them.', 'decided_at' => $now->copy()->subDays(2)]);

        DB::table('info_reports')->insert([
            'store_id' => $storeIds[1], 'reported_by' => $userIds[2], 'field' => 'Hours',
            'details' => 'Closes at 18:00 on Saturdays now, not 20:00.', 'created_at' => $now->copy()->subDays(2),
        ]);
    }
}
