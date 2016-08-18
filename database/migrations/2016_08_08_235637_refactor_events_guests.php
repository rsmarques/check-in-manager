<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class RefactorEventsGuests extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('guests', function (Blueprint $table) {
            $table->increments('id');
            $table->timestamps();
            $table->string('slug')->nullable();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->string('gender')->nullable();
            $table->string('degree')->nullable();
        });

        Schema::table('event_guests', function (Blueprint $table) {
            $table->dropColumn('slug');
            $table->dropColumn('email');
            $table->dropColumn('name');
            $table->integer('guest_id')->unsigned();
            $table->foreign('guest_id')->references('id')->on('guests');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->string('category')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('event_guests', function (Blueprint $table) {
            $table->dropForeign('event_guests_guest_id_foreign');
            $table->dropColumn('guest_id');
            $table->string('slug')->nullable();
            $table->string('email')->nullable();
            $table->string('name')->nullable();
        });

        Schema::drop('guests');

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
}
