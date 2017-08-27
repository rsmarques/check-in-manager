(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.service:StatsSrv
     * @description
     * # StatsSrv
     * Service of the checkInManager
     */
    angular.module('check_in_app.services').factory('Stats', function ($resource, API_URL) {
        return $resource(API_URL + "stats", {}, {
            global: {
                url: API_URL + "stats/global",
                method: 'GET',
                params: {
                    filters: '@filters',
                }
            },

            events: {
                url: API_URL + "stats/events",
                method: 'GET',
                params: {
                    filters: '@filters',
                }
            },

            csv: {
                url: API_URL + "stats/csv",
                method: 'GET',
                params: {
                    filters: '@filters',
                }
            },
        });
    });
})();
