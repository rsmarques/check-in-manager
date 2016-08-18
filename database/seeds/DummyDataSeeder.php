<?php

use Illuminate\Database\Seeder;

use App\Event;
use App\EventGuest;
use App\Guest;

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
        $categories     = ['Breakfast w/CEO', 'Discovery Week', 'Corporate Events'];
        $degrees        = ['BSc Economics', 'BSc Management', 'MSc Economics', 'MSc Management'];
        $genders        = ['male', 'female'];

        foreach (range(10000, 20000) as $key => $value) {

            $gender             = $genders[array_rand($genders)];
            $firstName          = $faker->firstName($gender);
            $lastName           = $faker->lastName;

            $guest              = new Guest;
            $guest->slug        = "nb" . $value;
            $guest->name        = "$firstName $lastName";
            $guest->email       = strtolower($firstName) . "." . strtolower($lastName) . "@novasbe.pt";
            $guest->degree      = $degrees[array_rand($degrees)];
            $guest->gender      = strtoupper($gender[0]);

            $guest->save();
        }

        // Creating event/guest data
        foreach (range(1, 10) as $key => $value) {

            Log::info("DummyDataSeeder :: Creating Event #$value");

            $event              = new Event;
            $event->user_id     = 1;
            $event->date        = $faker->dateTimeThisYear;
            $event->name        = "Event #$value";
            $event->category    = $categories[array_rand($categories)];
            $event->slug        = $event->calcSlug();
            $event->save();

            $guestCount         = rand(5, 50);

            foreach (range(1, $guestCount) as $key => $value) {
                $firstName              = $faker->firstName;
                $lastName               = $faker->lastName;

                $eventGuest             = new EventGuest;
                $eventGuest->event_id   = $event->id;
                $eventGuest->guest_id   = Guest::orderByRaw('RAND()')->first()->id;
                $eventGuest->check_in   = rand(0, 1);

                $eventGuest->save();
            }
        }

        return true;
    }
}
