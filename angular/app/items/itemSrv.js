(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.service:ItemSrv
     * @description
     * # ItemSrv
     * Service of the checkInManager
     */
    angular.module('check_in_app.services').factory('Item', function ($resource, API_URL) {
        return $resource(API_URL + "items/:type", {type: '@type'}, {

            updateAll: {
                method: 'POST',
                params: {
                    type: '@type',
                    items: '@items',
                }
            },
        });
    })

    .service('CategorySrv', function ($rootScope, Item) {

        this.getCategories  = function () {
            var categories  = Item.get({type: 'categories'}, function (result) {
                if (typeof $rootScope.items === 'undefined') {
                    $rootScope.items = {};
                }

                $rootScope.items.categories = {current: result.data};
            }, function (err) {
                // console.log(err);
            });
        };
    })

    .service('IndustrySrv', function ($rootScope, Item) {

        this.getIndustries  = function () {
            var industries  = Item.get({type: 'industries'}, function (result) {
                if (typeof $rootScope.items === 'undefined') {
                    $rootScope.items = {};
                }

                $rootScope.items.industries = {current: result.data};
            }, function (err) {
                // console.log(err);
            });
        };
    });
})();
