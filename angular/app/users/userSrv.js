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

            delete: {
                url: API_URL + "users/:userId/delete",
                method: 'POST',
                params: {
                    userId: '@userId',
                }
            },

            store: {
                url: API_URL + "users/store",
                method: 'POST',
                params: {
                    user: '@user',
                }
            },
        });
    });
})();
