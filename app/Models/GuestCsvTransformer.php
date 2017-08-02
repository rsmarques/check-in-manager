<?php

namespace App\Models;

use League\Fractal;

class GuestCsvTransformer extends Fractal\TransformerAbstract
{
    public $includeCheckIn;

    public function __construct($includeCheckIn = true)
    {
        $this->includeCheckIn = $includeCheckIn;
    }

    public function transform(Guest $guest)
    {
        $data = [
            'id'            => $guest->slug,
            'name'          => $guest->name,
            'email'         => $guest->email,
            'gender'        => $guest->gender,
            'degree'        => $guest->degree,
            'st_number'     => $guest->st_number,
            'origin'        => $guest->origin,
            'phone_number'  => $guest->getPhoneNumber(),
            'graduated'     => (int) $guest->graduated,
        ];

        if ($this->includeCheckIn) {
            $data['check_in']   = $guest->getCheckInData();
        }

        return $data;
    }
}
