<?php

namespace app;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $table = 'events';
    public $timestamps = true;

    public function user()
    {
        return $this->belongsTo('User');
    }

    public function guests()
    {
        return $this->hasMany('EventGuest');
    }
}
