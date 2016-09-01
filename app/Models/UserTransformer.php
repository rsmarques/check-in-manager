<?php

namespace App\Models;

use League\Fractal;

class UserTransformer extends Fractal\TransformerAbstract
{
    public function transform(User $user)
    {
        return [
            'id'                => $user->id,
            'created_at'        => $user->created_at,
            'updated_at'        => $user->updated_at,
            'slug'              => $user->slug,
            'email'             => $user->email,
            'admin'             => $user->admin,
        ];
    }
}
