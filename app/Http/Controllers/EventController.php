<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Input;
use Carbon\Carbon;
use Validator;

use App\Guest;
use App\Event;
use App\EventGuest;

use Log;
use DB;
use Exception;

class EventController extends ApiController
{
    /**
     * Display a listing of the resource.
     *
     * @return Response
     */
    public function userEvents()
    {
        // TODO filter events by user
        $events = Event::get();

        // TODO put this data into transformer
        foreach ($events as $event) {
            $event["guest_count"]   = $event->guests()->count();
        }

        return $events;
    }

    public function eventBySlug($slug)
    {
        $event  = Event::findBySlug($slug);

        if (!$event) {
            // TODO error page on event not found
            return array();
        }

        // TODO put this data into transformer
        $event["guest_count"]   = $event->guests()->count();

        return $event;
    }

    public function eventGuestsBySlug($slug)
    {
        $event  = Event::findBySlug($slug);

        if (!$event) {
            // TODO error page on event not found
            return array();
        }

        $guests = $event->guests;

        foreach ($guests as $guest) {
            $guest->check_in    = $guest->pivot->check_in;
        }

        return $guests;
    }

    /**
     * Store a newly created resource in storage.
     *
     * @return Response
     */
    public function store()
    {
        $eventData  = Input::get('event', array());

        $validator  = Validator::make($eventData, [
            'name'      => 'required',
            'category'  => 'required',
            'date'      => 'required',
        ]);

        if ($validator->fails()) {
            return $this->responseWithErrors($validator->errors()->all(), 422);
        }

        $event              = !empty($eventData['id']) ? Event::firstOrNew(array('id' => $eventData['id'])) : new Event;

        $event->user_id     = 1;
        $event->date        = new Carbon($eventData['date']);
        $event->name        = $eventData['name'];
        $event->category    = $eventData['category'];
        $event->slug        = $event->calcSlug();
        $event->save();

        return $event;
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param int $slug
     *
     * @return Response
     */
    public function delete($slug)
    {
        $event      = Event::findBySlug($slug);

        if (!$event) {
            return $this->responseWithErrors("Event [$slug] not found!", 500);
        }

        DB::beginTransaction();

        try {

            EventGuest::where('event_id', $event->id)->delete();
            Event::where('slug', $slug)->delete();

        } catch (Exception $e) {
            DB::rollback();
            return $this->responseWithErrors("Error deleting event! " . $e->getMessage(), 500);
        }

        DB::commit();


        return $this->responseWithNoContent();
    }
}
