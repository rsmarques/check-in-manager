<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

use DB;
use Log;
use Carbon\Carbon;

class Event extends Model
{
    protected $table    = 'events';
    protected $fillable = ['id', 'name'];
    public $timestamps  = true;

    public static function findBySlug($slug)
    {
        return Event::where('slug', $slug)->first();
    }

    public function user()
    {
        return $this->belongsTo('User');
    }

    public function guests()
    {
        return $this->belongsToMany('Guest', 'event_guests', 'event_id', 'guest_id')->orderBy('slug', 'ASC')->withPivot('check_in');
    }

    public function getDate()
    {
        $date   = new Carbon($this->date);
        return $date;
    }

    public function getDateFormatted()
    {
        $date   = $this->getDate();
        return $date->format('d/m/y H:i');
    }

    public function getGuestCount()
    {
        return $this->guests()->count();
    }

    public function calcSlug()
    {
        if (!empty($this->slug)) {
            return $this->slug;
        }

        if ($this->name) {

            $sluggable      = $this->name;

            //do not allow slugs starting with number
            if (preg_match('/^\d/', $sluggable)) {
                $sluggable  = 'event-' . $sluggable;
            }

            $sluggable = trim($sluggable);

            if (!$sluggable) {
                $sluggable  = 'event';
            }

            $slug = Str::slug($sluggable);

            if (!$slug) {
                $slug       = 'restaurant';
            }
        } else {
            //if no event name, "event"
            $slug           = Str::slug('event');
        }

        // Avoid repeated slugs
        $repetitions = DB::select(
            DB::raw('select slug from events where slug REGEXP \'^'.$slug.'(-[0-9]+)?$\' order by slug desc')
        );

        if ($repetitions) {
            //find the max number after the slug itself
            $maxNumber  = 0;
            $numbers    = array();
            foreach ($repetitions as $event) {
                preg_match('/-([0-9]+)$/', $event->slug, $matches);

                //find slug with numbers in front
                if ($matches) {
                    array_push($numbers, $matches[1]);
                } else {
                    //found just the slug
                    array_push($numbers, 0);
                }
            }

            Log::info('CalcSlug :: Slug $slug repetitions - '.count($numbers));

            if (count($numbers)) {
                sort($numbers, SORT_NUMERIC);

                //sum 1 to max number and use it in the new slug
                $maxNumber  = end($numbers) + 1;
                $slug       = $slug.'-'.$maxNumber;
            }
        }

        Log::info('CalcSlug :: Calculating slug for event - ' . $this->name . ' -> obtaining: ' . $slug);

        return $slug;
    }
}
