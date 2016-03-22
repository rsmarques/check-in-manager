<?php

namespace app;

use Illuminate\Database\Eloquent\Model;

class EventGuest extends Model
{
    protected $table = 'event_guests';
    public $timestamps = true;

    public function event()
    {
        return $this->belongsTo('Event');
    }
}
