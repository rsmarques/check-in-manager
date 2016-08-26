<?php

namespace App\Models;

use League\Fractal;

class EventTransformer extends Fractal\TransformerAbstract
{
    public function transform(Event $event)
    {
        return [
            'id'                => $event->id,
            'created_at'        => $event->created_at,
            'updated_at'        => $event->updated_at,
            // TODO filter by user
            // 'user_id'           => $event->user_id,
            'name'              => $event->name,
            'date'              => $event->date,
            'slug'              => $event->slug,
            'category'          => $event->category,
            'guest_count'       => $event->getGuestCount(),
            'date'              => $event->getDate(),
            'date_formatted'    => $event->getDateFormatted(),
        ];
    }
}
