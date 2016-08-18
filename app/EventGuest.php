<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class EventGuest extends Model
{
    protected $table    = 'event_guests';
    public $timestamps  = true;
    public $fillable    = ['event_id', 'guest_id', 'check_in'];

    public function event()
    {
        return $this->belongsTo('Event');
    }
}
