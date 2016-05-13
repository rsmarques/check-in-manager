<?php

namespace App\Http\Controllers;

use App\Event;
use App\EventGuest;

use Log;

class EventController extends Controller
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

        return $guests;
    }

    public function checkInGuest($eventSlug, $guestId)
    {
        $event  = Event::findBySlug($eventSlug);

        if (!$event) {
            // TODO error page on event not found
            return array();
        }

        $guest  = EventGuest::find($guestId);

        if ($guest && $guest->event_id === $event->id) {
            $guest->check_in    = !$guest->check_in;
            $guest->save();

            return $guest;

        } else {
            return array();
        }
    }

    /**
     * Store a newly created resource in storage.
     *
     * @return Response
     */
    public function store()
    {

    }

    /**
     * Update the specified resource in storage.
     *
     * @param int $slug
     *
     * @return Response
     */
    public function update($slug)
    {

    }

    /**
     * Remove the specified resource from storage.
     *
     * @param int $slug
     *
     * @return Response
     */
    public function destroy($slug)
    {

    }
}
