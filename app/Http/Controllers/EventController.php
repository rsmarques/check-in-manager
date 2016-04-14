<?php

namespace App\Http\Controllers;

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
        $events = \App\Event::get();

        return view('events', array("events" => $events));
    }

    public function eventBySlug($slug)
    {
        $event  = \App\Event::findBySlug($slug);

        if (!$event) {
            // TODO error page on event not found
        }

        $guests = $event->guests()->get();

        return view('event', array("event" => $event, "guests" => $guests, "guest_count" => $event->guests()->count()));
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
