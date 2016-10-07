<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Config;

class Guest extends Model
{
    protected $table = 'guests';
    public $timestamps = true;

    public function event()
    {
        return $this->belongsTo('Event');
    }

    public function getPhoneNumber()
    {
        if (empty($this->phone_country)) {
            return null;
        }

        $countryCode    = Config::get("country_phones.$this->phone_country");

        return $countryCode && $this->phone_number ? ('+' . $countryCode . $this->phone_number) : null;
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
        return isset($this->pivot->check_in) ? ((int) $this->pivot->check_in) : null;
    }
}
