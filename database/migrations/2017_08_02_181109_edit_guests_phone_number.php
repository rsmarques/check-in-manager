<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class EditGuestsPhoneNumber extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // updating all previous records
        $guests = Guest::whereNotNull('phone_number')->get();

        foreach ($guests as $guest) {
            $guest->phone_number    = $guest->getPhoneNumber();
            $guest->save();
        }

        Schema::table('guests', function (Blueprint $table) {
            $table->dropColumn('phone_country');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->string('phone_country', 2)->nullable();
        });
    }
}
