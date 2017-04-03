(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.service:EventSrv
     * @description
     * # EventSrv
     * Service of the checkInManager
     */
    angular.module('check_in_app.services').factory('Event', function ($resource, API_URL) {
        return $resource(API_URL + "events/:eventSlug/:data", {}, {
            delete: {
                url: API_URL + "events/:eventSlug/delete",
                method: 'POST',
                params: {
                    eventSlug: '@eventSlug',
                    csv: '@csv',
                }
            },

            store: {
                url: API_URL + "events/store",
                method: 'POST',
                params: {
                    event: '@event',
                }
            },
        });
    });
})();
