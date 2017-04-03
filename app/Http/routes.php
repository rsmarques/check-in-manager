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

    // authentication endpoints
    Route::post('/users/signin', array('uses' => 'UserController@signIn'));
    Route::post('/users/signup', array('uses' => 'UserController@signUp'));

    Route::group(array('middleware' => ['jwt.auth']), function () {

        // User endpoints
        Route::get('/me', 'UserController@me');

        // guest endpoints
        Route::get('guests', 'GuestController@userGuests');
        Route::post('guests/store', 'GuestController@store');
        Route::post('guests/{id}/delete', 'GuestController@delete');
        Route::post('events/{slug}/guests/{guestId}/checkin', 'GuestController@eventGuestCheckIn');
        Route::post('events/{slug}/guests/{guestId}/remove', 'GuestController@eventGuestRemove');

        // event endpoints
        Route::get('events', 'EventController@userEvents');
        Route::get('events/{slug}', 'EventController@eventBySlug');
        Route::get('events/{slug}/guests', 'EventController@eventGuestsBySlug');
        Route::post('events/store', 'EventController@store');
        Route::post('events/{slug}/delete', 'EventController@delete');

        // stats endpoints
        Route::get('/stats/global', array('uses' => 'StatsController@globalStats'));
        Route::get('/stats/events', array('uses' => 'StatsController@eventStats'));
        Route::get('/stats/events/{slug}', array('uses' => 'StatsController@eventStatsBySlug'));

        // items endpoints
        Route::get('/items/{type}', array('uses' => 'ItemController@index'));
        Route::post('/items/{type}', array('uses' => 'ItemController@updateAll'));
    });
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
