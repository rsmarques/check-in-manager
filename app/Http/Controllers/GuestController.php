<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Input;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Validator;

// Fractal
use League\Fractal\Manager;
use League\Fractal\Resource\Collection;

use GeneralHelper;

use Guest;
use GuestTransformer;
use GuestCsvTransformer;
use Event;
use EventGuest;

use Log;
use DB;
use Exception;

class GuestController extends ApiController
{
    public function userGuests()
    {
        // TODO filter guests by user
        $guests     = Guest::orderBy('slug', 'DESC')->get()->all();

        if (Input::get('csv')) {

            $fractal    = new Manager();
            $resource   = new Collection($guests, new GuestCsvTransformer(false));

            $guestData  = $fractal->createData($resource)->toArray()['data'];
            $csvData    = GeneralHelper::arrayToCsv($guestData);

            return $this->respondWithArray(array('data' => $csvData));
        }

        return $this->respondWithCollection($guests, new GuestTransformer);
    }

    public function guestBySlug($slug)
    {
        $guest      = Guest::findBySlug($slug);

        if (!$guest) {
            return $this->responseWithErrors("Guest [$slug] not found!", 500);
        }

        return $this->respondWithItem($guest, new GuestTransformer);
    }

    public function eventGuestCheckIn($eventSlug, $guestId)
    {
        $event      = Event::findBySlug($eventSlug);

        if (!$event) {
            return $this->responseWithErrors("Event [$slug] not found!", 500);
        }

        $guest          = Guest::find($guestId);

        if (!$guest) {
            return $this->responseWithErrors("Guest [$guest] not found!", 500);
        }

        Log::info("GuestController :: Checking Guest [$guestId] in event [$eventSlug]!");

        $eventGuest             = EventGuest::firstOrNew(array('event_id' => $event->id, 'guest_id' => $guest->id));
        $eventGuest->check_in   = is_null($eventGuest->check_in) ? 1 : !$eventGuest->check_in;
        $eventGuest->save();

        return $eventGuest;
    }

    public function eventGuestRemove($eventSlug, $guestId)
    {
        $event      = Event::findBySlug($eventSlug);

        if (!$event) {
            return $this->responseWithErrors("Event [$slug] not found!", 500);
        }

        $guest      = Guest::find($guestId);

        if (!$guest) {
            return $this->responseWithErrors("Guest [$guest] not found!", 500);
        }

        Log::info("GuestController :: Removing Guest [$guestId] from event [$eventSlug]!");

        $data       = EventGuest::where('event_id', $event->id)->where('guest_id', $guest->id)->delete();

        return $this->responseWithNoContent();
    }

    /**
     * Store a newly created resource in storage.
     *
     * @return Response
     */
    public function store()
    {
        $guestData  = Input::get('guest', array());

        $validator  = Validator::make($guestData, [
            'name'      => 'required',
            'slug'      => 'required',
            'email'     => 'required',
            'gender'    => 'required',
            'degree'    => 'required',
        ]);

        if ($validator->fails()) {
            return $this->responseWithErrors($validator->errors()->all(), 422);
        }

        Log::info("GuestController :: Storing Guest!");

        $guest              = !empty($guestData['id']) ? Guest::firstOrNew(array('id' => $guestData['id'])) : new Guest;

        // TODO associate user to guest
        // $guest->user_id     = 1;
        $guest->name        = $guestData['name'];
        $guest->slug        = $guestData['slug'];
        $guest->email       = $guestData['email'];
        $guest->gender      = $guestData['gender'];
        $guest->degree      = $guestData['degree'];

        if (!empty($guestData['st_number'])) {
            $guest->st_number   = $guestData['st_number'];
        }
        if (!empty($guestData['origin'])) {
            $guest->origin      = $guestData['origin'];
        }
        if (isset($guestData['graduated'])) {
            $guest->graduated   = $guestData['graduated'];
        }
        if (!empty($guestData['phone_number'])) {
            $guest->phone_number =  str_replace(' ', '', $guestData['phone_number']);
        }
        $guest->save();

        return $this->respondWithItem($guest, new GuestTransformer);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param int $slug
     *
     * @return Response
     */
    public function delete($id)
    {
        $guest          = Guest::find($id);

        if (!$guest) {
            return $this->responseWithErrors("Guest [$id] not found!", 500);
        }

        Log::info("GuestController :: Deleting Guest [$id]");

        DB::beginTransaction();

        try {

            EventGuest::where('guest_id', $guest->id)->delete();
            Guest::where('id', $guest->id)->delete();

        } catch (Exception $e) {
            DB::rollback();
            return $this->responseWithErrors("Error deleting guest! " . $e->getMessage(), 500);
        }

        DB::commit();

        return $this->responseWithNoContent();
    }

    public function loadCSV(Request $request)
    {
        $file           = $request->file('file');

        if (empty($file)) {
            return [];
        }

        $csv = GeneralHelper::CSVToArray($file->getRealPath());

        return $csv;
    }

    public function bulkLoad(Request $request)
    {
        $csvData = $this->loadCSV($request);

        return $this->respondWithArray(['data' => $csvData]);
    }

    public function bulkStore(Request $request)
    {
        $csvData = $this->loadCSV($request);

        Log::info("GuestController :: Bulk Storing Guests");

        foreach ($csvData as $key => $guestData) {
            Log::info("GuestController :: Bulk Storing Guest $key");

            if (!$guestData['id']) {
                continue;
            }

            $guest                  = Guest::firstOrNew(array('slug' => $guestData['id']));
            if (!empty($guestData['name'])) {
                $guest->name        = $guestData['name'];
            }
            if (!empty($guestData['email'])) {
                $guest->email       = $guestData['email'];
            }
            if (!empty($guestData['gender'])) {
                $guest->gender      = $guestData['gender'];
            }
            if (!empty($guestData['degree'])) {
                $guest->degree      = $guestData['degree'];
            }
            if (!empty($guestData['st_number'])) {
                $guest->st_number   = $guestData['st_number'];
            }
            if (!empty($guestData['origin'])) {
                $guest->origin      = $guestData['origin'];
            }
            if (isset($guestData['graduated'])) {
                $guest->graduated   = $guestData['graduated'];
            }
            if (!empty($guestData['phone_number'])) {
                $guest->phone_number =  str_replace(' ', '', $guestData['phone_number']);
            }

            $guest->save();
        }

        return $this->responseWithNoContent();
    }
}
