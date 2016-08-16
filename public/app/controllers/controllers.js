angular.module('checkInManager.controllers', [])

    .controller('EventListController', function ($rootScope, $window, $scope, $http, $stateParams, $location, $mdDialog, $mdToast, API_URL, Events, Guests, GuestsService) {
        // TODO change openDialogs location
        $scope.openGuestDialog = function ($event)
        {
            $mdDialog.show({
                controller: DialogController,
                controllerAs: 'ctrl',
                templateUrl: 'app/views/dialog_guest_checkin.html',
                parent: angular.element(document.body),
                // scope: $scope,
                // preserveScope: true,
                locals: {
                    guests: $scope.guests,
                    currentEvent: $scope.currentEvent,
                    currentGuest: null,
                },
                targetEvent: $event,
                clickOutsideToClose:true
            });
        }

        $scope.openEventDialog = function ($event, newEvent)
        {
            if (newEvent) {
                $scope.currentEvent     = {};
                $scope.currentGuests    = [];
            }

            $mdDialog.show({
                controller: DialogController,
                controllerAs: 'ctrl',
                templateUrl: 'app/views/dialog_edit_event.html',
                locals: {
                    guests: null,
                    currentEvent: $scope.currentEvent,
                    currentGuest: null,
                },
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
            $scope.currentEvent         = event;
            $scope.loadingGuests        = true;
            $scope.currentGuests        = [];

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

        $scope.$on('checkInEvent', function(ev, data) {

            var event   = data.event;
            var guest   = data.guest;

            $scope.checkInGuest(event, guest);
        });

        $scope.checkInGuest = function(event, eventGuest) {
            // clearing search guests field
            Guests.checkIn({eventSlug: event.slug, guestId: eventGuest.id, data: 'checkin'});

            var guestIndex      = $scope.currentGuests.map(function (g) {return g.id; }).indexOf(eventGuest.id);

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

        $scope.events   = Events.query(function (events) {

            // TODO improve this
            angular.forEach($scope.events, function (event, key) {
                $scope.events[key].date     = new Date($scope.events[key].date);
                $scope.events[key].time     = new Date($scope.events[key].date);

                $scope.events[key].dateFormatted    = moment($scope.events[key].date).format('YYYY-MM-DD HH:mm');
            });

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
                var eventIndex  = $scope.events.indexOf(event);

                if (eventIndex !== -1) {
                    $scope.events.splice(eventIndex, 1);

                    Events.delete({eventSlug: event.slug});

                    $scope.currentEvent     = {};
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

        $scope.showRemoveGuest = function (ev, event, guest) {
            // Appending dialog to document.body to cover sidenav in docs app
            var confirm     = $mdDialog.confirm()
                .title('Are you sure you want to remove this guest?')
                .textContent('This action cannot be undone.')
                .ariaLabel('Remove Guest')
                .targetEvent(ev)
                .ok('Yes')
                .cancel('Undo');

            $mdDialog.show(confirm).then(function() {
                // var guestIndex  = $scope.guests.map(function (e) {return e.id; }).indexOf(guest.id);
                var guestIndex  = $scope.currentGuests.indexOf(guest);

                if (guestIndex !== -1) {
                    $scope.currentGuests.splice(guestIndex, 1);

                    Guests.remove({eventSlug: event.slug, guestId: guest.id, data: 'remove'});
                    $scope.currentGuest = null;
                    $scope.showGuestRemoved();
                    $scope.status       = 'Guest Removed.';
                }

            }, function() {

            });
        }

        $scope.showGuestRemoved = function() {
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Guest Removed!')
                    .position('top right')
                    .hideDelay(3000)
            );
        };

        $scope.$on('storeEvent', function (event) {

            console.log('storeEvent!!');

            Events.store({event: $scope.currentEvent}, function (result) {

                var event       = result;
                var eventIndex  = $scope.events.map(function (e) {return e.id; }).indexOf(event.id);

                if (eventIndex === -1) {
                    // guest not on list, creating entry
                    var eventData           = (JSON.parse(JSON.stringify(event)));
                    eventData.guest_count   = 0;
                    $scope.events.unshift(eventData);
                }

            }, function (err) {
                // TODO error treatment
                console.log("Error creating event!")
                console.log(err);
            });
        });

        $scope.$on('openEventDialog', function (event, data) {
            console.log("FROM BROADCASTING");
            $scope.openEventDialog(data.event, data.newEvent);
        });

        // $scope.eventGuestRepeaterStyle = {
        //     height: $scope.eventGuestRepeaterHeight + 'px'
        // };

        // $window.addEventListener('resize', onResize);

        // function onResize() {

        //     windowHeight        = $window.innerHeight;
        //     navBarHeight        = angular.element('#navbar')[0].offsetHeight;
        //     eventHeaderHeight   = angular.element('#eventHeader')[0].offsetHeight;

        //     $scope.eventGuestRepeaterHeight = windowHeight - navBarHeight - eventHeaderHeight - 1;

        //     console.log("SETTING HEIGHT " + $scope.eventGuestRepeaterHeight + "(" + windowHeight + ";" + navBarHeight+ ";" + eventHeaderHeight + ")");

        //     $scope.eventGuestRepeaterStyle.height = $scope.eventGuestRepeaterHeight + 'px';
        //     $scope.$digest();
        // }

        $scope.getEventGuestRepeaterHeight = function() {

            windowHeight        = $window.innerHeight;
            navBarHeight        = $('#navbar').outerHeight(true);
            eventHeaderHeight   = $('#eventHeader').outerHeight(true);

            listHeight          = windowHeight - navBarHeight - eventHeaderHeight - 10;

            return {height: '' + listHeight + 'px'};
        };

        $scope.getEventRepeaterHeight = function() {

            windowHeight            = $window.innerHeight;
            navBarHeight            = $('#navbar').outerHeight(true);
            eventSearchBarHeight    = $('#eventSearchBar').outerHeight(true);

            listHeight              = windowHeight - navBarHeight - eventSearchBarHeight - 10;

            return {height: '' + listHeight + 'px'};
        };

        $window.addEventListener('resize', onResize);

        function onResize() {
            $scope.$digest();
        }

        $scope.$on('$destroy', function() {
            $window.removeEventListener('resize', onResize);
        });

        $scope.guests           = GuestsService;
        $scope.loadingGuests    = false;
    })

    .controller('GuestController', function ($rootScope, $scope, $http, $stateParams, $location, $mdDialog, $mdToast, $window, API_URL, Events, Guests, GuestsService) {

        $scope.openGuestEditDialog = function ($event, editMode, guest)
        {
            $scope.editMode             = editMode;
            if (typeof guest !== "undefined") {
                $scope.currentGuest     = guest;
            } else {
                $scope.currentGuest     = {};
            }

            $mdDialog.show({
                controller: DialogController,
                controllerAs: 'ctrl',
                templateUrl: 'app/views/dialog_edit_guest.html',
                locals: {
                    guests: $scope.guests,
                    currentEvent: null,
                    currentGuest: $scope.currentGuest,
                },
                parent: angular.element(document.body),
                scope: $scope,
                preserveScope: true,
                targetEvent: $event,
                clickOutsideToClose:true
            });
        }

        $scope.showDeleteGuest = function (ev, guest) {
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
                    $scope.dialogStatus = 'Guest Deleted.';
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

        $scope.$on('storeGuest', function (event) {

            Guests.store({guest: $scope.currentGuest}, function (result) {

                var guest       = result;
                var guestIndex  = $scope.guests.map(function (g) {return g.id; }).indexOf(guest.id);

                if (guestIndex === -1) {
                    // guest not on list, creating entry
                    var guestData       = (JSON.parse(JSON.stringify(guest)));
                    $scope.guests.unshift(guestData);
                }

            }, function (err) {
                // TODO error treatment
                console.log("Error creating guest!")
                console.log(err);
            });
        });

        $scope.getGuestRepeaterHeight = function() {

            windowHeight            = $window.innerHeight;
            navBarHeight            = $('#navbar').outerHeight(true);
            guestListHeaderHeight   = $('#guestListHeader').outerHeight(true);
            guestTableHeaderHeight  = $('#guestTableHeader').outerHeight(true);

            listHeight              = windowHeight - navBarHeight - guestListHeaderHeight - guestTableHeaderHeight - 10;

            return {height: '' + listHeight + 'px'};
        };

        $window.addEventListener('resize', onResize);

        function onResize() {
            $scope.$digest();
        }

        $scope.$on('$destroy', function() {
            $window.removeEventListener('resize', onResize);
        });

        $scope.guests       = GuestsService;
    })

    .controller('NavBarController', function ($timeout, $q, $rootScope, $scope) {

    });

    // TODO put this on a js file
    function DialogController ($timeout, $q, $rootScope, $scope, $mdDialog, Events, guests, currentEvent, currentGuest) {
        var self = this;

        $scope.guests       = guests;
        $scope.currentEvent = currentEvent;
        $scope.currentGuest = currentGuest;

        $scope.searchGuests = function (searchKey)
        {
            console.log("searching guests with " + searchKey);
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

            // broadcasting event to eventController
            $rootScope.$broadcast('checkInEvent', {'event' : $scope.currentEvent, 'guest' : $scope.selectedItem});

            $scope.searchGuest  = null;

            return true;
        }

        self.finishEditGuest = function ($event) {
            $rootScope.$broadcast('storeGuest');
            self.finish();
        }

        self.finishEditEvent = function ($event) {
            $rootScope.$broadcast('storeEvent');
            self.finish();
        }

        self.cancel = function($event) {
            $mdDialog.cancel();
        };

        self.finish = function($event) {
            $mdDialog.hide();
        };
    }
