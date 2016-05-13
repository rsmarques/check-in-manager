angular.module('checkInManager.controllers', [])

    .controller('EventListController', function ($rootScope, $scope, $http, API_URL, Events) {

        $scope.events  = Events.query();
    })

    .controller('EventController', function ($rootScope, $scope, $http, $stateParams, API_URL, Events, EventGuests) {

        $scope.currentEvent = Events.get({eventSlug: $stateParams.eventId});
        $scope.guestsAll    = Events.query({eventSlug: $stateParams.eventId, data: 'guests'});
        $scope.guests       = $scope.guestsAll;

        $scope.checkInGuest = function(eventGuest) {

            EventGuests.checkIn({eventSlug: $stateParams.eventId, guestId: eventGuest.id, data: 'checkin'});

            // TODO check best way to change value
            angular.forEach($scope.guests, function (guest, key) {
                if (guest.id !== eventGuest.id) {
                    return;
                }

                $scope.guests[key].check_in = eventGuest.check_in ? 0 : 1;
            });
        }

        $scope.searchGuests = function (searchKey) {

            console.log("searching for " + searchKey);
            guests  = $scope.guestsAll;

            $scope.guests   = guests.filter(function (guest) {
                return guest.email.toLowerCase().indexOf(searchKey.toLowerCase()) > -1 ||
                    guest.name.toLowerCase().indexOf(searchKey.toLowerCase()) > -1 ||
                    guest.slug.toLowerCase().indexOf(searchKey.toLowerCase()) > -1;
            });
        }
    });