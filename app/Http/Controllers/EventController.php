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
use User;

// Transformers
use GuestTransformer;
use GuestCsvTransformer;
use EventTransformer;

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

        return $this->respondWithCollection($events, new EventTransformer);
    }

    public function eventBySlug($slug)
    {
        $event  = Event::findBySlug($slug);

        if (!$event) {
            return $this->responseWithErrors("Event [$slug] not found!", 500);
        }

        return $this->respondWithItem($event, new EventTransformer);
    }

    public function eventGuestsBySlug($slug)
    {
        $event  = Event::findBySlug($slug);

        if (!$event) {
            return $this->responseWithErrors("Event [$slug] not found!", 500);
        }

        $guests = $event->guests;

        if (Input::get('csv')) {

            Log::info('CSV');
            $fractal    = new Manager();
            $resource   = new Collection($guests, new GuestCsvTransformer);

            $guestData  = $fractal->createData($resource)->toArray()['data'];
            $csvData    = GeneralHelper::arrayToCsv($guestData);
            Log::info($csvData);
            return $this->respondWithArray(array('data' => $csvData));
        }

        return $this->respondWithCollection($guests, new GuestTransformer);
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
        $date               = new Carbon($eventData['date']);
        $date->setTimezone(config('app.timezone'));
        $event->date        = $date;
        $event->name        = $eventData['name'];
        $event->category    = $eventData['category'];
        $event->industry    = empty($eventData['industry']) ? null  : $eventData['industry'];
        $event->company     = empty($eventData['company'])  ? null  : eventData['company'];
        $event->slug        = $event->calcSlug();
        $event->save();

        return $this->respondWithItem($event, new EventTransformer);
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
