(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.service:UserSrv
     * @description
     * # UserSrv
     * Service of the checkInManager
     */
    angular.module('check_in_app.services').factory('User', function ($resource, API_URL) {
        return $resource(API_URL + "users/:id", {type: '@type'}, {

            getAll: {
                method: 'GET',
                params: {
                    type: '@type',
                    items: '@items',
                }
            },

            update: {
                method: 'GET',
                params: {
                    type: '@type',
                    items: '@items',
                }
            }
        });
    });
})();
