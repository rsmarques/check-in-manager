(function(){
    "use strict";

    var app = angular.module('check_in_app', [
        'check_in_app.controllers',
        'check_in_app.services',
        'check_in_app.routes',
        'check_in_app.config'
    ]);


    angular.module('check_in_app.routes', ['ui.router', 'ngStorage']);
    angular.module('check_in_app.controllers', ['ui.router', 'ngMaterial', 'ngMessages', 'ngStorage', 'mdPickers', 'nvd3']);
    angular.module('check_in_app.services', ['ngResource']);
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
                templateUrl: './views/app/auth/auth.html',
                controller: 'AuthCtrl',
                register: 1
            })
            .state('signin', {
                url: '/signin',
                templateUrl: './views/app/auth/auth.html',
                controller: 'AuthCtrl',
                register: 0
            })
            .state('guests', {
                url: '/guests',
                templateUrl: './views/app/guests/guests.html',
                controller: 'GuestCtrl'
            })
            .state('events', {
                url: '/events',
                templateUrl: './views/app/events/events.html',
                controller: 'EventCtrl'
            })
            .state('stats', {
                url: '/stats',
                templateUrl: './views/app/stats/stats.html',
                controller: 'StatsCtrl'
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

(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:AuthCtrl
     * @description
     * # AuthCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('AuthCtrl', ["$rootScope", "$scope", "$state", "$location", "$localStorage", "Auth", "GuestSrv", "AuthSrv", function ($rootScope, $scope, $state, $location, $localStorage, Auth, GuestSrv, AuthSrv) {

        function successAuth (res) {
            $localStorage.token = res.data.token;
            window.location = "#/events";

            // TODO remove this from here
            // reload guests after successful login
            GuestSrv.getGuests();
            AuthSrv.getCurrentUser();
        }

        $scope.performLogin = function () {
            console.log('performLogin');
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
    }]);

})();

(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.service:Auth
     * @description
     * # Auth
     * Service of the checkInManager
     */
    angular.module('check_in_app.services').factory('Auth', ["$http", "$localStorage", "API_URL", function ($http, $localStorage, API_URL) {
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
                $http.post(API_URL + 'users/signup', data).then(success).catch(error);
            },
            signin: function (data, success, error) {
                $http.post(API_URL + 'users/signin', data).then(success).catch(error);
            },
            logout: function (success) {
                tokenClaims = {};
                delete $localStorage.token;
                success();
            },
            getTokenClaims: function () {
                return tokenClaims;
            },
            me: function (success, error) {
                $http.get(API_URL + 'me').then(success).catch(error);
            }
        };
    }])

    .service('AuthSrv', ["$rootScope", "Auth", function ($rootScope, Auth) {

        this.getCurrentUser = function () {
            var user    = Auth.me(function (result) {
                // TODO improve this
                $rootScope.authUser = result.data.data;

            }, function (err) {
                // console.log(err);
            });
        };

        this.getCurrentUser();
    }]);
})();

(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:DialogCtrl
     * @description
     * # DialogCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('DialogCtrl', ["$timeout", "$q", "$rootScope", "$scope", "$mdDialog", "guests", "currentEvent", "currentGuest", function ($timeout, $q, $rootScope, $scope, $mdDialog, guests, currentEvent, currentGuest) {

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
    }]);

})();

