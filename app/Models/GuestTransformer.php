<?php

namespace App\Models;

use League\Fractal;

class GuestTransformer extends Fractal\TransformerAbstract
{
    public function transform(Guest $guest)
    {
        return [
            'id'            => $guest->id,
            'created_at'    => $guest->created_at,
            'updated_at'    => $guest->updated_at,
            'slug'          => $guest->slug,
            'name'          => $guest->name,
            'email'         => $guest->email,
            'gender'        => $guest->gender,
            'course'        => $guest->getCourse(),
            'degree'        => $guest->degree,
            'st_number'     => $guest->st_number,
            'origin'        => $guest->origin,
            'phone_number'  => $guest->getPhoneNumber(),
            'short_name'    => $guest->getShortName(),
            'graduated'     => (int) $guest->graduated,
            'check_in'      => $guest->getCheckInData(),
        ];
    }
}
