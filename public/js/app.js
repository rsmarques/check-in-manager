
    DialogController.$inject = ["$timeout", "$q", "$rootScope", "$scope", "$mdDialog", "Events", "guests", "currentEvent", "currentGuest"];(function(){
    "use strict";

    var app = angular.module('check_in_app', [
        'check_in_app.controllers',
        'check_in_app.services',
        'check_in_app.routes',
        'check_in_app.config'
    ]);


    angular.module('check_in_app.routes', ['ui.router', 'ngStorage']);
    angular.module('check_in_app.controllers', ['ui.router', 'ngMaterial', 'ngMessages', 'ngStorage', 'mdPickers']);
    angular.module('check_in_app.services', []);
    angular.module('check_in_app.config', ['ngMaterial']);

})();

(function(){
    "use strict";

    angular.module('check_in_app.config').constant('API_URL', 'api/v1/')

    .config(["$mdIconProvider", function($mdIconProvider) {
        $mdIconProvider.fontSet('md', 'material-icons');
    }])

    .config(["$mdThemingProvider", function($mdThemingProvider) {
        $mdThemingProvider.theme('dark-grey').backgroundPalette('grey').dark();
        $mdThemingProvider.theme('dark-orange').backgroundPalette('orange').dark();
        $mdThemingProvider.theme('dark-purple').backgroundPalette('deep-purple').dark();
        $mdThemingProvider.theme('dark-blue').backgroundPalette('blue').dark();
    }])

    // TODO temp solution, remove this from here
    .run(["$rootScope", function ($rootScope) {

        $rootScope.hasAdminAccess   = function () {
            return $rootScope.authUser ? $rootScope.authUser.admin : 0;
        };
    }]);

})();
(function(){
    "use strict";

    angular.module('check_in_app.routes').config(["$stateProvider", "$urlRouterProvider", "$httpProvider", "$locationProvider", function ($stateProvider, $urlRouterProvider, $httpProvider, $locationProvider) {

        // preventing "!"" from appearing in url
        $locationProvider.hashPrefix('');

        $stateProvider
            .state('signup', {
                url: '/signup',
                templateUrl: './views/app/views/login.html',
                controller: 'HomeController',
                register: 1
            })
            .state('signin', {
                url: '/signin',
                templateUrl: './views/app/views/login.html',
                controller: 'HomeController',
                register: 0
            })
            .state('guests', {
                url: '/guests',
                templateUrl: './views/app/views/guests.html',
                controller: 'GuestController'
            })
            .state('events', {
                url: '/events',
                templateUrl: './views/app/views/events.html',
                controller: 'EventListController'
            });

        $urlRouterProvider.otherwise('/events');

        $httpProvider.interceptors.push(['$q', '$location', '$localStorage', function ($q, $location, $localStorage) {
            return {
                'request': function (config) {
                    config.headers = config.headers || {};
                    if ($localStorage.token) {
                        config.headers.Authorization = 'Bearer ' + $localStorage.token;
                    }
                    return config;
                },
                'responseError': function (response) {
                    if (response.status === 400 || response.status === 401 || response.status === 403) {
                        $location.path('/signin');
                    }
                    return $q.reject(response);
                }
            };
        }]);
    }]);
})();
angular.module('check_in_app.controllers', [])

   .controller('HomeController', ["$rootScope", "$scope", "$state", "$location", "$localStorage", "Auth", "GuestsService", "UsersService", function ($rootScope, $scope, $state, $location, $localStorage, Auth, GuestsService, UsersService) {

        function successAuth (res) {
            $localStorage.token = res.token;
            window.location = "#/events";

            // TODO remove this from here
            // reload guests after successful login
            GuestsService.getGuests();
            UsersService.getCurrentUser();
        }

        $scope.performLogin = function () {
            if ($scope.register) {
                return $scope.signup();
            } else {
                return $scope.signin();
            }
        };

        $scope.signin = function () {
            var formData = {
                email: $scope.credentials.email,
                password: $scope.credentials.password
            };

            $rootScope.error    = null;

            Auth.signin(formData, successAuth, function () {
                $rootScope.error = 'Invalid email/password.';
            });
        };

        $scope.signup = function () {
            var formData = {
                email: $scope.credentials.email,
                password: $scope.credentials.password
            };

            $rootScope.error            = null;

            Auth.signup(formData, successAuth, function (err) {
                if (err.errors && err.errors[0]) {
                    $rootScope.error    = err.errors[0];
                } else {
                    $rootScope.error    = 'Failed to signup';
                }
            });
        };

        $scope.logout = function () {
            Auth.logout(function () {
                window.location = "/";
            });
        };

         $scope.$on('$stateChangeSuccess', function () {
            $scope.register     = $state.current.register;
            $scope.loginText    = $scope.register ? 'Register' : 'Login';
            $rootScope.error    = null;
         });

        $scope.token         = $localStorage.token;
        $scope.tokenClaims   = Auth.getTokenClaims();
    }])

    .controller('EventListController', ["$rootScope", "$window", "$scope", "$http", "$stateParams", "$location", "$mdDialog", "$mdMedia", "$mdToast", "API_URL", "Events", "Guests", "GuestsService", "UsersService", function ($rootScope, $window, $scope, $http, $stateParams, $location, $mdDialog, $mdMedia, $mdToast, API_URL, Events, Guests, GuestsService, UsersService) {
        // TODO change openDialogs location
        $scope.openGuestDialog = function ($event)
        {
            $scope.checkInStatus    = null;

            $mdDialog.show({
                controller: DialogController,
                controllerAs: 'ctrl',
                templateUrl: './views/app/views/dialog_guest_checkin.html',
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
        };

        $scope.openEventDialog = function ($event, newEvent)
        {
            if (newEvent) {
                $scope.uncheckCurrentEvent();
            }

            $mdDialog.show({
                controller: DialogController,
                controllerAs: 'ctrl',
                templateUrl: './views/app/views/dialog_edit_event.html',
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
        };

        $scope.openEventMenu = function ($mdOpenMenu, ev) {
            originatorEv = ev;
            $mdOpenMenu(ev);
        };

        $scope.selectEvent  = function (event)
        {
            // console.log("EventListController :: Selecting Event " + event.slug);
            $location.search({'p' : event.slug});
        };

        $scope.findEvent    = function (eventSlug)
        {
            if (!$scope.events) {
                return false;
            }

            result          = $scope.events.find(function (event) {
                return event.slug == eventSlug;
            });

            return result;
        };

        $scope.setCurrentEvent  = function (event)
        {
            $scope.eventId              = event.id;
            $scope.currentEvent         = event;
            $scope.loadingGuests        = true;
            $scope.currentGuests        = [];

            var g                       = Events.get({eventSlug: event.slug, data: 'guests'}, function (result) {

                $scope.loadingGuests    = false;
                $scope.currentGuests    = result.data;

            }, function (error) {
                // TODO error message
            });
        };

        $scope.uncheckCurrentEvent  = function ()
        {
            $scope.eventId              = null;
            $scope.currentEvent         = 0;
            $scope.loadingGuests        = false;
            $scope.currentGuests        = [];

            $location.search({});
        };

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
        };

        $scope.sortEvents   = function (sort, reverse)
        {
            $scope.sortEvent        = sort;
            $scope.sortEventReverse = reverse;
        };

        $scope.checkInGuest = function(event, eventGuest)
        {

            Guests.checkIn({eventSlug: event.slug, guestId: eventGuest.id, data: 'checkin'}, function (result) {

                $scope.currentEvent.guest_count = $scope.currentGuests.length;

            }, function (err) {

            });

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

            // forcing window resize to update virtual repeater
            angular.element(window).triggerHandler('resize');

            return true;
        };

        $scope.showRemoveEvent = function (ev, event)
        {
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
        };

        $scope.showEventDeleted = function()
        {
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Event Deleted!')
                    .position('top right')
                    .hideDelay(3000)
            );
        };

        $scope.showRemoveGuest = function (ev, event, guest)
        {
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

                    Guests.remove({eventSlug: event.slug, guestId: guest.id, data: 'remove'}, function (result) {
                        $scope.currentEvent.guest_count = $scope.currentGuests.length;
                    }, function (err) {

                    });

                    $scope.currentGuests.splice(guestIndex, 1);
                    $scope.currentGuest = null;
                    $scope.showGuestRemoved();
                    $scope.status       = 'Guest Removed.';
                }

            }, function() {

            });
        };

        $scope.showGuestRemoved = function()
        {
            $mdToast.show(
                $mdToast.simple()
                    .textContent('Guest Removed!')
                    .position('top right')
                    .hideDelay(3000)
            );
        };

        $scope.getEventGuestRepeaterHeight = function()
        {

            windowHeight        = $window.innerHeight;
            navBarHeight        = $('#navbar').outerHeight(true);
            eventHeaderHeight   = $('#eventHeader').outerHeight(true);

            listHeight          = windowHeight - navBarHeight - eventHeaderHeight - 10;

            return {height: '' + listHeight + 'px'};
        };

        $scope.getEventRepeaterHeight = function ()
        {

            windowHeight            = $window.innerHeight;
            navBarHeight            = $('#navbar').outerHeight(true);
            eventSearchBarHeight    = $('#eventSearchBar').outerHeight(true);

            listHeight              = windowHeight - navBarHeight - eventSearchBarHeight - 10;

            return {height: '' + listHeight + 'px'};
        };

        $scope.showEventListMobile = function ()
        {
            return !$scope.currentEvent || $mdMedia('gt-sm');
        };

        $scope.showGuestListMobile = function ()
        {
            return $scope.currentEvent || $mdMedia('gt-sm');
        };

        $scope.eventSortComparator = function (event)
        {
            switch ($scope.sortEvent) {
                case 'date':
                    return event.date;

                case 'name':
                    return event.name;

                default:
                    // upcoming / past sort
                    return event.upcoming_index >= 0 ? event.upcoming_index : (-1) * event.upcoming_index + $scope.events.length;
            }
        };

        $scope.downloadGuestsCsv = function (event)
        {
            Events.get({eventSlug: event.slug, data: 'guests', csv: 1}, function (result) {

                var file = new Blob([ result.data ], {
                    type : 'application/csv'
                });

                //trick to download store a file having its URL
                var fileURL     = URL.createObjectURL(file);
                var a           = document.createElement('a');
                a.href          = fileURL;
                a.target        = '_blank';
                a.download      = event.slug +'_guests.csv';
                document.body.appendChild(a);
                a.click();

            }, function (error) {
                // TODO error message
            });
        };

        $window.addEventListener('resize', onResize);

        function onResize()
        {
            $scope.$digest();
        }

        $scope.$on('storeEvent', function (event) {

            if (typeof $scope.currentEvent.time !== "undefined" && typeof $scope.currentEvent.date !== "undefined") {
                $scope.currentEvent.date.setHours($scope.currentEvent.time.getHours());
                $scope.currentEvent.date.setMinutes($scope.currentEvent.time.getMinutes());
            }

            $scope.currentEvent.date_formatted  = moment($scope.currentEvent.date).format('DD/MM/YY HH:mm');

            Events.store({event: $scope.currentEvent}, function (result) {

                var event           = result.data;
                var eventIndex      = $scope.events.map(function (e) {return e.id; }).indexOf(event.id);

                if (eventIndex === -1) {
                    // event not on list, creating entry
                    var eventData           = (JSON.parse(JSON.stringify(event)));
                    $scope.events.unshift(eventData);
                    $scope.currentEvent     = eventData;
                }

            }, function (err) {
                // TODO error treatment
                // console.log("Error creating event!")
                // console.log(err);
            });
        });

        $scope.$on('checkInEvent', function(ev, data) {

            var event   = data.event;
            var guest   = data.guest;

            $scope.checkInGuest(event, guest);
        });

        $scope.$watch(function() { return $location.search(); }, function (params) {
            $scope.checkCurrentEvent();
        });

        $scope.$on('$destroy', function() {
            $window.removeEventListener('resize', onResize);
        });

        $scope.$on('openEventDialog', function (event, data) {
            $scope.openEventDialog(data.event, data.newEvent);
        });

        Events.get(function (result) {

            $scope.events   = result.data;

            // TODO improve this
            angular.forEach($scope.events, function (event, key) {

                date                        = moment($scope.events[key].date.date);
                $scope.events[key].date     = new Date(date);
                $scope.events[key].time     = new Date(date);
            });

            $scope.checkCurrentEvent();
        });

        $scope.loadingGuests    = false;
        $scope.sortEvent        = 'upcoming';
    }])

    .controller('GuestController', ["$rootScope", "$scope", "$http", "$stateParams", "$location", "$mdDialog", "$mdToast", "$window", "API_URL", "Events", "Guests", "GuestsService", "UsersService", function ($rootScope, $scope, $http, $stateParams, $location, $mdDialog, $mdToast, $window, API_URL, Events, Guests, GuestsService, UsersService) {

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
                templateUrl: './views/app/views/dialog_edit_guest.html',
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
        };

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

        $scope.getGuestRepeaterHeight = function() {

            windowHeight            = $window.innerHeight;
            navBarHeight            = $('#navbar').outerHeight(true);
            guestListHeaderHeight   = $('#guestListHeader').outerHeight(true);
            guestTableHeaderHeight  = $('#guestTableHeader').outerHeight(true);

            listHeight              = windowHeight - navBarHeight - guestListHeaderHeight - guestTableHeaderHeight - 10;

            return {height: '' + listHeight + 'px'};
        };

        $scope.sortGuests   = function (sort)
        {
            if (sort === $scope.sortGuest) {
                $scope.sortGuestReverse     = !$scope.sortGuestReverse;
                $scope.sortGuest            = $scope.sortGuestReverse === false ? null : $scope.sortGuest;
            } else {
                $scope.sortGuest            = sort;
                $scope.sortGuestReverse     = false;
            }

            $scope.sortIcon                 = $scope.sortGuestReverse ? 'arrow_drop_down' : 'arrow_drop_up';

            return true;
        };

        $window.addEventListener('resize', onResize);

        function onResize() {
            $scope.$digest();
        }

        $scope.$on('storeGuest', function (event) {

            Guests.store({guest: $scope.currentGuest}, function (result) {

                var guest       = result.data;
                var guestIndex  = $scope.guests.map(function (g) {return g.id; }).indexOf(guest.id);

                if (guestIndex === -1) {
                    // guest not on list, creating entry
                    var guestData       = (JSON.parse(JSON.stringify(guest)));
                    $scope.guests.unshift(guestData);
                }

            }, function (err) {
                // TODO error treatment
                // console.log("Error creating guest!")
                // console.log(err);
            });
        });

        $scope.$on('$destroy', function() {
            $window.removeEventListener('resize', onResize);
        });
    }])

    .controller('NavBarController', ["$timeout", "$q", "$rootScope", "$scope", function ($timeout, $q, $rootScope, $scope) {

    }]);

    // TODO put this on a js file
    function DialogController ($timeout, $q, $rootScope, $scope, $mdDialog, Events, guests, currentEvent, currentGuest) {
        var self = this;

        $scope.allGuests        = guests;
        $scope.currentEvent     = currentEvent;
        $scope.currentGuest     = currentGuest;
        $scope.checkInStatus    = null;

        $scope.searchGuests = function (searchKey)
        {
            if ($scope.allGuests === null || typeof $scope.allGuests === 'undefined') {
                return [];
            }

            // TODO put this to function
            searchKeyNormalized = searchKey.replace(/[áàãâä]/gi,"a").replace(/[éè¨ê]/gi,"e").replace(/[íìïî]/gi,"i").replace(/[óòöôõ]/gi,"o").replace(/[úùüû]/gi, "u").replace(/[ç]/gi, "c").replace(/[ñ]/gi, "n");

            // console.log("searching guests with " + searchKeyNormalized);
            guests              = $scope.allGuests.filter(function (guest) {

                // TODO put this to function
                guestNameNormalized         = guest.name.replace(/[áàãâä]/gi,"a").replace(/[éè¨ê]/gi,"e").replace(/[íìïî]/gi,"i").replace(/[óòöôõ]/gi,"o").replace(/[úùüû]/gi, "u").replace(/[ç]/gi, "c").replace(/[ñ]/gi, "n");
                guestShortNameNormalized    = guest.short_name.replace(/[áàãâä]/gi,"a").replace(/[éè¨ê]/gi,"e").replace(/[íìïî]/gi,"i").replace(/[óòöôõ]/gi,"o").replace(/[úùüû]/gi, "u").replace(/[ç]/gi, "c").replace(/[ñ]/gi, "n");


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

        self.finishEditGuest = function ($event) {
            $rootScope.$broadcast('storeGuest');
            self.finish();
        };

        self.finishEditEvent = function ($event) {
            $rootScope.$broadcast('storeEvent');
            self.finish();
        };

        self.cancel = function($event) {
            $mdDialog.cancel();
        };

        self.finish = function($event) {
            $mdDialog.hide();
        };
    }

angular.module('check_in_app.services', ['ngResource'])

    .factory('Auth', ["$http", "$localStorage", "API_URL", function ($http, $localStorage, API_URL) {
        function urlBase64Decode(str) {
            var output = str.replace('-', '+').replace('_', '/');
            switch (output.length % 4) {
                case 0:
                    break;
                case 2:
                    output += '==';
                    break;
                case 3:
                    output += '=';
                    break;
                default:
                    throw 'Illegal base64url string!';
            }
            return window.atob(output);
        }

        function getClaimsFromToken() {
            var token = $localStorage.token;
            var user = {};
            if (typeof token !== 'undefined') {
                var encoded = token.split('.')[1];
                user = JSON.parse(urlBase64Decode(encoded));
            }
            return user;
        }

        var tokenClaims = getClaimsFromToken();

        return {
            signup: function (data, success, error) {
                $http.post(API_URL + 'users/signup', data).success(success).error(error);
            },
            signin: function (data, success, error) {
                $http.post(API_URL + 'users/signin', data).success(success).error(error);
            },
            logout: function (success) {
                tokenClaims = {};
                delete $localStorage.token;
                success();
            },
            getTokenClaims: function () {
                return tokenClaims;
            }
        };
    }])

    .factory('Events', ["$resource", "API_URL", function ($resource, API_URL) {
        return $resource(API_URL + "events/:eventSlug/:data", {}, {
            delete: {
                url: API_URL + "events/:eventSlug/delete",
                method: 'POST',
                params: {
                    eventSlug: '@eventSlug',
                    csv: '@csv',
                }
            },

            store: {
                url: API_URL + "events/store",
                method: 'POST',
                params: {
                    event: '@event',
                }
            },
        });
    }])

    .factory('Guests', ["$resource", "API_URL", function ($resource, API_URL) {
        return $resource(API_URL + "guests", {}, {
            checkIn: {
                url: API_URL + "events/:eventSlug/guests/:guestId/:data",
                method: 'POST',
                params: {
                    eventSlug: '@eventSlug',
                    guestId: '@guestId',
                    data: '@data',
                }
            },

            remove: {
                url: API_URL + "events/:eventSlug/guests/:guestId/:data",
                method: 'POST',
                params: {
                    eventSlug: '@eventSlug',
                    guestId: '@guestId',
                    data: '@data',
                }
            },

            delete: {
                url: API_URL + "guests/:guestId/delete",
                method: 'POST',
                params: {
                    guestId: '@guestId',
                }
            },

            store: {
                url: API_URL + "guests/store",
                method: 'POST',
                params: {
                    guest: '@guest',
                }
            },
        });
    }])

    .factory('Users', ["$resource", "API_URL", function ($resource, API_URL) {
        return $resource(API_URL + "me", {}, {
            me: {
                url: API_URL + "me",
                method: 'GET'
            },
        });
    }])

    .service('GuestsService', ["$rootScope", "Guests", function ($rootScope, Guests) {

        this.getGuests  = function () {
            var guests  = Guests.get(function (result) {
                // TODO improve this
                $rootScope.guests   = result.data;

            }, function (err) {
                // console.log("GuestsService :: Error getting guests!");
                // console.log(err);
            });
        };

        this.getGuests();
    }])

    .service('UsersService', ["$rootScope", "Users", function ($rootScope, Users) {

        this.getCurrentUser = function () {
            var user    = Users.me(function (result) {
                // TODO improve this
                $rootScope.authUser = result.data;

            }, function (err) {
                // console.log("GuestsService :: Error getting guests!");
                // console.log(err);
            });
        };

        this.getCurrentUser();
    }]);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbmZpZy5qcyIsInJvdXRlcy5qcyIsImFwcC9jb250cm9sbGVycy9jb250cm9sbGVycy5qcyIsImFwcC9zZXJ2aWNlcy9zZXJ2aWNlcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzJJQUFBLENBQUEsVUFBQTtJQUNBOztJQUVBLElBQUEsTUFBQSxRQUFBLE9BQUEsZ0JBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7OztJQUlBLFFBQUEsT0FBQSx1QkFBQSxDQUFBLGFBQUE7SUFDQSxRQUFBLE9BQUEsNEJBQUEsQ0FBQSxhQUFBLGNBQUEsY0FBQSxhQUFBO0lBQ0EsUUFBQSxPQUFBLHlCQUFBO0lBQ0EsUUFBQSxPQUFBLHVCQUFBLENBQUE7Ozs7QUNkQSxDQUFBLFVBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsdUJBQUEsU0FBQSxXQUFBOztLQUVBLDJCQUFBLFNBQUEsaUJBQUE7UUFDQSxnQkFBQSxRQUFBLE1BQUE7OztLQUdBLDhCQUFBLFNBQUEsb0JBQUE7UUFDQSxtQkFBQSxNQUFBLGFBQUEsa0JBQUEsUUFBQTtRQUNBLG1CQUFBLE1BQUEsZUFBQSxrQkFBQSxVQUFBO1FBQ0EsbUJBQUEsTUFBQSxlQUFBLGtCQUFBLGVBQUE7UUFDQSxtQkFBQSxNQUFBLGFBQUEsa0JBQUEsUUFBQTs7OztLQUlBLG1CQUFBLFVBQUEsWUFBQTs7UUFFQSxXQUFBLG1CQUFBLFlBQUE7WUFDQSxPQUFBLFdBQUEsV0FBQSxXQUFBLFNBQUEsUUFBQTs7Ozs7QUNwQkEsQ0FBQSxVQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLHVCQUFBLHNGQUFBLFVBQUEsZ0JBQUEsb0JBQUEsZUFBQSxtQkFBQTs7O1FBR0Esa0JBQUEsV0FBQTs7UUFFQTthQUNBLE1BQUEsVUFBQTtnQkFDQSxLQUFBO2dCQUNBLGFBQUE7Z0JBQ0EsWUFBQTtnQkFDQSxVQUFBOzthQUVBLE1BQUEsVUFBQTtnQkFDQSxLQUFBO2dCQUNBLGFBQUE7Z0JBQ0EsWUFBQTtnQkFDQSxVQUFBOzth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QUFBOzs7UUFHQSxPQUFBLGVBQUEsVUFBQTtRQUNBOztZQUVBLFVBQUEsT0FBQSxDQUFBLE1BQUEsTUFBQTs7O1FBR0EsT0FBQSxlQUFBLFVBQUE7UUFDQTtZQUNBLElBQUEsQ0FBQSxPQUFBLFFBQUE7Z0JBQ0EsT0FBQTs7O1lBR0Esa0JBQUEsT0FBQSxPQUFBLEtBQUEsVUFBQSxPQUFBO2dCQUNBLE9BQUEsTUFBQSxRQUFBOzs7WUFHQSxPQUFBOzs7UUFHQSxPQUFBLG1CQUFBLFVBQUE7UUFDQTtZQUNBLE9BQUEsdUJBQUEsTUFBQTtZQUNBLE9BQUEsdUJBQUE7WUFDQSxPQUFBLHVCQUFBO1lBQ0EsT0FBQSx1QkFBQTs7WUFFQSxJQUFBLDBCQUFBLE9BQUEsSUFBQSxDQUFBLFdBQUEsTUFBQSxNQUFBLE1BQUEsV0FBQSxVQUFBLFFBQUE7O2dCQUVBLE9BQUEsbUJBQUE7Z0JBQ0EsT0FBQSxtQkFBQSxPQUFBOztlQUVBLFVBQUEsT0FBQTs7Ozs7UUFLQSxPQUFBLHVCQUFBO1FBQ0E7WUFDQSxPQUFBLHVCQUFBO1lBQ0EsT0FBQSx1QkFBQTtZQUNBLE9BQUEsdUJBQUE7WUFDQSxPQUFBLHVCQUFBOztZQUVBLFVBQUEsT0FBQTs7O1FBR0EsT0FBQSx1QkFBQTtRQUNBO1lBQ0EsSUFBQSxVQUFBLFVBQUE7O1lBRUEsSUFBQSxPQUFBLE9BQUEsTUFBQSxhQUFBO2dCQUNBLElBQUEsVUFBQSxPQUFBO2dCQUNBLElBQUEsVUFBQSxPQUFBLFVBQUE7O2dCQUVBLElBQUEsT0FBQSxVQUFBLGFBQUE7b0JBQ0EsSUFBQSxPQUFBLFlBQUEsTUFBQSxJQUFBO3dCQUNBLE9BQUEsZ0JBQUE7OzttQkFHQTs7OztZQUlBLE9BQUE7OztRQUdBLE9BQUEsZUFBQSxVQUFBLE1BQUE7UUFDQTtZQUNBLE9BQUEsbUJBQUE7WUFDQSxPQUFBLG1CQUFBOzs7UUFHQSxPQUFBLGVBQUEsU0FBQSxPQUFBO1FBQ0E7O1lBRUEsT0FBQSxRQUFBLENBQUEsV0FBQSxNQUFBLE1BQUEsU0FBQSxXQUFBLElBQUEsTUFBQSxZQUFBLFVBQUEsUUFBQTs7Z0JBRUEsT0FBQSxhQUFBLGNBQUEsT0FBQSxjQUFBOztlQUVBLFVBQUEsS0FBQTs7OztZQUlBLElBQUEsa0JBQUEsT0FBQSxjQUFBLElBQUEsVUFBQSxHQUFBLENBQUEsT0FBQSxFQUFBLE9BQUEsUUFBQSxXQUFBOztZQUVBLElBQUEsZUFBQSxDQUFBLEdBQUE7O2dCQUVBLE9BQUEsY0FBQSxZQUFBLFdBQUEsQ0FBQSxPQUFBLGNBQUEsWUFBQTttQkFDQTs7Z0JBRUEsSUFBQSxtQkFBQSxLQUFBLE1BQUEsS0FBQSxVQUFBO2dCQUNBLFVBQUEsWUFBQTtnQkFDQSxPQUFBLGNBQUEsUUFBQTs7OztZQUlBLFFBQUEsUUFBQSxRQUFBLGVBQUE7O1lBRUEsT0FBQTs7O1FBR0EsT0FBQSxrQkFBQSxVQUFBLElBQUE7UUFDQTs7WUFFQSxJQUFBLGNBQUEsVUFBQTtpQkFDQSxNQUFBO2lCQUNBLFlBQUE7aUJBQ0EsVUFBQTtpQkFDQSxZQUFBO2lCQUNBLEdBQUE7aUJBQ0EsT0FBQTs7WUFFQSxVQUFBLEtBQUEsU0FBQSxLQUFBLFdBQUE7O2dCQUVBLElBQUEsY0FBQSxPQUFBLE9BQUEsUUFBQTs7Z0JBRUEsSUFBQSxlQUFBLENBQUEsR0FBQTtvQkFDQSxPQUFBLE9BQUEsT0FBQSxZQUFBOztvQkFFQSxPQUFBLE9BQUEsQ0FBQSxXQUFBLE1BQUE7O29CQUVBLE9BQUEsbUJBQUE7b0JBQ0EsT0FBQSxtQkFBQTtvQkFDQSxPQUFBO29CQUNBLE9BQUEsbUJBQUE7OztlQUdBLFdBQUE7Ozs7O1FBS0EsT0FBQSxtQkFBQTtRQUNBO1lBQ0EsU0FBQTtnQkFDQSxTQUFBO3FCQUNBLFlBQUE7cUJBQ0EsU0FBQTtxQkFDQSxVQUFBOzs7O1FBSUEsT0FBQSxrQkFBQSxVQUFBLElBQUEsT0FBQTtRQUNBOztZQUVBLElBQUEsY0FBQSxVQUFBO2lCQUNBLE1BQUE7aUJBQ0EsWUFBQTtpQkFDQSxVQUFBO2lCQUNBLFlBQUE7aUJBQ0EsR0FBQTtpQkFDQSxPQUFBOztZQUVBLFVBQUEsS0FBQSxTQUFBLEtBQUEsV0FBQTs7Z0JBRUEsSUFBQSxjQUFBLE9BQUEsY0FBQSxRQUFBOztnQkFFQSxJQUFBLGVBQUEsQ0FBQSxHQUFBOztvQkFFQSxPQUFBLE9BQUEsQ0FBQSxXQUFBLE1BQUEsTUFBQSxTQUFBLE1BQUEsSUFBQSxNQUFBLFdBQUEsVUFBQSxRQUFBO3dCQUNBLE9BQUEsYUFBQSxjQUFBLE9BQUEsY0FBQTt1QkFDQSxVQUFBLEtBQUE7Ozs7b0JBSUEsT0FBQSxjQUFBLE9BQUEsWUFBQTtvQkFDQSxPQUFBLGVBQUE7b0JBQ0EsT0FBQTtvQkFDQSxPQUFBLGVBQUE7OztlQUdBLFdBQUE7Ozs7O1FBS0EsT0FBQSxtQkFBQTtRQUNBO1lBQ0EsU0FBQTtnQkFDQSxTQUFBO3FCQUNBLFlBQUE7cUJBQ0EsU0FBQTtxQkFDQSxVQUFBOzs7O1FBSUEsT0FBQSw4QkFBQTtRQUNBOztZQUVBLHNCQUFBLFFBQUE7WUFDQSxzQkFBQSxFQUFBLFdBQUEsWUFBQTtZQUNBLHNCQUFBLEVBQUEsZ0JBQUEsWUFBQTs7WUFFQSxzQkFBQSxlQUFBLGVBQUEsb0JBQUE7O1lBRUEsT0FBQSxDQUFBLFFBQUEsS0FBQSxhQUFBOzs7UUFHQSxPQUFBLHlCQUFBO1FBQ0E7O1lBRUEsMEJBQUEsUUFBQTtZQUNBLDBCQUFBLEVBQUEsV0FBQSxZQUFBO1lBQ0EsMEJBQUEsRUFBQSxtQkFBQSxZQUFBOztZQUVBLDBCQUFBLGVBQUEsZUFBQSx1QkFBQTs7WUFFQSxPQUFBLENBQUEsUUFBQSxLQUFBLGFBQUE7OztRQUdBLE9BQUEsc0JBQUE7UUFDQTtZQUNBLE9BQUEsQ0FBQSxPQUFBLGdCQUFBLFNBQUE7OztRQUdBLE9BQUEsc0JBQUE7UUFDQTtZQUNBLE9BQUEsT0FBQSxnQkFBQSxTQUFBOzs7UUFHQSxPQUFBLHNCQUFBLFVBQUE7UUFDQTtZQUNBLFFBQUEsT0FBQTtnQkFDQSxLQUFBO29CQUNBLE9BQUEsTUFBQTs7Z0JBRUEsS0FBQTtvQkFDQSxPQUFBLE1BQUE7O2dCQUVBOztvQkFFQSxPQUFBLE1BQUEsa0JBQUEsSUFBQSxNQUFBLGlCQUFBLENBQUEsQ0FBQSxLQUFBLE1BQUEsaUJBQUEsT0FBQSxPQUFBOzs7O1FBSUEsT0FBQSxvQkFBQSxVQUFBO1FBQ0E7WUFDQSxPQUFBLElBQUEsQ0FBQSxXQUFBLE1BQUEsTUFBQSxNQUFBLFVBQUEsS0FBQSxJQUFBLFVBQUEsUUFBQTs7Z0JBRUEsSUFBQSxPQUFBLElBQUEsS0FBQSxFQUFBLE9BQUEsUUFBQTtvQkFDQSxPQUFBOzs7O2dCQUlBLElBQUEsY0FBQSxJQUFBLGdCQUFBO2dCQUNBLElBQUEsY0FBQSxTQUFBLGNBQUE7Z0JBQ0EsRUFBQSxnQkFBQTtnQkFDQSxFQUFBLGdCQUFBO2dCQUNBLEVBQUEsZ0JBQUEsTUFBQSxNQUFBO2dCQUNBLFNBQUEsS0FBQSxZQUFBO2dCQUNBLEVBQUE7O2VBRUEsVUFBQSxPQUFBOzs7OztRQUtBLFFBQUEsaUJBQUEsVUFBQTs7UUFFQSxTQUFBO1FBQ0E7WUFDQSxPQUFBOzs7UUFHQSxPQUFBLElBQUEsY0FBQSxVQUFBLE9BQUE7O1lBRUEsSUFBQSxPQUFBLE9BQUEsYUFBQSxTQUFBLGVBQUEsT0FBQSxPQUFBLGFBQUEsU0FBQSxhQUFBO2dCQUNBLE9BQUEsYUFBQSxLQUFBLFNBQUEsT0FBQSxhQUFBLEtBQUE7Z0JBQ0EsT0FBQSxhQUFBLEtBQUEsV0FBQSxPQUFBLGFBQUEsS0FBQTs7O1lBR0EsT0FBQSxhQUFBLGtCQUFBLE9BQUEsT0FBQSxhQUFBLE1BQUEsT0FBQTs7WUFFQSxPQUFBLE1BQUEsQ0FBQSxPQUFBLE9BQUEsZUFBQSxVQUFBLFFBQUE7O2dCQUVBLElBQUEsa0JBQUEsT0FBQTtnQkFDQSxJQUFBLGtCQUFBLE9BQUEsT0FBQSxJQUFBLFVBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxPQUFBLFFBQUEsTUFBQTs7Z0JBRUEsSUFBQSxlQUFBLENBQUEsR0FBQTs7b0JBRUEsSUFBQSx1QkFBQSxLQUFBLE1BQUEsS0FBQSxVQUFBO29CQUNBLE9BQUEsT0FBQSxRQUFBO29CQUNBLE9BQUEsbUJBQUE7OztlQUdBLFVBQUEsS0FBQTs7Ozs7OztRQU9BLE9BQUEsSUFBQSxnQkFB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O1FBR0EsU0FBQSxxQkFBQTtZQUNBLElBQUEsUUFBQSxjQUFBO1lBQ0EsSUFBQSxPQUFBO1lBQ0EsSUFBQSxPQUFBLFVBQUEsYUFBQTtnQkFDQSxJQUFBLFVBQUEsTUFBQSxNQUFBLEtBQUE7Z0JBQ0EsT0FBQSxLQUFBLE1BQUEsZ0JBQUE7O1lBRUEsT0FBQTs7O1FBR0EsSUFBQSxjQUFBOztRQUVBLE9BQUE7WUFDQSxRQUFBLFVBQUEsTUFBQSxTQUFBLE9BQUE7Z0JBQ0EsTUFBQSxLQUFBLFVBQUEsZ0JBQUEsTUFBQSxRQUFBLFNBQUEsTUFBQTs7WUFFQSxRQUFBLFVBQUEsTUFBQSxTQUFBLE9BQUE7Z0JBQ0EsTUFBQSxLQUFBLFVBQUEsZ0JBQUEsTUFBQSxRQUFBLFNBQUEsTUFBQTs7WUFFQSxRQUFBLFVBQUEsU0FBQTtnQkFDQSxjQUFBO2dCQUNBLE9BQUEsY0FBQTtnQkFDQTs7WUFFQSxnQkFBQSxZQUFBO2dCQUNBLE9BQUE7Ozs7O0tBS0EsUUFBQSxtQ0FBQSxVQUFBLFdBQUEsU0FBQTtRQUNBLE9BQUEsVUFBQSxVQUFBLDJCQUFBLElBQUE7WUFDQSxRQUFBO2dCQUNBLEtBQUEsVUFBQTtnQkFDQSxRQUFBO2dCQUNBLFFBQUE7b0JBQ0EsV0FBQTtvQkFDQSxLQUFBOzs7O1lBSUEsT0FBQTtnQkFDQSxLQUFBLFVBQUE7Z0JBQ0EsUUFBQTtnQkFDQSxRQUFBO29CQUNBLE9BQUE7Ozs7OztLQU1BLFFBQUEsbUNBQUEsVUFBQSxXQUFBLFNBQUE7UUFDQSxPQUFBLFVBQUEsVUFBQSxVQUFBLElBQUE7WUFDQSxTQUFBO2dCQUNBLEtBQUEsVUFBQTtnQkFDQSxRQUFBO2dCQUNBLFFBQUE7b0JBQ0EsV0FBQTtvQkFDQSxTQUFBO29CQUNBLE1BQUE7Ozs7WUFJQSxRQUFBO2dCQUNBLEtBQUEsVUFBQTtnQkFDQSxRQUFBO2dCQUNBLFFBQUE7b0JBQ0EsV0FBQTtvQkFDQSxTQUFBO29CQUNBLE1BQUE7Ozs7WUFJQSxRQUFBO2dCQUNBLEtBQUEsVUFBQTtnQkFDQSxRQUFBO2dCQUNBLFFBQUE7b0JBQ0EsU0FBQTs7OztZQUlBLE9BQUE7Z0JBQ0EsS0FBQSxVQUFBO2dCQUNBLFFBQUE7Z0JBQ0EsUUFBQTtvQkFDQSxPQUFBOzs7Ozs7S0FNQSxRQUFBLGtDQUFBLFVBQUEsV0FBQSxTQUFBO1FBQ0EsT0FBQSxVQUFBLFVBQUEsTUFBQSxJQUFBO1lBQ0EsSUFBQTtnQkFDQSxLQUFBLFVBQUE7Z0JBQ0EsUUFBQTs7Ozs7S0FLQSxRQUFBLDBDQUFBLFVBQUEsWUFBQSxRQUFBOztRQUVBLEtBQUEsYUFBQSxZQUFBO1lBQ0EsSUFBQSxVQUFBLE9BQUEsSUFBQSxVQUFBLFFBQUE7O2dCQUVBLFdBQUEsV0FBQSxPQUFBOztlQUVBLFVBQUEsS0FBQTs7Ozs7O1FBTUEsS0FBQTs7O0tBR0EsUUFBQSx3Q0FBQSxVQUFBLFlBQUEsT0FBQTs7UUFFQSxLQUFBLGlCQUFBLFlBQUE7WUFDQSxJQUFBLFVBQUEsTUFBQSxHQUFBLFVBQUEsUUFBQTs7Z0JBRUEsV0FBQSxXQUFBLE9BQUE7O2VBRUEsVUFBQSxLQUFBOzs7Ozs7UUFNQSxLQUFBOztBQUVBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAnLCBbXG4gICAgICAgICdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnLFxuICAgICAgICAnY2hlY2tfaW5fYXBwLnNlcnZpY2VzJyxcbiAgICAgICAgJ2NoZWNrX2luX2FwcC5yb3V0ZXMnLFxuICAgICAgICAnY2hlY2tfaW5fYXBwLmNvbmZpZydcbiAgICBdKTtcblxuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5yb3V0ZXMnLCBbJ3VpLnJvdXRlcicsICduZ1N0b3JhZ2UnXSk7XG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5jb250cm9sbGVycycsIFsndWkucm91dGVyJywgJ25nTWF0ZXJpYWwnLCAnbmdNZXNzYWdlcycsICduZ1N0b3JhZ2UnLCAnbWRQaWNrZXJzJ10pO1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuc2VydmljZXMnLCBbXSk7XG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5jb25maWcnLCBbJ25nTWF0ZXJpYWwnXSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29uZmlnJykuY29uc3RhbnQoJ0FQSV9VUkwnLCAnYXBpL3YxLycpXG5cbiAgICAuY29uZmlnKGZ1bmN0aW9uKCRtZEljb25Qcm92aWRlcikge1xuICAgICAgICAkbWRJY29uUHJvdmlkZXIuZm9udFNldCgnbWQnLCAnbWF0ZXJpYWwtaWNvbnMnKTtcbiAgICB9KVxuXG4gICAgLmNvbmZpZyhmdW5jdGlvbigkbWRUaGVtaW5nUHJvdmlkZXIpIHtcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdkYXJrLWdyZXknKS5iYWNrZ3JvdW5kUGFsZXR0ZSgnZ3JleScpLmRhcmsoKTtcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdkYXJrLW9yYW5nZScpLmJhY2tncm91bmRQYWxldHRlKCdvcmFuZ2UnKS5kYXJrKCk7XG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZGFyay1wdXJwbGUnKS5iYWNrZ3JvdW5kUGFsZXR0ZSgnZGVlcC1wdXJwbGUnKS5kYXJrKCk7XG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZGFyay1ibHVlJykuYmFja2dyb3VuZFBhbGV0dGUoJ2JsdWUnKS5kYXJrKCk7XG4gICAgfSlcblxuICAgIC8vIFRPRE8gdGVtcCBzb2x1dGlvbiwgcmVtb3ZlIHRoaXMgZnJvbSBoZXJlXG4gICAgLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuXG4gICAgICAgICRyb290U2NvcGUuaGFzQWRtaW5BY2Nlc3MgICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkcm9vdFNjb3BlLmF1dGhVc2VyID8gJHJvb3RTY29wZS5hdXRoVXNlci5hZG1pbiA6IDA7XG4gICAgICAgIH07XG4gICAgfSk7XG5cbn0pKCk7IiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLnJvdXRlcycpLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgJGh0dHBQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcblxuICAgICAgICAvLyBwcmV2ZW50aW5nIFwiIVwiXCIgZnJvbSBhcHBlYXJpbmcgaW4gdXJsXG4gICAgICAgICRsb2NhdGlvblByb3ZpZGVyLmhhc2hQcmVmaXgoJycpO1xuXG4gICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAuc3RhdGUoJ3NpZ251cCcsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL3ZpZXdzL2xvZ2luLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdIb21lQ29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgcmVnaXN0ZXI6IDFcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ3NpZ25pbicsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvc2lnbmluJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL3ZpZXdzL2xvZ2luLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdIb21lQ29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgcmVnaXN0ZXI6IDBcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ2d1ZXN0cycsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvZ3Vlc3RzJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL3ZpZXdzL2d1ZXN0cy5odG1sJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnR3Vlc3RDb250cm9sbGVyJ1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnZXZlbnRzJywge1xuICAgICAgICAgICAgICAgIHVybDogJy9ldmVudHMnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvdmlld3MvZXZlbnRzLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdFdmVudExpc3RDb250cm9sbGVyJ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnL2V2ZW50cycpO1xuXG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goWyckcScsICckbG9jYXRpb24nLCAnJGxvY2FsU3RvcmFnZScsIGZ1bmN0aW9uICgkcSwgJGxvY2F0aW9uLCAkbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICdyZXF1ZXN0JzogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuaGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGxvY2FsU3RvcmFnZS50b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA9ICdCZWFyZXIgJyArICRsb2NhbFN0b3JhZ2UudG9rZW47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICdyZXNwb25zZUVycm9yJzogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMCB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy9zaWduaW4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XSk7XG4gICAgfSk7XG59KSgpOyIsImFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnLCBbXSlcblxuICAgLmNvbnRyb2xsZXIoJ0hvbWVDb250cm9sbGVyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRzY29wZSwgJHN0YXRlLCAkbG9jYXRpb24sICRsb2NhbFN0b3JhZ2UsIEF1dGgsIEd1ZXN0c1NlcnZpY2UsIFVzZXJzU2VydmljZSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3NBdXRoIChyZXMpIHtcbiAgICAgICAgICAgICRsb2NhbFN0b3JhZ2UudG9rZW4gPSByZXMudG9rZW47XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBcIiMvZXZlbnRzXCI7XG5cbiAgICAgICAgICAgIC8vIFRPRE8gcmVtb3ZlIHRoaXMgZnJvbSBoZXJlXG4gICAgICAgICAgICAvLyByZWxvYWQgZ3Vlc3RzIGFmdGVyIHN1Y2Nlc3NmdWwgbG9naW5cbiAgICAgICAgICAgIEd1ZXN0c1NlcnZpY2UuZ2V0R3Vlc3RzKCk7XG4gICAgICAgICAgICBVc2Vyc1NlcnZpY2UuZ2V0Q3VycmVudFVzZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS5wZXJmb3JtTG9naW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoJHNjb3BlLnJlZ2lzdGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5zaWdudXAoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5zaWduaW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2lnbmluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGZvcm1EYXRhID0ge1xuICAgICAgICAgICAgICAgIGVtYWlsOiAkc2NvcGUuY3JlZGVudGlhbHMuZW1haWwsXG4gICAgICAgICAgICAgICAgcGFzc3dvcmQ6ICRzY29wZS5jcmVkZW50aWFscy5wYXNzd29yZFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS5lcnJvciAgICA9IG51bGw7XG5cbiAgICAgICAgICAgIEF1dGguc2lnbmluKGZvcm1EYXRhLCBzdWNjZXNzQXV0aCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuZXJyb3IgPSAnSW52YWxpZCBlbWFpbC9wYXNzd29yZC4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNpZ251cCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBmb3JtRGF0YSA9IHtcbiAgICAgICAgICAgICAgICBlbWFpbDogJHNjb3BlLmNyZWRlbnRpYWxzLmVtYWlsLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiAkc2NvcGUuY3JlZGVudGlhbHMucGFzc3dvcmRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuZXJyb3IgICAgICAgICAgICA9IG51bGw7XG5cbiAgICAgICAgICAgIEF1dGguc2lnbnVwKGZvcm1EYXRhLCBzdWNjZXNzQXV0aCwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIuZXJyb3JzICYmIGVyci5lcnJvcnNbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5lcnJvciAgICA9IGVyci5lcnJvcnNbMF07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5lcnJvciAgICA9ICdGYWlsZWQgdG8gc2lnbnVwJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgQXV0aC5sb2dvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IFwiL1wiO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgICRzY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUucmVnaXN0ZXIgICAgID0gJHN0YXRlLmN1cnJlbnQucmVnaXN0ZXI7XG4gICAgICAgICAgICAkc2NvcGUubG9naW5UZXh0ICAgID0gJHNjb3BlLnJlZ2lzdGVyID8gJ1JlZ2lzdGVyJyA6ICdMb2dpbic7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLmVycm9yICAgID0gbnVsbDtcbiAgICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS50b2tlbiAgICAgICAgID0gJGxvY2FsU3RvcmFnZS50b2tlbjtcbiAgICAgICAgJHNjb3BlLnRva2VuQ2xhaW1zICAgPSBBdXRoLmdldFRva2VuQ2xhaW1zKCk7XG4gICAgfSlcblxuICAgIC5jb250cm9sbGVyKCdFdmVudExpc3RDb250cm9sbGVyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICR3aW5kb3csICRzY29wZSwgJGh0dHAsICRzdGF0ZVBhcmFtcywgJGxvY2F0aW9uLCAkbWREaWFsb2csICRtZE1lZGlhLCAkbWRUb2FzdCwgQVBJX1VSTCwgRXZlbnRzLCBHdWVzdHMsIEd1ZXN0c1NlcnZpY2UsIFVzZXJzU2VydmljZSkge1xuICAgICAgICAvLyBUT0RPIGNoYW5nZSBvcGVuRGlhbG9ncyBsb2NhdGlvblxuICAgICAgICAkc2NvcGUub3Blbkd1ZXN0RGlhbG9nID0gZnVuY3Rpb24gKCRldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrSW5TdGF0dXMgICAgPSBudWxsO1xuXG4gICAgICAgICAgICAkbWREaWFsb2cuc2hvdyh7XG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogRGlhbG9nQ29udHJvbGxlcixcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyQXM6ICdjdHJsJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL3ZpZXdzL2RpYWxvZ19ndWVzdF9jaGVja2luLmh0bWwnLFxuICAgICAgICAgICAgICAgIHBhcmVudDogYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LmJvZHkpLFxuICAgICAgICAgICAgICAgIC8vIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgLy8gcHJlc2VydmVTY29wZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBsb2NhbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3RzOiAkc2NvcGUuZ3Vlc3RzLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50RXZlbnQ6ICRzY29wZS5jdXJyZW50RXZlbnQsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRHdWVzdDogbnVsbCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50OiAkZXZlbnQsXG4gICAgICAgICAgICAgICAgY2xpY2tPdXRzaWRlVG9DbG9zZTp0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUub3BlbkV2ZW50RGlhbG9nID0gZnVuY3Rpb24gKCRldmVudCwgbmV3RXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChuZXdFdmVudCkge1xuICAgICAgICAgICAgICAgICRzY29wZS51bmNoZWNrQ3VycmVudEV2ZW50KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRtZERpYWxvZy5zaG93KHtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBEaWFsb2dDb250cm9sbGVyLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvdmlld3MvZGlhbG9nX2VkaXRfZXZlbnQuaHRtbCcsXG4gICAgICAgICAgICAgICAgbG9jYWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEV2ZW50OiAkc2NvcGUuY3VycmVudEV2ZW50LFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50R3Vlc3Q6IG51bGwsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5ib2R5KSxcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlU2NvcGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQ6ICRldmVudCxcbiAgICAgICAgICAgICAgICBjbGlja091dHNpZGVUb0Nsb3NlOnRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5vcGVuRXZlbnRNZW51ID0gZnVuY3Rpb24gKCRtZE9wZW5NZW51LCBldikge1xuICAgICAgICAgICAgb3JpZ2luYXRvckV2ID0gZXY7XG4gICAgICAgICAgICAkbWRPcGVuTWVudShldik7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNlbGVjdEV2ZW50ICA9IGZ1bmN0aW9uIChldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJFdmVudExpc3RDb250cm9sbGVyIDo6IFNlbGVjdGluZyBFdmVudCBcIiArIGV2ZW50LnNsdWcpO1xuICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaCh7J3AnIDogZXZlbnQuc2x1Z30pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5maW5kRXZlbnQgICAgPSBmdW5jdGlvbiAoZXZlbnRTbHVnKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoISRzY29wZS5ldmVudHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc3VsdCAgICAgICAgICA9ICRzY29wZS5ldmVudHMuZmluZChmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQuc2x1ZyA9PSBldmVudFNsdWc7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2V0Q3VycmVudEV2ZW50ICA9IGZ1bmN0aW9uIChldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmV2ZW50SWQgICAgICAgICAgICAgID0gZXZlbnQuaWQ7XG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50ICAgICAgICAgPSBldmVudDtcbiAgICAgICAgICAgICRzY29wZS5sb2FkaW5nR3Vlc3RzICAgICAgICA9IHRydWU7XG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0cyAgICAgICAgPSBbXTtcblxuICAgICAgICAgICAgdmFyIGcgICAgICAgICAgICAgICAgICAgICAgID0gRXZlbnRzLmdldCh7ZXZlbnRTbHVnOiBldmVudC5zbHVnLCBkYXRhOiAnZ3Vlc3RzJ30sIGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgICAgICRzY29wZS5sb2FkaW5nR3Vlc3RzICAgID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHMgICAgPSByZXN1bHQuZGF0YTtcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUudW5jaGVja0N1cnJlbnRFdmVudCAgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuZXZlbnRJZCAgICAgICAgICAgICAgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgICAgID0gMDtcbiAgICAgICAgICAgICRzY29wZS5sb2FkaW5nR3Vlc3RzICAgICAgICA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHMgICAgICAgID0gW107XG5cbiAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2goe30pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5jaGVja0N1cnJlbnRFdmVudCAgICA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhcmFtcy5wICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50SWQgPSBwYXJhbXMucDtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnQgICA9ICRzY29wZS5maW5kRXZlbnQoZXZlbnRJZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGV2ZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuZXZlbnRJZCAhPT0gZXZlbnQuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXRDdXJyZW50RXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIHNldCBmaXJzdCBldmVudCBhcyBkZWZhdWx0XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zb3J0RXZlbnRzICAgPSBmdW5jdGlvbiAoc29ydCwgcmV2ZXJzZSlcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLnNvcnRFdmVudCAgICAgICAgPSBzb3J0O1xuICAgICAgICAgICAgJHNjb3BlLnNvcnRFdmVudFJldmVyc2UgPSByZXZlcnNlO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5jaGVja0luR3Vlc3QgPSBmdW5jdGlvbihldmVudCwgZXZlbnRHdWVzdClcbiAgICAgICAge1xuXG4gICAgICAgICAgICBHdWVzdHMuY2hlY2tJbih7ZXZlbnRTbHVnOiBldmVudC5zbHVnLCBndWVzdElkOiBldmVudEd1ZXN0LmlkLCBkYXRhOiAnY2hlY2tpbid9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50Lmd1ZXN0X2NvdW50ID0gJHNjb3BlLmN1cnJlbnRHdWVzdHMubGVuZ3RoO1xuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgZ3Vlc3RJbmRleCAgICAgID0gJHNjb3BlLmN1cnJlbnRHdWVzdHMubWFwKGZ1bmN0aW9uIChnKSB7cmV0dXJuIGcuaWQ7IH0pLmluZGV4T2YoZXZlbnRHdWVzdC5pZCk7XG5cbiAgICAgICAgICAgIGlmIChndWVzdEluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIGd1ZXN0IGFscmVhZHkgb24gbGlzdCwgY2hhbmdpbmcgaXRzIHZhbHVlXG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHNbZ3Vlc3RJbmRleF0uY2hlY2tfaW4gPSAhJHNjb3BlLmN1cnJlbnRHdWVzdHNbZ3Vlc3RJbmRleF0uY2hlY2tfaW47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5ldyBndWVzdCwgYWRkaW5nIGhpbSB0byBhcnJheVxuICAgICAgICAgICAgICAgIHZhciBndWVzdERhdGEgICAgICAgPSAoSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShldmVudEd1ZXN0KSkpO1xuICAgICAgICAgICAgICAgIGd1ZXN0RGF0YS5jaGVja19pbiAgPSAxO1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzLnVuc2hpZnQoZ3Vlc3REYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZm9yY2luZyB3aW5kb3cgcmVzaXplIHRvIHVwZGF0ZSB2aXJ0dWFsIHJlcGVhdGVyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQod2luZG93KS50cmlnZ2VySGFuZGxlcigncmVzaXplJyk7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93UmVtb3ZlRXZlbnQgPSBmdW5jdGlvbiAoZXYsIGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBBcHBlbmRpbmcgZGlhbG9nIHRvIGRvY3VtZW50LmJvZHkgdG8gY292ZXIgc2lkZW5hdiBpbiBkb2NzIGFwcFxuICAgICAgICAgICAgdmFyIGNvbmZpcm0gICAgID0gJG1kRGlhbG9nLmNvbmZpcm0oKVxuICAgICAgICAgICAgICAgIC50aXRsZSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIGV2ZW50PycpXG4gICAgICAgICAgICAgICAgLnRleHRDb250ZW50KCdUaGlzIGFjdGlvbiBjYW5ub3QgYmUgdW5kb25lLicpXG4gICAgICAgICAgICAgICAgLmFyaWFMYWJlbCgnRGVsZXRlIEV2ZW50JylcbiAgICAgICAgICAgICAgICAudGFyZ2V0RXZlbnQoZXYpXG4gICAgICAgICAgICAgICAgLm9rKCdZZXMnKVxuICAgICAgICAgICAgICAgIC5jYW5jZWwoJ1VuZG8nKTtcblxuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coY29uZmlybSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuZ3Vlc3RzLm1hcChmdW5jdGlvbiAoZSkge3JldHVybiBlLmlkOyB9KS5pbmRleE9mKGd1ZXN0LmlkKTtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRJbmRleCAgPSAkc2NvcGUuZXZlbnRzLmluZGV4T2YoZXZlbnQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50SW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ldmVudHMuc3BsaWNlKGV2ZW50SW5kZXgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIEV2ZW50cy5kZWxldGUoe2V2ZW50U2x1ZzogZXZlbnQuc2x1Z30pO1xuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQgICAgID0ge307XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzICAgID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dFdmVudERlbGV0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN0YXR1cyAgICAgICAgICAgPSAnRXZlbnQgRGVsZXRlZC4nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93RXZlbnREZWxldGVkID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICAkbWRUb2FzdC5zaG93KFxuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNpbXBsZSgpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0Q29udGVudCgnRXZlbnQgRGVsZXRlZCEnKVxuICAgICAgICAgICAgICAgICAgICAucG9zaXRpb24oJ3RvcCByaWdodCcpXG4gICAgICAgICAgICAgICAgICAgIC5oaWRlRGVsYXkoMzAwMClcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dSZW1vdmVHdWVzdCA9IGZ1bmN0aW9uIChldiwgZXZlbnQsIGd1ZXN0KVxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBBcHBlbmRpbmcgZGlhbG9nIHRvIGRvY3VtZW50LmJvZHkgdG8gY292ZXIgc2lkZW5hdiBpbiBkb2NzIGFwcFxuICAgICAgICAgICAgdmFyIGNvbmZpcm0gICAgID0gJG1kRGlhbG9nLmNvbmZpcm0oKVxuICAgICAgICAgICAgICAgIC50aXRsZSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHJlbW92ZSB0aGlzIGd1ZXN0PycpXG4gICAgICAgICAgICAgICAgLnRleHRDb250ZW50KCdUaGlzIGFjdGlvbiBjYW5ub3QgYmUgdW5kb25lLicpXG4gICAgICAgICAgICAgICAgLmFyaWFMYWJlbCgnUmVtb3ZlIEd1ZXN0JylcbiAgICAgICAgICAgICAgICAudGFyZ2V0RXZlbnQoZXYpXG4gICAgICAgICAgICAgICAgLm9rKCdZZXMnKVxuICAgICAgICAgICAgICAgIC5jYW5jZWwoJ1VuZG8nKTtcblxuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coY29uZmlybSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuZ3Vlc3RzLm1hcChmdW5jdGlvbiAoZSkge3JldHVybiBlLmlkOyB9KS5pbmRleE9mKGd1ZXN0LmlkKTtcbiAgICAgICAgICAgICAgICB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuY3VycmVudEd1ZXN0cy5pbmRleE9mKGd1ZXN0KTtcblxuICAgICAgICAgICAgICAgIGlmIChndWVzdEluZGV4ICE9PSAtMSkge1xuXG4gICAgICAgICAgICAgICAgICAgIEd1ZXN0cy5yZW1vdmUoe2V2ZW50U2x1ZzogZXZlbnQuc2x1ZywgZ3Vlc3RJZDogZ3Vlc3QuaWQsIGRhdGE6ICdyZW1vdmUnfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudC5ndWVzdF9jb3VudCA9ICRzY29wZS5jdXJyZW50R3Vlc3RzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzLnNwbGljZShndWVzdEluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93R3Vlc3RSZW1vdmVkKCk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zdGF0dXMgICAgICAgPSAnR3Vlc3QgUmVtb3ZlZC4nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93R3Vlc3RSZW1vdmVkID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICAkbWRUb2FzdC5zaG93KFxuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNpbXBsZSgpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0Q29udGVudCgnR3Vlc3QgUmVtb3ZlZCEnKVxuICAgICAgICAgICAgICAgICAgICAucG9zaXRpb24oJ3RvcCByaWdodCcpXG4gICAgICAgICAgICAgICAgICAgIC5oaWRlRGVsYXkoMzAwMClcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdldEV2ZW50R3Vlc3RSZXBlYXRlckhlaWdodCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuXG4gICAgICAgICAgICB3aW5kb3dIZWlnaHQgICAgICAgID0gJHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgICAgIG5hdkJhckhlaWdodCAgICAgICAgPSAkKCcjbmF2YmFyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG4gICAgICAgICAgICBldmVudEhlYWRlckhlaWdodCAgID0gJCgnI2V2ZW50SGVhZGVyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cbiAgICAgICAgICAgIGxpc3RIZWlnaHQgICAgICAgICAgPSB3aW5kb3dIZWlnaHQgLSBuYXZCYXJIZWlnaHQgLSBldmVudEhlYWRlckhlaWdodCAtIDEwO1xuXG4gICAgICAgICAgICByZXR1cm4ge2hlaWdodDogJycgKyBsaXN0SGVpZ2h0ICsgJ3B4J307XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdldEV2ZW50UmVwZWF0ZXJIZWlnaHQgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG5cbiAgICAgICAgICAgIHdpbmRvd0hlaWdodCAgICAgICAgICAgID0gJHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgICAgIG5hdkJhckhlaWdodCAgICAgICAgICAgID0gJCgnI25hdmJhcicpLm91dGVySGVpZ2h0KHRydWUpO1xuICAgICAgICAgICAgZXZlbnRTZWFyY2hCYXJIZWlnaHQgICAgPSAkKCcjZXZlbnRTZWFyY2hCYXInKS5vdXRlckhlaWdodCh0cnVlKTtcblxuICAgICAgICAgICAgbGlzdEhlaWdodCAgICAgICAgICAgICAgPSB3aW5kb3dIZWlnaHQgLSBuYXZCYXJIZWlnaHQgLSBldmVudFNlYXJjaEJhckhlaWdodCAtIDEwO1xuXG4gICAgICAgICAgICByZXR1cm4ge2hlaWdodDogJycgKyBsaXN0SGVpZ2h0ICsgJ3B4J307XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dFdmVudExpc3RNb2JpbGUgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gISRzY29wZS5jdXJyZW50RXZlbnQgfHwgJG1kTWVkaWEoJ2d0LXNtJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dHdWVzdExpc3RNb2JpbGUgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLmN1cnJlbnRFdmVudCB8fCAkbWRNZWRpYSgnZ3Qtc20nKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZXZlbnRTb3J0Q29tcGFyYXRvciA9IGZ1bmN0aW9uIChldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgc3dpdGNoICgkc2NvcGUuc29ydEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5kYXRlO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAnbmFtZSc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5uYW1lO1xuXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgLy8gdXBjb21pbmcgLyBwYXN0IHNvcnRcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnVwY29taW5nX2luZGV4ID49IDAgPyBldmVudC51cGNvbWluZ19pbmRleCA6ICgtMSkgKiBldmVudC51cGNvbWluZ19pbmRleCArICRzY29wZS5ldmVudHMubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5kb3dubG9hZEd1ZXN0c0NzdiA9IGZ1bmN0aW9uIChldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgRXZlbnRzLmdldCh7ZXZlbnRTbHVnOiBldmVudC5zbHVnLCBkYXRhOiAnZ3Vlc3RzJywgY3N2OiAxfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuXG4gICAgICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbIHJlc3VsdC5kYXRhIF0sIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA6ICdhcHBsaWNhdGlvbi9jc3YnXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvL3RyaWNrIHRvIGRvd25sb2FkIHN0b3JlIGEgZmlsZSBoYXZpbmcgaXRzIFVSTFxuICAgICAgICAgICAgICAgIHZhciBmaWxlVVJMICAgICA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICAgICAgICAgICAgdmFyIGEgICAgICAgICAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgICAgIGEuaHJlZiAgICAgICAgICA9IGZpbGVVUkw7XG4gICAgICAgICAgICAgICAgYS50YXJnZXQgICAgICAgID0gJ19ibGFuayc7XG4gICAgICAgICAgICAgICAgYS5kb3dubG9hZCAgICAgID0gZXZlbnQuc2x1ZyArJ19ndWVzdHMuY3N2JztcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgICAgIGEuY2xpY2soKTtcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplKTtcblxuICAgICAgICBmdW5jdGlvbiBvblJlc2l6ZSgpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuJG9uKCdzdG9yZUV2ZW50JywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgJHNjb3BlLmN1cnJlbnRFdmVudC50aW1lICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiAkc2NvcGUuY3VycmVudEV2ZW50LmRhdGUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50LmRhdGUuc2V0SG91cnMoJHNjb3BlLmN1cnJlbnRFdmVudC50aW1lLmdldEhvdXJzKCkpO1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQuZGF0ZS5zZXRNaW51dGVzKCRzY29wZS5jdXJyZW50RXZlbnQudGltZS5nZXRNaW51dGVzKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50LmRhdGVfZm9ybWF0dGVkICA9IG1vbWVudCgkc2NvcGUuY3VycmVudEV2ZW50LmRhdGUpLmZvcm1hdCgnREQvTU0vWVkgSEg6bW0nKTtcblxuICAgICAgICAgICAgRXZlbnRzLnN0b3JlKHtldmVudDogJHNjb3BlLmN1cnJlbnRFdmVudH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgICAgIHZhciBldmVudCAgICAgICAgICAgPSByZXN1bHQuZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRJbmRleCAgICAgID0gJHNjb3BlLmV2ZW50cy5tYXAoZnVuY3Rpb24gKGUpIHtyZXR1cm4gZS5pZDsgfSkuaW5kZXhPZihldmVudC5pZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZXZlbnQgbm90IG9uIGxpc3QsIGNyZWF0aW5nIGVudHJ5XG4gICAgICAgICAgICAgICAgICAgIHZhciBldmVudERhdGEgICAgICAgICAgID0gKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZXZlbnQpKSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ldmVudHMudW5zaGlmdChldmVudERhdGEpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50ICAgICA9IGV2ZW50RGF0YTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGVycm9yIHRyZWF0bWVudFxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiRXJyb3IgY3JlYXRpbmcgZXZlbnQhXCIpXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJG9uKCdjaGVja0luRXZlbnQnLCBmdW5jdGlvbihldiwgZGF0YSkge1xuXG4gICAgICAgICAgICB2YXIgZXZlbnQgICA9IGRhdGEuZXZlbnQ7XG4gICAgICAgICAgICB2YXIgZ3Vlc3QgICA9IGRhdGEuZ3Vlc3Q7XG5cbiAgICAgICAgICAgICRzY29wZS5jaGVja0luR3Vlc3QoZXZlbnQsIGd1ZXN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHsgcmV0dXJuICRsb2NhdGlvbi5zZWFyY2goKTsgfSwgZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrQ3VycmVudEV2ZW50KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiRvbignb3BlbkV2ZW50RGlhbG9nJywgZnVuY3Rpb24gKGV2ZW50LCBkYXRhKSB7XG4gICAgICAgICAgICAkc2NvcGUub3BlbkV2ZW50RGlhbG9nKGRhdGEuZXZlbnQsIGRhdGEubmV3RXZlbnQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBFdmVudHMuZ2V0KGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgJHNjb3BlLmV2ZW50cyAgID0gcmVzdWx0LmRhdGE7XG5cbiAgICAgICAgICAgIC8vIFRPRE8gaW1wcm92ZSB0aGlzXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmV2ZW50cywgZnVuY3Rpb24gKGV2ZW50LCBrZXkpIHtcblxuICAgICAgICAgICAgICAgIGRhdGUgICAgICAgICAgICAgICAgICAgICAgICA9IG1vbWVudCgkc2NvcGUuZXZlbnRzW2tleV0uZGF0ZS5kYXRlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZXZlbnRzW2tleV0uZGF0ZSAgICAgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZXZlbnRzW2tleV0udGltZSAgICAgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkc2NvcGUuY2hlY2tDdXJyZW50RXZlbnQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLmxvYWRpbmdHdWVzdHMgICAgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnNvcnRFdmVudCAgICAgICAgPSAndXBjb21pbmcnO1xuICAgIH0pXG5cbiAgICAuY29udHJvbGxlcignR3Vlc3RDb250cm9sbGVyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRzY29wZSwgJGh0dHAsICRzdGF0ZVBhcmFtcywgJGxvY2F0aW9uLCAkbWREaWFsb2csICRtZFRvYXN0LCAkd2luZG93LCBBUElfVVJMLCBFdmVudHMsIEd1ZXN0cywgR3Vlc3RzU2VydmljZSwgVXNlcnNTZXJ2aWNlKSB7XG5cbiAgICAgICAgJHNjb3BlLm9wZW5HdWVzdEVkaXREaWFsb2cgPSBmdW5jdGlvbiAoJGV2ZW50LCBlZGl0TW9kZSwgZ3Vlc3QpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5lZGl0TW9kZSAgICAgICAgICAgICA9IGVkaXRNb2RlO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBndWVzdCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgICAgID0gZ3Vlc3Q7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgICAgID0ge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRtZERpYWxvZy5zaG93KHtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBEaWFsb2dDb250cm9sbGVyLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvdmlld3MvZGlhbG9nX2VkaXRfZ3Vlc3QuaHRtbCcsXG4gICAgICAgICAgICAgICAgbG9jYWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0czogJHNjb3BlLmd1ZXN0cyxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEV2ZW50OiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50R3Vlc3Q6ICRzY29wZS5jdXJyZW50R3Vlc3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5ib2R5KSxcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlU2NvcGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQ6ICRldmVudCxcbiAgICAgICAgICAgICAgICBjbGlja091dHNpZGVUb0Nsb3NlOnRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93RGVsZXRlR3Vlc3QgPSBmdW5jdGlvbiAoZXYsIGd1ZXN0KSB7XG4gICAgICAgICAgICAvLyBBcHBlbmRpbmcgZGlhbG9nIHRvIGRvY3VtZW50LmJvZHkgdG8gY292ZXIgc2lkZW5hdiBpbiBkb2NzIGFwcFxuICAgICAgICAgICAgdmFyIGNvbmZpcm0gICAgID0gJG1kRGlhbG9nLmNvbmZpcm0oKVxuICAgICAgICAgICAgICAgIC50aXRsZSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIGd1ZXN0PycpXG4gICAgICAgICAgICAgICAgLnRleHRDb250ZW50KCdUaGlzIGFjdGlvbiBjYW5ub3QgYmUgdW5kb25lLicpXG4gICAgICAgICAgICAgICAgLmFyaWFMYWJlbCgnRGVsZXRlIEd1ZXN0JylcbiAgICAgICAgICAgICAgICAudGFyZ2V0RXZlbnQoZXYpXG4gICAgICAgICAgICAgICAgLm9rKCdZZXMnKVxuICAgICAgICAgICAgICAgIC5jYW5jZWwoJ1VuZG8nKTtcblxuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coY29uZmlybSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuZ3Vlc3RzLm1hcChmdW5jdGlvbiAoZSkge3JldHVybiBlLmlkOyB9KS5pbmRleE9mKGd1ZXN0LmlkKTtcbiAgICAgICAgICAgICAgICB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuZ3Vlc3RzLmluZGV4T2YoZ3Vlc3QpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGd1ZXN0SW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ndWVzdHMuc3BsaWNlKGd1ZXN0SW5kZXgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIEd1ZXN0cy5kZWxldGUoe2d1ZXN0SWQ6IGd1ZXN0LmlkfSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0d1ZXN0RGVsZXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGlhbG9nU3RhdHVzID0gJ0d1ZXN0IERlbGV0ZWQuJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2hvd0d1ZXN0RGVsZXRlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJG1kVG9hc3Quc2hvdyhcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaW1wbGUoKVxuICAgICAgICAgICAgICAgICAgICAudGV4dENvbnRlbnQoJ0d1ZXN0IERlbGV0ZWQhJylcbiAgICAgICAgICAgICAgICAgICAgLnBvc2l0aW9uKCd0b3AgcmlnaHQnKVxuICAgICAgICAgICAgICAgICAgICAuaGlkZURlbGF5KDMwMDApXG4gICAgICAgICAgICApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5nZXRHdWVzdFJlcGVhdGVySGVpZ2h0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIHdpbmRvd0hlaWdodCAgICAgICAgICAgID0gJHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgICAgIG5hdkJhckhlaWdodCAgICAgICAgICAgID0gJCgnI25hdmJhcicpLm91dGVySGVpZ2h0KHRydWUpO1xuICAgICAgICAgICAgZ3Vlc3RMaXN0SGVhZGVySGVpZ2h0ICAgPSAkKCcjZ3Vlc3RMaXN0SGVhZGVyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG4gICAgICAgICAgICBndWVzdFRhYmxlSGVhZGVySGVpZ2h0ICA9ICQoJyNndWVzdFRhYmxlSGVhZGVyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cbiAgICAgICAgICAgIGxpc3RIZWlnaHQgICAgICAgICAgICAgID0gd2luZG93SGVpZ2h0IC0gbmF2QmFySGVpZ2h0IC0gZ3Vlc3RMaXN0SGVhZGVySGVpZ2h0IC0gZ3Vlc3RUYWJsZUhlYWRlckhlaWdodCAtIDEwO1xuXG4gICAgICAgICAgICByZXR1cm4ge2hlaWdodDogJycgKyBsaXN0SGVpZ2h0ICsgJ3B4J307XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNvcnRHdWVzdHMgICA9IGZ1bmN0aW9uIChzb3J0KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoc29ydCA9PT0gJHNjb3BlLnNvcnRHdWVzdCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zb3J0R3Vlc3RSZXZlcnNlICAgICA9ICEkc2NvcGUuc29ydEd1ZXN0UmV2ZXJzZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc29ydEd1ZXN0ICAgICAgICAgICAgPSAkc2NvcGUuc29ydEd1ZXN0UmV2ZXJzZSA9PT0gZmFsc2UgPyBudWxsIDogJHNjb3BlLnNvcnRHdWVzdDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRHdWVzdCAgICAgICAgICAgID0gc29ydDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc29ydEd1ZXN0UmV2ZXJzZSAgICAgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLnNvcnRJY29uICAgICAgICAgICAgICAgICA9ICRzY29wZS5zb3J0R3Vlc3RSZXZlcnNlID8gJ2Fycm93X2Ryb3BfZG93bicgOiAnYXJyb3dfZHJvcF91cCc7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgICR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgb25SZXNpemUpO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uUmVzaXplKCkge1xuICAgICAgICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kb24oJ3N0b3JlR3Vlc3QnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblxuICAgICAgICAgICAgR3Vlc3RzLnN0b3JlKHtndWVzdDogJHNjb3BlLmN1cnJlbnRHdWVzdH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgICAgIHZhciBndWVzdCAgICAgICA9IHJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5ndWVzdHMubWFwKGZ1bmN0aW9uIChnKSB7cmV0dXJuIGcuaWQ7IH0pLmluZGV4T2YoZ3Vlc3QuaWQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGd1ZXN0SW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGd1ZXN0IG5vdCBvbiBsaXN0LCBjcmVhdGluZyBlbnRyeVxuICAgICAgICAgICAgICAgICAgICB2YXIgZ3Vlc3REYXRhICAgICAgID0gKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZ3Vlc3QpKSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ndWVzdHMudW5zaGlmdChndWVzdERhdGEpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gZXJyb3IgdHJlYXRtZW50XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJFcnJvciBjcmVhdGluZyBndWVzdCFcIilcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplKTtcbiAgICAgICAgfSk7XG4gICAgfSlcblxuICAgIC5jb250cm9sbGVyKCdOYXZCYXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCR0aW1lb3V0LCAkcSwgJHJvb3RTY29wZSwgJHNjb3BlKSB7XG5cbiAgICB9KTtcblxuICAgIC8vIFRPRE8gcHV0IHRoaXMgb24gYSBqcyBmaWxlXG4gICAgZnVuY3Rpb24gRGlhbG9nQ29udHJvbGxlciAoJHRpbWVvdXQsICRxLCAkcm9vdFNjb3BlLCAkc2NvcGUsICRtZERpYWxvZywgRXZlbnRzLCBndWVzdHMsIGN1cnJlbnRFdmVudCwgY3VycmVudEd1ZXN0KSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkc2NvcGUuYWxsR3Vlc3RzICAgICAgICA9IGd1ZXN0cztcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgPSBjdXJyZW50RXZlbnQ7XG4gICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgICAgID0gY3VycmVudEd1ZXN0O1xuICAgICAgICAkc2NvcGUuY2hlY2tJblN0YXR1cyAgICA9IG51bGw7XG5cbiAgICAgICAgJHNjb3BlLnNlYXJjaEd1ZXN0cyA9IGZ1bmN0aW9uIChzZWFyY2hLZXkpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuYWxsR3Vlc3RzID09PSBudWxsIHx8IHR5cGVvZiAkc2NvcGUuYWxsR3Vlc3RzID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVE9ETyBwdXQgdGhpcyB0byBmdW5jdGlvblxuICAgICAgICAgICAgc2VhcmNoS2V5Tm9ybWFsaXplZCA9IHNlYXJjaEtleS5yZXBsYWNlKC9bw6HDoMOjw6LDpF0vZ2ksXCJhXCIpLnJlcGxhY2UoL1vDqcOowqjDql0vZ2ksXCJlXCIpLnJlcGxhY2UoL1vDrcOsw6/Drl0vZ2ksXCJpXCIpLnJlcGxhY2UoL1vDs8Oyw7bDtMO1XS9naSxcIm9cIikucmVwbGFjZSgvW8O6w7nDvMO7XS9naSwgXCJ1XCIpLnJlcGxhY2UoL1vDp10vZ2ksIFwiY1wiKS5yZXBsYWNlKC9bw7FdL2dpLCBcIm5cIik7XG5cbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2VhcmNoaW5nIGd1ZXN0cyB3aXRoIFwiICsgc2VhcmNoS2V5Tm9ybWFsaXplZCk7XG4gICAgICAgICAgICBndWVzdHMgICAgICAgICAgICAgID0gJHNjb3BlLmFsbEd1ZXN0cy5maWx0ZXIoZnVuY3Rpb24gKGd1ZXN0KSB7XG5cbiAgICAgICAgICAgICAgICAvLyBUT0RPIHB1dCB0aGlzIHRvIGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgZ3Vlc3ROYW1lTm9ybWFsaXplZCAgICAgICAgID0gZ3Vlc3QubmFtZS5yZXBsYWNlKC9bw6HDoMOjw6LDpF0vZ2ksXCJhXCIpLnJlcGxhY2UoL1vDqcOowqjDql0vZ2ksXCJlXCIpLnJlcGxhY2UoL1vDrcOsw6/Drl0vZ2ksXCJpXCIpLnJlcGxhY2UoL1vDs8Oyw7bDtMO1XS9naSxcIm9cIikucmVwbGFjZSgvW8O6w7nDvMO7XS9naSwgXCJ1XCIpLnJlcGxhY2UoL1vDp10vZ2ksIFwiY1wiKS5yZXBsYWNlKC9bw7FdL2dpLCBcIm5cIik7XG4gICAgICAgICAgICAgICAgZ3Vlc3RTaG9ydE5hbWVOb3JtYWxpemVkICAgID0gZ3Vlc3Quc2hvcnRfbmFtZS5yZXBsYWNlKC9bw6HDoMOjw6LDpF0vZ2ksXCJhXCIpLnJlcGxhY2UoL1vDqcOowqjDql0vZ2ksXCJlXCIpLnJlcGxhY2UoL1vDrcOsw6/Drl0vZ2ksXCJpXCIpLnJlcGxhY2UoL1vDs8Oyw7bDtMO1XS9naSxcIm9cIikucmVwbGFjZSgvW8O6w7nDvMO7XS9naSwgXCJ1XCIpLnJlcGxhY2UoL1vDp10vZ2ksIFwiY1wiKS5yZXBsYWNlKC9bw7FdL2dpLCBcIm5cIik7XG5cblxuICAgICAgICAgICAgICAgIHJldHVybiAoZ3Vlc3QuZW1haWwgJiYgZ3Vlc3QuZW1haWwudG9Mb3dlckNhc2UoKS5pbmRleE9mKHNlYXJjaEtleU5vcm1hbGl6ZWQudG9Mb3dlckNhc2UoKSkgPiAtMSkgfHxcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3ROYW1lTm9ybWFsaXplZC50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoS2V5Tm9ybWFsaXplZC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8XG4gICAgICAgICAgICAgICAgICAgIChndWVzdC5zbHVnICYmIGd1ZXN0LnNsdWcudG9Mb3dlckNhc2UoKS5pbmRleE9mKHNlYXJjaEtleU5vcm1hbGl6ZWQudG9Mb3dlckNhc2UoKSkgPiAtMSkgfHxcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3RTaG9ydE5hbWVOb3JtYWxpemVkLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihzZWFyY2hLZXlOb3JtYWxpemVkLnRvTG93ZXJDYXNlKCkpID4gLTE7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGd1ZXN0cy5zbGljZSgwLCAxMCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkSXRlbUNoYW5nZSA9IGZ1bmN0aW9uIChpdGVtKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkSXRlbSA9PT0gbnVsbCB8fCB0eXBlb2YgJHNjb3BlLnNlbGVjdGVkSXRlbSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gYnJvYWRjYXN0aW5nIGV2ZW50IHRvIGV2ZW50Q29udHJvbGxlclxuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdjaGVja0luRXZlbnQnLCB7J2V2ZW50JyA6ICRzY29wZS5jdXJyZW50RXZlbnQsICdndWVzdCcgOiAkc2NvcGUuc2VsZWN0ZWRJdGVtfSk7XG5cbiAgICAgICAgICAgICRzY29wZS5zZWFyY2hHdWVzdCAgICAgID0gbnVsbDtcbiAgICAgICAgICAgICRzY29wZS5jaGVja0luU3RhdHVzICAgID0gJHNjb3BlLnNlbGVjdGVkSXRlbS5zaG9ydF9uYW1lICsgJyBhZGRlZCEnO1xuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzZWxmLmZpbmlzaEVkaXRHdWVzdCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnc3RvcmVHdWVzdCcpO1xuICAgICAgICAgICAgc2VsZi5maW5pc2goKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzZWxmLmZpbmlzaEVkaXRFdmVudCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnc3RvcmVFdmVudCcpO1xuICAgICAgICAgICAgc2VsZi5maW5pc2goKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzZWxmLmNhbmNlbCA9IGZ1bmN0aW9uKCRldmVudCkge1xuICAgICAgICAgICAgJG1kRGlhbG9nLmNhbmNlbCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNlbGYuZmluaXNoID0gZnVuY3Rpb24oJGV2ZW50KSB7XG4gICAgICAgICAgICAkbWREaWFsb2cuaGlkZSgpO1xuICAgICAgICB9O1xuICAgIH1cbiIsImFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuc2VydmljZXMnLCBbJ25nUmVzb3VyY2UnXSlcblxuICAgIC5mYWN0b3J5KCdBdXRoJywgZnVuY3Rpb24gKCRodHRwLCAkbG9jYWxTdG9yYWdlLCBBUElfVVJMKSB7XG4gICAgICAgIGZ1bmN0aW9uIHVybEJhc2U2NERlY29kZShzdHIpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSBzdHIucmVwbGFjZSgnLScsICcrJykucmVwbGFjZSgnXycsICcvJyk7XG4gICAgICAgICAgICBzd2l0Y2ggKG91dHB1dC5sZW5ndGggJSA0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCArPSAnPT0nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCArPSAnPSc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdJbGxlZ2FsIGJhc2U2NHVybCBzdHJpbmchJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB3aW5kb3cuYXRvYihvdXRwdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0Q2xhaW1zRnJvbVRva2VuKCkge1xuICAgICAgICAgICAgdmFyIHRva2VuID0gJGxvY2FsU3RvcmFnZS50b2tlbjtcbiAgICAgICAgICAgIHZhciB1c2VyID0ge307XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHZhciBlbmNvZGVkID0gdG9rZW4uc3BsaXQoJy4nKVsxXTtcbiAgICAgICAgICAgICAgICB1c2VyID0gSlNPTi5wYXJzZSh1cmxCYXNlNjREZWNvZGUoZW5jb2RlZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdG9rZW5DbGFpbXMgPSBnZXRDbGFpbXNGcm9tVG9rZW4oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2lnbnVwOiBmdW5jdGlvbiAoZGF0YSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KEFQSV9VUkwgKyAndXNlcnMvc2lnbnVwJywgZGF0YSkuc3VjY2VzcyhzdWNjZXNzKS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2lnbmluOiBmdW5jdGlvbiAoZGF0YSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KEFQSV9VUkwgKyAndXNlcnMvc2lnbmluJywgZGF0YSkuc3VjY2VzcyhzdWNjZXNzKS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbG9nb3V0OiBmdW5jdGlvbiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHRva2VuQ2xhaW1zID0ge307XG4gICAgICAgICAgICAgICAgZGVsZXRlICRsb2NhbFN0b3JhZ2UudG9rZW47XG4gICAgICAgICAgICAgICAgc3VjY2VzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFRva2VuQ2xhaW1zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuQ2xhaW1zO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pXG5cbiAgICAuZmFjdG9yeSgnRXZlbnRzJywgZnVuY3Rpb24gKCRyZXNvdXJjZSwgQVBJX1VSTCkge1xuICAgICAgICByZXR1cm4gJHJlc291cmNlKEFQSV9VUkwgKyBcImV2ZW50cy86ZXZlbnRTbHVnLzpkYXRhXCIsIHt9LCB7XG4gICAgICAgICAgICBkZWxldGU6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEFQSV9VUkwgKyBcImV2ZW50cy86ZXZlbnRTbHVnL2RlbGV0ZVwiLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBldmVudFNsdWc6ICdAZXZlbnRTbHVnJyxcbiAgICAgICAgICAgICAgICAgICAgY3N2OiAnQGNzdicsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgc3RvcmU6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEFQSV9VUkwgKyBcImV2ZW50cy9zdG9yZVwiLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBldmVudDogJ0BldmVudCcsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSlcblxuICAgIC5mYWN0b3J5KCdHdWVzdHMnLCBmdW5jdGlvbiAoJHJlc291cmNlLCBBUElfVVJMKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoQVBJX1VSTCArIFwiZ3Vlc3RzXCIsIHt9LCB7XG4gICAgICAgICAgICBjaGVja0luOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBBUElfVVJMICsgXCJldmVudHMvOmV2ZW50U2x1Zy9ndWVzdHMvOmd1ZXN0SWQvOmRhdGFcIixcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRTbHVnOiAnQGV2ZW50U2x1ZycsXG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0SWQ6ICdAZ3Vlc3RJZCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdAZGF0YScsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcmVtb3ZlOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBBUElfVVJMICsgXCJldmVudHMvOmV2ZW50U2x1Zy9ndWVzdHMvOmd1ZXN0SWQvOmRhdGFcIixcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRTbHVnOiAnQGV2ZW50U2x1ZycsXG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0SWQ6ICdAZ3Vlc3RJZCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdAZGF0YScsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZGVsZXRlOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBBUElfVVJMICsgXCJndWVzdHMvOmd1ZXN0SWQvZGVsZXRlXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0SWQ6ICdAZ3Vlc3RJZCcsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgc3RvcmU6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEFQSV9VUkwgKyBcImd1ZXN0cy9zdG9yZVwiLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBndWVzdDogJ0BndWVzdCcsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSlcblxuICAgIC5mYWN0b3J5KCdVc2VycycsIGZ1bmN0aW9uICgkcmVzb3VyY2UsIEFQSV9VUkwpIHtcbiAgICAgICAgcmV0dXJuICRyZXNvdXJjZShBUElfVVJMICsgXCJtZVwiLCB7fSwge1xuICAgICAgICAgICAgbWU6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEFQSV9VUkwgKyBcIm1lXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSlcblxuICAgIC5zZXJ2aWNlKCdHdWVzdHNTZXJ2aWNlJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEd1ZXN0cykge1xuXG4gICAgICAgIHRoaXMuZ2V0R3Vlc3RzICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBndWVzdHMgID0gR3Vlc3RzLmdldChmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBpbXByb3ZlIHRoaXNcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmd1ZXN0cyAgID0gcmVzdWx0LmRhdGE7XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkd1ZXN0c1NlcnZpY2UgOjogRXJyb3IgZ2V0dGluZyBndWVzdHMhXCIpO1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldEd1ZXN0cygpO1xuICAgIH0pXG5cbiAgICAuc2VydmljZSgnVXNlcnNTZXJ2aWNlJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIFVzZXJzKSB7XG5cbiAgICAgICAgdGhpcy5nZXRDdXJyZW50VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB1c2VyICAgID0gVXNlcnMubWUoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gaW1wcm92ZSB0aGlzXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS5hdXRoVXNlciA9IHJlc3VsdC5kYXRhO1xuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJHdWVzdHNTZXJ2aWNlIDo6IEVycm9yIGdldHRpbmcgZ3Vlc3RzIVwiKTtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRDdXJyZW50VXNlcigpO1xuICAgIH0pO1xuIl19
