<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Input;
use Validator;

use App\Guest;
use App\Event;
use App\EventGuest;

use Log;
use DB;
use Exception;

class GuestController extends ApiController
{
    public function userGuests()
    {
        // TODO filter guests by user
        $guests     = Guest::orderBy('slug')->get()->all();

        // TODO put this data into transformer
        return $this->respondWithArray($guests);
    }

    public function guestBySlug($slug)
    {
        $guest      = Guest::findBySlug($slug);

        if (!$guest) {
            return $this->responseWithErrors("Guest [$slug] not found!", 500);
        }

        return $guest;
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
        $guest->save();

        return $guest;
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
}
