angular.module('checkInManager.controllers', [])

    .controller('EventListController', function ($rootScope, $scope, $http, $stateParams, $location, $mdDialog, API_URL, Events, EventGuests) {

        // TODO change openDialogs location
        $scope.openGuestDialog = function ($event)
        {
            $mdDialog.show({
                controller: GuestDialogController,
                controllerAs: 'ctrl',
                templateUrl: 'app/views/dialog_guest_checkin.html',
                parent: angular.element(document.body),
                scope: $scope,
                preserveScope: true,
                targetEvent: $event,
                clickOutsideToClose:true
            });
        }

        $scope.openEventDialog = function ($event)
        {
            $mdDialog.show({
                controller: GuestDialogController,
                controllerAs: 'ctrl',
                templateUrl: 'app/views/dialog_edit_event.html',
                parent: angular.element(document.body),
                scope: $scope,
                preserveScope: true,
                targetEvent: $event,
                clickOutsideToClose:true
            });
        }

        $scope.selectEvent  = function (event)
        {
            console.log("EventListController :: Selecting Event " + event.slug);
            $location.search({'p' : event.slug});
        }

        $scope.findEvent    = function (eventSlug)
        {
            result          = $scope.events.find(function (event) {
                return event.slug == eventSlug;
            });

            return result;
        }

        $scope.setCurrentEvent  = function (event)
        {
            $scope.eventId              = event.id;
            $scope.guests               = [];
            $scope.currentEvent         = event;
            // var e                       = Events.get({eventSlug: event.slug}, function (result) {
            //     $scope.currentEvent     = result;
            // });
            var g                       = Events.query({eventSlug: event.slug, data: 'guests'},
                function (result) {

                $scope.guestsAll        = result;
                $scope.guests           = result;

            }, function (error) {
                // TODO error message
            });
        }

        $scope.checkCurrentEvent    = function ()
        {
            var params  = $location.search();

            if (typeof params.p !== "undefined") {
                var eventId = params.p;
                var event   = $scope.findEvent(eventId);

                if (typeof event !== "undefined") {
                    if ($scope.eventId !== event.id) {
                        $scope.setCurrentEvent(event);
                    }
                }
            } else {
                // TODO set first event as default
            }

            return true;
        }

        $scope.checkInGuest = function(event, eventGuest) {

            EventGuests.checkIn({eventSlug: event.slug, guestId: eventGuest.id, data: 'checkin'});

            // TODO check best way to change value
            angular.forEach($scope.guests, function (guest, key) {
                if (guest.id !== eventGuest.id) {
                    return;
                }

                $scope.guests[key].check_in = eventGuest.check_in ? 0 : 1;
            });

            return true;
        }

        $scope.searchGuests = function (searchKey)
        {
            console.log("searching for " + searchKey);
            guests  = $scope.guestsAll.filter(function (guest) {
                return guest.email.toLowerCase().indexOf(searchKey.toLowerCase()) > -1 ||
                    guest.name.toLowerCase().indexOf(searchKey.toLowerCase()) > -1 ||
                    guest.slug.toLowerCase().indexOf(searchKey.toLowerCase()) > -1;
            });

            return guests.slice(0, 3);
        }

        $scope.selectedItemChange = function (item)
        {
            if ($scope.selectedItem === null || typeof $scope.selectedItem === "undefined") {
                return false;
            }

            return $scope.checkInGuest($scope.currentEvent, $scope.selectedItem);
        }

        $scope.events       = Events.query(function (events) {
            // TODO improve this
            angular.forEach($scope.events, function (event, key) {
                $scope.events[key].date     = new Date($scope.events[key].date);
                $scope.events[key].time     = new Date($scope.events[key].date);
            });

            $scope.checkCurrentEvent();
        });

        $scope.$watch(function() { return $location.search() }, function (params) {
            $scope.checkCurrentEvent();
        });
    })

    // TODO put this on a js file
    function GuestDialogController ($timeout, $q, $scope, $mdDialog) {
        var self = this;

        self.cancel = function($event) {
          $mdDialog.cancel();
        };
        self.finish = function($event) {
          $mdDialog.hide();
          console.log($scope.currentEvent);
        };
    }
