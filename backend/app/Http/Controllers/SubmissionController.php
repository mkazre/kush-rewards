<?php

namespace App\Http\Controllers;

use App\Support\ApiException;
use App\Support\Catalog;
use App\Support\ContentFilter;
use App\Support\Format;
use App\Support\Input;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Venue suggestions and wrong-info reports (HANDOVER 6.6). */
class SubmissionController extends Controller
{
    public function create(Request $r): JsonResponse
    {
        $user = $this->requirePoster($r);
        $name = Input::reqStr($r, 'name', 2, 80, "Enter the venue's name");
        $type = Input::oneOf($r, 'type', Catalog::STORE_TYPES, 'Pick a venue type.');
        $suburb = Input::reqStr($r, 'suburb', 2, 60, 'Pick a suburb.');
        $address = Input::optStr($r, 'address', 200, 'Address') ?? '';
        $whatsapp = Input::optStr($r, 'whatsapp', 30, 'WhatsApp number');
        $hoursNote = Input::optStr($r, 'hoursNote', 200, 'Opening hours');
        $notes = Input::optStr($r, 'notes', 500, 'Notes');
        foreach ([$notes, $hoursNote] as $text) {
            if ($problem = ContentFilter::contentProblem($text)) {
                Input::fail($problem);
            }
        }
        if ($address === '' && $whatsapp === null) {
            Input::fail('Add a street address or a WhatsApp number so we can check the venue.');
        }
        $waiting = DB::table('store_submissions')->where('submitted_by', $user->id)->whereIn('status', ['pending', 'needs_info'])->count();
        if ($waiting >= 5) {
            throw new ApiException(429, 'You have 5 venues waiting for approval. Please wait for those first.');
        }

        $id = DB::table('store_submissions')->insertGetId([
            'submitted_by' => $user->id, 'name' => $name, 'type' => $type, 'suburb' => $suburb,
            'address' => $address, 'whatsapp' => $whatsapp, 'hours_note' => $hoursNote,
            'is_owner' => (bool) $r->boolean('isOwner'), 'notes' => $notes, 'created_at' => now(),
        ]);

        return response()->json(['id' => (int) $id]);
    }

    public function mine(Request $r): JsonResponse
    {
        $user = $this->requireUser($r);
        $rows = DB::table('store_submissions')->where('submitted_by', $user->id)
            ->orderByDesc('created_at')->orderByDesc('id')->limit(50)->get();

        return response()->json(['submissions' => $rows->map(fn ($s) => Format::submission($s))]);
    }

    public function report(Request $r): JsonResponse
    {
        $user = $this->requirePoster($r);
        $storeId = Input::int($r, 'storeId');
        $field = Input::oneOf($r, 'field', Catalog::REPORT_FIELDS, 'Pick what is wrong.');
        $details = Input::reqStr($r, 'details', 3, 500, "Tell us what's wrong in a few words");
        // Offensive check only: a report may need to contain a new phone number.
        if ($problem = ContentFilter::offensiveProblem($details)) {
            Input::fail($problem);
        }
        if (! DB::table('stores')->where('id', $storeId)->where('status', 'live')->exists()) {
            throw new ApiException(404, 'Venue not found');
        }
        $this->throttle('report:'.$user->id, 20, 3600, "You've sent a lot of reports. Please try again in an hour.");

        $id = DB::table('info_reports')->insertGetId([
            'store_id' => $storeId, 'reported_by' => $user->id, 'field' => $field, 'details' => $details, 'created_at' => now(),
        ]);

        return response()->json(['id' => (int) $id]);
    }
}
