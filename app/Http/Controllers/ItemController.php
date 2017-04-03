<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Input;
use Carbon\Carbon;
use Validator;
use Log;
use DB;
use Exception;

// Fractal
use League\Fractal\Manager;
use League\Fractal\Resource\Collection;

// Models
use Item;

// Transformers
use ItemTransformer;

class ItemController extends ApiController
{
    public function index($type)
    {
        $items  = Item::where('type', $type)->get();

        return $this->respondWithCollection($items, new ItemTransformer);
    }

    public function updateAll($type)
    {
        $items      = array_unique(Input::get('items', []));

        $dbItems    = array_map(function ($item) use ($type) {
            return ['name' => $item, 'type' => $type, 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()];
        }, $items);

        Item::where('type', $type)->delete();
        Item::insert($dbItems);

        return $this->index($type);
    }
}
