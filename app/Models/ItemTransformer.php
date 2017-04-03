<?php

namespace App\Models;

use League\Fractal;

class ItemTransformer extends Fractal\TransformerAbstract
{
    public function transform($item)
    {
        return $item->name;
    }
}
