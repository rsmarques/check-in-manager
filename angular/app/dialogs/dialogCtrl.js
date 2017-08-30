(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:DialogCtrl
     * @description
     * # DialogCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('DialogCtrl', function ($timeout, $q, $rootScope, $scope, $mdDialog, Guest, guests, currentEvent, currentGuests, currentGuest, Upload) {

        var self = this;

        $scope.allGuests        = guests;
        $scope.currentEvent     = currentEvent;
        $scope.currentGuest     = currentGuest;
        $scope.currentGuests    = currentGuests;
        $scope.checkInStatus    = null;

        $scope.searchGuests = function (searchKey)
        {
            if ($scope.allGuests === null || typeof $scope.allGuests === 'undefined') {
                return [];
            }

            // TODO put this to function
            var searchKeyNormalized = searchKey.replace(/[áàãâä]/gi,"a").replace(/[éè¨ê]/gi,"e").replace(/[íìïî]/gi,"i").replace(/[óòöôõ]/gi,"o").replace(/[úùüû]/gi, "u").replace(/[ç]/gi, "c").replace(/[ñ]/gi, "n");

            // console.log("searching guests with " + searchKeyNormalized);
            var guests              = $scope.allGuests.filter(function (guest) {

                // TODO put this to function
                var guestNameNormalized         = guest.name.replace(/[áàãâä]/gi,"a").replace(/[éè¨ê]/gi,"e").replace(/[íìïî]/gi,"i").replace(/[óòöôõ]/gi,"o").replace(/[úùüû]/gi, "u").replace(/[ç]/gi, "c").replace(/[ñ]/gi, "n");
                var guestShortNameNormalized    = guest.short_name.replace(/[áàãâä]/gi,"a").replace(/[éè¨ê]/gi,"e").replace(/[íìïî]/gi,"i").replace(/[óòöôõ]/gi,"o").replace(/[úùüû]/gi, "u").replace(/[ç]/gi, "c").replace(/[ñ]/gi, "n");


                return (guest.email && guest.email.toLowerCase().indexOf(searchKeyNormalized.toLowerCase()) > -1) ||
                    guestNameNormalized.toLowerCase().indexOf(searchKeyNormalized.toLowerCase()) > -1 ||
                    (guest.slug && guest.slug.toLowerCase().indexOf(searchKeyNormalized.toLowerCase()) > -1) ||
                    guestShortNameNormalized.toLowerCase().indexOf(searchKeyNormalized.toLowerCase()) > -1;
            });

            return guests.slice(0, 10);
        };

        $scope.selectedItemChange = function (item)
        {
            if ($scope.selectedItem === null || typeof $scope.selectedItem === "undefined") {
                return false;
            }

            // broadcasting event to eventController
            $rootScope.$broadcast('checkInEvent', {'event' : $scope.currentEvent, 'guest' : $scope.selectedItem});

            $scope.searchGuest      = null;
            $scope.checkInStatus    = $scope.selectedItem.short_name + ' added!';

            return true;
        };

        $scope.onFileChange     = function (file)
        {
            if (file) {
                $scope.file     = file;
            }

            Upload.upload({
                url: '/api/v1/guests/load',
                data: {file: $scope.file}
            }).then(function(res, status, headers, config) {
                // file is uploaded successfully
                $scope.loadedGuests = res.data.data;
            });
        };

        $scope.isGuestCheckedInStr  = function (item) {
            return currentGuests.find(function (guest) { return guest.slug == item.slug && guest.check_in; }) ? "(+) " : "";
        };

        self.uploadGuestCSV     = function ($event)
        {
            if (!$scope.loadedGuests || !$scope.file) {
                self.finish();
                return false;
            }

            Upload.upload({
                url: '/api/v1/guests/upload',
                data: {file: $scope.file}
            }).then(function(res, status, headers, config) {
                // TODO error treatment
            });

            self.finish();
        };

        self.finishEditUser = function ($event)
        {
            $rootScope.$broadcast('storeUser');
            self.finish();
        };

        self.finishEditGuest = function ($event)
        {
            $rootScope.$broadcast('storeGuest');
            self.finish();
        };

        self.finishEditEvent = function ($event)
        {
            $rootScope.$broadcast('storeEvent');
            self.finish();
        };

        self.cancel = function($event)
        {
            $mdDialog.cancel();
        };

        self.finish = function($event)
        {
            $mdDialog.hide();
        };
    });

})();
