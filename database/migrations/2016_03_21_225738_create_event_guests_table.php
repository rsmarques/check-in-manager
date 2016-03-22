<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;

class CreateEventGuestsTable extends Migration
{
    public function up()
    {
        Schema::create('event_guests', function (Blueprint $table) {
            $table->increments('id');
            $table->timestamps();
            $table->integer('event_id')->unsigned();
            $table->string('slug')->nullable();
            $table->string('email')->nullable();
            $table->string('name')->nullable();
            $table->boolean('check_in')->default(0);
        });
    }

    public function down()
    {
        Schema::drop('event_guests');
    }
}
