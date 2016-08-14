angular.module('checkInManager.controllers', [])

    .controller('EventListController', function ($rootScope, $scope, $http, $stateParams, $location, $mdDialog, $mdToast, API_URL, Events, Guests, GuestsService) {
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
            result          = $scope.eventsAll.find(function (event) {
                return event.slug == eventSlug;
            });

            return result;
        }

        $scope.setCurrentEvent  = function (event)
        {
            $scope.eventId              = event.id;
            // $scope.currentGuests        = [];
            $scope.currentEvent         = event;
            $scope.loadingGuests        = true;
            $scope.currentGuests        = [];
            // var e                       = Events.get({eventSlug: event.slug}, function (result) {
            //     $scope.currentEvent     = result;
            // });
            var g                       = Events.query({eventSlug: event.slug, data: 'guests'}, function (result) {

                $scope.loadingGuests    = false;
                $scope.currentGuests    = result;

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

            Guests.checkIn({eventSlug: event.slug, guestId: eventGuest.id, data: 'checkin'});

            var guestIndex  = $scope.currentGuests.map(function (g) {return g.id; }).indexOf(eventGuest.id);

            if (guestIndex !== -1) {
                // guest already on list, changing its value
                $scope.currentGuests[guestIndex].check_in = !$scope.currentGuests[guestIndex].check_in;
            } else {
                // new guest, adding him to array
                var guestData       = (JSON.parse(JSON.stringify(eventGuest)));
                guestData.check_in  = 1;
                $scope.currentGuests.unshift(guestData);
            }

            return true;
        }

        $scope.searchGuests = function (searchKey)
        {
            console.log("searching guests for " + searchKey);
            guests  = $scope.guests.filter(function (guest) {
                return guest.email.toLowerCase().indexOf(searchKey.toLowerCase()) > -1 ||
                    guest.name.toLowerCase().indexOf(searchKey.toLowerCase()) > -1 ||
                    guest.slug.toLowerCase().indexOf(searchKey.toLowerCase()) > -1;
            });

            return guests.slice(0, 3);
        }

        $scope.filterEvents = function (searchKey)
        {
            console.log("searching events for " + searchKey);
            $scope.events  = $scope.eventsAll.filter(function (event) {
                return event.name.toLowerCase().indexOf(searchKey.toLowerCase()) > -1 ||
                    event.category.toLowerCase().indexOf(searchKey.toLowerCase()) > -1;
            });

            return true;
        }

        $scope.filterGuests = function (searchKey)
        {
            console.log("searching events for " + searchKey);
            guests  = $scope.guests.filter(function (guest) {
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

        $scope.eventsAll    = Events.query(function (events) {

            // TODO improve this
            angular.forEach($scope.eventsAll, function (event, key) {
                $scope.eventsAll[key].date     = new Date($scope.eventsAll[key].date);
                $scope.eventsAll[key].time     = new Date($scope.eventsAll[key].date);

                $scope.eventsAll[key].dateFormatted    = moment($scope.eventsAll[key].date).format('YYYY-MM-DD HH:mm');
            });

            $scope.events   = $scope.eventsAll;

            $scope.checkCurrentEvent();
        });

        $scope.$watch(function() { return $location.search() }, function (params) {
            $scope.checkCurrentEvent();
        });

        $scope.showRemoveEvent = function (ev, event) {
            // Appending dialog to document.body to cover sidenav in docs app
            var confirm     = $mdDialog.confirm()
                .title('Are you sure you want to delete this event?')
                .textContent('This action cannot be undone.')
                .ariaLabel('Delete Event')
                .targetEvent(ev)
                .ok('Yes')
                .cancel('Undo');

            $mdDialog.show(confirm).then(function() {
                // var guestIndex  = $scope.guests.map(function (e) {return e.id; }).indexOf(guest.id);
                var eventIndex  = $scope.eventsAll.indexOf(event);

                if (eventIndex !== -1) {
                    $scope.eventsAll.splice(eventIndex, 1);

                    Events.delete({eventSlug: event.slug});

                    $scope.currentEvent     = null;
                    $scope.currentGuests    = null;
                    $scope.showEventDeleted();
                    $scope.status           = 'Event Deleted.';
                }

            }, function() {

            });
        }

        $scope.showEventDeleted = function() {
            console.log('showEventDeleted');
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Event Deleted!')
                    .position('top right')
                    .hideDelay(3000)
            );
        };

        $scope.guests           = GuestsService;
        $scope.loadingGuests    = false;
    })

    .controller('GuestController', function ($rootScope, $scope, $http, $stateParams, $location, $mdDialog, $mdToast, API_URL, Events, Guests, GuestsService) {

        $scope.openGuestEditDialog = function ($event, editMode, guest)
        {
            $scope.editMode             = editMode;
            if (typeof guest !== "undefined") {
                $scope.currentGuest     = guest;
            } else {
                $scope.currentGuest     = null;
            }

            $mdDialog.show({
                controller: GuestDialogController,
                controllerAs: 'ctrl',
                templateUrl: 'app/views/dialog_edit_guest.html',
                parent: angular.element(document.body),
                scope: $scope,
                preserveScope: true,
                targetEvent: $event,
                clickOutsideToClose:true
            });
        }

        $scope.showRemoveGuest = function (ev, guest) {
            // Appending dialog to document.body to cover sidenav in docs app
            var confirm     = $mdDialog.confirm()
                .title('Are you sure you want to delete this guest?')
                .textContent('This action cannot be undone.')
                .ariaLabel('Delete Guest')
                .targetEvent(ev)
                .ok('Yes')
                .cancel('Undo');

            $mdDialog.show(confirm).then(function() {
                // var guestIndex  = $scope.guests.map(function (e) {return e.id; }).indexOf(guest.id);
                var guestIndex  = $scope.guests.indexOf(guest);

                if (guestIndex !== -1) {
                    $scope.guests.splice(guestIndex, 1);

                    Guests.delete({guestId: guest.id});
                    $scope.currentGuest = null;
                    $scope.showGuestDeleted();
                    $scope.status       = 'Guest Deleted.';
                }

            }, function() {

            });
        };

        $scope.showGuestDeleted = function() {
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Guest Deleted!')
                    .position('top right')
                    .hideDelay(3000)
            );
        };

        $scope.guests   = GuestsService;
    });

    // TODO put this on a js file
    function GuestDialogController ($timeout, $q, $scope, $mdDialog, Events) {
        var self = this;

        self.cancel = function($event) {
            $mdDialog.cancel();
        };
        self.finish = function($event) {
            $mdDialog.hide();
            Events.store({event: $scope.currentEvent});
        };
    }
