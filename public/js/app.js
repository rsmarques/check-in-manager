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
                    showMaxMin: false
                },
                yAxis: {
                    axisLabel: 'Y Axis',
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

    }]);

})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbmZpZy5qcyIsInJvdXRlcy5qcyIsImFwcC9hdXRoL2F1dGhDdHJsLmpzIiwiYXBwL2F1dGgvYXV0aFNydi5qcyIsImFwcC9ldmVudHMvZXZlbnRDdHJsLmpzIiwiYXBwL2V2ZW50cy9ldmVudFNydi5qcyIsImFwcC9kaWFsb2dzL2RpYWxvZ0N0cmwuanMiLCJhcHAvZ3Vlc3RzL2d1ZXN0Q3RybC5qcyIsImFwcC9ndWVzdHMvZ3Vlc3RTcnYuanMiLCJhcHAvc3RhdHMvc3RhdHNDdHJsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUEsVUFBQTtJQUNBOztJQUVBLElBQUEsTUFBQSxRQUFBLE9BQUEsZ0JBQUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7OztJQUlBLFFBQUEsT0FBQSx1QkFBQSxDQUFBLGFBQUE7SUFDQSxRQUFBLE9BQUEsNEJBQUEsQ0FBQSxhQUFBLGNBQUEsY0FBQSxhQUFBLGFBQUE7SUFDQSxRQUFBLE9BQUEseUJBQUEsQ0FBQTtJQUNBLFFBQUEsT0FBQSx1QkFBQSxDQUFBOzs7O0FDZEEsQ0FBQSxVQUFBO0lBQ0E7O0lBRUEsUUFBQSxPQUFBLHVCQUFBLFNBQUEsV0FBQTs7S0FFQSwyQkFBQSxTQUFBLGlCQUFBO1FBQ0EsZ0JBQUEsUUFBQSxNQUFBOzs7S0FHQSw4QkFBQSxTQUFBLG9CQUFBO1FBQ0EsbUJBQUEsTUFBQSxhQUFBLGtCQUFBLFFBQUE7UUFDQSxtQkFBQSxNQUFBLGVBQUEsa0JBQUEsVUFBQTtRQUNBLG1CQUFBLE1BQUEsZUFBQSxrQkFBQSxlQUFBO1FBQ0EsbUJBQUEsTUFBQSxhQUFBLGtCQUFBLFFBQUE7Ozs7S0FJQSxtQkFBQSxVQUFBLFlBQUE7O1FBRUEsV0FBQSxtQkFBQSxZQUFBO1lBQ0EsT0FBQSxXQUFBLFdBQUEsV0FBQSxTQUFBLFFBQUE7Ozs7OztBQ3BCQSxDQUFBLFVBQUE7SUFDQTs7SUFFQSxRQUFBLE9BQUEsdUJBQUEsc0ZBQUEsVUFBQSxnQkFBQSxvQkFBQSxlQUFBLG1C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VUFBQSxRQUFBOztnQkFFQSxXQUFBLFdBQUEsT0FBQTs7ZUFFQSxVQUFBLEtBQUE7Ozs7O1FBS0EsS0FBQTs7OztBQzlEQSxDQUFBLFVBQUE7SUFDQTs7Ozs7Ozs7O0lBU0EsUUFBQSxPQUFBLDRCQUFBLFdBQUEsMERBQUEsVUFBQSxZQUFBLFNBQUEsUUFBQSxPQUFBOztRQUVBLE9BQUEsWUFBQTtRQUNBLE9BQUEsVUFBQTtRQUNBLE9BQUEsT0FBQTs7UUFFQSxPQUFBLFFBQUEsZUFBQTtZQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxRQUFBO2dCQUNBLFNBQUE7b0JBQ0EsS0FBQTtvQkFDQSxPQUFBO29CQUNBLFFBQUE7b0JBQ0EsTUFBQTs7Z0JBRUEsY0FBQTtnQkFDQSxVQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsU0FBQTtnQkFDQSxPQUFBO29CQUNBLFdBQUE7b0JBQ0EsWUFBQTs7Z0JBRUEsT0FBQTtvQkFDQSxXQUFBO29CQUNBLG1CQUFBLENBQUE7b0JBQ0EsWUFBQSxTQUFBLEVBQUE7d0JBQ0EsT0FBQSxHQUFBLE9BQUEsUUFBQTs7Ozs7O1FBTUEsT0FBQSxLQUFBLGVBQUE7WUFDQTtnQkFDQSxNQUFBO2dCQUNBLFNBQUE7b0JBQ0E7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOzs7O1lBSUE7Z0JBQ0EsTUFBQTtnQkFDQSxTQUFBO29CQUNBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7OztZQUlBO2dCQUNBLE1BQUE7Z0JBQ0EsU0FBQTtvQkFDQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7O29CQUVBO3dCQUNBLElBQUE7d0JBQ0EsSUFBQTs7b0JBRUE7d0JBQ0EsSUFBQTt3QkFDQSxJQUFBOztvQkFFQTt3QkFDQSxJQUFBO3dCQUNBLElBQUE7Ozs7OztRQU1BLE9BQUEsUUFBQSxzQkFBQTtZQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxRQUFBO2dCQUNBLEdBQUEsU0FBQSxFQUFBLENBQUEsT0FBQSxFQUFBO2dCQUNBLEdBQUEsU0FBQSxFQUFBLENBQUEsT0FBQSxFQUFBO2dCQUNBLFlBQUE7Z0JBQ0Esb0JBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxZQUFBO2dCQUNBLFdBQUE7Z0JBQ0EsVUFBQTtnQkFDQSxnQkFBQTtnQkFDQSxRQUFBO29CQUNBLFFBQUE7d0JBQ0EsS0FBQTt3QkFDQSxPQUFBO3dCQUNBLFFBQUE7d0JBQ0EsTUFBQTs7Ozs7O1FBTUEsT0FBQSxLQUFBLHNCQUFBO1lBQ0E7Z0JBQ0EsTUFBQTtnQkFDQSxJQUFBOztZQUVBO2dCQUNBLE1BQUE7Z0JBQ0EsSUFBQTs7WUFFQTtnQkFDQSxNQUFBO2dCQUNBLElBQUE7O1lBRUE7Z0JBQ0EsTUFBQTtnQkFDQSxJQUFBOztZQUVBO2dCQUNBLE1BQUE7Z0JBQ0EsSUFBQTs7WUFFQTtnQkFDQSxNQUFBO2dCQUNBLElBQUE7O1lBRUE7Z0JBQ0EsTUFBQTtnQkFDQSxJQUFBOztZQUVBO2dCQUNBLE1BQUE7Z0JBQ0EsSUFBQTs7WUFFQTtnQkFDQSxNQUFBO2dCQUNBLElBQUE7O1lBRUE7Z0JBQ0EsTUFBQTtnQkFDQSxJQUFBOzs7Ozs7O0FBT0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcCcsIFtcbiAgICAgICAgJ2NoZWNrX2luX2FwcC5jb250cm9sbGVycycsXG4gICAgICAgICdjaGVja19pbl9hcHAuc2VydmljZXMnLFxuICAgICAgICAnY2hlY2tfaW5fYXBwLnJvdXRlcycsXG4gICAgICAgICdjaGVja19pbl9hcHAuY29uZmlnJ1xuICAgIF0pO1xuXG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLnJvdXRlcycsIFsndWkucm91dGVyJywgJ25nU3RvcmFnZSddKTtcbiAgICBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLmNvbnRyb2xsZXJzJywgWyd1aS5yb3V0ZXInLCAnbmdNYXRlcmlhbCcsICduZ01lc3NhZ2VzJywgJ25nU3RvcmFnZScsICdtZFBpY2tlcnMnLCAnbnZkMyddKTtcbiAgICBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLnNlcnZpY2VzJywgWyduZ1Jlc291cmNlJ10pO1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29uZmlnJywgWyduZ01hdGVyaWFsJ10pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLmNvbmZpZycpLmNvbnN0YW50KCdBUElfVVJMJywgJ2FwaS92MS8nKVxuXG4gICAgLmNvbmZpZyhmdW5jdGlvbigkbWRJY29uUHJvdmlkZXIpIHtcbiAgICAgICAgJG1kSWNvblByb3ZpZGVyLmZvbnRTZXQoJ21kJywgJ21hdGVyaWFsLWljb25zJyk7XG4gICAgfSlcblxuICAgIC5jb25maWcoZnVuY3Rpb24oJG1kVGhlbWluZ1Byb3ZpZGVyKSB7XG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZGFyay1ncmV5JykuYmFja2dyb3VuZFBhbGV0dGUoJ2dyZXknKS5kYXJrKCk7XG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZGFyay1vcmFuZ2UnKS5iYWNrZ3JvdW5kUGFsZXR0ZSgnb3JhbmdlJykuZGFyaygpO1xuICAgICAgICAkbWRUaGVtaW5nUHJvdmlkZXIudGhlbWUoJ2RhcmstcHVycGxlJykuYmFja2dyb3VuZFBhbGV0dGUoJ2RlZXAtcHVycGxlJykuZGFyaygpO1xuICAgICAgICAkbWRUaGVtaW5nUHJvdmlkZXIudGhlbWUoJ2RhcmstYmx1ZScpLmJhY2tncm91bmRQYWxldHRlKCdibHVlJykuZGFyaygpO1xuICAgIH0pXG5cbiAgICAvLyBUT0RPIHRlbXAgc29sdXRpb24sIHJlbW92ZSB0aGlzIGZyb20gaGVyZVxuICAgIC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcblxuICAgICAgICAkcm9vdFNjb3BlLmhhc0FkbWluQWNjZXNzICAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJHJvb3RTY29wZS5hdXRoVXNlciA/ICRyb290U2NvcGUuYXV0aFVzZXIuYWRtaW4gOiAwO1xuICAgICAgICB9O1xuICAgIH0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLnJvdXRlcycpLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgJGh0dHBQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcblxuICAgICAgICAvLyBwcmV2ZW50aW5nIFwiIVwiXCIgZnJvbSBhcHBlYXJpbmcgaW4gdXJsXG4gICAgICAgICRsb2NhdGlvblByb3ZpZGVyLmhhc2hQcmVmaXgoJycpO1xuXG4gICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAuc3RhdGUoJ3NpZ251cCcsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL2F1dGgvYXV0aC5odG1sJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQXV0aEN0cmwnLFxuICAgICAgICAgICAgICAgIHJlZ2lzdGVyOiAxXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdzaWduaW4nLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3NpZ25pbicsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcuL3ZpZXdzL2FwcC9hdXRoL2F1dGguaHRtbCcsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0F1dGhDdHJsJyxcbiAgICAgICAgICAgICAgICByZWdpc3RlcjogMFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnZ3Vlc3RzJywge1xuICAgICAgICAgICAgICAgIHVybDogJy9ndWVzdHMnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvZ3Vlc3RzL2d1ZXN0cy5odG1sJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnR3Vlc3RDdHJsJ1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnZXZlbnRzJywge1xuICAgICAgICAgICAgICAgIHVybDogJy9ldmVudHMnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvZXZlbnRzL2V2ZW50cy5odG1sJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRXZlbnRDdHJsJ1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnc3RhdHMnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL3N0YXRzJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL3N0YXRzL3N0YXRzLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdTdGF0c0N0cmwnXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvZXZlbnRzJyk7XG5cbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbJyRxJywgJyRsb2NhdGlvbicsICckbG9jYWxTdG9yYWdlJywgZnVuY3Rpb24gKCRxLCAkbG9jYXRpb24sICRsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgJ3JlcXVlc3QnOiBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307XG4gICAgICAgICAgICAgICAgICAgIGlmICgkbG9jYWxTdG9yYWdlLnRva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWcuaGVhZGVycy5BdXRob3JpemF0aW9uID0gJ0JlYXJlciAnICsgJGxvY2FsU3RvcmFnZS50b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29uZmlnO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJ3Jlc3BvbnNlRXJyb3InOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAwIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24ucGF0aCgnL3NpZ25pbicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1dKTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGNoZWNrSW5NYW5hZ2VyLmNvbnRyb2xsZXI6QXV0aEN0cmxcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIEF1dGhDdHJsXG4gICAgICogQ29udHJvbGxlciBvZiB0aGUgY2hlY2tJbk1hbmFnZXJcbiAgICAgKi9cbiAgICBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLmNvbnRyb2xsZXJzJykuY29udHJvbGxlcignQXV0aEN0cmwnLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHNjb3BlLCAkc3RhdGUsICRsb2NhdGlvbiwgJGxvY2FsU3RvcmFnZSwgQXV0aCwgR3Vlc3RTcnYsIEF1dGhTcnYpIHtcblxuICAgICAgICBmdW5jdGlvbiBzdWNjZXNzQXV0aCAocmVzKSB7XG4gICAgICAgICAgICAkbG9jYWxTdG9yYWdlLnRva2VuID0gcmVzLmRhdGEudG9rZW47XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBcIiMvZXZlbnRzXCI7XG5cbiAgICAgICAgICAgIC8vIFRPRE8gcmVtb3ZlIHRoaXMgZnJvbSBoZXJlXG4gICAgICAgICAgICAvLyByZWxvYWQgZ3Vlc3RzIGFmdGVyIHN1Y2Nlc3NmdWwgbG9naW5cbiAgICAgICAgICAgIEd1ZXN0U3J2LmdldEd1ZXN0cygpO1xuICAgICAgICAgICAgQXV0aFNydi5nZXRDdXJyZW50VXNlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLnBlcmZvcm1Mb2dpbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwZXJmb3JtTG9naW4nKTtcbiAgICAgICAgICAgIGlmICgkc2NvcGUucmVnaXN0ZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnNpZ251cCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHNjb3BlLnNpZ25pbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaWduaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZm9ybURhdGEgPSB7XG4gICAgICAgICAgICAgICAgZW1haWw6ICRzY29wZS5jcmVkZW50aWFscy5lbWFpbCxcbiAgICAgICAgICAgICAgICBwYXNzd29yZDogJHNjb3BlLmNyZWRlbnRpYWxzLnBhc3N3b3JkXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLmVycm9yICAgID0gbnVsbDtcblxuICAgICAgICAgICAgQXV0aC5zaWduaW4oZm9ybURhdGEsIHN1Y2Nlc3NBdXRoLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS5lcnJvciA9ICdJbnZhbGlkIGVtYWlsL3Bhc3N3b3JkLic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2lnbnVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGZvcm1EYXRhID0ge1xuICAgICAgICAgICAgICAgIGVtYWlsOiAkc2NvcGUuY3JlZGVudGlhbHMuZW1haWwsXG4gICAgICAgICAgICAgICAgcGFzc3dvcmQ6ICRzY29wZS5jcmVkZW50aWFscy5wYXNzd29yZFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS5lcnJvciAgICAgICAgICAgID0gbnVsbDtcblxuICAgICAgICAgICAgQXV0aC5zaWdudXAoZm9ybURhdGEsIHN1Y2Nlc3NBdXRoLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVyci5lcnJvcnMgJiYgZXJyLmVycm9yc1swXSkge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmVycm9yICAgID0gZXJyLmVycm9yc1swXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmVycm9yICAgID0gJ0ZhaWxlZCB0byBzaWdudXAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBBdXRoLmxvZ291dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gXCIvXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAgJHNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3VjY2VzcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5yZWdpc3RlciAgICAgPSAkc3RhdGUuY3VycmVudC5yZWdpc3RlcjtcbiAgICAgICAgICAgICRzY29wZS5sb2dpblRleHQgICAgPSAkc2NvcGUucmVnaXN0ZXIgPyAnUmVnaXN0ZXInIDogJ0xvZ2luJztcbiAgICAgICAgICAgICRyb290U2NvcGUuZXJyb3IgICAgPSBudWxsO1xuICAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLnRva2VuICAgICAgICAgPSAkbG9jYWxTdG9yYWdlLnRva2VuO1xuICAgICAgICAkc2NvcGUudG9rZW5DbGFpbXMgICA9IEF1dGguZ2V0VG9rZW5DbGFpbXMoKTtcbiAgICB9KTtcblxufSkoKTtcbiIsIihmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgY2hlY2tJbk1hbmFnZXIuc2VydmljZTpBdXRoXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogIyBBdXRoXG4gICAgICogU2VydmljZSBvZiB0aGUgY2hlY2tJbk1hbmFnZXJcbiAgICAgKi9cbiAgICBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLnNlcnZpY2VzJykuZmFjdG9yeSgnQXV0aCcsIGZ1bmN0aW9uICgkaHR0cCwgJGxvY2FsU3RvcmFnZSwgQVBJX1VSTCkge1xuICAgICAgICBmdW5jdGlvbiB1cmxCYXNlNjREZWNvZGUoc3RyKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gc3RyLnJlcGxhY2UoJy0nLCAnKycpLnJlcGxhY2UoJ18nLCAnLycpO1xuICAgICAgICAgICAgc3dpdGNoIChvdXRwdXQubGVuZ3RoICUgNCkge1xuICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQgKz0gJz09JztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQgKz0gJz0nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnSWxsZWdhbCBiYXNlNjR1cmwgc3RyaW5nISc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gd2luZG93LmF0b2Iob3V0cHV0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldENsYWltc0Zyb21Ub2tlbigpIHtcbiAgICAgICAgICAgIHZhciB0b2tlbiA9ICRsb2NhbFN0b3JhZ2UudG9rZW47XG4gICAgICAgICAgICB2YXIgdXNlciA9IHt9O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW5jb2RlZCA9IHRva2VuLnNwbGl0KCcuJylbMV07XG4gICAgICAgICAgICAgICAgdXNlciA9IEpTT04ucGFyc2UodXJsQmFzZTY0RGVjb2RlKGVuY29kZWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRva2VuQ2xhaW1zID0gZ2V0Q2xhaW1zRnJvbVRva2VuKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNpZ251cDogZnVuY3Rpb24gKGRhdGEsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdChBUElfVVJMICsgJ3VzZXJzL3NpZ251cCcsIGRhdGEpLnRoZW4oc3VjY2VzcykuY2F0Y2goZXJyb3IpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNpZ25pbjogZnVuY3Rpb24gKGRhdGEsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdChBUElfVVJMICsgJ3VzZXJzL3NpZ25pbicsIGRhdGEpLnRoZW4oc3VjY2VzcykuY2F0Y2goZXJyb3IpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxvZ291dDogZnVuY3Rpb24gKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICB0b2tlbkNsYWltcyA9IHt9O1xuICAgICAgICAgICAgICAgIGRlbGV0ZSAkbG9jYWxTdG9yYWdlLnRva2VuO1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3MoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRUb2tlbkNsYWltczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0b2tlbkNsYWltcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtZTogZnVuY3Rpb24gKHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgICAgICAgICAgICAgJGh0dHAuZ2V0KEFQSV9VUkwgKyAnbWUnKS50aGVuKHN1Y2Nlc3MpLmNhdGNoKGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KVxuXG4gICAgLnNlcnZpY2UoJ0F1dGhTcnYnLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aCkge1xuXG4gICAgICAgIHRoaXMuZ2V0Q3VycmVudFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdXNlciAgICA9IEF1dGgubWUoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gaW1wcm92ZSB0aGlzXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS5hdXRoVXNlciA9IHJlc3VsdC5kYXRhLmRhdGE7XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRDdXJyZW50VXNlcigpO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgY2hlY2tJbk1hbmFnZXIuY29udHJvbGxlcjpFdmVudEN0cmxcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIEV2ZW50Q3RybFxuICAgICAqIENvbnRyb2xsZXIgb2YgdGhlIGNoZWNrSW5NYW5hZ2VyXG4gICAgICovXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5jb250cm9sbGVycycpLmNvbnRyb2xsZXIoJ0V2ZW50Q3RybCcsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkd2luZG93LCAkc2NvcGUsICRodHRwLCAkc3RhdGVQYXJhbXMsICRsb2NhdGlvbiwgJG1kRGlhbG9nLCAkbWRNZWRpYSwgJG1kVG9hc3QsIEFQSV9VUkwsIEV2ZW50LCBHdWVzdCwgR3Vlc3RTcnYsIEF1dGhTcnYpIHtcblxuICAgICAgICAvLyBUT0RPIGNoYW5nZSBvcGVuRGlhbG9ncyBsb2NhdGlvblxuICAgICAgICAkc2NvcGUub3Blbkd1ZXN0RGlhbG9nID0gZnVuY3Rpb24gKCRldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrSW5TdGF0dXMgICAgPSBudWxsO1xuXG4gICAgICAgICAgICAkbWREaWFsb2cuc2hvdyh7XG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0RpYWxvZ0N0cmwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvZGlhbG9ncy9ndWVzdF9jaGVja2luLmh0bWwnLFxuICAgICAgICAgICAgICAgIHBhcmVudDogYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LmJvZHkpLFxuICAgICAgICAgICAgICAgIC8vIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgLy8gcHJlc2VydmVTY29wZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBsb2NhbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3RzOiAkc2NvcGUuZ3Vlc3RzLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50RXZlbnQ6ICRzY29wZS5jdXJyZW50RXZlbnQsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRHdWVzdDogbnVsbCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50OiAkZXZlbnQsXG4gICAgICAgICAgICAgICAgY2xpY2tPdXRzaWRlVG9DbG9zZTp0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUub3BlbkV2ZW50RGlhbG9nID0gZnVuY3Rpb24gKCRldmVudCwgbmV3RXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChuZXdFdmVudCkge1xuICAgICAgICAgICAgICAgICRzY29wZS51bmNoZWNrQ3VycmVudEV2ZW50KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRtZERpYWxvZy5zaG93KHtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRGlhbG9nQ3RybCcsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlckFzOiAnY3RybCcsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcuL3ZpZXdzL2FwcC9kaWFsb2dzL2VkaXRfZXZlbnQuaHRtbCcsXG4gICAgICAgICAgICAgICAgbG9jYWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0czogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEV2ZW50OiAkc2NvcGUuY3VycmVudEV2ZW50LFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50R3Vlc3Q6IG51bGwsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5ib2R5KSxcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlU2NvcGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQ6ICRldmVudCxcbiAgICAgICAgICAgICAgICBjbGlja091dHNpZGVUb0Nsb3NlOnRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5vcGVuRXZlbnRNZW51ID0gZnVuY3Rpb24gKCRtZE9wZW5NZW51LCBldikge1xuICAgICAgICAgICAgdmFyIG9yaWdpbmF0b3JFdiA9IGV2O1xuICAgICAgICAgICAgJG1kT3Blbk1lbnUoZXYpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zZWxlY3RFdmVudCAgPSBmdW5jdGlvbiAoZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2goeydwJyA6IGV2ZW50LnNsdWd9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZmluZEV2ZW50ICAgID0gZnVuY3Rpb24gKGV2ZW50U2x1ZylcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCEkc2NvcGUuZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgcmVzdWx0ICAgICAgICAgID0gJHNjb3BlLmV2ZW50cy5maW5kKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5zbHVnID09IGV2ZW50U2x1ZztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zZXRDdXJyZW50RXZlbnQgID0gZnVuY3Rpb24gKGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuZXZlbnRJZCAgICAgICAgICAgICAgPSBldmVudC5pZDtcbiAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQgICAgICAgICA9IGV2ZW50O1xuICAgICAgICAgICAgJHNjb3BlLmxvYWRpbmdHdWVzdHMgICAgICAgID0gdHJ1ZTtcbiAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzICAgICAgICA9IFtdO1xuXG4gICAgICAgICAgICB2YXIgZyAgICAgICAgICAgICAgICAgICAgICAgPSBFdmVudC5nZXQoe2V2ZW50U2x1ZzogZXZlbnQuc2x1ZywgZGF0YTogJ2d1ZXN0cyd9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZ0d1ZXN0cyAgICA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzICAgID0gcmVzdWx0LmRhdGE7XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnVuY2hlY2tDdXJyZW50RXZlbnQgID0gZnVuY3Rpb24gKClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmV2ZW50SWQgICAgICAgICAgICAgID0gbnVsbDtcbiAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQgICAgICAgICA9IDA7XG4gICAgICAgICAgICAkc2NvcGUubG9hZGluZ0d1ZXN0cyAgICAgICAgPSBmYWxzZTtcbiAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzICAgICAgICA9IFtdO1xuXG4gICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHt9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuY2hlY2tDdXJyZW50RXZlbnQgICAgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zICA9ICRsb2NhdGlvbi5zZWFyY2goKTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBwYXJhbXMucCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIHZhciBldmVudElkID0gcGFyYW1zLnA7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50ICAgPSAkc2NvcGUuZmluZEV2ZW50KGV2ZW50SWQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBldmVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLmV2ZW50SWQgIT09IGV2ZW50LmlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2V0Q3VycmVudEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBzZXQgZmlyc3QgZXZlbnQgYXMgZGVmYXVsdFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc29ydEV2ZW50cyAgID0gZnVuY3Rpb24gKHNvcnQsIHJldmVyc2UpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5zb3J0RXZlbnQgICAgICAgID0gc29ydDtcbiAgICAgICAgICAgICRzY29wZS5zb3J0RXZlbnRSZXZlcnNlID0gcmV2ZXJzZTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuY2hlY2tJbkd1ZXN0ID0gZnVuY3Rpb24oZXZlbnQsIGV2ZW50R3Vlc3QpXG4gICAgICAgIHtcblxuICAgICAgICAgICAgR3Vlc3QuY2hlY2tJbih7ZXZlbnRTbHVnOiBldmVudC5zbHVnLCBndWVzdElkOiBldmVudEd1ZXN0LmlkLCBkYXRhOiAnY2hlY2tpbid9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50Lmd1ZXN0X2NvdW50ID0gJHNjb3BlLmN1cnJlbnRHdWVzdHMubGVuZ3RoO1xuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgZ3Vlc3RJbmRleCAgICAgID0gJHNjb3BlLmN1cnJlbnRHdWVzdHMubWFwKGZ1bmN0aW9uIChnKSB7cmV0dXJuIGcuaWQ7IH0pLmluZGV4T2YoZXZlbnRHdWVzdC5pZCk7XG5cbiAgICAgICAgICAgIGlmIChndWVzdEluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIGd1ZXN0IGFscmVhZHkgb24gbGlzdCwgY2hhbmdpbmcgaXRzIHZhbHVlXG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHNbZ3Vlc3RJbmRleF0uY2hlY2tfaW4gPSAhJHNjb3BlLmN1cnJlbnRHdWVzdHNbZ3Vlc3RJbmRleF0uY2hlY2tfaW47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5ldyBndWVzdCwgYWRkaW5nIGhpbSB0byBhcnJheVxuICAgICAgICAgICAgICAgIHZhciBndWVzdERhdGEgICAgICAgPSAoSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShldmVudEd1ZXN0KSkpO1xuICAgICAgICAgICAgICAgIGd1ZXN0RGF0YS5jaGVja19pbiAgPSAxO1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzLnVuc2hpZnQoZ3Vlc3REYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZm9yY2luZyB3aW5kb3cgcmVzaXplIHRvIHVwZGF0ZSB2aXJ0dWFsIHJlcGVhdGVyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQod2luZG93KS50cmlnZ2VySGFuZGxlcigncmVzaXplJyk7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93UmVtb3ZlRXZlbnQgPSBmdW5jdGlvbiAoZXYsIGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICAvLyBBcHBlbmRpbmcgZGlhbG9nIHRvIGRvY3VtZW50LmJvZHkgdG8gY292ZXIgc2lkZW5hdiBpbiBkb2NzIGFwcFxuICAgICAgICAgICAgdmFyIGNvbmZpcm0gICAgID0gJG1kRGlhbG9nLmNvbmZpcm0oKVxuICAgICAgICAgICAgICAgIC50aXRsZSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIGV2ZW50PycpXG4gICAgICAgICAgICAgICAgLnRleHRDb250ZW50KCdUaGlzIGFjdGlvbiBjYW5ub3QgYmUgdW5kb25lLicpXG4gICAgICAgICAgICAgICAgLmFyaWFMYWJlbCgnRGVsZXRlIEV2ZW50JylcbiAgICAgICAgICAgICAgICAudGFyZ2V0RXZlbnQoZXYpXG4gICAgICAgICAgICAgICAgLm9rKCdZZXMnKVxuICAgICAgICAgICAgICAgIC5jYW5jZWwoJ1VuZG8nKTtcblxuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coY29uZmlybSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuZ3Vlc3RzLm1hcChmdW5jdGlvbiAoZSkge3JldHVybiBlLmlkOyB9KS5pbmRleE9mKGd1ZXN0LmlkKTtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRJbmRleCAgPSAkc2NvcGUuZXZlbnRzLmluZGV4T2YoZXZlbnQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50SW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ldmVudHMuc3BsaWNlKGV2ZW50SW5kZXgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIEV2ZW50LmRlbGV0ZSh7ZXZlbnRTbHVnOiBldmVudC5zbHVnfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHMgICAgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0V2ZW50RGVsZXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3RhdHVzICAgICAgICAgICA9ICdFdmVudCBEZWxldGVkLic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dFdmVudERlbGV0ZWQgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRtZFRvYXN0LnNob3coXG4gICAgICAgICAgICAgICAgJG1kVG9hc3Quc2ltcGxlKClcbiAgICAgICAgICAgICAgICAgICAgLnRleHRDb250ZW50KCdFdmVudCBEZWxldGVkIScpXG4gICAgICAgICAgICAgICAgICAgIC5wb3NpdGlvbigndG9wIHJpZ2h0JylcbiAgICAgICAgICAgICAgICAgICAgLmhpZGVEZWxheSgzMDAwKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2hvd1JlbW92ZUd1ZXN0ID0gZnVuY3Rpb24gKGV2LCBldmVudCwgZ3Vlc3QpXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIEFwcGVuZGluZyBkaWFsb2cgdG8gZG9jdW1lbnQuYm9keSB0byBjb3ZlciBzaWRlbmF2IGluIGRvY3MgYXBwXG4gICAgICAgICAgICB2YXIgY29uZmlybSAgICAgPSAkbWREaWFsb2cuY29uZmlybSgpXG4gICAgICAgICAgICAgICAgLnRpdGxlKCdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gcmVtb3ZlIHRoaXMgZ3Vlc3Q/JylcbiAgICAgICAgICAgICAgICAudGV4dENvbnRlbnQoJ1RoaXMgYWN0aW9uIGNhbm5vdCBiZSB1bmRvbmUuJylcbiAgICAgICAgICAgICAgICAuYXJpYUxhYmVsKCdSZW1vdmUgR3Vlc3QnKVxuICAgICAgICAgICAgICAgIC50YXJnZXRFdmVudChldilcbiAgICAgICAgICAgICAgICAub2soJ1llcycpXG4gICAgICAgICAgICAgICAgLmNhbmNlbCgnVW5kbycpO1xuXG4gICAgICAgICAgICAkbWREaWFsb2cuc2hvdyhjb25maXJtKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5ndWVzdHMubWFwKGZ1bmN0aW9uIChlKSB7cmV0dXJuIGUuaWQ7IH0pLmluZGV4T2YoZ3Vlc3QuaWQpO1xuICAgICAgICAgICAgICAgIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5jdXJyZW50R3Vlc3RzLmluZGV4T2YoZ3Vlc3QpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGd1ZXN0SW5kZXggIT09IC0xKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgR3Vlc3QucmVtb3ZlKHtldmVudFNsdWc6IGV2ZW50LnNsdWcsIGd1ZXN0SWQ6IGd1ZXN0LmlkLCBkYXRhOiAncmVtb3ZlJ30sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQuZ3Vlc3RfY291bnQgPSAkc2NvcGUuY3VycmVudEd1ZXN0cy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcblxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0cy5zcGxpY2UoZ3Vlc3RJbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0d1ZXN0UmVtb3ZlZCgpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3RhdHVzICAgICAgID0gJ0d1ZXN0IFJlbW92ZWQuJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2hvd0d1ZXN0UmVtb3ZlZCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgJG1kVG9hc3Quc2hvdyhcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaW1wbGUoKVxuICAgICAgICAgICAgICAgICAgICAudGV4dENvbnRlbnQoJ0d1ZXN0IFJlbW92ZWQhJylcbiAgICAgICAgICAgICAgICAgICAgLnBvc2l0aW9uKCd0b3AgcmlnaHQnKVxuICAgICAgICAgICAgICAgICAgICAuaGlkZURlbGF5KDMwMDApXG4gICAgICAgICAgICApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5nZXRFdmVudEd1ZXN0UmVwZWF0ZXJIZWlnaHQgPSBmdW5jdGlvbigpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB3aW5kb3dIZWlnaHQgICAgICAgID0gJHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgICAgIHZhciBuYXZCYXJIZWlnaHQgICAgICAgID0gJCgnI25hdmJhcicpLm91dGVySGVpZ2h0KHRydWUpO1xuICAgICAgICAgICAgdmFyIGV2ZW50SGVhZGVySGVpZ2h0ICAgPSAkKCcjZXZlbnRIZWFkZXInKS5vdXRlckhlaWdodCh0cnVlKTtcblxuICAgICAgICAgICAgdmFyIGxpc3RIZWlnaHQgICAgICAgICAgPSB3aW5kb3dIZWlnaHQgLSBuYXZCYXJIZWlnaHQgLSBldmVudEhlYWRlckhlaWdodCAtIDEwO1xuXG4gICAgICAgICAgICByZXR1cm4ge2hlaWdodDogJycgKyBsaXN0SGVpZ2h0ICsgJ3B4J307XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdldEV2ZW50UmVwZWF0ZXJIZWlnaHQgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgd2luZG93SGVpZ2h0ICAgICAgICAgICAgPSAkd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICAgICAgdmFyIG5hdkJhckhlaWdodCAgICAgICAgICAgID0gJCgnI25hdmJhcicpLm91dGVySGVpZ2h0KHRydWUpO1xuICAgICAgICAgICAgdmFyIGV2ZW50U2VhcmNoQmFySGVpZ2h0ICAgID0gJCgnI2V2ZW50U2VhcmNoQmFyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cbiAgICAgICAgICAgIHZhciBsaXN0SGVpZ2h0ICAgICAgICAgICAgICA9IHdpbmRvd0hlaWdodCAtIG5hdkJhckhlaWdodCAtIGV2ZW50U2VhcmNoQmFySGVpZ2h0IC0gMTA7XG5cbiAgICAgICAgICAgIHJldHVybiB7aGVpZ2h0OiAnJyArIGxpc3RIZWlnaHQgKyAncHgnfTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2hvd0V2ZW50TGlzdE1vYmlsZSA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAhJHNjb3BlLmN1cnJlbnRFdmVudCB8fCAkbWRNZWRpYSgnZ3Qtc20nKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2hvd0d1ZXN0TGlzdE1vYmlsZSA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuY3VycmVudEV2ZW50IHx8ICRtZE1lZGlhKCdndC1zbScpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5ldmVudFNvcnRDb21wYXJhdG9yID0gZnVuY3Rpb24gKGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICBzd2l0Y2ggKCRzY29wZS5zb3J0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdkYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LmRhdGU7XG5cbiAgICAgICAgICAgICAgICBjYXNlICduYW1lJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50Lm5hbWU7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAvLyB1cGNvbWluZyAvIHBhc3Qgc29ydFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQudXBjb21pbmdfaW5kZXggPj0gMCA/IGV2ZW50LnVwY29taW5nX2luZGV4IDogKC0xKSAqIGV2ZW50LnVwY29taW5nX2luZGV4ICsgJHNjb3BlLmV2ZW50cy5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmRvd25sb2FkR3Vlc3RzQ3N2ID0gZnVuY3Rpb24gKGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICBFdmVudC5nZXQoe2V2ZW50U2x1ZzogZXZlbnQuc2x1ZywgZGF0YTogJ2d1ZXN0cycsIGNzdjogMX0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgICAgIHZhciBmaWxlID0gbmV3IEJsb2IoWyByZXN1bHQuZGF0YSBdLCB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgOiAnYXBwbGljYXRpb24vY3N2J1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy90cmljayB0byBkb3dubG9hZCBzdG9yZSBhIGZpbGUgaGF2aW5nIGl0cyBVUkxcbiAgICAgICAgICAgICAgICB2YXIgZmlsZVVSTCAgICAgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgICAgICAgICAgIHZhciBhICAgICAgICAgICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICAgICAgICBhLmhyZWYgICAgICAgICAgPSBmaWxlVVJMO1xuICAgICAgICAgICAgICAgIGEudGFyZ2V0ICAgICAgICA9ICdfYmxhbmsnO1xuICAgICAgICAgICAgICAgIGEuZG93bmxvYWQgICAgICA9IGV2ZW50LnNsdWcgKydfZ3Vlc3RzLmNzdic7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTtcbiAgICAgICAgICAgICAgICBhLmNsaWNrKCk7XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBvblJlc2l6ZSk7XG5cbiAgICAgICAgZnVuY3Rpb24gb25SZXNpemUoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLiRvbignc3RvcmVFdmVudCcsIGZ1bmN0aW9uIChldmVudCkge1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mICRzY29wZS5jdXJyZW50RXZlbnQudGltZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YgJHNjb3BlLmN1cnJlbnRFdmVudC5kYXRlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudC5kYXRlLnNldEhvdXJzKCRzY29wZS5jdXJyZW50RXZlbnQudGltZS5nZXRIb3VycygpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50LmRhdGUuc2V0TWludXRlcygkc2NvcGUuY3VycmVudEV2ZW50LnRpbWUuZ2V0TWludXRlcygpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudC5kYXRlX2Zvcm1hdHRlZCAgPSBtb21lbnQoJHNjb3BlLmN1cnJlbnRFdmVudC5kYXRlKS5mb3JtYXQoJ0REL01NL1lZIEhIOm1tJyk7XG5cbiAgICAgICAgICAgIEV2ZW50LnN0b3JlKHtldmVudDogJHNjb3BlLmN1cnJlbnRFdmVudH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgICAgIHZhciBldmVudCAgICAgICAgICAgPSByZXN1bHQuZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRJbmRleCAgICAgID0gJHNjb3BlLmV2ZW50cy5tYXAoZnVuY3Rpb24gKGUpIHtyZXR1cm4gZS5pZDsgfSkuaW5kZXhPZihldmVudC5pZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZXZlbnQgbm90IG9uIGxpc3QsIGNyZWF0aW5nIGVudHJ5XG4gICAgICAgICAgICAgICAgICAgIHZhciBldmVudERhdGEgICAgICAgICAgID0gKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZXZlbnQpKSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ldmVudHMudW5zaGlmdChldmVudERhdGEpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50ICAgICA9IGV2ZW50RGF0YTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGVycm9yIHRyZWF0bWVudFxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiRXJyb3IgY3JlYXRpbmcgZXZlbnQhXCIpXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJG9uKCdjaGVja0luRXZlbnQnLCBmdW5jdGlvbihldiwgZGF0YSkge1xuXG4gICAgICAgICAgICB2YXIgZXZlbnQgICA9IGRhdGEuZXZlbnQ7XG4gICAgICAgICAgICB2YXIgZ3Vlc3QgICA9IGRhdGEuZ3Vlc3Q7XG5cbiAgICAgICAgICAgICRzY29wZS5jaGVja0luR3Vlc3QoZXZlbnQsIGd1ZXN0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHsgcmV0dXJuICRsb2NhdGlvbi5zZWFyY2goKTsgfSwgZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrQ3VycmVudEV2ZW50KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiRvbignb3BlbkV2ZW50RGlhbG9nJywgZnVuY3Rpb24gKGV2ZW50LCBkYXRhKSB7XG4gICAgICAgICAgICAkc2NvcGUub3BlbkV2ZW50RGlhbG9nKGRhdGEuZXZlbnQsIGRhdGEubmV3RXZlbnQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBFdmVudC5nZXQoZnVuY3Rpb24gKHJlc3VsdCkge1xuXG4gICAgICAgICAgICAkc2NvcGUuZXZlbnRzICAgPSByZXN1bHQuZGF0YTtcblxuICAgICAgICAgICAgLy8gVE9ETyBpbXByb3ZlIHRoaXNcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCgkc2NvcGUuZXZlbnRzLCBmdW5jdGlvbiAoZXZlbnQsIGtleSkge1xuXG4gICAgICAgICAgICAgICAgdmFyIGRhdGUgICAgICAgICAgICAgICAgICAgID0gbW9tZW50KCRzY29wZS5ldmVudHNba2V5XS5kYXRlLmRhdGUpO1xuICAgICAgICAgICAgICAgICRzY29wZS5ldmVudHNba2V5XS5kYXRlICAgICA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgICRzY29wZS5ldmVudHNba2V5XS50aW1lICAgICA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICRzY29wZS5jaGVja0N1cnJlbnRFdmVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUubG9hZGluZ0d1ZXN0cyAgICA9IGZhbHNlO1xuICAgICAgICAkc2NvcGUuc29ydEV2ZW50ICAgICAgICA9ICd1cGNvbWluZyc7XG4gICAgfSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGNoZWNrSW5NYW5hZ2VyLnNlcnZpY2U6RXZlbnRTcnZcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIEV2ZW50U3J2XG4gICAgICogU2VydmljZSBvZiB0aGUgY2hlY2tJbk1hbmFnZXJcbiAgICAgKi9cbiAgICBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLnNlcnZpY2VzJykuZmFjdG9yeSgnRXZlbnQnLCBmdW5jdGlvbiAoJHJlc291cmNlLCBBUElfVVJMKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoQVBJX1VSTCArIFwiZXZlbnRzLzpldmVudFNsdWcvOmRhdGFcIiwge30sIHtcbiAgICAgICAgICAgIGRlbGV0ZToge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwiZXZlbnRzLzpldmVudFNsdWcvZGVsZXRlXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50U2x1ZzogJ0BldmVudFNsdWcnLFxuICAgICAgICAgICAgICAgICAgICBjc3Y6ICdAY3N2JyxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzdG9yZToge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwiZXZlbnRzL3N0b3JlXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50OiAnQGV2ZW50JyxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGNoZWNrSW5NYW5hZ2VyLmNvbnRyb2xsZXI6RGlhbG9nQ3RybFxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqICMgRGlhbG9nQ3RybFxuICAgICAqIENvbnRyb2xsZXIgb2YgdGhlIGNoZWNrSW5NYW5hZ2VyXG4gICAgICovXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5jb250cm9sbGVycycpLmNvbnRyb2xsZXIoJ0RpYWxvZ0N0cmwnLCBmdW5jdGlvbiAoJHRpbWVvdXQsICRxLCAkcm9vdFNjb3BlLCAkc2NvcGUsICRtZERpYWxvZywgZ3Vlc3RzLCBjdXJyZW50RXZlbnQsIGN1cnJlbnRHdWVzdCkge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkc2NvcGUuYWxsR3Vlc3RzICAgICAgICA9IGd1ZXN0cztcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgPSBjdXJyZW50RXZlbnQ7XG4gICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgICAgID0gY3VycmVudEd1ZXN0O1xuICAgICAgICAkc2NvcGUuY2hlY2tJblN0YXR1cyAgICA9IG51bGw7XG5cbiAgICAgICAgJHNjb3BlLnNlYXJjaEd1ZXN0cyA9IGZ1bmN0aW9uIChzZWFyY2hLZXkpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuYWxsR3Vlc3RzID09PSBudWxsIHx8IHR5cGVvZiAkc2NvcGUuYWxsR3Vlc3RzID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVE9ETyBwdXQgdGhpcyB0byBmdW5jdGlvblxuICAgICAgICAgICAgdmFyIHNlYXJjaEtleU5vcm1hbGl6ZWQgPSBzZWFyY2hLZXkucmVwbGFjZSgvW8Ohw6DDo8Oiw6RdL2dpLFwiYVwiKS5yZXBsYWNlKC9bw6nDqMKow6pdL2dpLFwiZVwiKS5yZXBsYWNlKC9bw63DrMOvw65dL2dpLFwiaVwiKS5yZXBsYWNlKC9bw7PDssO2w7TDtV0vZ2ksXCJvXCIpLnJlcGxhY2UoL1vDusO5w7zDu10vZ2ksIFwidVwiKS5yZXBsYWNlKC9bw6ddL2dpLCBcImNcIikucmVwbGFjZSgvW8OxXS9naSwgXCJuXCIpO1xuXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInNlYXJjaGluZyBndWVzdHMgd2l0aCBcIiArIHNlYXJjaEtleU5vcm1hbGl6ZWQpO1xuICAgICAgICAgICAgdmFyIGd1ZXN0cyAgICAgICAgICAgICAgPSAkc2NvcGUuYWxsR3Vlc3RzLmZpbHRlcihmdW5jdGlvbiAoZ3Vlc3QpIHtcblxuICAgICAgICAgICAgICAgIC8vIFRPRE8gcHV0IHRoaXMgdG8gZnVuY3Rpb25cbiAgICAgICAgICAgICAgICB2YXIgZ3Vlc3ROYW1lTm9ybWFsaXplZCAgICAgICAgID0gZ3Vlc3QubmFtZS5yZXBsYWNlKC9bw6HDoMOjw6LDpF0vZ2ksXCJhXCIpLnJlcGxhY2UoL1vDqcOowqjDql0vZ2ksXCJlXCIpLnJlcGxhY2UoL1vDrcOsw6/Drl0vZ2ksXCJpXCIpLnJlcGxhY2UoL1vDs8Oyw7bDtMO1XS9naSxcIm9cIikucmVwbGFjZSgvW8O6w7nDvMO7XS9naSwgXCJ1XCIpLnJlcGxhY2UoL1vDp10vZ2ksIFwiY1wiKS5yZXBsYWNlKC9bw7FdL2dpLCBcIm5cIik7XG4gICAgICAgICAgICAgICAgdmFyIGd1ZXN0U2hvcnROYW1lTm9ybWFsaXplZCAgICA9IGd1ZXN0LnNob3J0X25hbWUucmVwbGFjZSgvW8Ohw6DDo8Oiw6RdL2dpLFwiYVwiKS5yZXBsYWNlKC9bw6nDqMKow6pdL2dpLFwiZVwiKS5yZXBsYWNlKC9bw63DrMOvw65dL2dpLFwiaVwiKS5yZXBsYWNlKC9bw7PDssO2w7TDtV0vZ2ksXCJvXCIpLnJlcGxhY2UoL1vDusO5w7zDu10vZ2ksIFwidVwiKS5yZXBsYWNlKC9bw6ddL2dpLCBcImNcIikucmVwbGFjZSgvW8OxXS9naSwgXCJuXCIpO1xuXG5cbiAgICAgICAgICAgICAgICByZXR1cm4gKGd1ZXN0LmVtYWlsICYmIGd1ZXN0LmVtYWlsLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihzZWFyY2hLZXlOb3JtYWxpemVkLnRvTG93ZXJDYXNlKCkpID4gLTEpIHx8XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0TmFtZU5vcm1hbGl6ZWQudG9Mb3dlckNhc2UoKS5pbmRleE9mKHNlYXJjaEtleU5vcm1hbGl6ZWQudG9Mb3dlckNhc2UoKSkgPiAtMSB8fFxuICAgICAgICAgICAgICAgICAgICAoZ3Vlc3Quc2x1ZyAmJiBndWVzdC5zbHVnLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihzZWFyY2hLZXlOb3JtYWxpemVkLnRvTG93ZXJDYXNlKCkpID4gLTEpIHx8XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0U2hvcnROYW1lTm9ybWFsaXplZC50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoS2V5Tm9ybWFsaXplZC50b0xvd2VyQ2FzZSgpKSA+IC0xO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBndWVzdHMuc2xpY2UoMCwgMTApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zZWxlY3RlZEl0ZW1DaGFuZ2UgPSBmdW5jdGlvbiAoaXRlbSlcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZEl0ZW0gPT09IG51bGwgfHwgdHlwZW9mICRzY29wZS5zZWxlY3RlZEl0ZW0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGJyb2FkY2FzdGluZyBldmVudCB0byBldmVudENvbnRyb2xsZXJcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnY2hlY2tJbkV2ZW50JywgeydldmVudCcgOiAkc2NvcGUuY3VycmVudEV2ZW50LCAnZ3Vlc3QnIDogJHNjb3BlLnNlbGVjdGVkSXRlbX0pO1xuXG4gICAgICAgICAgICAkc2NvcGUuc2VhcmNoR3Vlc3QgICAgICA9IG51bGw7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2tJblN0YXR1cyAgICA9ICRzY29wZS5zZWxlY3RlZEl0ZW0uc2hvcnRfbmFtZSArICcgYWRkZWQhJztcblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2VsZi5maW5pc2hFZGl0R3Vlc3QgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3N0b3JlR3Vlc3QnKTtcbiAgICAgICAgICAgIHNlbGYuZmluaXNoKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2VsZi5maW5pc2hFZGl0RXZlbnQgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3N0b3JlRXZlbnQnKTtcbiAgICAgICAgICAgIHNlbGYuZmluaXNoKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2VsZi5jYW5jZWwgPSBmdW5jdGlvbigkZXZlbnQpIHtcbiAgICAgICAgICAgICRtZERpYWxvZy5jYW5jZWwoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzZWxmLmZpbmlzaCA9IGZ1bmN0aW9uKCRldmVudCkge1xuICAgICAgICAgICAgJG1kRGlhbG9nLmhpZGUoKTtcbiAgICAgICAgfTtcbiAgICB9KTtcblxufSkoKTtcbiIsIihmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgY2hlY2tJbk1hbmFnZXIuY29udHJvbGxlcjpHdWVzdEN0cmxcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIEd1ZXN0Q3RybFxuICAgICAqIENvbnRyb2xsZXIgb2YgdGhlIGNoZWNrSW5NYW5hZ2VyXG4gICAgICovXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5jb250cm9sbGVycycpLmNvbnRyb2xsZXIoJ0d1ZXN0Q3RybCcsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc2NvcGUsICRodHRwLCAkc3RhdGVQYXJhbXMsICRsb2NhdGlvbiwgJG1kRGlhbG9nLCAkbWRUb2FzdCwgJHdpbmRvdywgQVBJX1VSTCwgR3Vlc3QsIEd1ZXN0U3J2LCBBdXRoU3J2KSB7XG5cbiAgICAgICAgJHNjb3BlLm9wZW5HdWVzdEVkaXREaWFsb2cgPSBmdW5jdGlvbiAoJGV2ZW50LCBlZGl0TW9kZSwgZ3Vlc3QpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5lZGl0TW9kZSAgICAgICAgICAgICA9IGVkaXRNb2RlO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBndWVzdCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgICAgID0gZ3Vlc3Q7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgICAgID0ge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRtZERpYWxvZy5zaG93KHtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRGlhbG9nQ3RybCcsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlckFzOiAnY3RybCcsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcuL3ZpZXdzL2FwcC9kaWFsb2dzL2VkaXRfZ3Vlc3QuaHRtbCcsXG4gICAgICAgICAgICAgICAgbG9jYWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0czogJHNjb3BlLmd1ZXN0cyxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEV2ZW50OiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50R3Vlc3Q6ICRzY29wZS5jdXJyZW50R3Vlc3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5ib2R5KSxcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlU2NvcGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQ6ICRldmVudCxcbiAgICAgICAgICAgICAgICBjbGlja091dHNpZGVUb0Nsb3NlOnRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93RGVsZXRlR3Vlc3QgPSBmdW5jdGlvbiAoZXYsIGd1ZXN0KSB7XG4gICAgICAgICAgICAvLyBBcHBlbmRpbmcgZGlhbG9nIHRvIGRvY3VtZW50LmJvZHkgdG8gY292ZXIgc2lkZW5hdiBpbiBkb2NzIGFwcFxuICAgICAgICAgICAgdmFyIGNvbmZpcm0gICAgID0gJG1kRGlhbG9nLmNvbmZpcm0oKVxuICAgICAgICAgICAgICAgIC50aXRsZSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIGd1ZXN0PycpXG4gICAgICAgICAgICAgICAgLnRleHRDb250ZW50KCdUaGlzIGFjdGlvbiBjYW5ub3QgYmUgdW5kb25lLicpXG4gICAgICAgICAgICAgICAgLmFyaWFMYWJlbCgnRGVsZXRlIEd1ZXN0JylcbiAgICAgICAgICAgICAgICAudGFyZ2V0RXZlbnQoZXYpXG4gICAgICAgICAgICAgICAgLm9rKCdZZXMnKVxuICAgICAgICAgICAgICAgIC5jYW5jZWwoJ1VuZG8nKTtcblxuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coY29uZmlybSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuZ3Vlc3RzLm1hcChmdW5jdGlvbiAoZSkge3JldHVybiBlLmlkOyB9KS5pbmRleE9mKGd1ZXN0LmlkKTtcbiAgICAgICAgICAgICAgICB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuZ3Vlc3RzLmluZGV4T2YoZ3Vlc3QpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGd1ZXN0SW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ndWVzdHMuc3BsaWNlKGd1ZXN0SW5kZXgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIEd1ZXN0LmRlbGV0ZSh7Z3Vlc3RJZDogZ3Vlc3QuaWR9KTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93R3Vlc3REZWxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5kaWFsb2dTdGF0dXMgPSAnR3Vlc3QgRGVsZXRlZC4nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93R3Vlc3REZWxldGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkbWRUb2FzdC5zaG93KFxuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNpbXBsZSgpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0Q29udGVudCgnR3Vlc3QgRGVsZXRlZCEnKVxuICAgICAgICAgICAgICAgICAgICAucG9zaXRpb24oJ3RvcCByaWdodCcpXG4gICAgICAgICAgICAgICAgICAgIC5oaWRlRGVsYXkoMzAwMClcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdldEd1ZXN0UmVwZWF0ZXJIZWlnaHQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgdmFyIHdpbmRvd0hlaWdodCAgICAgICAgICAgID0gJHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgICAgIHZhciBuYXZCYXJIZWlnaHQgICAgICAgICAgICA9ICQoJyNuYXZiYXInKS5vdXRlckhlaWdodCh0cnVlKTtcbiAgICAgICAgICAgIHZhciBndWVzdExpc3RIZWFkZXJIZWlnaHQgICA9ICQoJyNndWVzdExpc3RIZWFkZXInKS5vdXRlckhlaWdodCh0cnVlKTtcbiAgICAgICAgICAgIHZhciBndWVzdFRhYmxlSGVhZGVySGVpZ2h0ICA9ICQoJyNndWVzdFRhYmxlSGVhZGVyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cbiAgICAgICAgICAgIHZhciBsaXN0SGVpZ2h0ICAgICAgICAgICAgICA9IHdpbmRvd0hlaWdodCAtIG5hdkJhckhlaWdodCAtIGd1ZXN0TGlzdEhlYWRlckhlaWdodCAtIGd1ZXN0VGFibGVIZWFkZXJIZWlnaHQgLSAxMDtcblxuICAgICAgICAgICAgcmV0dXJuIHtoZWlnaHQ6ICcnICsgbGlzdEhlaWdodCArICdweCd9O1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zb3J0R3Vlc3RzICAgPSBmdW5jdGlvbiAoc29ydClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKHNvcnQgPT09ICRzY29wZS5zb3J0R3Vlc3QpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc29ydEd1ZXN0UmV2ZXJzZSAgICAgPSAhJHNjb3BlLnNvcnRHdWVzdFJldmVyc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRHdWVzdCAgICAgICAgICAgID0gJHNjb3BlLnNvcnRHdWVzdFJldmVyc2UgPT09IGZhbHNlID8gbnVsbCA6ICRzY29wZS5zb3J0R3Vlc3Q7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzY29wZS5zb3J0R3Vlc3QgICAgICAgICAgICA9IHNvcnQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRHdWVzdFJldmVyc2UgICAgID0gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5zb3J0SWNvbiAgICAgICAgICAgICAgICAgPSAkc2NvcGUuc29ydEd1ZXN0UmV2ZXJzZSA/ICdhcnJvd19kcm9wX2Rvd24nIDogJ2Fycm93X2Ryb3BfdXAnO1xuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAkd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplKTtcblxuICAgICAgICBmdW5jdGlvbiBvblJlc2l6ZSgpIHtcbiAgICAgICAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuJG9uKCdzdG9yZUd1ZXN0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cbiAgICAgICAgICAgIEd1ZXN0LnN0b3JlKHtndWVzdDogJHNjb3BlLmN1cnJlbnRHdWVzdH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgICAgIHZhciBndWVzdCAgICAgICA9IHJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5ndWVzdHMubWFwKGZ1bmN0aW9uIChnKSB7cmV0dXJuIGcuaWQ7IH0pLmluZGV4T2YoZ3Vlc3QuaWQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGd1ZXN0SW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGd1ZXN0IG5vdCBvbiBsaXN0LCBjcmVhdGluZyBlbnRyeVxuICAgICAgICAgICAgICAgICAgICB2YXIgZ3Vlc3REYXRhICAgICAgID0gKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZ3Vlc3QpKSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ndWVzdHMudW5zaGlmdChndWVzdERhdGEpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gZXJyb3IgdHJlYXRtZW50XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJFcnJvciBjcmVhdGluZyBndWVzdCFcIilcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBjaGVja0luTWFuYWdlci5zZXJ2aWNlOkd1ZXN0U3J2XG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogIyBHdWVzdFNydlxuICAgICAqIFNlcnZpY2Ugb2YgdGhlIGNoZWNrSW5NYW5hZ2VyXG4gICAgICovXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5zZXJ2aWNlcycpLmZhY3RvcnkoJ0d1ZXN0JywgZnVuY3Rpb24gKCRyZXNvdXJjZSwgQVBJX1VSTCkge1xuICAgICAgICByZXR1cm4gJHJlc291cmNlKEFQSV9VUkwgKyBcImd1ZXN0c1wiLCB7fSwge1xuICAgICAgICAgICAgY2hlY2tJbjoge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwiZXZlbnRzLzpldmVudFNsdWcvZ3Vlc3RzLzpndWVzdElkLzpkYXRhXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50U2x1ZzogJ0BldmVudFNsdWcnLFxuICAgICAgICAgICAgICAgICAgICBndWVzdElkOiAnQGd1ZXN0SWQnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnQGRhdGEnLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlbW92ZToge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwiZXZlbnRzLzpldmVudFNsdWcvZ3Vlc3RzLzpndWVzdElkLzpkYXRhXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50U2x1ZzogJ0BldmVudFNsdWcnLFxuICAgICAgICAgICAgICAgICAgICBndWVzdElkOiAnQGd1ZXN0SWQnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnQGRhdGEnLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGRlbGV0ZToge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwiZ3Vlc3RzLzpndWVzdElkL2RlbGV0ZVwiLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBndWVzdElkOiAnQGd1ZXN0SWQnLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHN0b3JlOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBBUElfVVJMICsgXCJndWVzdHMvc3RvcmVcIixcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3Q6ICdAZ3Vlc3QnLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0pXG5cbiAgICAuc2VydmljZSgnR3Vlc3RTcnYnLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgR3Vlc3QpIHtcblxuICAgICAgICB0aGlzLmdldEd1ZXN0cyAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZ3Vlc3RzICA9IEd1ZXN0LmdldChmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBpbXByb3ZlIHRoaXNcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmd1ZXN0cyAgID0gcmVzdWx0LmRhdGE7XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRHdWVzdHMoKTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGNoZWNrSW5NYW5hZ2VyLmNvbnRyb2xsZXI6U3RhdHNDdHJsXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogIyBTdGF0c0N0cmxcbiAgICAgKiBDb250cm9sbGVyIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnKS5jb250cm9sbGVyKCdTdGF0c0N0cmwnLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHdpbmRvdywgJHNjb3BlLCAkaHR0cCkge1xuXG4gICAgICAgICRzY29wZS52YWx1ZU1vZGUgPSBcImFic29sdXRlXCI7XG4gICAgICAgICRzY29wZS5vcHRpb25zID0ge307XG4gICAgICAgICRzY29wZS5kYXRhID0ge307XG5cbiAgICAgICAgJHNjb3BlLm9wdGlvbnMuaW5kdXN0cnlfYWJzID0ge1xuICAgICAgICAgICAgY2hhcnQ6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnbXVsdGlCYXJDaGFydCcsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAzMjAsXG4gICAgICAgICAgICAgICAgbWFyZ2luIDoge1xuICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxuICAgICAgICAgICAgICAgICAgICByaWdodDogMjAsXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNDUsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDQ1XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBncm91cFNwYWNpbmc6IDAuNSxcbiAgICAgICAgICAgICAgICBjbGlwRWRnZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgIHN0YWNrZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgeEF4aXM6IHtcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnSW5kdXN0cnknLFxuICAgICAgICAgICAgICAgICAgICBzaG93TWF4TWluOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeUF4aXM6IHtcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnWSBBeGlzJyxcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IC0yMCxcbiAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuZm9ybWF0KCcsLjFmJykoZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmRhdGEuaW5kdXN0cnlfYWJzID0gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6XCJNYXN0ZXJzXCIsXG4gICAgICAgICAgICAgICAgXCJ2YWx1ZXNcIjpbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidBZHZpc29yeSBTZXJ2aWNlcycsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjoxLjI2NjQwMDM2ODQ5NTY0NzVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0ZpbmFuY2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MS42Nzk1NTEzMzcwNzI3NzEzXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidDb25zdWx0aW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjIuMjkyMTM4NjY3MzIwNzcxNVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQ29uc3VtZXIgR29vZHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6Mi44NjE5NDk4MTIxNDQ2MTA3XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidSZXRhaWwvRGlzdHJpYnV0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjMuNTQxMDI2NjU0NzAyODA2NlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQXV0b21vdGl2ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjo0LjA5MTE3Njg5NDAyNTEyNFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonVGVjaG5vbG9neScsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjo0LjU1MTQ5OTkzMTkxNDQyNlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonT3RoZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6NC43MTU0NDA5MjE2ODAyMDlcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0F1ZGl0aW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjQuNjc1ODUyNjA0NDkzMjI5XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidMZWFkZXJzaGlwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjQuNDg0Mzk4MjEwOTY0OTM1XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6XCJCYWNoZWxvclwiLFxuICAgICAgICAgICAgICAgIFwidmFsdWVzXCI6W1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQWR2aXNvcnkgU2VydmljZXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xMjAyMTI3Mzc5MzY3Njg1NVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonRmluYW5jZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjEzNzY4ODE3MDA5MjE0ODE1XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidDb25zdWx0aW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTIyMDQ0NTIxMTAxMjExMjFcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0NvbnN1bWVyIEdvb2RzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTIwNTQ5OTMzODI3Nzg2MjdcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J1JldGFpbC9EaXN0cmlidXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xODQyNjg3OTI5Mjg1NDQxNVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQXV0b21vdGl2ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjE3NTI3MTc1MDgwOTM2OTIxXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidUZWNobm9sb2d5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTM4NDg3MzQ0OTkxOTY5N1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonT3RoZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xMzY5NDIyNTgxOTkxNTY0MlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQXVkaXRpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xODcxMTExNzI5NjAwNTQ5NFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonTGVhZGVyc2hpcCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjE4OTU0NjQzNDA3MTY4MTU2XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6XCJPdGhlclwiLFxuICAgICAgICAgICAgICAgIFwidmFsdWVzXCI6W1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQWR2aXNvcnkgU2VydmljZXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xMzg3ODcxMjgxODM1MDY1XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidGaW5hbmNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTgyMTIzNTQ0NzkzODQ4NzZcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J0NvbnN1bHRpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xNjg0NTU4NDU5ODkxMDQyNlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonQ29uc3VtZXIgR29vZHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xNzYxNDI3NDM3NDQ1MzM3M1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjonUmV0YWlsL0Rpc3RyaWJ1dGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjE1OTk4NzEyMDg0OTA4MjQ1XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidBdXRvbW90aXZlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTU2NzYxNzk0NDA2MjU3MjNcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6J1RlY2hub2xvZ3knLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6MC4xNzQ2MDU4ODkwMjI3OTI0XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidPdGhlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjE3MzY0OTYxMDI3MzMyMzEyXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidBdWRpdGluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjowLjE1MzU0NTc5OTM3Nzc2Njc1XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOidMZWFkZXJzaGlwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOjAuMTI0Nzc2MTc1MTU1Mjk3M1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICBdXG5cbiAgICAgICAgJHNjb3BlLm9wdGlvbnMuaW5kdXN0cnlfcGVyY2VudGFnZSA9IHtcbiAgICAgICAgICAgIGNoYXJ0OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3BpZUNoYXJ0JyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDMyMCxcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5rZXk7fSxcbiAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXtyZXR1cm4gZC55O30sXG4gICAgICAgICAgICAgICAgc2hvd0xhYmVsczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBsYWJlbFN1bmJlYW1MYXlvdXQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRvbnV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGRvbnV0UmF0aW86IDAuMzUsXG4gICAgICAgICAgICAgICAgbGFiZWxUeXBlOiBcInBlcmNlbnRcIixcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNTAwLFxuICAgICAgICAgICAgICAgIGxhYmVsVGhyZXNob2xkOiAwLjAxLFxuICAgICAgICAgICAgICAgIGxlZ2VuZDoge1xuICAgICAgICAgICAgICAgICAgICBtYXJnaW46IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogNSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAzNSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGF0YS5pbmR1c3RyeV9wZXJjZW50YWdlID0gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6J0Fkdmlzb3J5IFNlcnZpY2VzJyxcbiAgICAgICAgICAgICAgICBcInlcIjowLjEzODc4NzEyODE4MzUwNjVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXlcIjonRmluYW5jZScsXG4gICAgICAgICAgICAgICAgXCJ5XCI6MC4xODIxMjM1NDQ3OTM4NDg3NlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOidDb25zdWx0aW5nJyxcbiAgICAgICAgICAgICAgICBcInlcIjowLjE2ODQ1NTg0NTk4OTEwNDI2XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6J0NvbnN1bWVyIEdvb2RzJyxcbiAgICAgICAgICAgICAgICBcInlcIjowLjE3NjE0Mjc0Mzc0NDUzMzczXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwia2V5XCI6J1JldGFpbC9EaXN0cmlidXRpb24nLFxuICAgICAgICAgICAgICAgIFwieVwiOjAuMTU5OTg3MTIwODQ5MDgyNDVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXlcIjonQXV0b21vdGl2ZScsXG4gICAgICAgICAgICAgICAgXCJ5XCI6MC4xNTY3NjE3OTQ0MDYyNTcyM1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImtleVwiOidUZWNobm9sb2d5JyxcbiAgICAgICAgICAgICAgICBcInlcIjowLjE3NDYwNTg4OTAyMjc5MjRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXlcIjonT3RoZXInLFxuICAgICAgICAgICAgICAgIFwieVwiOjAuMTczNjQ5NjEwMjczMzIzMTJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXlcIjonQXVkaXRpbmcnLFxuICAgICAgICAgICAgICAgIFwieVwiOjAuMTUzNTQ1Nzk5Mzc3NzY2NzVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJrZXlcIjonTGVhZGVyc2hpcCcsXG4gICAgICAgICAgICAgICAgXCJ5XCI6MC4xMjQ3NzYxNzUxNTUyOTczXG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG5cbiAgICB9KTtcblxufSkoKTtcbiJdfQ==
