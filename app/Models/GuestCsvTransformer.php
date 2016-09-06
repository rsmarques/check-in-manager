<?php

namespace App\Models;

use League\Fractal;

class GuestCsvTransformer extends Fractal\TransformerAbstract
{
    public function transform(Guest $guest)
    {
        return [
            'id'            => $guest->slug,
            'name'          => $guest->name,
            'email'         => $guest->email,
            'gender'        => $guest->gender,
            'degree'        => $guest->degree,
            'st_number'     => $guest->st_number,
            'origin'        => $guest->origin,
            'check_in'      => $guest->getCheckInData(),
        ];
    }
}
