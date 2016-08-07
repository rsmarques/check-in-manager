<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $table = 'events';
    public $timestamps = true;

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
        return $this->hasMany('App\EventGuest')->orderBy('slug', 'ASC');
    }
}
