<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Input;
use Carbon\Carbon;
use Validator;
use Log;
use DB;
use Exception;

// Fractal
use League\Fractal\Manager;
use League\Fractal\Resource\Collection;

// Helpers
use GeneralHelper;

// Models
use Guest;
use Event;
use EventGuest;

class StatsController extends ApiController
{
    /**
     * Display a listing of the resource.
     *
     * @return Response
     */
    public function globalStats()
    {
        $totalEvents        = Event::count();
        $totalGuests        = Guest::count();

        $guestsByEvent      = Event::leftJoin('event_guests', 'events.id', '=', 'event_guests.event_id')->selectRaw('count(distinct(guest_id)) as count')->groupBy('events.id')->pluck('count')->all();

        $eventGuestsAvg     = GeneralHelper::arrayAverage($guestsByEvent);
        $eventGuestsMedian  = GeneralHelper::arrayMedian($guestsByEvent);


        return $this->respondWithArray(['data' => [
            "total_events"          => $totalEvents,
            "total_guests"          => $totalEvents,
            "event_guests_avg"      => $eventGuestsAvg,
            "event_guests_median"   => $eventGuestsMedian,
            ]
        ]);
    }

    public function eventStats($eventId)
    {
        $event  = Event::findBySlug($slug);

        if (!$event) {
            return $this->responseWithErrors("Event [$slug] not found!", 500);
        }

        return $this->respondWithItem($event, new EventTransformer);
    }
}
