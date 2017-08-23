(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:NavbarCtrl
     * @description
     * # NavbarCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('NavbarCtrl', function ($rootScope, $window, $scope, $http, $mdDialog, mdDialogSrv, Auth, Item, DegreeSrv, CategorySrv, IndustrySrv) {

        $scope.logout = function () {
            Auth.logout(function () {
                window.location = "/";
            });
        };

        $scope.openDegreesDialog = function (event)
        {
            mdDialogSrv.fromTemplate('./views/app/dialogs/edit_degrees.html', event, $scope);
        };

        $scope.openCategoriesDialog = function (event)
        {
            mdDialogSrv.fromTemplate('./views/app/dialogs/edit_categories.html', event, $scope);
        };

        $scope.openIndustriesDialog = function ($event)
        {
            mdDialogSrv.fromTemplate('./views/app/dialogs/edit_industries.html', event, $scope);
        };

        $scope.deleteItem   = function (type, index)
        {
            $scope.items[type].current.splice(index, 1);

            return true;
        };

        $scope.createItem   = function (type)
        {
            if (!$scope.items[type].new) return false;

            if (!$scope.items[type].current) {
                $scope.items[type].current   = [];
            }

            $scope.items[type].current.push($scope.items[type].new);
            $scope.items[type].new  = null;

            return true;
        };

        $scope.cancelEditMenu  = function ()
        {
            mdDialogSrv.cancel();
        };

        $scope.finishEditMenu  = function (type)
        {
            Item.updateAll({items: $scope.items[type].current, type: type}, function (res) {
                // Success message?
            });
            mdDialogSrv.hide();
        };

        DegreeSrv.getDegrees();
        CategorySrv.getCategories();
        IndustrySrv.getIndustries();
    });

})();
