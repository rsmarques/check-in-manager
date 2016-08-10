<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Guest extends Model
{
    protected $table = 'guests';
    public $timestamps = true;

    public function event()
    {
        return $this->belongsTo('Event');
    }
}
