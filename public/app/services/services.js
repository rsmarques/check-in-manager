angular.module('checkInManager.services', ['ngResource'])

    .factory('Events', function ($resource, API_URL) {
        return $resource(API_URL + "events/:eventSlug/:data");
    })

    .factory('EventGuests', function ($resource, API_URL) {
        return $resource(API_URL + "events/:eventSlug/guests/:guestId/:data", {}, {
            checkIn: {
                url: API_URL + "events/:eventSlug/guests/:guestId/:data",
                method: 'POST',
                params: {
                    eventSlug: '@eventSlug',
                    guestId: '@guestId',
                    data: '@data',
                }
            },
        });
    });