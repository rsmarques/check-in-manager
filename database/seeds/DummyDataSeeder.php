<?php

use Illuminate\Database\Seeder;

use App\Event;
use App\EventGuest;

use Carbon\Carbon;

class DummyDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $faker          = Faker\Factory::create();

        // Creating event/guest data
        foreach (range(11, 11) as $key => $value) {

            Log::info("DummyDataSeeder :: Creating Event #$value");

            $event              = new Event;
            $event->user_id     = 1;
            $event->date        = Carbon::now();
            $event->name        = "Event #$value";
            $event->slug        = "event-$value";
            $event->save();

            $guestCount         = 5000;


            foreach (range(1, $guestCount) as $key => $value) {
                $firstName          = $faker->firstName;
                $lastName           = $faker->lastName;

                $guest              = new EventGuest;
                $guest->event_id    = $event->id;
                $guest->slug        = "nb" . rand(10000, 20000);
                $guest->name        = "$firstName $lastName";
                $guest->email       = strtolower($firstName) . "." . strtolower($lastName) . "@novasbe.pt";
                $guest->check_in    = rand(0, 1);

                $guest->save();
            }
        }
    }
}
