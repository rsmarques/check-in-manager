<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    protected $table = 'users';
    public $timestamps = true;
    protected $hidden = array('password');

    public function events()
    {
        return $this->hasMany('Event');
    }
}
