<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Guest extends Model
{
    protected $table = 'guests';
    public $timestamps = true;

    public function event()
    {
        return $this->belongsTo('Event');
    }

    public function getShortName()
    {
        $names  = explode(' ', $this->name);

        if (count($names) < 2) {
            return $this->name;
        }

        return reset($names) . ' ' . end($names);
    }

    public function getCheckInData()
    {
        return isset($this->pivot->check_in) ? ((bool) $this->pivot->check_in) : null;
    }
}
