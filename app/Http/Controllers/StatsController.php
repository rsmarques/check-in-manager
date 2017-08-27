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
    public function globalStatsData()
    {
        $startDate          = Input::get('start_date', '0000-00-00');
        $endDate            = Input::get('end_date', '2099-01-01');

        $totalEvents        = Event::where('date', '>=', $startDate)->where('date', '<', $endDate)->count();
        $totalGuests        = Event::where('date', '>=', $startDate)->where('date', '<', $endDate)
            ->join('event_guests', 'events.id', '=', 'event_guests.event_id')
            ->join('guests', 'guests.id', '=', 'event_guests.guest_id')
            ->count();

        $guestsByEvent      = Event::where('date', '>=', $startDate)->where('date', '<', $endDate)->leftJoin('event_guests', 'events.id', '=', 'event_guests.event_id')->selectRaw('count(distinct(guest_id)) as count')->groupBy('events.id')->pluck('count')->all();

        $eventGuestsAvg     = GeneralHelper::arrayAverage($guestsByEvent);
        $eventGuestsMedian  = GeneralHelper::arrayMedian($guestsByEvent);

        $totalIndustries    = Event::distinct()->where('date', '>=', $startDate)->where('date', '<', $endDate)->count('industry');
        $totalCompanies     = Event::distinct()->where('date', '>=', $startDate)->where('date', '<', $endDate)->count('company');
        $totalCountries     = Event::distinct()->where('date', '>=', $startDate)->where('date', '<', $endDate)
            ->join('event_guests', 'events.id', '=', 'event_guests.event_id')
            ->join('guests', 'guests.id', '=', 'event_guests.guest_id')
            ->count('origin');

        return [
            "total_events"          => $totalEvents,
            "total_guests"          => $totalGuests,
            "event_guests_avg"      => $eventGuestsAvg,
            "event_guests_median"   => $eventGuestsMedian,
            "total_industries"      => $totalIndustries,
            "total_companies"       => $totalCompanies,
            "total_countries"       => $totalCountries,
        ];
    }

    public function globalStats()
    {
        return $this->respondWithArray(['data' => $this->globalStatsData()]);
    }

    public function eventStatsData()
    {
        $statsData      = [];
        $courses        = ['Masters', 'Bachelor', 'Other'];
        $startDate      = Input::get('start_date', '0000-00-00');
        $endDate        = Input::get('end_date', '2099-00-00');

        $industries     = Event::distinct()->where('date', '>=', $startDate)->where('date', '<', $endDate)->pluck('industry')->all();
        $countries      = Guest::distinct()->pluck('origin')->all();
        $months         = Event::selectRaw('date_format(date, "%Y-%m") as month')
            ->distinct()
            ->where('date', '>=', $startDate)->where('date', '<', $endDate)
            ->pluck('month')->all();
        $timestamps     = array_map(function ($month) {
            $date       = new Carbon($month);
            return $date->timestamp * 1000;
        }, $months);

        $statsData['industries_abs']        = array_fill_keys($courses, array_fill_keys($industries, 0));
        $statsData['industries_percentage'] = array_fill_keys($industries, 0);
        $statsData['countries']             = array_fill_keys($countries, 0);
        $statsData['time']                  = array_fill_keys($courses, array_fill_keys($timestamps, 0));

        $stats = Event::where('date', '>=', $startDate)->where('date', '<', $endDate)
            ->leftJoin('event_guests', 'events.id', '=', 'event_guests.event_id')
            ->leftJoin('guests', 'guests.id', '=', 'event_guests.guest_id')
            ->selectRaw('events.id, events.date, events.industry, events.company, guests.origin, if(guests.degree like "%MSc%", "Masters", if (guests.degree like "%BSc%", "Bachelor", "Other")) as course, count(distinct(guests.id)) as count')
            ->groupBy(DB::raw('events.id, events.date, events.industry, events.company, guests.origin, if(guests.degree like "%MSc%", "Masters", if (guests.degree like "%BSc%", "Bachelor", "Other"))'))
            ->get();

        // return $this->respondWithArray(['data' => $stats->all()]);

        foreach ($stats as $stat) {
            if ($stat->count == 0) {
                continue;
            }

            $date       = new Carbon($stat->date);
            $timestamp  = $date->startOfMonth()->timestamp * 1000;

            $statsData['industries_abs'][$stat->course][$stat->industry]    += $stat->count;
            $statsData['industries_percentage'][$stat->industry]            += $stat->count;
            $statsData['countries'][$stat->origin]                          += $stat->count;
            $statsData['time'][$stat->course][$timestamp]                   += $stat->count;
        }

        return $statsData;
    }

    public function eventStats()
    {
        return $this->respondWithArray(['data' => $this->eventStatsData()]);
    }

    public function csvStats()
    {
        $eventStatsData = $this->eventStatsData();
        $globalStatsData = $this->globalStatsData();

        # Creating temp CSV
        $fh = fopen('php://temp', 'rw');

        // Industry Stats
        $industriesHeader = array_merge(['Industry'], array_keys($eventStatsData['industries_abs']), ['Total', '%']);
        fputcsv($fh, $industriesHeader);

        $courses = array_keys($eventStatsData['industries_abs']);

        foreach (reset($eventStatsData['industries_abs']) as $industry => $value) {
            $industryLine = [$industry];
            foreach ($courses as $course) {
                array_push($industryLine, $eventStatsData['industries_abs'][$course][$industry]);
            }
            array_push($industryLine, $eventStatsData['industries_percentage'][$industry]);
            array_push($industryLine, round($eventStatsData['industries_percentage'][$industry] / array_sum($eventStatsData['industries_percentage']) * 100., 2) . '%');
            fputcsv($fh, $industryLine);
        }

        // Country Stats
        fputcsv($fh, ['', '']);
        fputcsv($fh, ['Country', '# Guests']);
        foreach ($eventStatsData['countries'] as $country => $value) {
            fputcsv($fh, [$country, $value]);
        }

        // Time Stats
        fputcsv($fh, ['', '']);
        fputcsv($fh, array_merge(['Date'], $courses, ['Total']));
        foreach (reset($eventStatsData['time']) as $timestamp => $value) {
            $dateStr    = Carbon::createFromTimestamp($timestamp / 1000)->format('F Y');
            $dateLine   = [$dateStr];
            $dateCount  = 0;
            foreach ($courses as $course) {
                array_push($dateLine, $eventStatsData['time'][$course][$timestamp]);
                $dateCount  += $eventStatsData['time'][$course][$timestamp];
            }
            array_push($dateLine, $dateCount);
            fputcsv($fh, $dateLine);
        }

        // Global Stats
        fputcsv($fh, ['', '']);
        fputcsv($fh, ['Global Stats', '# Guests']);
        foreach ($globalStatsData as $key => $value) {
            fputcsv($fh, [$key, $value]);
        }

        rewind($fh);
        $csv = stream_get_contents($fh);
        fclose($fh);

        // return $this->respondWithArray(['data' => ['events' => $eventStatsData, 'global' => $globalStatsData]]);
        return $this->respondWithArray(array('data' => $csv));
    }
}
