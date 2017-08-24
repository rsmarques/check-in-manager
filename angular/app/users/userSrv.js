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
    })

    .service('DegreeSrv', function ($rootScope, Item) {

        this.getDegrees     = function () {
            var degrees     = Item.get({type: 'degrees'}, function (result) {
                if (typeof $rootScope.items === 'undefined') {
                    $rootScope.items = {};
                }

                $rootScope.items.degrees = {current: result.data};
            }, function (err) {
                // console.log(err);
            });
        };
    });
})();
