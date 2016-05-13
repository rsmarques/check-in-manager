<?php

/*
|--------------------------------------------------------------------------
| Routes File
|--------------------------------------------------------------------------
|
| Here is where you will register all of the routes in an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the controller to call when that URI is requested.
|
*/

// API endpoints
Route::group(array('prefix' => 'api/v1'), function () {
    Route::get('events', 'EventController@userEvents');
    Route::get('events/{slug}', 'EventController@eventBySlug');
    Route::get('events/{slug}/guests', 'EventController@eventGuestsBySlug');
    Route::post('events/create', 'EventController@store');
    Route::post('events/{slug}/update', 'EventController@update');
    Route::post('events/{slug}/delete', 'EventController@destroy');
    Route::post('events/{slug}/guests/{guestId}/checkin', 'EventController@checkInGuest');
});

// Angular routes
// Route::any('{path?}', 'ViewController@home')->where("path", ".+");
Route::any('{path?}', 'ViewController@home')->where("path", "^(?!api/).+");

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| This route group applies the "web" middleware group to every route
| it contains. The "web" middleware group is defined in your HTTP
| kernel and includes session state, CSRF protection, and more.
|
*/

Route::group(['middleware' => ['web']], function () {
    //
});
