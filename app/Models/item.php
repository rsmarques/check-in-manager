<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    protected $table    = 'items';
    public $timestamps  = true;
    public $fillable    = ['name', 'type', 'created_at', 'updated_at'];
}