(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:EventCtrl
     * @description
     * # EventCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('EventCtrl', ["$rootScope", "$window", "$scope", "$http", "$stateParams", "$location", "$mdDialog", "$mdMedia", "$mdToast", "API_URL", "Event", "Guest", "GuestSrv", "AuthSrv", function ($rootScope, $window, $scope, $http, $stateParams, $location, $mdDialog, $mdMedia, $mdToast, API_URL, Event, Guest, GuestSrv, AuthSrv) {

        // TODO change openDialogs location
        $scope.openGuestDialog = function ($event)
        {
            $scope.checkInStatus    = null;

            $mdDialog.show({
                controller: 'DialogCtrl',
                controllerAs: 'ctrl',
                templateUrl: './views/app/dialogs/guest_checkin.html',
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
                controller: 'DialogCtrl',
                controllerAs: 'ctrl',
                templateUrl: './views/app/dialogs/edit_event.html',
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
            var originatorEv = ev;
            $mdOpenMenu(ev);
        };

        $scope.selectEvent  = function (event)
        {
            $location.search({'p' : event.slug});
        };

        $scope.findEvent    = function (eventSlug)
        {
            if (!$scope.events) {
                return false;
            }

            var result          = $scope.events.find(function (event) {
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

            var g                       = Event.get({eventSlug: event.slug, data: 'guests'}, function (result) {

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

            Guest.checkIn({eventSlug: event.slug, guestId: eventGuest.id, data: 'checkin'}, function (result) {

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

                    Event.delete({eventSlug: event.slug});

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

                    Guest.remove({eventSlug: event.slug, guestId: guest.id, data: 'remove'}, function (result) {
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
            var windowHeight        = $window.innerHeight;
            var navBarHeight        = $('#navbar').outerHeight(true);
            var eventHeaderHeight   = $('#eventHeader').outerHeight(true);

            var listHeight          = windowHeight - navBarHeight - eventHeaderHeight - 10;

            return {height: '' + listHeight + 'px'};
        };

        $scope.getEventRepeaterHeight = function ()
        {
            var windowHeight            = $window.innerHeight;
            var navBarHeight            = $('#navbar').outerHeight(true);
            var eventSearchBarHeight    = $('#eventSearchBar').outerHeight(true);

            var listHeight              = windowHeight - navBarHeight - eventSearchBarHeight - 10;

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
            Event.get({eventSlug: event.slug, data: 'guests', csv: 1}, function (result) {

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

            Event.store({event: $scope.currentEvent}, function (result) {

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

        Event.get(function (result) {

            $scope.events   = result.data;

            // TODO improve this
            angular.forEach($scope.events, function (event, key) {

                var date                    = moment($scope.events[key].date.date);
                $scope.events[key].date     = new Date(date);
                $scope.events[key].time     = new Date(date);
            });

            $scope.checkCurrentEvent();
        });

        $scope.loadingGuests    = false;
        $scope.sortEvent        = 'upcoming';
    }]);

})();

(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.service:EventSrv
     * @description
     * # EventSrv
     * Service of the checkInManager
     */
    angular.module('check_in_app.services').factory('Event', ["$resource", "API_URL", function ($resource, API_URL) {
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
    }]);
})();

(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:GuestCtrl
     * @description
     * # GuestCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('GuestCtrl', ["$rootScope", "$scope", "$http", "$stateParams", "$location", "$mdDialog", "$mdToast", "$window", "API_URL", "Guest", "GuestSrv", "AuthSrv", function ($rootScope, $scope, $http, $stateParams, $location, $mdDialog, $mdToast, $window, API_URL, Guest, GuestSrv, AuthSrv) {

        $scope.openGuestEditDialog = function ($event, editMode, guest)
        {
            $scope.editMode             = editMode;
            if (typeof guest !== "undefined") {
                $scope.currentGuest     = guest;
            } else {
                $scope.currentGuest     = {};
            }

            $mdDialog.show({
                controller: 'DialogCtrl',
                controllerAs: 'ctrl',
                templateUrl: './views/app/dialogs/edit_guest.html',
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

                    Guest.delete({guestId: guest.id});
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

            var windowHeight            = $window.innerHeight;
            var navBarHeight            = $('#navbar').outerHeight(true);
            var guestListHeaderHeight   = $('#guestListHeader').outerHeight(true);
            var guestTableHeaderHeight  = $('#guestTableHeader').outerHeight(true);

            var listHeight              = windowHeight - navBarHeight - guestListHeaderHeight - guestTableHeaderHeight - 10;

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

            Guest.store({guest: $scope.currentGuest}, function (result) {

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
    }]);
})();

(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.service:GuestSrv
     * @description
     * # GuestSrv
     * Service of the checkInManager
     */
    angular.module('check_in_app.services').factory('Guest', ["$resource", "API_URL", function ($resource, API_URL) {
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

    .service('GuestSrv', ["$rootScope", "Guest", function ($rootScope, Guest) {

        this.getGuests  = function () {
            var guests  = Guest.get(function (result) {
                // TODO improve this
                $rootScope.guests   = result.data;

            }, function (err) {
                // console.log(err);
            });
        };

        this.getGuests();
    }]);
})();

(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:StatsCtrl
     * @description
     * # StatsCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('StatsCtrl', ["$rootScope", "$window", "$scope", "$http", function ($rootScope, $window, $scope, $http) {

        $scope.valueMode = "absolute";
        $scope.options = {};
        $scope.data = {};

        $scope.options.industry_abs = {
            chart: {
                type: 'multiBarChart',
                height: 320,
                margin : {
                    top: 20,
                    right: 20,
                    bottom: 45,
                    left: 45
                },
                groupSpacing: 0.5,
                clipEdge: true,
                duration: 500,
                stacked: true,
                xAxis: {
                    axisLabel: 'Industry',
                    rotateLabels: -45,
                    showMaxMin: false
                },
                yAxis: {
                    axisLabel: 'Attendance',
                    axisLabelDistance: -20,
                    tickFormat: function(d){
                        return d3.format(',.1f')(d);
                    }
                }
            }
        };

        $scope.data.industry_abs = [
            {
                "key":"Masters",
                "values":[
                    {
                        "x":'Advisory Services',
                        "y":1.2664003684956475
                    },
                    {
                        "x":'Finance',
                        "y":1.6795513370727713
                    },
                    {
                        "x":'Consulting',
                        "y":2.2921386673207715
                    },
                    {
                        "x":'Consumer Goods',
                        "y":2.8619498121446107
                    },
                    {
                        "x":'Retail/Distribution',
                        "y":3.5410266547028066
                    },
                    {
                        "x":'Automotive',
                        "y":4.091176894025124
                    },
                    {
                        "x":'Technology',
                        "y":4.551499931914426
                    },
                    {
                        "x":'Other',
                        "y":4.715440921680209
                    },
                    {
                        "x":'Auditing',
                        "y":4.675852604493229
                    },
                    {
                        "x":'Leadership',
                        "y":4.484398210964935
                    }
                ]
            },
            {
                "key":"Bachelor",
                "values":[
                    {
                        "x":'Advisory Services',
                        "y":0.12021273793676855
                    },
                    {
                        "x":'Finance',
                        "y":0.13768817009214815
                    },
                    {
                        "x":'Consulting',
                        "y":0.12204452110121121
                    },
                    {
                        "x":'Consumer Goods',
                        "y":0.12054993382778627
                    },
                    {
                        "x":'Retail/Distribution',
                        "y":0.18426879292854415
                    },
                    {
                        "x":'Automotive',
                        "y":0.17527175080936921
                    },
                    {
                        "x":'Technology',
                        "y":0.1384873449919697
                    },
                    {
                        "x":'Other',
                        "y":0.13694225819915642
                    },
                    {
                        "x":'Auditing',
                        "y":0.18711117296005494
                    },
                    {
                        "x":'Leadership',
                        "y":0.18954643407168156
                    }
                ]
            },
            {
                "key":"Other",
                "values":[
                    {
                        "x":'Advisory Services',
                        "y":0.1387871281835065
                    },
                    {
                        "x":'Finance',
                        "y":0.18212354479384876
                    },
                    {
                        "x":'Consulting',
                        "y":0.16845584598910426
                    },
                    {
                        "x":'Consumer Goods',
                        "y":0.17614274374453373
                    },
                    {
                        "x":'Retail/Distribution',
                        "y":0.15998712084908245
                    },
                    {
                        "x":'Automotive',
                        "y":0.15676179440625723
                    },
                    {
                        "x":'Technology',
                        "y":0.1746058890227924
                    },
                    {
                        "x":'Other',
                        "y":0.17364961027332312
                    },
                    {
                        "x":'Auditing',
                        "y":0.15354579937776675
                    },
                    {
                        "x":'Leadership',
                        "y":0.1247761751552973
                    }
                ]
            }
        ]

        $scope.options.industry_percentage = {
            chart: {
                type: 'pieChart',
                height: 320,
                x: function(d){return d.key;},
                y: function(d){return d.y;},
                showLabels: true,
                labelSunbeamLayout: false,
                donut: true,
                donutRatio: 0.35,
                labelType: "percent",
                duration: 500,
                labelThreshold: 0.01,
                legend: {
                    margin: {
                        top: 5,
                        right: 35,
                        bottom: 5,
                        left: 0
                    }
                }
            }
        };

        $scope.data.industry_percentage = [
            {
                "key":'Advisory Services',
                "y":0.1387871281835065
            },
            {
                "key":'Finance',
                "y":0.18212354479384876
            },
            {
                "key":'Consulting',
                "y":0.16845584598910426
            },
            {
                "key":'Consumer Goods',
                "y":0.17614274374453373
            },
            {
                "key":'Retail/Distribution',
                "y":0.15998712084908245
            },
            {
                "key":'Automotive',
                "y":0.15676179440625723
            },
            {
                "key":'Technology',
                "y":0.1746058890227924
            },
            {
                "key":'Other',
                "y":0.17364961027332312
            },
            {
                "key":'Auditing',
                "y":0.15354579937776675
            },
            {
                "key":'Leadership',
                "y":0.1247761751552973
            }
        ];

        $scope.options.time = {
            chart: {
                type: 'lineChart',
                height: 450,
                margin : {
                    top: 20,
                    right: 20,
                    bottom: 40,
                    left: 55
                },
                x: function(d){ console.log(d); return d.x; },
                y: function(d){ console.log(d); return d.y; },
                useInteractiveGuideline: true,
                xAxis: {
                    axisLabel: 'Date',
                    // rotateLabels: -45,
                    tickFormat: function(d){
                        return d3.time.format('%B %Y')(new Date(d))
                    }
                },
                yAxis: {
                    axisLabel: 'Attendance',
                    axisLabelDistance: -10
                }
            }
        };

        $scope.data.time = [
            {
                values: [{"x": 1472688000000, "y": 400}, {"x": 1475280000000, "y": 300}, {"x": 1477958400000, "y": 128}, {"x": 1480550400000, "y": 333}, {"x": 1485907200000, "y": 520}, {"x": 1488326400000, "y": 400}],      //values - represents the array of {x,y} data points
                key: 'Masters', //key  - the name of the series.
                color: '#ff7f0e',  //color - optional: choose your own line color.
                strokeWidth: 2,
                area: true      //area - set to true if you want this line to turn into a filled area chart.
            },
            {
                values: [{"x": 1472688000000, "y": 132}, {"x": 1475280000000, "y": 221}, {"x": 1477958400000, "y": 60}, {"x": 1480550400000, "y": 120}, {"x": 1485907200000, "y": 400}, {"x": 1488326400000, "y": 200}],      //values - represents the array of {x,y} data points
                key: 'Bachelor',
                color: '#2ca02c',
                area: true      //area - set to true if you want this line to turn into a filled area chart.
            },
            {
                values: [{"x": 1472688000000, "y": 32}, {"x": 1475280000000, "y": 21}, {"x": 1477958400000, "y": 10}, {"x": 1480550400000, "y": 12}, {"x": 1485907200000, "y": 40}, {"x": 1488326400000, "y": 20}],      //values - represents the array of {x,y} data points
                key: 'Other',
                color: '#7777ff',
                area: true      //area - set to true if you want this line to turn into a filled area chart.
            }
        ];

        $scope.options.countries = {
            chart: {
                type: 'pieChart',
                height: 320,
                x: function(d){return d.key;},
                y: function(d){return d.y;},
                showLabels: true,
                labelSunbeamLayout: false,
                donut: false,
                labelType: "percent",
                duration: 500,
                labelThreshold: 0.01,
                legend: {
                    margin: {
                        top: 5,
                        right: 35,
                        bottom: 5,
                        left: 0
                    }
                }
            }
        };

        $scope.data.countries = [
            {
                "key":'Portugal',
                "y":0.8387871281835065
            },
            {
                "key":'Germany',
                "y":0.28212354479384876
            },
            {
                "key":'Brasil',
                "y":0.16845584598910426
            },
            {
                "key":'China',
                "y":0.17614274374453373
            },
            {
                "key":'France',
                "y":0.15998712084908245
            },
            {
                "key":'Thailand',
                "y":0.15676179440625723
            },
            {
                "key":'Spain',
                "y":0.1746058890227924
            },
            {
                "key":'Great Britain',
                "y":0.17364961027332312
            },
            {
                "key":'Other',
                "y":0.35354579937776675
            }
        ];

    }]);

})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbmZpZy5qcyIsInJvdXRlcy5qcyIsImFwcC9hdXRoL2F1dGhDdHJsLmpzIiwiYXBwL2F1dGgvYXV0aFNydi5qcyIsImFwcC9kaWFsb2dzL2RpYWxvZ0N0cmwuanMiLCJhcHAvZXZlbnRzL2V2ZW50Q3RybC5qcyIsImFwcC9ldmVudHMvZXZlbnRTcnYuanMiLCJhcHAvZ3Vlc3RzL2d1ZXN0Q3RybC5qcyIsImFwcC9ndWVzdHMvZ3Vlc3RTcnYuanMiLCJhcHAvc3RhdHMvc3RhdHNDdHJsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUEsVUFBQTtJQUNBOztJQUVBLElBQUEsTUFBQSxRQUFBLE9BQUEsZ0JBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7OztJQUlBLFFBQUEsT0FBQSx1QkFBQSxDQUFBLGFBQUE7SUFDQSxRQUFBLE9BQUEsNEJBQUEsQ0FBQSxhQUFBLGNBQUEsY0FBQSxhQUFBLGFBQUE7SUFDQSxRQUFBLE9BQUEseUJBQUEsQ0FBQTtJQUNBLFFBQUEsT0FBQSx1QkFBQSxDQUFBOzs7O0FDZEEsQ0FBQSxVQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLHVCQUFBLFNBQUEsV0FBQTs7S0FFQSwyQkFBQSxTQUFBLGlCQUFBO1FBQ0EsZ0JBQUEsUUFBQSxNQUFBOzs7S0FHQSw4QkFBQSxTQUFBLG9CQUFBO1FBQ0EsbUJBQUEsTUFBQSxhQUFBLGtCQUFBLFFBQUE7UUFDQSxtQkFBQSxNQUFBLGVBQUEsa0JBQUEsVUFBQTtRQUNBLG1CQUFBLE1BQUEsZUFBQSxrQkFBQSxlQUFBO1FBQ0EsbUJBQUEsTUFBQSxhQUFBLGtCQUFBLFFBQUE7Ozs7S0FJQSxtQkFBQSxVQUFBLFlBQUE7O1FBRUEsV0FBQSxtQkFBQSxZQUFBO1lBQ0EsT0FBQSxXQUFBLFdBQUEsV0FBQSxTQUFBLFFBQUE7Ozs7OztBQ3BCQSxDQUFBLFVBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsdUJBQUEsc0ZBQUEsVUFBQSxnQkFBQSxvQkFBQSxlQUFBLG1C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QUEsUUFBQTtvQkFDQSxPQUFBOzs7O2dCQUlBLElBQUEsY0FBQSxJQUFBLGdCQUFBO2dCQUNBLElBQUEsY0FBQSxTQUFBLGNBQUE7Z0JBQ0EsRUFBQSxnQkFBQTtnQkFDQSxFQUFBLGdCQUFBO2dCQUNBLEVBQUEsZ0JBQUEsTUFBQSxNQUFBO2dCQUNBLFNBQUEsS0FBQSxZQUFBO2dCQUNBLEVBQUE7O2VBRUEsVUFBQSxPQUFBOzs7OztRQUtBLFFBQUEsaUJBQUEsVUFBQTs7UUFFQSxTQUFBO1FBQ0E7WUFDQSxPQUFBOzs7UUFHQSxPQUFBLElBQUEsY0FBQSxVQUFBLE9BQUE7O1lBRUEsSUFBQSxPQUFBLE9BQUEsYUFBQSxTQUFBLGVBQUEsT0FBQSxPQUFBLGFBQUEsU0FBQSxhQUFBO2dCQUNBLE9BQUEsYUFBQSxLQUFBLFNBQUEsT0FBQSxhQUFBLEtBQUE7Z0JBQ0EsT0FBQSxhQUFBLEtBQUEsV0FBQSxPQUFBLGFBQUEsS0FBQTs7O1lBR0EsT0FBQSxhQUFBLGtCQUFBLE9BQUEsT0FBQSxhQUFBLE1BQUEsT0FBQTs7WUFFQSxNQUFBLE1BQUEsQ0FBQSxPQUFBLE9BQUEsZUFBQSxVQUFBLFFBQUE7O2dCQUVBLElBQUEsa0JBQUEsT0FBQTtnQkFDQSxJQUFBLGtCQUFBLE9BQUEsT0FBQSxJQUFBLFVBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxPQUFBLFFBQUEsTUFBQTs7Z0JBRUEsSUFBQSxlQUFBLENBQUEsR0FBQTs7b0JBRUEsSUFBQSx1QkFBQSxLQUFBLE1BQUEsS0FBQSxVQUFBO29CQUNBLE9BQUEsT0FBQSxRQUFBO29CQUNBLE9BQUEsbUJBQUE7OztlQUdBLFVBQUEsS0FBQTs7Ozs7OztRQU9BLE9BQUEsSUFBQSxnQkFBQSxTQUFBLElBQUEsTUFBQTs7WUFFQSxJQUFBLFVBQUEsS0FBQTtZQUNBLElBQUEsVUFBQSxLQUFBOztZQUVBLE9BQUEsYUFBQSxPQUFBOzs7UUFHQSxPQUFBLE9BQUEsV0FBQSxFQUFBLE9BQUEsVUFBQSxhQUFBLFVBQUEsUUFBQTtZQUNBLE9BQUE7OztRQUdBLE9BQUEsSUFB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VUFBQSxRQUFBOztnQkFFQSxXQUFBLFdBQUEsT0FBQTs7ZUFFQSxVQUFBLEtBQUE7Ozs7O1FBS0EsS0FBQTs7OztBQzlEQSxDQUFBLFVBQUE7SUFDQTs7Ozs7Ozs7O0lBU0EsUUFBQSxPQUFBLDRCQUFBLFdBQUEsMERBQUEsVUFBQSxZQUFBLFNBQUEsUUFBQSxPQUFBOztRQUVBLE9BQUEsWUFBQTtRQUNBLE9BQUEsVUFBQTtRQUNBLE9BQUEsT0FBQTs7UUFFQSxPQUFBLFFBQUEsZUFBQTtZQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxRQUFBO2dCQUNBLFNBQUE7b0JBQ0EsS0FBQTtvQkFDQSxPQUFBO29CQUNBLFFBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsY0FBQTtnQkFDQSxVQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsU0FBQTtnQkFDQSxPQUFBO29CQUNBLFdBQUE7b0JBQ0EsY0FBQSxDQUFBO29CQUNBLFlBQUE7O2dCQUVBLE9BQUE7b0JBQ0EsV0FBQTtvQkFDQSxtQkFBQSxDQUFBO29CQUNBLFlBQUEsU0FBQSxFQUFBO3dCQUNBLE9BQUEsR0FBQSxPQUFBLFFBQUE7Ozs7OztRQU1BLE9BQUEsS0FBQSxlQUFBO1lBQ0E7Z0JBQ0EsTUFBQTtnQkFDQSxTQUFBO29CQUNBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7OztZQUlBO2dCQUNBLE1BQUE7Z0JBQ0EsU0FBQTtvQkFDQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7Ozs7WUFJQTtnQkFDQSxNQUFBO2dCQUNBLFNBQUE7b0JBQ0E7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOzs7Ozs7UUFNQSxPQUFBLFFBQUEsc0JBQUE7WUFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsUUFBQTtnQkFDQSxHQUFBLFNBQUEsRUFBQSxDQUFBLE9BQUEsRUFBQTtnQkFDQSxHQUFBLFNBQUEsRUFBQSxDQUFBLE9BQUEsRUFBQTtnQkFDQSxZQUFBO2dCQUNBLG9CQUFBO2dCQUNBLE9BQUE7Z0JBQ0EsWUFBQTtnQkFDQSxXQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsZ0JBQUE7Z0JBQ0EsUUFBQTtvQkFDQSxRQUFBO3dCQUNBLEtBQUE7d0JBQ0EsT0FBQTt3QkFDQSxRQUFBO3dCQUNBLE1BQUE7Ozs7OztRQU1BLE9BQUEsS0FBQSxzQkFBQTtZQUNBO2dCQUNBLE1BQUE7Z0JBQ0EsSUFBQTs7WUFFQTtnQkFDQSxNQUFBO2dCQUNBLElBQUE7O1lBRUE7Z0JBQ0EsTUFBQTtnQkFDQSxJQUFBOztZQUVBO2dCQUNBLE1BQUE7Z0JBQ0EsSUFBQTs7WUFFQTtnQkFDQSxNQUFBO2dCQUNBLElBQUE7O1lBRUE7Z0JBQ0EsTUFBQTtnQkFDQSxJQUFBOztZQUVBO2dCQUNBLE1BQUE7Z0JBQ0EsSUFBQTs7WUFFQTtnQkFDQSxNQUFBO2dCQUNBLElBQUE7O1lBRUE7Z0JBQ0EsTUFBQTtnQkFDQSxJQUFBOztZQUVBO2dCQUNBLE1BQUE7Z0JBQ0EsSUFBQTs7OztRQUlBLE9BQUEsUUFBQSxPQUFBO1lBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFFBQUE7Z0JBQ0EsU0FBQTtvQkFDQSxLQUFBO29CQUNBLE9BQUE7b0JBQ0EsUUFBQTtvQkFDQSxNQUFBOztnQkFFQSxHQUFBLFNBQUEsRUFBQSxFQUFBLFFBQUEsSUFBQSxJQUFBLE9BQUEsRUFBQTtnQkFDQSxHQUFBLFNBQUEsRUFBQSxFQUFBLFFBQUEsSUFBQSxJQUFBLE9BQUEsRUFBQTtnQkFDQSx5QkFBQTtnQkFDQSxPQUFBO29CQUNBLFdBQUE7O29CQUVBLFlBQUEsU0FBQSxFQUFBO3dCQUNBLE9BQUEsR0FBQSxLQUFBLE9BQUEsU0FBQSxJQUFBLEtBQUE7OztnQkFHQSxPQUFBO29CQUNBLFdBQUE7b0JBQ0EsbUJBQUEsQ0FBQTs7Ozs7UUFLQSxPQUFBLEtBQUEsT0FBQTtZQUNBO2dCQUNBLFFBQUEsQ0FBQSxDQUFBLEtBQUEsZUFBQSxLQUFBLE1BQUEsQ0FBQSxLQUFBLGVBQUEsS0FBQSxNQUFBLENBQUEsS0FBQSxlQUFBLEtBQUEsTUFBQSxDQUFBLEtBQUEsZUFBQSxLQUFBLE1BQUEsQ0FBQSxLQUFBLGVBQUEsS0FBQSxNQUFBLENBQUEsS0FBQSxlQUFBLEtBQUE7Z0JBQ0EsS0FBQTtnQkFDQSxPQUFBO2dCQUNBLGFBQUE7Z0JBQ0EsTUFBQTs7WUFFQTtnQkFDQSxRQUFBLENBQUEsQ0FBQSxLQUFBLGVBQUEsS0FBQSxNQUFBLENBQUEsS0FBQSxlQUFBLEtBQUEsTUFBQSxDQUFBLEtBQUEsZUFBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLGVBQUEsS0FBQSxNQUFBLENBQUEsS0FBQSxlQUFBLEtBQUEsTUFBQSxDQUFBLEtBQUEsZUFBQSxLQUFBO2dCQUNBLEtBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBOztZQUVBO2dCQUNBLFFBQUEsQ0FBQSxDQUFBLEtBQUEsZUFBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLGVBQUEsS0FBQSxLQUFBLENBQUEsS0FBQSxlQUFBLEtBQUEsS0FBQSxDQUFBLEtBQUEsZUFBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLGVBQUEsS0FBQSxLQUFBLENBQUEsS0FBQSxlQUFBLEtBQUE7Z0JBQ0EsS0FBQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Ozs7UUFJQSxPQUFBLFFBQUEsWUFBQTtZQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxRQUFBO2dCQUNBLEdBQUEsU0FBQSxFQUFBLENBQUEsT0FBQSxFQUFBO2dCQUNBLEdBQUEsU0FBQSxFQUFBLENBQUEsT0FBQSxFQUFBO2dCQUNBLFlBQUE7Z0JBQ0Esb0JBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxXQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsZ0JBQUE7Z0JBQ0EsUUFBQTtvQkFDQSxRQUFBO3dCQUNBLEtBQUE7d0JBQ0EsT0FBQTt3QkFDQSxRQUFBO3dCQUNBLE1BQUE7Ozs7OztRQU1BLE9BQUEsS0FBQSxZQUFBO1lBQ0E7Z0JBQ0EsTUFBQTtnQkFDQSxJQUFBOztZQUVBO2dCQUNBLE1BQUE7Z0JBQ0EsSUFBQTs7WUFFQTtnQkFDQSxNQUFBO2dCQUNBLElBQUE7O1lBRUE7Z0JBQ0EsTUFBQTtnQkFDQSxJQUFBOztZQUVBO2dCQUNBLE1BQUE7Z0JBQ0EsSUFBQTs7WUFFQTtnQkFDQSxNQUFBO2dCQUNBLElBQUE7O1lBRUE7Z0JBQ0EsTUFBQTtnQkFDQSxJQUFBOztZQUVBO2dCQUNBLE1BQUE7Z0JBQ0EsSUFBQTs7WUFFQTtnQkFDQSxNQUFBO2dCQUNBLElBQUE7Ozs7Ozs7QUFPQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwJywgW1xuICAgICAgICAnY2hlY2tfaW5fYXBwLmNvbnRyb2xsZXJzJyxcbiAgICAgICAgJ2NoZWNrX2luX2FwcC5zZXJ2aWNlcycsXG4gICAgICAgICdjaGVja19pbl9hcHAucm91dGVzJyxcbiAgICAgICAgJ2NoZWNrX2luX2FwcC5jb25maWcnXG4gICAgXSk7XG5cblxuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAucm91dGVzJywgWyd1aS5yb3V0ZXInLCAnbmdTdG9yYWdlJ10pO1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnLCBbJ3VpLnJvdXRlcicsICduZ01hdGVyaWFsJywgJ25nTWVzc2FnZXMnLCAnbmdTdG9yYWdlJywgJ21kUGlja2VycycsICdudmQzJ10pO1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuc2VydmljZXMnLCBbJ25nUmVzb3VyY2UnXSk7XG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5jb25maWcnLCBbJ25nTWF0ZXJpYWwnXSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29uZmlnJykuY29uc3RhbnQoJ0FQSV9VUkwnLCAnYXBpL3YxLycpXG5cbiAgICAuY29uZmlnKGZ1bmN0aW9uKCRtZEljb25Qcm92aWRlcikge1xuICAgICAgICAkbWRJY29uUHJvdmlkZXIuZm9udFNldCgnbWQnLCAnbWF0ZXJpYWwtaWNvbnMnKTtcbiAgICB9KVxuXG4gICAgLmNvbmZpZyhmdW5jdGlvbigkbWRUaGVtaW5nUHJvdmlkZXIpIHtcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdkYXJrLWdyZXknKS5iYWNrZ3JvdW5kUGFsZXR0ZSgnZ3JleScpLmRhcmsoKTtcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdkYXJrLW9yYW5nZScpLmJhY2tncm91bmRQYWxldHRlKCdvcmFuZ2UnKS5kYXJrKCk7XG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZGFyay1wdXJwbGUnKS5iYWNrZ3JvdW5kUGFsZXR0ZSgnZGVlcC1wdXJwbGUnKS5kYXJrKCk7XG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZGFyay1ibHVlJykuYmFja2dyb3VuZFBhbGV0dGUoJ2JsdWUnKS5kYXJrKCk7XG4gICAgfSlcblxuICAgIC8vIFRPRE8gdGVtcCBzb2x1dGlvbiwgcmVtb3ZlIHRoaXMgZnJvbSBoZXJlXG4gICAgLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuXG4gICAgICAgICRyb290U2NvcGUuaGFzQWRtaW5BY2Nlc3MgICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkcm9vdFNjb3BlLmF1dGhVc2VyID8gJHJvb3RTY29wZS5hdXRoVXNlci5hZG1pbiA6IDA7XG4gICAgICAgIH07XG4gICAgfSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAucm91dGVzJykuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyLCAkaHR0cFByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuXG4gICAgICAgIC8vIHByZXZlbnRpbmcgXCIhXCJcIiBmcm9tIGFwcGVhcmluZyBpbiB1cmxcbiAgICAgICAgJGxvY2F0aW9uUHJvdmlkZXIuaGFzaFByZWZpeCgnJyk7XG5cbiAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgIC5zdGF0ZSgnc2lnbnVwJywge1xuICAgICAgICAgICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvYXV0aC9hdXRoLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBdXRoQ3RybCcsXG4gICAgICAgICAgICAgICAgcmVnaXN0ZXI6IDFcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ3NpZ25pbicsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvc2lnbmluJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL2F1dGgvYXV0aC5odG1sJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQXV0aEN0cmwnLFxuICAgICAgICAgICAgICAgIHJlZ2lzdGVyOiAwXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdndWVzdHMnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL2d1ZXN0cycsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcuL3ZpZXdzL2FwcC9ndWVzdHMvZ3Vlc3RzLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdHdWVzdEN0cmwnXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdldmVudHMnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL2V2ZW50cycsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcuL3ZpZXdzL2FwcC9ldmVudHMvZXZlbnRzLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdFdmVudEN0cmwnXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdzdGF0cycsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvc3RhdHMnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvc3RhdHMvc3RhdHMuaHRtbCcsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ1N0YXRzQ3RybCdcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy9ldmVudHMnKTtcblxuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFsnJHEnLCAnJGxvY2F0aW9uJywgJyRsb2NhbFN0b3JhZ2UnLCBmdW5jdGlvbiAoJHEsICRsb2NhdGlvbiwgJGxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAncmVxdWVzdCc6IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRsb2NhbFN0b3JhZ2UudG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy5oZWFkZXJzLkF1dGhvcml6YXRpb24gPSAnQmVhcmVyICcgKyAkbG9jYWxTdG9yYWdlLnRva2VuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAncmVzcG9uc2VFcnJvcic6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDAgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSA0MDEgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKCcvc2lnbmluJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfV0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgY2hlY2tJbk1hbmFnZXIuY29udHJvbGxlcjpBdXRoQ3RybFxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqICMgQXV0aEN0cmxcbiAgICAgKiBDb250cm9sbGVyIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnKS5jb250cm9sbGVyKCdBdXRoQ3RybCcsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc2NvcGUsICRzdGF0ZSwgJGxvY2F0aW9uLCAkbG9jYWxTdG9yYWdlLCBBdXRoLCBHdWVzdFNydiwgQXV0aFNydikge1xuXG4gICAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3NBdXRoIChyZXMpIHtcbiAgICAgICAgICAgICRsb2NhbFN0b3JhZ2UudG9rZW4gPSByZXMuZGF0YS50b2tlbjtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IFwiIy9ldmVudHNcIjtcblxuICAgICAgICAgICAgLy8gVE9ETyByZW1vdmUgdGhpcyBmcm9tIGhlcmVcbiAgICAgICAgICAgIC8vIHJlbG9hZCBndWVzdHMgYWZ0ZXIgc3VjY2Vzc2Z1bCBsb2dpblxuICAgICAgICAgICAgR3Vlc3RTcnYuZ2V0R3Vlc3RzKCk7XG4gICAgICAgICAgICBBdXRoU3J2LmdldEN1cnJlbnRVc2VyKCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUucGVyZm9ybUxvZ2luID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3BlcmZvcm1Mb2dpbicpO1xuICAgICAgICAgICAgaWYgKCRzY29wZS5yZWdpc3Rlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2lnbnVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2lnbmluKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNpZ25pbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBmb3JtRGF0YSA9IHtcbiAgICAgICAgICAgICAgICBlbWFpbDogJHNjb3BlLmNyZWRlbnRpYWxzLmVtYWlsLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiAkc2NvcGUuY3JlZGVudGlhbHMucGFzc3dvcmRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuZXJyb3IgICAgPSBudWxsO1xuXG4gICAgICAgICAgICBBdXRoLnNpZ25pbihmb3JtRGF0YSwgc3VjY2Vzc0F1dGgsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmVycm9yID0gJ0ludmFsaWQgZW1haWwvcGFzc3dvcmQuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaWdudXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZm9ybURhdGEgPSB7XG4gICAgICAgICAgICAgICAgZW1haWw6ICRzY29wZS5jcmVkZW50aWFscy5lbWFpbCxcbiAgICAgICAgICAgICAgICBwYXNzd29yZDogJHNjb3BlLmNyZWRlbnRpYWxzLnBhc3N3b3JkXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLmVycm9yICAgICAgICAgICAgPSBudWxsO1xuXG4gICAgICAgICAgICBBdXRoLnNpZ251cChmb3JtRGF0YSwgc3VjY2Vzc0F1dGgsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLmVycm9ycyAmJiBlcnIuZXJyb3JzWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuZXJyb3IgICAgPSBlcnIuZXJyb3JzWzBdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuZXJyb3IgICAgPSAnRmFpbGVkIHRvIHNpZ251cCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIEF1dGgubG9nb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBcIi9cIjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICAkc2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLnJlZ2lzdGVyICAgICA9ICRzdGF0ZS5jdXJyZW50LnJlZ2lzdGVyO1xuICAgICAgICAgICAgJHNjb3BlLmxvZ2luVGV4dCAgICA9ICRzY29wZS5yZWdpc3RlciA/ICdSZWdpc3RlcicgOiAnTG9naW4nO1xuICAgICAgICAgICAgJHJvb3RTY29wZS5lcnJvciAgICA9IG51bGw7XG4gICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUudG9rZW4gICAgICAgICA9ICRsb2NhbFN0b3JhZ2UudG9rZW47XG4gICAgICAgICRzY29wZS50b2tlbkNsYWltcyAgID0gQXV0aC5nZXRUb2tlbkNsYWltcygpO1xuICAgIH0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBjaGVja0luTWFuYWdlci5zZXJ2aWNlOkF1dGhcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIEF1dGhcbiAgICAgKiBTZXJ2aWNlIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuc2VydmljZXMnKS5mYWN0b3J5KCdBdXRoJywgZnVuY3Rpb24gKCRodHRwLCAkbG9jYWxTdG9yYWdlLCBBUElfVVJMKSB7XG4gICAgICAgIGZ1bmN0aW9uIHVybEJhc2U2NERlY29kZShzdHIpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSBzdHIucmVwbGFjZSgnLScsICcrJykucmVwbGFjZSgnXycsICcvJyk7XG4gICAgICAgICAgICBzd2l0Y2ggKG91dHB1dC5sZW5ndGggJSA0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCArPSAnPT0nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCArPSAnPSc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdJbGxlZ2FsIGJhc2U2NHVybCBzdHJpbmchJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB3aW5kb3cuYXRvYihvdXRwdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0Q2xhaW1zRnJvbVRva2VuKCkge1xuICAgICAgICAgICAgdmFyIHRva2VuID0gJGxvY2FsU3RvcmFnZS50b2tlbjtcbiAgICAgICAgICAgIHZhciB1c2VyID0ge307XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHZhciBlbmNvZGVkID0gdG9rZW4uc3BsaXQoJy4nKVsxXTtcbiAgICAgICAgICAgICAgICB1c2VyID0gSlNPTi5wYXJzZSh1cmxCYXNlNjREZWNvZGUoZW5jb2RlZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdG9rZW5DbGFpbXMgPSBnZXRDbGFpbXNGcm9tVG9rZW4oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2lnbnVwOiBmdW5jdGlvbiAoZGF0YSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KEFQSV9VUkwgKyAndXNlcnMvc2lnbnVwJywgZGF0YSkudGhlbihzdWNjZXNzKS5jYXRjaChlcnJvcik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2lnbmluOiBmdW5jdGlvbiAoZGF0YSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KEFQSV9VUkwgKyAndXNlcnMvc2lnbmluJywgZGF0YSkudGhlbihzdWNjZXNzKS5jYXRjaChlcnJvcik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbG9nb3V0OiBmdW5jdGlvbiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHRva2VuQ2xhaW1zID0ge307XG4gICAgICAgICAgICAgICAgZGVsZXRlICRsb2NhbFN0b3JhZ2UudG9rZW47XG4gICAgICAgICAgICAgICAgc3VjY2VzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFRva2VuQ2xhaW1zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuQ2xhaW1zO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1lOiBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAkaHR0cC5nZXQoQVBJX1VSTCArICdtZScpLnRoZW4oc3VjY2VzcykuY2F0Y2goZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pXG5cbiAgICAuc2VydmljZSgnQXV0aFNydicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoKSB7XG5cbiAgICAgICAgdGhpcy5nZXRDdXJyZW50VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB1c2VyICAgID0gQXV0aC5tZShmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBpbXByb3ZlIHRoaXNcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmF1dGhVc2VyID0gcmVzdWx0LmRhdGEuZGF0YTtcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldEN1cnJlbnRVc2VyKCk7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBjaGVja0luTWFuYWdlci5jb250cm9sbGVyOkRpYWxvZ0N0cmxcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIERpYWxvZ0N0cmxcbiAgICAgKiBDb250cm9sbGVyIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnKS5jb250cm9sbGVyKCdEaWFsb2dDdHJsJywgZnVuY3Rpb24gKCR0aW1lb3V0LCAkcSwgJHJvb3RTY29wZSwgJHNjb3BlLCAkbWREaWFsb2csIGd1ZXN0cywgY3VycmVudEV2ZW50LCBjdXJyZW50R3Vlc3QpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHNjb3BlLmFsbEd1ZXN0cyAgICAgICAgPSBndWVzdHM7XG4gICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQgICAgID0gY3VycmVudEV2ZW50O1xuICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0ICAgICA9IGN1cnJlbnRHdWVzdDtcbiAgICAgICAgJHNjb3BlLmNoZWNrSW5TdGF0dXMgICAgPSBudWxsO1xuXG4gICAgICAgICRzY29wZS5zZWFyY2hHdWVzdHMgPSBmdW5jdGlvbiAoc2VhcmNoS2V5KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoJHNjb3BlLmFsbEd1ZXN0cyA9PT0gbnVsbCB8fCB0eXBlb2YgJHNjb3BlLmFsbEd1ZXN0cyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRPRE8gcHV0IHRoaXMgdG8gZnVuY3Rpb25cbiAgICAgICAgICAgIHZhciBzZWFyY2hLZXlOb3JtYWxpemVkID0gc2VhcmNoS2V5LnJlcGxhY2UoL1vDocOgw6PDosOkXS9naSxcImFcIikucmVwbGFjZSgvW8Opw6jCqMOqXS9naSxcImVcIikucmVwbGFjZSgvW8Otw6zDr8OuXS9naSxcImlcIikucmVwbGFjZSgvW8Ozw7LDtsO0w7VdL2dpLFwib1wiKS5yZXBsYWNlKC9bw7rDucO8w7tdL2dpLCBcInVcIikucmVwbGFjZSgvW8OnXS9naSwgXCJjXCIpLnJlcGxhY2UoL1vDsV0vZ2ksIFwiblwiKTtcblxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJzZWFyY2hpbmcgZ3Vlc3RzIHdpdGggXCIgKyBzZWFyY2hLZXlOb3JtYWxpemVkKTtcbiAgICAgICAgICAgIHZhciBndWVzdHMgICAgICAgICAgICAgID0gJHNjb3BlLmFsbEd1ZXN0cy5maWx0ZXIoZnVuY3Rpb24gKGd1ZXN0KSB7XG5cbiAgICAgICAgICAgICAgICAvLyBUT0RPIHB1dCB0aGlzIHRvIGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgdmFyIGd1ZXN0TmFtZU5vcm1hbGl6ZWQgICAgICAgICA9IGd1ZXN0Lm5hbWUucmVwbGFjZSgvW8Ohw6DDo8Oiw6RdL2dpLFwiYVwiKS5yZXBsYWNlKC9bw6nDqMKow6pdL2dpLFwiZVwiKS5yZXBsYWNlKC9bw63DrMOvw65dL2dpLFwiaVwiKS5yZXBsYWNlKC9bw7PDssO2w7TDtV0vZ2ksXCJvXCIpLnJlcGxhY2UoL1vDusO5w7zDu10vZ2ksIFwidVwiKS5yZXBsYWNlKC9bw6ddL2dpLCBcImNcIikucmVwbGFjZSgvW8OxXS9naSwgXCJuXCIpO1xuICAgICAgICAgICAgICAgIHZhciBndWVzdFNob3J0TmFtZU5vcm1hbGl6ZWQgICAgPSBndWVzdC5zaG9ydF9uYW1lLnJlcGxhY2UoL1vDocOgw6PDosOkXS9naSxcImFcIikucmVwbGFjZSgvW8Opw6jCqMOqXS9naSxcImVcIikucmVwbGFjZSgvW8Otw6zDr8OuXS9naSxcImlcIikucmVwbGFjZSgvW8Ozw7LDtsO0w7VdL2dpLFwib1wiKS5yZXBsYWNlKC9bw7rDucO8w7tdL2dpLCBcInVcIikucmVwbGFjZSgvW8OnXS9naSwgXCJjXCIpLnJlcGxhY2UoL1vDsV0vZ2ksIFwiblwiKTtcblxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIChndWVzdC5lbWFpbCAmJiBndWVzdC5lbWFpbC50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoS2V5Tm9ybWFsaXplZC50b0xvd2VyQ2FzZSgpKSA+IC0xKSB8fFxuICAgICAgICAgICAgICAgICAgICBndWVzdE5hbWVOb3JtYWxpemVkLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihzZWFyY2hLZXlOb3JtYWxpemVkLnRvTG93ZXJDYXNlKCkpID4gLTEgfHxcbiAgICAgICAgICAgICAgICAgICAgKGd1ZXN0LnNsdWcgJiYgZ3Vlc3Quc2x1Zy50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoS2V5Tm9ybWFsaXplZC50b0xvd2VyQ2FzZSgpKSA+IC0xKSB8fFxuICAgICAgICAgICAgICAgICAgICBndWVzdFNob3J0TmFtZU5vcm1hbGl6ZWQudG9Mb3dlckNhc2UoKS5pbmRleE9mKHNlYXJjaEtleU5vcm1hbGl6ZWQudG9Mb3dlckNhc2UoKSkgPiAtMTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gZ3Vlc3RzLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRJdGVtQ2hhbmdlID0gZnVuY3Rpb24gKGl0ZW0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRJdGVtID09PSBudWxsIHx8IHR5cGVvZiAkc2NvcGUuc2VsZWN0ZWRJdGVtID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBicm9hZGNhc3RpbmcgZXZlbnQgdG8gZXZlbnRDb250cm9sbGVyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2NoZWNrSW5FdmVudCcsIHsnZXZlbnQnIDogJHNjb3BlLmN1cnJlbnRFdmVudCwgJ2d1ZXN0JyA6ICRzY29wZS5zZWxlY3RlZEl0ZW19KTtcblxuICAgICAgICAgICAgJHNjb3BlLnNlYXJjaEd1ZXN0ICAgICAgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrSW5TdGF0dXMgICAgPSAkc2NvcGUuc2VsZWN0ZWRJdGVtLnNob3J0X25hbWUgKyAnIGFkZGVkISc7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNlbGYuZmluaXNoRWRpdEd1ZXN0ID0gZnVuY3Rpb24gKCRldmVudCkge1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdzdG9yZUd1ZXN0Jyk7XG4gICAgICAgICAgICBzZWxmLmZpbmlzaCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNlbGYuZmluaXNoRWRpdEV2ZW50ID0gZnVuY3Rpb24gKCRldmVudCkge1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdzdG9yZUV2ZW50Jyk7XG4gICAgICAgICAgICBzZWxmLmZpbmlzaCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNlbGYuY2FuY2VsID0gZnVuY3Rpb24oJGV2ZW50KSB7XG4gICAgICAgICAgICAkbWREaWFsb2cuY2FuY2VsKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2VsZi5maW5pc2ggPSBmdW5jdGlvbigkZXZlbnQpIHtcbiAgICAgICAgICAgICRtZERpYWxvZy5oaWRlKCk7XG4gICAgICAgIH07XG4gICAgfSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGNoZWNrSW5NYW5hZ2VyLmNvbnRyb2xsZXI6RXZlbnRDdHJsXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogIyBFdmVudEN0cmxcbiAgICAgKiBDb250cm9sbGVyIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnKS5jb250cm9sbGVyKCdFdmVudEN0cmwnLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHdpbmRvdywgJHNjb3BlLCAkaHR0cCwgJHN0YXRlUGFyYW1zLCAkbG9jYXRpb24sICRtZERpYWxvZywgJG1kTWVkaWEsICRtZFRvYXN0LCBBUElfVVJMLCBFdmVudCwgR3Vlc3QsIEd1ZXN0U3J2LCBBdXRoU3J2KSB7XG5cbiAgICAgICAgLy8gVE9ETyBjaGFuZ2Ugb3BlbkRpYWxvZ3MgbG9jYXRpb25cbiAgICAgICAgJHNjb3BlLm9wZW5HdWVzdERpYWxvZyA9IGZ1bmN0aW9uICgkZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5jaGVja0luU3RhdHVzICAgID0gbnVsbDtcblxuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coe1xuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdEaWFsb2dDdHJsJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyQXM6ICdjdHJsJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL2RpYWxvZ3MvZ3Vlc3RfY2hlY2tpbi5odG1sJyxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5ib2R5KSxcbiAgICAgICAgICAgICAgICAvLyBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIC8vIHByZXNlcnZlU2NvcGU6IHRydWUsXG4gICAgICAgICAgICAgICAgbG9jYWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0czogJHNjb3BlLmd1ZXN0cyxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEV2ZW50OiAkc2NvcGUuY3VycmVudEV2ZW50LFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50R3Vlc3Q6IG51bGwsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB0YXJnZXRFdmVudDogJGV2ZW50LFxuICAgICAgICAgICAgICAgIGNsaWNrT3V0c2lkZVRvQ2xvc2U6dHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLm9wZW5FdmVudERpYWxvZyA9IGZ1bmN0aW9uICgkZXZlbnQsIG5ld0V2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAobmV3RXZlbnQpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudW5jaGVja0N1cnJlbnRFdmVudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkbWREaWFsb2cuc2hvdyh7XG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0RpYWxvZ0N0cmwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvZGlhbG9ncy9lZGl0X2V2ZW50Lmh0bWwnLFxuICAgICAgICAgICAgICAgIGxvY2Fsczoge1xuICAgICAgICAgICAgICAgICAgICBndWVzdHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRFdmVudDogJHNjb3BlLmN1cnJlbnRFdmVudCxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEd1ZXN0OiBudWxsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFyZW50OiBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQuYm9keSksXG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICBwcmVzZXJ2ZVNjb3BlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50OiAkZXZlbnQsXG4gICAgICAgICAgICAgICAgY2xpY2tPdXRzaWRlVG9DbG9zZTp0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUub3BlbkV2ZW50TWVudSA9IGZ1bmN0aW9uICgkbWRPcGVuTWVudSwgZXYpIHtcbiAgICAgICAgICAgIHZhciBvcmlnaW5hdG9yRXYgPSBldjtcbiAgICAgICAgICAgICRtZE9wZW5NZW51KGV2KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2VsZWN0RXZlbnQgID0gZnVuY3Rpb24gKGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHsncCcgOiBldmVudC5zbHVnfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmZpbmRFdmVudCAgICA9IGZ1bmN0aW9uIChldmVudFNsdWcpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICghJHNjb3BlLmV2ZW50cykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHJlc3VsdCAgICAgICAgICA9ICRzY29wZS5ldmVudHMuZmluZChmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQuc2x1ZyA9PSBldmVudFNsdWc7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2V0Q3VycmVudEV2ZW50ICA9IGZ1bmN0aW9uIChldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmV2ZW50SWQgICAgICAgICAgICAgID0gZXZlbnQuaWQ7XG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50ICAgICAgICAgPSBldmVudDtcbiAgICAgICAgICAgICRzY29wZS5sb2FkaW5nR3Vlc3RzICAgICAgICA9IHRydWU7XG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0cyAgICAgICAgPSBbXTtcblxuICAgICAgICAgICAgdmFyIGcgICAgICAgICAgICAgICAgICAgICAgID0gRXZlbnQuZ2V0KHtldmVudFNsdWc6IGV2ZW50LnNsdWcsIGRhdGE6ICdndWVzdHMnfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmdHdWVzdHMgICAgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0cyAgICA9IHJlc3VsdC5kYXRhO1xuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS51bmNoZWNrQ3VycmVudEV2ZW50ICA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5ldmVudElkICAgICAgICAgICAgICA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50ICAgICAgICAgPSAwO1xuICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmdHdWVzdHMgICAgICAgID0gZmFsc2U7XG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0cyAgICAgICAgPSBbXTtcblxuICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaCh7fSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmNoZWNrQ3VycmVudEV2ZW50ICAgID0gZnVuY3Rpb24gKClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHBhcmFtcyAgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGFyYW1zLnAgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRJZCA9IHBhcmFtcy5wO1xuICAgICAgICAgICAgICAgIHZhciBldmVudCAgID0gJHNjb3BlLmZpbmRFdmVudChldmVudElkKTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXZlbnQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5ldmVudElkICE9PSBldmVudC5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNldEN1cnJlbnRFdmVudChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gc2V0IGZpcnN0IGV2ZW50IGFzIGRlZmF1bHRcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNvcnRFdmVudHMgICA9IGZ1bmN0aW9uIChzb3J0LCByZXZlcnNlKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuc29ydEV2ZW50ICAgICAgICA9IHNvcnQ7XG4gICAgICAgICAgICAkc2NvcGUuc29ydEV2ZW50UmV2ZXJzZSA9IHJldmVyc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmNoZWNrSW5HdWVzdCA9IGZ1bmN0aW9uKGV2ZW50LCBldmVudEd1ZXN0KVxuICAgICAgICB7XG5cbiAgICAgICAgICAgIEd1ZXN0LmNoZWNrSW4oe2V2ZW50U2x1ZzogZXZlbnQuc2x1ZywgZ3Vlc3RJZDogZXZlbnRHdWVzdC5pZCwgZGF0YTogJ2NoZWNraW4nfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuXG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudC5ndWVzdF9jb3VudCA9ICRzY29wZS5jdXJyZW50R3Vlc3RzLmxlbmd0aDtcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIGd1ZXN0SW5kZXggICAgICA9ICRzY29wZS5jdXJyZW50R3Vlc3RzLm1hcChmdW5jdGlvbiAoZykge3JldHVybiBnLmlkOyB9KS5pbmRleE9mKGV2ZW50R3Vlc3QuaWQpO1xuXG4gICAgICAgICAgICBpZiAoZ3Vlc3RJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAvLyBndWVzdCBhbHJlYWR5IG9uIGxpc3QsIGNoYW5naW5nIGl0cyB2YWx1ZVxuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzW2d1ZXN0SW5kZXhdLmNoZWNrX2luID0gISRzY29wZS5jdXJyZW50R3Vlc3RzW2d1ZXN0SW5kZXhdLmNoZWNrX2luO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBuZXcgZ3Vlc3QsIGFkZGluZyBoaW0gdG8gYXJyYXlcbiAgICAgICAgICAgICAgICB2YXIgZ3Vlc3REYXRhICAgICAgID0gKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZXZlbnRHdWVzdCkpKTtcbiAgICAgICAgICAgICAgICBndWVzdERhdGEuY2hlY2tfaW4gID0gMTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0cy51bnNoaWZ0KGd1ZXN0RGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGZvcmNpbmcgd2luZG93IHJlc2l6ZSB0byB1cGRhdGUgdmlydHVhbCByZXBlYXRlclxuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHdpbmRvdykudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZScpO1xuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2hvd1JlbW92ZUV2ZW50ID0gZnVuY3Rpb24gKGV2LCBldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gQXBwZW5kaW5nIGRpYWxvZyB0byBkb2N1bWVudC5ib2R5IHRvIGNvdmVyIHNpZGVuYXYgaW4gZG9jcyBhcHBcbiAgICAgICAgICAgIHZhciBjb25maXJtICAgICA9ICRtZERpYWxvZy5jb25maXJtKClcbiAgICAgICAgICAgICAgICAudGl0bGUoJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgdGhpcyBldmVudD8nKVxuICAgICAgICAgICAgICAgIC50ZXh0Q29udGVudCgnVGhpcyBhY3Rpb24gY2Fubm90IGJlIHVuZG9uZS4nKVxuICAgICAgICAgICAgICAgIC5hcmlhTGFiZWwoJ0RlbGV0ZSBFdmVudCcpXG4gICAgICAgICAgICAgICAgLnRhcmdldEV2ZW50KGV2KVxuICAgICAgICAgICAgICAgIC5vaygnWWVzJylcbiAgICAgICAgICAgICAgICAuY2FuY2VsKCdVbmRvJyk7XG5cbiAgICAgICAgICAgICRtZERpYWxvZy5zaG93KGNvbmZpcm0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gdmFyIGd1ZXN0SW5kZXggID0gJHNjb3BlLmd1ZXN0cy5tYXAoZnVuY3Rpb24gKGUpIHtyZXR1cm4gZS5pZDsgfSkuaW5kZXhPZihndWVzdC5pZCk7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50SW5kZXggID0gJHNjb3BlLmV2ZW50cy5pbmRleE9mKGV2ZW50KTtcblxuICAgICAgICAgICAgICAgIGlmIChldmVudEluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZXZlbnRzLnNwbGljZShldmVudEluZGV4LCAxKTtcblxuICAgICAgICAgICAgICAgICAgICBFdmVudC5kZWxldGUoe2V2ZW50U2x1ZzogZXZlbnQuc2x1Z30pO1xuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQgICAgID0ge307XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzICAgID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dFdmVudERlbGV0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN0YXR1cyAgICAgICAgICAgPSAnRXZlbnQgRGVsZXRlZC4nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93RXZlbnREZWxldGVkID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICAkbWRUb2FzdC5zaG93KFxuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNpbXBsZSgpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0Q29udGVudCgnRXZlbnQgRGVsZXRlZCEnKVxuICAgICAgICAgICAgICAgICAgICAucG9zaXRpb24oJ3RvcCByaWdodCcpXG4gICAgICAgICAgICAgICAgICAgIC5oaWRlRGVsYXkoMzAwMClcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dSZW1vdmVHdWVzdCA9IGZ1bmN0aW9uIChldiwgZXZlbnQsIGd1ZXN0KVxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBBcHBlbmRpbmcgZGlhbG9nIHRvIGRvY3VtZW50LmJvZHkgdG8gY292ZXIgc2lkZW5hdiBpbiBkb2NzIGFwcFxuICAgICAgICAgICAgdmFyIGNvbmZpcm0gICAgID0gJG1kRGlhbG9nLmNvbmZpcm0oKVxuICAgICAgICAgICAgICAgIC50aXRsZSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHJlbW92ZSB0aGlzIGd1ZXN0PycpXG4gICAgICAgICAgICAgICAgLnRleHRDb250ZW50KCdUaGlzIGFjdGlvbiBjYW5ub3QgYmUgdW5kb25lLicpXG4gICAgICAgICAgICAgICAgLmFyaWFMYWJlbCgnUmVtb3ZlIEd1ZXN0JylcbiAgICAgICAgICAgICAgICAudGFyZ2V0RXZlbnQoZXYpXG4gICAgICAgICAgICAgICAgLm9rKCdZZXMnKVxuICAgICAgICAgICAgICAgIC5jYW5jZWwoJ1VuZG8nKTtcblxuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coY29uZmlybSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuZ3Vlc3RzLm1hcChmdW5jdGlvbiAoZSkge3JldHVybiBlLmlkOyB9KS5pbmRleE9mKGd1ZXN0LmlkKTtcbiAgICAgICAgICAgICAgICB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuY3VycmVudEd1ZXN0cy5pbmRleE9mKGd1ZXN0KTtcblxuICAgICAgICAgICAgICAgIGlmIChndWVzdEluZGV4ICE9PSAtMSkge1xuXG4gICAgICAgICAgICAgICAgICAgIEd1ZXN0LnJlbW92ZSh7ZXZlbnRTbHVnOiBldmVudC5zbHVnLCBndWVzdElkOiBndWVzdC5pZCwgZGF0YTogJ3JlbW92ZSd9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50Lmd1ZXN0X2NvdW50ID0gJHNjb3BlLmN1cnJlbnRHdWVzdHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHMuc3BsaWNlKGd1ZXN0SW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dHdWVzdFJlbW92ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN0YXR1cyAgICAgICA9ICdHdWVzdCBSZW1vdmVkLic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dHdWVzdFJlbW92ZWQgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRtZFRvYXN0LnNob3coXG4gICAgICAgICAgICAgICAgJG1kVG9hc3Quc2ltcGxlKClcbiAgICAgICAgICAgICAgICAgICAgLnRleHRDb250ZW50KCdHdWVzdCBSZW1vdmVkIScpXG4gICAgICAgICAgICAgICAgICAgIC5wb3NpdGlvbigndG9wIHJpZ2h0JylcbiAgICAgICAgICAgICAgICAgICAgLmhpZGVEZWxheSgzMDAwKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZ2V0RXZlbnRHdWVzdFJlcGVhdGVySGVpZ2h0ID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgd2luZG93SGVpZ2h0ICAgICAgICA9ICR3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgICAgICB2YXIgbmF2QmFySGVpZ2h0ICAgICAgICA9ICQoJyNuYXZiYXInKS5vdXRlckhlaWdodCh0cnVlKTtcbiAgICAgICAgICAgIHZhciBldmVudEhlYWRlckhlaWdodCAgID0gJCgnI2V2ZW50SGVhZGVyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cbiAgICAgICAgICAgIHZhciBsaXN0SGVpZ2h0ICAgICAgICAgID0gd2luZG93SGVpZ2h0IC0gbmF2QmFySGVpZ2h0IC0gZXZlbnRIZWFkZXJIZWlnaHQgLSAxMDtcblxuICAgICAgICAgICAgcmV0dXJuIHtoZWlnaHQ6ICcnICsgbGlzdEhlaWdodCArICdweCd9O1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5nZXRFdmVudFJlcGVhdGVySGVpZ2h0ID0gZnVuY3Rpb24gKClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHdpbmRvd0hlaWdodCAgICAgICAgICAgID0gJHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgICAgIHZhciBuYXZCYXJIZWlnaHQgICAgICAgICAgICA9ICQoJyNuYXZiYXInKS5vdXRlckhlaWdodCh0cnVlKTtcbiAgICAgICAgICAgIHZhciBldmVudFNlYXJjaEJhckhlaWdodCAgICA9ICQoJyNldmVudFNlYXJjaEJhcicpLm91dGVySGVpZ2h0KHRydWUpO1xuXG4gICAgICAgICAgICB2YXIgbGlzdEhlaWdodCAgICAgICAgICAgICAgPSB3aW5kb3dIZWlnaHQgLSBuYXZCYXJIZWlnaHQgLSBldmVudFNlYXJjaEJhckhlaWdodCAtIDEwO1xuXG4gICAgICAgICAgICByZXR1cm4ge2hlaWdodDogJycgKyBsaXN0SGVpZ2h0ICsgJ3B4J307XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dFdmVudExpc3RNb2JpbGUgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gISRzY29wZS5jdXJyZW50RXZlbnQgfHwgJG1kTWVkaWEoJ2d0LXNtJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dHdWVzdExpc3RNb2JpbGUgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLmN1cnJlbnRFdmVudCB8fCAkbWRNZWRpYSgnZ3Qtc20nKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZXZlbnRTb3J0Q29tcGFyYXRvciA9IGZ1bmN0aW9uIChldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgc3dpdGNoICgkc2NvcGUuc29ydEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZGF0ZSc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5kYXRlO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAnbmFtZSc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5uYW1lO1xuXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgLy8gdXBjb21pbmcgLyBwYXN0IHNvcnRcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnVwY29taW5nX2luZGV4ID49IDAgPyBldmVudC51cGNvbWluZ19pbmRleCA6ICgtMSkgKiBldmVudC51cGNvbWluZ19pbmRleCArICRzY29wZS5ldmVudHMubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5kb3dubG9hZEd1ZXN0c0NzdiA9IGZ1bmN0aW9uIChldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgRXZlbnQuZ2V0KHtldmVudFNsdWc6IGV2ZW50LnNsdWcsIGRhdGE6ICdndWVzdHMnLCBjc3Y6IDF9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFsgcmVzdWx0LmRhdGEgXSwge1xuICAgICAgICAgICAgICAgICAgICB0eXBlIDogJ2FwcGxpY2F0aW9uL2NzdidcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vdHJpY2sgdG8gZG93bmxvYWQgc3RvcmUgYSBmaWxlIGhhdmluZyBpdHMgVVJMXG4gICAgICAgICAgICAgICAgdmFyIGZpbGVVUkwgICAgID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgICAgICB2YXIgYSAgICAgICAgICAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgICAgICAgICAgYS5ocmVmICAgICAgICAgID0gZmlsZVVSTDtcbiAgICAgICAgICAgICAgICBhLnRhcmdldCAgICAgICAgPSAnX2JsYW5rJztcbiAgICAgICAgICAgICAgICBhLmRvd25sb2FkICAgICAgPSBldmVudC5zbHVnICsnX2d1ZXN0cy5jc3YnO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgYS5jbGljaygpO1xuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgb25SZXNpemUpO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uUmVzaXplKClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kb24oJ3N0b3JlRXZlbnQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiAkc2NvcGUuY3VycmVudEV2ZW50LnRpbWUgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mICRzY29wZS5jdXJyZW50RXZlbnQuZGF0ZSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQuZGF0ZS5zZXRIb3Vycygkc2NvcGUuY3VycmVudEV2ZW50LnRpbWUuZ2V0SG91cnMoKSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudC5kYXRlLnNldE1pbnV0ZXMoJHNjb3BlLmN1cnJlbnRFdmVudC50aW1lLmdldE1pbnV0ZXMoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQuZGF0ZV9mb3JtYXR0ZWQgID0gbW9tZW50KCRzY29wZS5jdXJyZW50RXZlbnQuZGF0ZSkuZm9ybWF0KCdERC9NTS9ZWSBISDptbScpO1xuXG4gICAgICAgICAgICBFdmVudC5zdG9yZSh7ZXZlbnQ6ICRzY29wZS5jdXJyZW50RXZlbnR9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgZXZlbnQgICAgICAgICAgID0gcmVzdWx0LmRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50SW5kZXggICAgICA9ICRzY29wZS5ldmVudHMubWFwKGZ1bmN0aW9uIChlKSB7cmV0dXJuIGUuaWQ7IH0pLmluZGV4T2YoZXZlbnQuaWQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50SW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGV2ZW50IG5vdCBvbiBsaXN0LCBjcmVhdGluZyBlbnRyeVxuICAgICAgICAgICAgICAgICAgICB2YXIgZXZlbnREYXRhICAgICAgICAgICA9IChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGV2ZW50KSkpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZXZlbnRzLnVuc2hpZnQoZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgPSBldmVudERhdGE7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBlcnJvciB0cmVhdG1lbnRcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkVycm9yIGNyZWF0aW5nIGV2ZW50IVwiKVxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiRvbignY2hlY2tJbkV2ZW50JywgZnVuY3Rpb24oZXYsIGRhdGEpIHtcblxuICAgICAgICAgICAgdmFyIGV2ZW50ICAgPSBkYXRhLmV2ZW50O1xuICAgICAgICAgICAgdmFyIGd1ZXN0ICAgPSBkYXRhLmd1ZXN0O1xuXG4gICAgICAgICAgICAkc2NvcGUuY2hlY2tJbkd1ZXN0KGV2ZW50LCBndWVzdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7IHJldHVybiAkbG9jYXRpb24uc2VhcmNoKCk7IH0sIGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgICRzY29wZS5jaGVja0N1cnJlbnRFdmVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBvblJlc2l6ZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kb24oJ29wZW5FdmVudERpYWxvZycsIGZ1bmN0aW9uIChldmVudCwgZGF0YSkge1xuICAgICAgICAgICAgJHNjb3BlLm9wZW5FdmVudERpYWxvZyhkYXRhLmV2ZW50LCBkYXRhLm5ld0V2ZW50KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgRXZlbnQuZ2V0KGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgJHNjb3BlLmV2ZW50cyAgID0gcmVzdWx0LmRhdGE7XG5cbiAgICAgICAgICAgIC8vIFRPRE8gaW1wcm92ZSB0aGlzXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmV2ZW50cywgZnVuY3Rpb24gKGV2ZW50LCBrZXkpIHtcblxuICAgICAgICAgICAgICAgIHZhciBkYXRlICAgICAgICAgICAgICAgICAgICA9IG1vbWVudCgkc2NvcGUuZXZlbnRzW2tleV0uZGF0ZS5kYXRlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZXZlbnRzW2tleV0uZGF0ZSAgICAgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZXZlbnRzW2tleV0udGltZSAgICAgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkc2NvcGUuY2hlY2tDdXJyZW50RXZlbnQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLmxvYWRpbmdHdWVzdHMgICAgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnNvcnRFdmVudCAgICAgICAgPSAndXBjb21pbmcnO1xuICAgIH0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBjaGVja0luTWFuYWdlci5zZXJ2aWNlOkV2ZW50U3J2XG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogIyBFdmVudFNydlxuICAgICAqIFNlcnZpY2Ugb2YgdGhlIGNoZWNrSW5NYW5hZ2VyXG4gICAgICovXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5zZXJ2aWNlcycpLmZhY3RvcnkoJ0V2ZW50JywgZnVuY3Rpb24gKCRyZXNvdXJjZSwgQVBJX1VSTCkge1xuICAgICAgICByZXR1cm4gJHJlc291cmNlKEFQSV9VUkwgKyBcImV2ZW50cy86ZXZlbnRTbHVnLzpkYXRhXCIsIHt9LCB7XG4gICAgICAgICAgICBkZWxldGU6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEFQSV9VUkwgKyBcImV2ZW50cy86ZXZlbnRTbHVnL2RlbGV0ZVwiLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBldmVudFNsdWc6ICdAZXZlbnRTbHVnJyxcbiAgICAgICAgICAgICAgICAgICAgY3N2OiAnQGNzdicsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgc3RvcmU6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEFQSV9VUkwgKyBcImV2ZW50cy9zdG9yZVwiLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBldmVudDogJ0BldmVudCcsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBjaGVja0luTWFuYWdlci5jb250cm9sbGVyOkd1ZXN0Q3RybFxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqICMgR3Vlc3RDdHJsXG4gICAgICogQ29udHJvbGxlciBvZiB0aGUgY2hlY2tJbk1hbmFnZXJcbiAgICAgKi9cbiAgICBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLmNvbnRyb2xsZXJzJykuY29udHJvbGxlcignR3Vlc3RDdHJsJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRzY29wZSwgJGh0dHAsICRzdGF0ZVBhcmFtcywgJGxvY2F0aW9uLCAkbWREaWFsb2csICRtZFRvYXN0LCAkd2luZG93LCBBUElfVVJMLCBHdWVzdCwgR3Vlc3RTcnYsIEF1dGhTcnYpIHtcblxuICAgICAgICAkc2NvcGUub3Blbkd1ZXN0RWRpdERpYWxvZyA9IGZ1bmN0aW9uICgkZXZlbnQsIGVkaXRNb2RlLCBndWVzdClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmVkaXRNb2RlICAgICAgICAgICAgID0gZWRpdE1vZGU7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGd1ZXN0ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdCAgICAgPSBndWVzdDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdCAgICAgPSB7fTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coe1xuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdEaWFsb2dDdHJsJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyQXM6ICdjdHJsJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL2RpYWxvZ3MvZWRpdF9ndWVzdC5odG1sJyxcbiAgICAgICAgICAgICAgICBsb2NhbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3RzOiAkc2NvcGUuZ3Vlc3RzLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50RXZlbnQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRHdWVzdDogJHNjb3BlLmN1cnJlbnRHdWVzdCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhcmVudDogYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LmJvZHkpLFxuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgcHJlc2VydmVTY29wZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB0YXJnZXRFdmVudDogJGV2ZW50LFxuICAgICAgICAgICAgICAgIGNsaWNrT3V0c2lkZVRvQ2xvc2U6dHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dEZWxldGVHdWVzdCA9IGZ1bmN0aW9uIChldiwgZ3Vlc3QpIHtcbiAgICAgICAgICAgIC8vIEFwcGVuZGluZyBkaWFsb2cgdG8gZG9jdW1lbnQuYm9keSB0byBjb3ZlciBzaWRlbmF2IGluIGRvY3MgYXBwXG4gICAgICAgICAgICB2YXIgY29uZmlybSAgICAgPSAkbWREaWFsb2cuY29uZmlybSgpXG4gICAgICAgICAgICAgICAgLnRpdGxlKCdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgZ3Vlc3Q/JylcbiAgICAgICAgICAgICAgICAudGV4dENvbnRlbnQoJ1RoaXMgYWN0aW9uIGNhbm5vdCBiZSB1bmRvbmUuJylcbiAgICAgICAgICAgICAgICAuYXJpYUxhYmVsKCdEZWxldGUgR3Vlc3QnKVxuICAgICAgICAgICAgICAgIC50YXJnZXRFdmVudChldilcbiAgICAgICAgICAgICAgICAub2soJ1llcycpXG4gICAgICAgICAgICAgICAgLmNhbmNlbCgnVW5kbycpO1xuXG4gICAgICAgICAgICAkbWREaWFsb2cuc2hvdyhjb25maXJtKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5ndWVzdHMubWFwKGZ1bmN0aW9uIChlKSB7cmV0dXJuIGUuaWQ7IH0pLmluZGV4T2YoZ3Vlc3QuaWQpO1xuICAgICAgICAgICAgICAgIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5ndWVzdHMuaW5kZXhPZihndWVzdCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZ3Vlc3RJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmd1ZXN0cy5zcGxpY2UoZ3Vlc3RJbmRleCwgMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgR3Vlc3QuZGVsZXRlKHtndWVzdElkOiBndWVzdC5pZH0pO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNob3dHdWVzdERlbGV0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmRpYWxvZ1N0YXR1cyA9ICdHdWVzdCBEZWxldGVkLic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dHdWVzdERlbGV0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICRtZFRvYXN0LnNob3coXG4gICAgICAgICAgICAgICAgJG1kVG9hc3Quc2ltcGxlKClcbiAgICAgICAgICAgICAgICAgICAgLnRleHRDb250ZW50KCdHdWVzdCBEZWxldGVkIScpXG4gICAgICAgICAgICAgICAgICAgIC5wb3NpdGlvbigndG9wIHJpZ2h0JylcbiAgICAgICAgICAgICAgICAgICAgLmhpZGVEZWxheSgzMDAwKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZ2V0R3Vlc3RSZXBlYXRlckhlaWdodCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICB2YXIgd2luZG93SGVpZ2h0ICAgICAgICAgICAgPSAkd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICAgICAgdmFyIG5hdkJhckhlaWdodCAgICAgICAgICAgID0gJCgnI25hdmJhcicpLm91dGVySGVpZ2h0KHRydWUpO1xuICAgICAgICAgICAgdmFyIGd1ZXN0TGlzdEhlYWRlckhlaWdodCAgID0gJCgnI2d1ZXN0TGlzdEhlYWRlcicpLm91dGVySGVpZ2h0KHRydWUpO1xuICAgICAgICAgICAgdmFyIGd1ZXN0VGFibGVIZWFkZXJIZWlnaHQgID0gJCgnI2d1ZXN0VGFibGVIZWFkZXInKS5vdXRlckhlaWdodCh0cnVlKTtcblxuICAgICAgICAgICAgdmFyIGxpc3RIZWlnaHQgICAgICAgICAgICAgID0gd2luZG93SGVpZ2h0IC0gbmF2QmFySGVpZ2h0IC0gZ3Vlc3RMaXN0SGVhZGVySGVpZ2h0IC0gZ3Vlc3RUYWJsZUhlYWRlckhlaWdodCAtIDEwO1xuXG4gICAgICAgICAgICByZXR1cm4ge2hlaWdodDogJycgKyBsaXN0SGVpZ2h0ICsgJ3B4J307XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNvcnRHdWVzdHMgICA9IGZ1bmN0aW9uIChzb3J0KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoc29ydCA9PT0gJHNjb3BlLnNvcnRHdWVzdCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5zb3J0R3Vlc3RSZXZlcnNlICAgICA9ICEkc2NvcGUuc29ydEd1ZXN0UmV2ZXJzZTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc29ydEd1ZXN0ICAgICAgICAgICAgPSAkc2NvcGUuc29ydEd1ZXN0UmV2ZXJzZSA9PT0gZmFsc2UgPyBudWxsIDogJHNjb3BlLnNvcnRHdWVzdDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRHdWVzdCAgICAgICAgICAgID0gc29ydDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc29ydEd1ZXN0UmV2ZXJzZSAgICAgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLnNvcnRJY29uICAgICAgICAgICAgICAgICA9ICRzY29wZS5zb3J0R3Vlc3RSZXZlcnNlID8gJ2Fycm93X2Ryb3BfZG93bicgOiAnYXJyb3dfZHJvcF91cCc7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgICR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgb25SZXNpemUpO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uUmVzaXplKCkge1xuICAgICAgICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kb24oJ3N0b3JlR3Vlc3QnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblxuICAgICAgICAgICAgR3Vlc3Quc3RvcmUoe2d1ZXN0OiAkc2NvcGUuY3VycmVudEd1ZXN0fSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuXG4gICAgICAgICAgICAgICAgdmFyIGd1ZXN0ICAgICAgID0gcmVzdWx0LmRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGd1ZXN0SW5kZXggID0gJHNjb3BlLmd1ZXN0cy5tYXAoZnVuY3Rpb24gKGcpIHtyZXR1cm4gZy5pZDsgfSkuaW5kZXhPZihndWVzdC5pZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZ3Vlc3RJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZ3Vlc3Qgbm90IG9uIGxpc3QsIGNyZWF0aW5nIGVudHJ5XG4gICAgICAgICAgICAgICAgICAgIHZhciBndWVzdERhdGEgICAgICAgPSAoSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShndWVzdCkpKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmd1ZXN0cy51bnNoaWZ0KGd1ZXN0RGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBlcnJvciB0cmVhdG1lbnRcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkVycm9yIGNyZWF0aW5nIGd1ZXN0IVwiKVxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgb25SZXNpemUpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGNoZWNrSW5NYW5hZ2VyLnNlcnZpY2U6R3Vlc3RTcnZcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIEd1ZXN0U3J2XG4gICAgICogU2VydmljZSBvZiB0aGUgY2hlY2tJbk1hbmFnZXJcbiAgICAgKi9cbiAgICBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLnNlcnZpY2VzJykuZmFjdG9yeSgnR3Vlc3QnLCBmdW5jdGlvbiAoJHJlc291cmNlLCBBUElfVVJMKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoQVBJX1VSTCArIFwiZ3Vlc3RzXCIsIHt9LCB7XG4gICAgICAgICAgICBjaGVja0luOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBBUElfVVJMICsgXCJldmVudHMvOmV2ZW50U2x1Zy9ndWVzdHMvOmd1ZXN0SWQvOmRhdGFcIixcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRTbHVnOiAnQGV2ZW50U2x1ZycsXG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0SWQ6ICdAZ3Vlc3RJZCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdAZGF0YScsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcmVtb3ZlOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBBUElfVVJMICsgXCJldmVudHMvOmV2ZW50U2x1Zy9ndWVzdHMvOmd1ZXN0SWQvOmRhdGFcIixcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRTbHVnOiAnQGV2ZW50U2x1ZycsXG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0SWQ6ICdAZ3Vlc3RJZCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdAZGF0YScsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZGVsZXRlOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBBUElfVVJMICsgXCJndWVzdHMvOmd1ZXN0SWQvZGVsZXRlXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0SWQ6ICdAZ3Vlc3RJZCcsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgc3RvcmU6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEFQSV9VUkwgKyBcImd1ZXN0cy9zdG9yZVwiLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBndWVzdDogJ0BndWVzdCcsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSlcblxuICAgIC5zZXJ2aWNlKCdHdWVzdFNydicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBHdWVzdCkge1xuXG4gICAgICAgIHRoaXMuZ2V0R3Vlc3RzICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBndWVzdHMgID0gR3Vlc3QuZ2V0KGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGltcHJvdmUgdGhpc1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuZ3Vlc3RzICAgPSByZXN1bHQuZGF0YTtcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldEd1ZXN0cygpO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgY2hlY2tJbk1hbmFnZXIuY29udHJvbGxlcjpTdGF0c0N0cmxcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIFN0YXRzQ3RybFxuICAgICAqIENvbnRyb2xsZXIgb2YgdGhlIGNoZWNrSW5NYW5hZ2VyXG4gICAgICovXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5jb250cm9sbGVycycpLmNvbnRyb2xsZXIoJ1N0YXRzQ3RybCcsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkd2luZG93LCAkc2NvcGUsICRodHRwKSB7XG5cbiAgICAgICAgJHNjb3BlLnZhbHVlTW9kZSA9IFwiYWJzb2x1dGVcIjtcbiAgICAgICAgJHNjb3BlLm9wdGlvbnMgPSB7fTtcbiAgICAgICAgJHNjb3BlLmRhdGEgPSB7fTtcblxuICAgICAgICAkc2NvcGUub3B0aW9ucy5pbmR1c3RyeV9hYnMgPSB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdtdWx0aUJhckNoYXJ0JyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDMyMCxcbiAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvcDogMjAsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAyMCxcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiA0NSxcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogNDVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGdyb3VwU3BhY2luZzogMC41LFxuICAgICAgICAgICAgICAgIGNsaXBFZGdlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICAgICAgc3RhY2tlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICB4QXhpczoge1xuICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWw6ICdJbmR1c3RyeScsXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZUxhYmVsczogLTQ1LFxuICAgICAgICAgICAgICAgICAgICBzaG93TWF4TWluOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeUF4aXM6IHtcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnQXR0ZW5kYW5jZScsXG4gICAgICAgICAgICAgICAgICAgIGF4aXNMYWJlbERpc3RhbmNlOiAtMjAsXG4gICAgICAgICAgICAgICAgICAgIHRpY2tGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLC4xZicpKGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5kYXRhLmluZHVzdHJ5X2FicyA9IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOlwiTWFzdGVyc1wiLFxuICAgICAgICAgICAgICAgIFwidmFsdWVzXCI6W1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQWR2aXNvcnkgU2VydmljZXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MS4yNjY0MDAzNjg0OTU2NDc1XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidGaW5hbmNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjEuNjc5NTUxMzM3MDcyNzcxM1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQ29uc3VsdGluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjoyLjI5MjEzODY2NzMyMDc3MTVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0NvbnN1bWVyIEdvb2RzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjIuODYxOTQ5ODEyMTQ0NjEwN1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonUmV0YWlsL0Rpc3RyaWJ1dGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjozLjU0MTAyNjY1NDcwMjgwNjZcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0F1dG9tb3RpdmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6NC4wOTExNzY4OTQwMjUxMjRcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J1RlY2hub2xvZ3knLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6NC41NTE0OTk5MzE5MTQ0MjZcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J090aGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjQuNzE1NDQwOTIxNjgwMjA5XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidBdWRpdGluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjo0LjY3NTg1MjYwNDQ5MzIyOVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonTGVhZGVyc2hpcCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjo0LjQ4NDM5ODIxMDk2NDkzNVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOlwiQmFjaGVsb3JcIixcbiAgICAgICAgICAgICAgICBcInZhbHVlc1wiOltcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0Fkdmlzb3J5IFNlcnZpY2VzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTIwMjEyNzM3OTM2NzY4NTVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0ZpbmFuY2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xMzc2ODgxNzAwOTIxNDgxNVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQ29uc3VsdGluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjEyMjA0NDUyMTEwMTIxMTIxXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidDb25zdW1lciBHb29kcycsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjEyMDU0OTkzMzgyNzc4NjI3XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidSZXRhaWwvRGlzdHJpYnV0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTg0MjY4NzkyOTI4NTQ0MTVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0F1dG9tb3RpdmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xNzUyNzE3NTA4MDkzNjkyMVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonVGVjaG5vbG9neScsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjEzODQ4NzM0NDk5MTk2OTdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J090aGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTM2OTQyMjU4MTk5MTU2NDJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0F1ZGl0aW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTg3MTExMTcyOTYwMDU0OTRcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0xlYWRlcnNoaXAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xODk1NDY0MzQwNzE2ODE1NlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOlwiT3RoZXJcIixcbiAgICAgICAgICAgICAgICBcInZhbHVlc1wiOltcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0Fkdmlzb3J5IFNlcnZpY2VzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTM4Nzg3MTI4MTgzNTA2NVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonRmluYW5jZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjE4MjEyMzU0NDc5Mzg0ODc2XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidDb25zdWx0aW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTY4NDU1ODQ1OTg5MTA0MjZcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0NvbnN1bWVyIEdvb2RzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTc2MTQyNzQzNzQ0NTMzNzNcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J1JldGFpbC9EaXN0cmlidXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xNTk5ODcxMjA4NDkwODI0NVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQXV0b21vdGl2ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjE1Njc2MTc5NDQwNjI1NzIzXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidUZWNobm9sb2d5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTc0NjA1ODg5MDIyNzkyNFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonT3RoZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xNzM2NDk2MTAyNzMzMjMxMlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQXVkaXRpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xNTM1NDU3OTkzNzc3NjY3NVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonTGVhZGVyc2hpcCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjEyNDc3NjE3NTE1NTI5NzNcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuXG4gICAgICAgICRzY29wZS5vcHRpb25zLmluZHVzdHJ5X3BlcmNlbnRhZ2UgPSB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdwaWVDaGFydCcsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAzMjAsXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7cmV0dXJuIGQua2V5O30sXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQueTt9LFxuICAgICAgICAgICAgICAgIHNob3dMYWJlbHM6IHRydWUsXG4gICAgICAgICAgICAgICAgbGFiZWxTdW5iZWFtTGF5b3V0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkb251dDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkb251dFJhdGlvOiAwLjM1LFxuICAgICAgICAgICAgICAgIGxhYmVsVHlwZTogXCJwZXJjZW50XCIsXG4gICAgICAgICAgICAgICAgZHVyYXRpb246IDUwMCxcbiAgICAgICAgICAgICAgICBsYWJlbFRocmVzaG9sZDogMC4wMSxcbiAgICAgICAgICAgICAgICBsZWdlbmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b3A6IDUsXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodDogMzUsXG4gICAgICAgICAgICAgICAgICAgICAgICBib3R0b206IDUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmRhdGEuaW5kdXN0cnlfcGVyY2VudGFnZSA9IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOidBZHZpc29yeSBTZXJ2aWNlcycsXG4gICAgICAgICAgICAgICAgXCJ5XCI6MC4xMzg3ODcxMjgxODM1MDY1XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6J0ZpbmFuY2UnLFxuICAgICAgICAgICAgICAgIFwieVwiOjAuMTgyMTIzNTQ0NzkzODQ4NzZcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXlcIjonQ29uc3VsdGluZycsXG4gICAgICAgICAgICAgICAgXCJ5XCI6MC4xNjg0NTU4NDU5ODkxMDQyNlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOidDb25zdW1lciBHb29kcycsXG4gICAgICAgICAgICAgICAgXCJ5XCI6MC4xNzYxNDI3NDM3NDQ1MzM3M1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOidSZXRhaWwvRGlzdHJpYnV0aW9uJyxcbiAgICAgICAgICAgICAgICBcInlcIjowLjE1OTk4NzEyMDg0OTA4MjQ1XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6J0F1dG9tb3RpdmUnLFxuICAgICAgICAgICAgICAgIFwieVwiOjAuMTU2NzYxNzk0NDA2MjU3MjNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXlcIjonVGVjaG5vbG9neScsXG4gICAgICAgICAgICAgICAgXCJ5XCI6MC4xNzQ2MDU4ODkwMjI3OTI0XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6J090aGVyJyxcbiAgICAgICAgICAgICAgICBcInlcIjowLjE3MzY0OTYxMDI3MzMyMzEyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6J0F1ZGl0aW5nJyxcbiAgICAgICAgICAgICAgICBcInlcIjowLjE1MzU0NTc5OTM3Nzc2Njc1XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6J0xlYWRlcnNoaXAnLFxuICAgICAgICAgICAgICAgIFwieVwiOjAuMTI0Nzc2MTc1MTU1Mjk3M1xuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuXG4gICAgICAgICRzY29wZS5vcHRpb25zLnRpbWUgPSB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdsaW5lQ2hhcnQnLFxuICAgICAgICAgICAgICAgIGhlaWdodDogNDUwLFxuICAgICAgICAgICAgICAgIG1hcmdpbiA6IHtcbiAgICAgICAgICAgICAgICAgICAgdG9wOiAyMCxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDIwLFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDQwLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiA1NVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7IGNvbnNvbGUubG9nKGQpOyByZXR1cm4gZC54OyB9LFxuICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpeyBjb25zb2xlLmxvZyhkKTsgcmV0dXJuIGQueTsgfSxcbiAgICAgICAgICAgICAgICB1c2VJbnRlcmFjdGl2ZUd1aWRlbGluZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB4QXhpczoge1xuICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWw6ICdEYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgLy8gcm90YXRlTGFiZWxzOiAtNDUsXG4gICAgICAgICAgICAgICAgICAgIHRpY2tGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLnRpbWUuZm9ybWF0KCclQiAlWScpKG5ldyBEYXRlKGQpKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB5QXhpczoge1xuICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWw6ICdBdHRlbmRhbmNlJyxcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IC0xMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGF0YS50aW1lID0gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhbHVlczogW3tcInhcIjogMTQ3MjY4ODAwMDAwMCwgXCJ5XCI6IDQwMH0sIHtcInhcIjogMTQ3NTI4MDAwMDAwMCwgXCJ5XCI6IDMwMH0sIHtcInhcIjogMTQ3Nzk1ODQwMDAwMCwgXCJ5XCI6IDEyOH0sIHtcInhcIjogMTQ4MDU1MDQwMDAwMCwgXCJ5XCI6IDMzM30sIHtcInhcIjogMTQ4NTkwNzIwMDAwMCwgXCJ5XCI6IDUyMH0sIHtcInhcIjogMTQ4ODMyNjQwMDAwMCwgXCJ5XCI6IDQwMH1dLCAgICAgIC8vdmFsdWVzIC0gcmVwcmVzZW50cyB0aGUgYXJyYXkgb2Yge3gseX0gZGF0YSBwb2ludHNcbiAgICAgICAgICAgICAgICBrZXk6ICdNYXN0ZXJzJywgLy9rZXkgIC0gdGhlIG5hbWUgb2YgdGhlIHNlcmllcy5cbiAgICAgICAgICAgICAgICBjb2xvcjogJyNmZjdmMGUnLCAgLy9jb2xvciAtIG9wdGlvbmFsOiBjaG9vc2UgeW91ciBvd24gbGluZSBjb2xvci5cbiAgICAgICAgICAgICAgICBzdHJva2VXaWR0aDogMixcbiAgICAgICAgICAgICAgICBhcmVhOiB0cnVlICAgICAgLy9hcmVhIC0gc2V0IHRvIHRydWUgaWYgeW91IHdhbnQgdGhpcyBsaW5lIHRvIHR1cm4gaW50byBhIGZpbGxlZCBhcmVhIGNoYXJ0LlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXM6IFt7XCJ4XCI6IDE0NzI2ODgwMDAwMDAsIFwieVwiOiAxMzJ9LCB7XCJ4XCI6IDE0NzUyODAwMDAwMDAsIFwieVwiOiAyMjF9LCB7XCJ4XCI6IDE0Nzc5NTg0MDAwMDAsIFwieVwiOiA2MH0sIHtcInhcIjogMTQ4MDU1MDQwMDAwMCwgXCJ5XCI6IDEyMH0sIHtcInhcIjogMTQ4NTkwNzIwMDAwMCwgXCJ5XCI6IDQwMH0sIHtcInhcIjogMTQ4ODMyNjQwMDAwMCwgXCJ5XCI6IDIwMH1dLCAgICAgIC8vdmFsdWVzIC0gcmVwcmVzZW50cyB0aGUgYXJyYXkgb2Yge3gseX0gZGF0YSBwb2ludHNcbiAgICAgICAgICAgICAgICBrZXk6ICdCYWNoZWxvcicsXG4gICAgICAgICAgICAgICAgY29sb3I6ICcjMmNhMDJjJyxcbiAgICAgICAgICAgICAgICBhcmVhOiB0cnVlICAgICAgLy9hcmVhIC0gc2V0IHRvIHRydWUgaWYgeW91IHdhbnQgdGhpcyBsaW5lIHRvIHR1cm4gaW50byBhIGZpbGxlZCBhcmVhIGNoYXJ0LlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXM6IFt7XCJ4XCI6IDE0NzI2ODgwMDAwMDAsIFwieVwiOiAzMn0sIHtcInhcIjogMTQ3NTI4MDAwMDAwMCwgXCJ5XCI6IDIxfSwge1wieFwiOiAxNDc3OTU4NDAwMDAwLCBcInlcIjogMTB9LCB7XCJ4XCI6IDE0ODA1NTA0MDAwMDAsIFwieVwiOiAxMn0sIHtcInhcIjogMTQ4NTkwNzIwMDAwMCwgXCJ5XCI6IDQwfSwge1wieFwiOiAxNDg4MzI2NDAwMDAwLCBcInlcIjogMjB9XSwgICAgICAvL3ZhbHVlcyAtIHJlcHJlc2VudHMgdGhlIGFycmF5IG9mIHt4LHl9IGRhdGEgcG9pbnRzXG4gICAgICAgICAgICAgICAga2V5OiAnT3RoZXInLFxuICAgICAgICAgICAgICAgIGNvbG9yOiAnIzc3NzdmZicsXG4gICAgICAgICAgICAgICAgYXJlYTogdHJ1ZSAgICAgIC8vYXJlYSAtIHNldCB0byB0cnVlIGlmIHlvdSB3YW50IHRoaXMgbGluZSB0byB0dXJuIGludG8gYSBmaWxsZWQgYXJlYSBjaGFydC5cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcblxuICAgICAgICAkc2NvcGUub3B0aW9ucy5jb3VudHJpZXMgPSB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdwaWVDaGFydCcsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAzMjAsXG4gICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7cmV0dXJuIGQua2V5O30sXG4gICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQueTt9LFxuICAgICAgICAgICAgICAgIHNob3dMYWJlbHM6IHRydWUsXG4gICAgICAgICAgICAgICAgbGFiZWxTdW5iZWFtTGF5b3V0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkb251dDogZmFsc2UsXG4gICAgICAgICAgICAgICAgbGFiZWxUeXBlOiBcInBlcmNlbnRcIixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgIGxhYmVsVGhyZXNob2xkOiAwLjAxLFxuICAgICAgICAgICAgICAgIGxlZ2VuZDoge1xuICAgICAgICAgICAgICAgICAgICBtYXJnaW46IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogNSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAzNSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGF0YS5jb3VudHJpZXMgPSBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXlcIjonUG9ydHVnYWwnLFxuICAgICAgICAgICAgICAgIFwieVwiOjAuODM4Nzg3MTI4MTgzNTA2NVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOidHZXJtYW55JyxcbiAgICAgICAgICAgICAgICBcInlcIjowLjI4MjEyMzU0NDc5Mzg0ODc2XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6J0JyYXNpbCcsXG4gICAgICAgICAgICAgICAgXCJ5XCI6MC4xNjg0NTU4NDU5ODkxMDQyNlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOidDaGluYScsXG4gICAgICAgICAgICAgICAgXCJ5XCI6MC4xNzYxNDI3NDM3NDQ1MzM3M1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOidGcmFuY2UnLFxuICAgICAgICAgICAgICAgIFwieVwiOjAuMTU5OTg3MTIwODQ5MDgyNDVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXlcIjonVGhhaWxhbmQnLFxuICAgICAgICAgICAgICAgIFwieVwiOjAuMTU2NzYxNzk0NDA2MjU3MjNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXlcIjonU3BhaW4nLFxuICAgICAgICAgICAgICAgIFwieVwiOjAuMTc0NjA1ODg5MDIyNzkyNFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOidHcmVhdCBCcml0YWluJyxcbiAgICAgICAgICAgICAgICBcInlcIjowLjE3MzY0OTYxMDI3MzMyMzEyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6J090aGVyJyxcbiAgICAgICAgICAgICAgICBcInlcIjowLjM1MzU0NTc5OTM3Nzc2Njc1XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG5cbiAgICB9KTtcblxufSkoKTtcbiJdfQ==
