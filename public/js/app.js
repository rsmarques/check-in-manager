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
    angular.module('check_in_app.controllers').controller('EventCtrl', ["$rootScope", "$window", "$scope", "$http", "$stateParams", "$location", "$mdDialog", "$mdMedia", "$mdToast", "API_URL", "Event", "Guest", "GuestSrv", "AuthSrv", "mobileSrv", function ($rootScope, $window, $scope, $http, $stateParams, $location, $mdDialog, $mdMedia, $mdToast, API_URL, Event, Guest, GuestSrv, AuthSrv, mobileSrv) {

        // TODO change openDialogs location
        $scope.openGuestDialog = function ($event)
        {
            $scope.checkInStatus    = null;

            $mdDialog.show({
                controller: 'DialogCtrl',
                controllerAs: 'ctrl',
                templateUrl: './views/app/dialogs/guest_checkin' + (mobileSrv.mobileAndTabletCheck() ? '_mobile' : '') + '.html',
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
     * @name checkInManager.service:ItemSrv
     * @description
     * # ItemSrv
     * Service of the checkInManager
     */
    angular.module('check_in_app.services').factory('Item', ["$resource", "API_URL", function ($resource, API_URL) {
        return $resource(API_URL + "items/:type", {type: '@type'}, {

            updateAll: {
                method: 'POST',
                params: {
                    type: '@type',
                    items: '@items',
                }
            },
        });
    }])

    .service('CategorySrv', ["$rootScope", "Item", function ($rootScope, Item) {

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
    }])

    .service('IndustrySrv', ["$rootScope", "Item", function ($rootScope, Item) {

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
    }]);
})();

(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:NavbarCtrl
     * @description
     * # NavbarCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('NavbarCtrl', ["$rootScope", "$window", "$scope", "$http", "$mdDialog", "mdDialogSrv", "Auth", "Item", "CategorySrv", "IndustrySrv", function ($rootScope, $window, $scope, $http, $mdDialog, mdDialogSrv, Auth, Item, CategorySrv, IndustrySrv) {

        $scope.logout = function () {
            Auth.logout(function () {
                window.location = "/";
            });
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

        CategorySrv.getCategories();
        IndustrySrv.getIndustries();
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
    angular.module('check_in_app.controllers').controller('StatsCtrl', ["$rootScope", "$window", "$scope", "$http", "Stats", function ($rootScope, $window, $scope, $http, Stats) {

        $scope.parseEventStats = function ()
        {
            $scope.data = {};
            $scope.parseIndustryAbsData();
            $scope.parseIndustryPercentageData();
            $scope.parseTimeData();
            $scope.parseCountriesData();
        };

        $scope.parseIndustryAbsData = function ()
        {
            $scope.data.industry_abs = [];

            angular.forEach($scope.eventStats.industries_abs, function (data, key) {

                var index = $scope.data.industry_abs.push({key: key, values: []});
                angular.forEach(data, function (value, key) {
                    if (key === '') return false;
                    $scope.data.industry_abs[index - 1].values.push({x: key, y: value});
                });
            });
        };

        $scope.parseIndustryPercentageData = function ()
        {
            $scope.data.industry_percentage = [];

            angular.forEach($scope.eventStats.industries_percentage, function (value, key) {
                if (key === '') return false;
                $scope.data.industry_percentage.push({key: key, y: value});
            });
        };

        $scope.parseTimeData = function ()
        {
            $scope.data.time = [];

            angular.forEach($scope.eventStats.time, function (data, key) {
                var index = $scope.data.time.push({key: key, values: [], strokeWidth: 2, area: true});
                angular.forEach(data, function (value, key) {
                    if (key === '') return false;
                    $scope.data.time[index - 1].values.push({x: key, y: value});
                });
            });
        };

        $scope.parseCountriesData = function ()
        {
            $scope.data.countries = [];

            angular.forEach($scope.eventStats.countries, function (value, key) {
                if (key === '--' || value === 0) return false;
                $scope.data.countries.push({key: key, y: value});
            });
        };

        $scope.setChartsOptions = function ()
        {
            $scope.options = {};

            $scope.options.industry_abs = {
                chart: {
                    type: 'multiBarChart',
                    height: 300,
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
                    reduceXTicks: false,
                    useInteractiveGuideline: true,
                    xAxis: {
                        rotateLabels: -45,
                        showMaxMin: false
                    },
                    yAxis: {
                        axisLabel: 'Attendance',
                        axisLabelDistance: -20,
                        tickFormat: function(d){
                            return d3.format('d')(d);
                        }
                    }
                }
            };

            $scope.options.industry_percentage = {
                chart: {
                    type: 'pieChart',
                    height: 350,
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

            $scope.options.time = {
                chart: {
                    type: 'lineChart',
                    height: 300,
                    margin : {
                        top: 20,
                        right: 20,
                        bottom: 40,
                        left: 55
                    },
                    x: function(d){ return d.x; },
                    y: function(d){ return d.y; },
                    useInteractiveGuideline: true,
                    xAxis: {
                        axisLabel: 'Date',
                        // rotateLabels: -45,
                        tickFormat: function(d){
                            return d3.time.format('%B %Y')(new Date(Number(d)));
                        }
                    },
                    yAxis: {
                        axisLabel: 'Attendance',
                        axisLabelDistance: -10,
                        tickFormat: function(d){
                            return d3.format('d')(d);
                        }
                    }
                }
            };

            $scope.options.countries = {
                chart: {
                    type: 'pieChart',
                    height: 300,
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
        };

        $scope.getFilters = function ()
        {
            return {
                start_date: $scope.filters.start_date   ? moment($scope.filters.start_date).format('YYYY/MM/DD HH:mm')  : null,
                end_date: $scope.filters.end_date       ? moment($scope.filters.end_date).format('YYYY/MM/DD HH:mm')    : null,
            };
        };

        $scope.dateRangeChanged = function ()
        {
            if ($scope.dateRange.key === 'custom') {
                $scope.filters              = {start_date: null, end_date: null};
                $scope.customRangeActive    = true;
            } else {
                $scope.filters              = {start_date: $scope.dateRange.start_date, end_date: $scope.dateRange.end_date};
                $scope.getStats();
            }
        };

        $scope.setCustomDateRange = function ()
        {
            $scope.customRangeActive        = false;
            $scope.dateRange.description    = ($scope.filters.start_date ? moment($scope.filters.start_date).format('YYYY/MM/DD') : '∞') + ' → ' + ($scope.filters.end_date ? moment($scope.filters.end_date).format('YYYY/MM/DD') : '∞');
            $scope.getStats();
        };

        $scope.getStats = function ()
        {
            Stats.events($scope.getFilters(), function (res) {
                $scope.eventStats = res.data;
                $scope.parseEventStats();
            });

            Stats.global($scope.getFilters(), function (res) {
                $scope.globalStats = res.data;
            });
        };

        $scope.setDefaultDateRangeFilters = function ()
        {
            $scope.dateRanges   = [{key: 'alltime', description: 'All-time'}, {key: 'monthly', description: 'This Month', start_date: moment().startOf('month')._d}, {key: 'yearly', description: 'This Year', start_date: moment().startOf('year')._d}, {key: 'custom', description: 'Pick a date range...'}];
        };

        $scope.setDefaultDateRangeFilters();
        $scope.dateRange    = $scope.dateRanges[0];
        $scope.filters      = {start_date: null, end_date: null};

        $scope.getStats();
        $scope.setChartsOptions();
    }]);

})();

(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.service:StatsSrv
     * @description
     * # StatsSrv
     * Service of the checkInManager
     */
    angular.module('check_in_app.services').factory('Stats', ["$resource", "API_URL", function ($resource, API_URL) {
        return $resource(API_URL + "stats", {}, {
            global: {
                url: API_URL + "stats/global",
                method: 'GET',
                params: {
                    filters: '@filters',
                }
            },

            events: {
                url: API_URL + "stats/events",
                method: 'GET',
                params: {
                    filters: '@filters',
                }
            },
        });
    }]);
})();

angular.module('check_in_app.services')

    .factory('mobileSrv', function () {

        return {
            mobileCheck: function() {
                var check = false;
                (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
                return check;
            },

            mobileAndTabletCheck: function() {
                var check = false;
                (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
                return check;
            }
        };
    });



angular.module('check_in_app.services')

    .factory('mdDialogSrv', ["$mdDialog", function ($mdDialog) {

        return {
            fromTemplate: function (template, event, $scope) {

                var options = {
                    templateUrl: template,
                    targetEvent: event,
                    clickOutsideToClose: true
                };

                if ($scope) {
                    options.scope = $scope.$new();
                }

                return $mdDialog.show(options);
            },

            hide: function () {
                return $mdDialog.hide();
            },

            cancel: function () {
                return $mdDialog.cancel();
            },

            alert: function (title, content){
                $mdDialog.show(
                    $mdDialog.alert()
                        .title(title)
                        .content(content)
                        .ok('Ok')
                );
            },

            confirm: function (event, params, success, err) {
                var confirm     = $mdDialog.confirm()
                    .title(params.title)
                    .textContent(params.textContent)
                    .ariaLabel(params.ariaLabel)
                    .targetEvent(event)
                    .ok(params.ok)
                    .cancel(params.cancel);

                $mdDialog.show(confirm).then(success, err);
            }
        };
    }]);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbmZpZy5qcyIsInJvdXRlcy5qcyIsImFwcC9hdXRoL2F1dGhDdHJsLmpzIiwiYXBwL2F1dGgvYXV0aFNydi5qcyIsImFwcC9kaWFsb2dzL2RpYWxvZ0N0cmwuanMiLCJhcHAvZXZlbnRzL2V2ZW50Q3RybC5qcyIsImFwcC9ldmVudHMvZXZlbnRTcnYuanMiLCJhcHAvZ3Vlc3RzL2d1ZXN0Q3RybC5qcyIsImFwcC9ndWVzdHMvZ3Vlc3RTcnYuanMiLCJhcHAvaXRlbXMvaXRlbVNydi5qcyIsImFwcC9uYXZiYXIvbmF2YmFyQ3RybC5qcyIsImFwcC9zdGF0cy9zdGF0c0N0cmwuanMiLCJhcHAvc3RhdHMvc3RhdHNTcnYuanMiLCJzZXJ2aWNlcy9oZWxwZXJzL21vYmlsZVNydi5qcyIsInNlcnZpY2VzL21hdGVyaWFsL2RpYWxvZ1Nydi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFBLFVBQUE7SUFDQTs7SUFFQSxJQUFBLE1BQUEsUUFBQSxPQUFBLGdCQUFBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7Ozs7SUFJQSxRQUFBLE9BQUEsdUJBQUEsQ0FBQSxhQUFBO0lBQ0EsUUFBQSxPQUFBLDRCQUFBLENBQUEsYUFBQSxjQUFBLGNBQUEsYUFBQSxhQUFBO0lBQ0EsUUFBQSxPQUFBLHlCQUFBLENBQUE7SUFDQSxRQUFBLE9BQUEsdUJBQUEsQ0FBQTs7OztBQ2RBLENBQUEsVUFBQTtJQUNBOztJQUVBLFFBQUEsT0FBQSx1QkFBQSxTQUFBLFdBQUE7O0tBRUEsMkJBQUEsU0FBQSxpQkFBQTtRQUNBLGdCQUFBLFFBQUEsTUFBQTs7O0tBR0EsOEJBQUEsU0FBQSxvQkFBQTtRQUNBLG1CQUFBLE1BQUEsYUFBQSxrQkFBQSxRQUFBO1FBQ0EsbUJBQUEsTUFBQSxlQUFBLGtCQUFBLFVBQUE7UUFDQSxtQkFBQSxNQUFBLGVBQUEsa0JBQUEsZUFBQTtRQUNBLG1CQUFBLE1BQUEsYUFBQSxrQkFBQSxRQUFBOzs7O0tBSUEsbUJBQUEsVUFBQSxZ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QUE7b0JBQ0E7Z0JBQ0EsS0FBQTtvQkFDQSxVQUFBO29CQUNBO2dCQUNBO29CQUNBLE1BQUE7O1lBRUEsT0FBQSxPQUFBLEtBQUE7OztRQUdBLFNBQUEscUJBQUE7WUFDQSxJQUFBLFFBQUEsY0FBQTtZQUNBLElBQUEsT0FBQTtZQUNBLElBQUEsT0FBQSxVQUFBLGFBQUE7Z0JBQ0EsSUFBQSxVQUFBLE1BQUEsTUFBQSxLQUFBO2dCQUNBLE9BQUEsS0FBQSxNQUFBLGdCQUFBOztZQUVBLE9BQUE7OztRQUdBLElBQUEsY0FBQTs7UUFFQSxPQUFBO1lBQ0EsUUFBQSxVQUFBLE1BQUEsU0FBQSxPQUFBO2dCQUNBLE1BQUEsS0FBQSxVQUFBLGdCQUFBLE1BQUEsS0FBQSxTQUFBLE1BQUE7O1lBRUEsUUFBQSxVQUFBLE1BQUEsU0FBQSxPQUFBO2dCQUNBLE1BQUEsS0FBQSxVQUFBLGdCQUFBLE1BQUEsS0FBQSxTQUFBLE1BQUE7O1lBRUEsUUFBQSxVQUFBLFNBQUE7Z0JBQ0EsY0FBQTtnQkFDQSxPQUFBLGNBQUE7Z0JBQ0E7O1lBRUEsZ0JBQUEsWUFBQTtnQkFDQSxPQUFBOztZQUVBLElBQUEsVUFBQSxTQUFBLE9BQUE7Z0JBQ0EsTUFBQSxJQUFBLFVBQUEsTUFBQSxLQUFBLFNBQUEsTUFBQTs7Ozs7S0FLQSxRQUFBLGtDQUFBLFVBQUEsWUFBQSxNQUFBOztRQUVBLEtBQUEsaUJBQUEsWUFBQTtZQUNBLElBQUEsVUFBQSxLQUFBLEdBQUEsVUFBQSxRQUFBOztnQkFFQSxXQUFBLFdBQUEsT0FBQSxLQUFBOztlQUVBLFVBQUEsS0FBQTs7Ozs7UUFLQSxLQUFBOzs7O0FDekVBLENBQUEsVUFBQTtJQUNBOzs7Ozs7Ozs7SUFTQSxRQUFBLE9BQUEsNEJBQUEsV0FBQSxnSEFBQSxVQUFBLFVBQUEsSUFBQSxZQUFBLFFBQUEsV0FBQSxRQUFBLGNBQUEsY0FBQTs7UUFFQSxJQUFBLE9BQUE7O1FBRUEsT0FBQSxtQkFBQTtRQUNBLE9BQUEsbUJBQUE7UUFDQSxPQUFBLG1CQUFBO1FBQ0EsT0FBQSxtQkFBQTs7UUFFQSxPQUFBLGVBQUEsVUFBQTtRQUNBO1lBQ0EsSUFBQSxPQUFBLGNBQUEsUUFBQSxPQUFBLE9BQUEsY0FBQSxhQUFBO2dCQUNBLE9BQUE7Ozs7WUFJQSxJQUFBLHNCQUFBLFVBQUEsUUFBQSxZQUFBLEtBQUEsUUFBQSxXQUFBLEtBQUEsUUFBQSxXQUFBLEtBQUEsUUFBQSxZQUFBLEtBQUEsUUFBQSxZQUFBLEtBQUEsUUFBQSxTQUFBLEtBQUEsUUFBQSxTQUFBOzs7WUFHQSxJQUFBLHNCQUFBLE9BQUEsVUFBQSxPQUFBLFVBQUEsT0FBQTs7O2dCQUdBLElBQUEsOEJBQUEsTUFBQSxLQUFBLFFBQUEsWUFBQSxLQUFBLFFBQUEsV0FBQSxLQUFBLFFBQUEsV0FBQSxLQUFBLFFBQUEsWUFBQSxLQUFBLFFBQUEsWUFBQSxLQUFBLFFBQUEsU0FBQSxLQUFBLFFBQUEsU0FBQTtnQkFDQSxJQUFBLDhCQUFBLE1BQUEsV0FBQSxRQUFBLFlBQUEsS0FBQSxRQUFBLFdBQUEsS0FBQSxRQUFBLFdBQUEsS0FBQSxRQUFBLFlBQUEsS0FBQSxRQUFBLFlBQUEsS0FBQSxRQUFBLFNBQUEsS0FBQSxRQUFBLFNBQUE7OztnQkFHQSxPQUFBLENBQUEsTUFBQSxTQUFBLE1BQUEsTUFBQSxjQUFBLFFBQUEsb0JBQUEsaUJBQUEsQ0FBQTtvQkFDQSxvQkFBQSxjQUFBLFFBQUEsb0JBQUEsaUJBQUEsQ0FBQTtxQkFDQSxNQUFBLFFBQUEsTUFBQSxLQUFBLGNBQUEsUUFBQSxvQkFBQSxpQkFBQSxDQUFBO29CQUNBLHlCQUFBLGNBQUEsUUFBQSxvQkFBQSxpQkFBQSxDQUFBOzs7WUFHQSxPQUFBLE9BQUEsTUFBQSxHQUFBOzs7UUFHQSxPQUFBLHFCQUFBLFVBQUE7UUFDQTtZQUNBLElBQUEsT0FBQSxpQkFBQSxRQUFBLE9BQUEsT0FBQSxpQkFBQSxhQUFBO2dCQUNBLE9BQUE7Ozs7WUFJQSxXQUFBLFdBQUEsZ0JBQUEsQ0FBQSxVQUFBLE9BQUEsY0FBQSxVQUFBLE9BQUE7O1lBRUEsT0FBQSxtQkFBQTtZQUNBLE9BQUEsbUJBQUEsT0FBQSxhQUFBLGFBQUE7O1lBRUEsT0FBQTs7O1FBR0EsS0FBQSxrQkFBQSxVQUFBLFFBQUE7WUFDQSxXQUFBLFdBQUE7WUFDQSxLQUFBOzs7UUFHQSxLQUFBLGtCQUFBLFVBQUEsUUFBQTtZQUNBLFdBQUEsV0FBQTtZQUNBLEtBQUE7OztRQUdBLEtBQUEsU0FBQSxTQUFBLFFBQUE7WUFDQSxVQUFBOzs7UUFHQSxLQUFBLFNBQUEsU0FBQSxRQUFBO1lBQ0EsVUFBQTs7Ozs7O0FDM0VBLENBQUEsVUFBQTtJQUNBOzs7Ozs7Ozs7SUFTQSxRQUFBLE9BQUEsNEJBQUEsV0FBQSw2TEFBQSxVQUFBLFlBQUEsU0FBQSxRQUFBLE9BQUEsY0FBQSxXQUFBLFdBQUEsVUFBQSxVQUFBLFNBQUEsT0FBQSxPQUFBLFVBQUEsU0FBQSxXQUFBOzs7UUFHQSxPQUFBLGtCQUFBLFVBQUE7UUFDQTtZQUNBLE9BQUEsbUJBQUE7O1lBRUEsVUFBQSxLQUFBO2dCQUNBLFlBQUE7Z0JBQ0EsY0FBQTtnQkFDQSxhQUFBLHVDQUFBLFVBQUEseUJBQUEsWUFBQSxNQUFBO2dCQUNBLFFBQUEsUUFBQSxRQUFBLFNBQUE7OztnQkFHQSxRQUFBO29CQUNBLFFBQUEsT0FBQTtvQkFDQSxjQUFBLE9BQUE7b0JBQ0EsY0FBQTs7Z0JBRUEsYUFBQTtnQkFDQSxvQkFBQTs7OztRQUlBLE9BQUEsa0JBQUEsVUFBQSxRQUFBO1FBQ0E7WUFDQSxJQUFBLFVBQUE7Z0JBQ0EsT0FBQTs7O1lBR0EsVUFBQSxLQUFBO2dCQUNBLFlBQUE7Z0JBQ0EsY0FBQTtnQkFDQSxhQUFBO2dCQUNBLFFBQUE7b0JBQ0EsUUFBQTtvQkFDQSxjQUFBLE9BQUE7b0JBQ0EsY0FBQTs7Z0JBRUEsUUFBQSxRQUFBLFFBQUEsU0FBQTtnQkFDQSxPQUFBO2dCQUNBLGVBQUE7Z0JBQ0EsYUFBQTtnQkFDQSxvQkFBQTs7OztRQUlBLE9BQUEsZ0JBQUEsVUFBQSxhQUFBLElBQUE7WUFDQSxJQUFBLGVBQUE7WUFDQSxZQUFBOzs7UUFHQSxPQUFBLGVBQUEsVUFBQTtRQUNBO1lBQ0EsVUFBQSxPQUFBLENBQUEsTUFBQSxNQUFBOzs7UUFHQSxPQUFBLGVBQUEsVUFBQTtRQUNBO1lBQ0EsSUFBQSxDQUFBLE9BQUEsUUFBQTtnQkFDQSxPQUFBOzs7WUFHQSxJQUFBLGtCQUFBLE9BQUEsT0FBQSxLQUFBLFVBQUEsT0FBQTtnQkFDQSxPQUFBLE1BQUEsUUFBQTs7O1lBR0EsT0FBQTs7O1FBR0EsT0FBQSxtQkFBQSxVQUFBO1FBQ0E7WUFDQSxPQUFBLHVCQUFBLE1BQUE7WUFDQSxPQUFBLHVCQUFBO1lBQ0EsT0FBQSx1QkFBQTtZQUNBLE9BQUEsdUJBQUE7O1lBRUEsSUFBQSwwQkFBQSxNQUFBLElBQUEsQ0FBQSxXQUFBLE1BQUEsTUFBQSxNQUFBLFdBQUEsVUFBQSxRQUFBOztnQkFFQSxPQUFBLG1CQUFBO2dCQUNBLE9BQUEsbUJBQUEsT0FBQTs7ZUFFQSxVQUFBLE9BQUE7Ozs7O1FBS0EsT0FBQSx1QkFBQTtRQUNBO1lBQ0EsT0FBQSx1QkFBQTtZQUNBLE9BQUEsdUJBQUE7WUFDQSxPQUFBLHVCQUFBO1lBQ0EsT0FBQSx1QkFBQTs7WUFFQSxVQUFBLE9BQUE7OztRQUdBLE9BQUEsdUJBQUE7UUFDQTtZQUNBLElBQUEsVUFBQSxVQUFBOztZQUVBLElBQUEsT0FBQSxPQUFBLE1BQUEsYUFBQTtnQkFDQSxJQUFBLFVBQUEsT0FBQTtnQkFDQSxJQUFBLFVBQUEsT0FBQSxVQUFBOztnQkFFQSxJQUFBLE9BQUEsVUFBQSxhQUFBO29CQUNBLElBQUEsT0FBQSxZQUFBLE1BQUEsSUFBQTt3QkFDQSxPQUFBLGdCQUFBOzs7bUJBR0E7Ozs7WUFJQSxPQUFBOzs7UUFHQSxPQUFBLGVBQUEsVUFBQSxNQUFBO1FBQ0E7WUFDQSxPQUFBLG1CQUFBO1lBQ0EsT0FBQSxtQkFBQTs7O1FBR0EsT0FBQSxlQUFBLFNBQUEsT0FBQTtRQUNBOztZQUVBLE1BQUEsUUFBQSxDQUFBLFdBQUEsTUFBQSxNQUFBLFNBQUEsV0FBQSxJQUFBLE1BQUEsWUFBQSxVQUFBLFFBQUE7O2dCQUVBLE9BQUEsYUFBQSxjQUFBLE9BQUEsY0FBQTs7ZUFFQSxVQUFBLEtBQUE7Ozs7WUFJQSxJQUFBLGtCQUFBLE9BQUEsY0FBQSxJQUFBLFVBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxPQUFBLFFBQUEsV0FBQTs7WUFFQSxJQUFBLGVBQUEsQ0FBQSxHQUFBOztnQkFFQSxPQUFBLGNBQUEsWUFBQSxXQUFBLENBQUEsT0FBQSxjQUFBLFlBQUE7bUJBQ0E7O2dCQUVBLElBQUEsbUJBQUEsS0FBQSxNQUFBLEtBQUEsVUFBQTtnQkFDQSxVQUFBLFlBQUE7Z0JBQ0EsT0FBQSxjQUFBLFFBQUE7Ozs7WUFJQSxRQUFBLFFBQUEsUUFBQSxlQUFBOztZQUVBLE9BQUE7OztRQUdBLE9BQUEsa0JBQUEsVUFBQSxJQUFBO1FBQ0E7O1lBRUEsSUFBQSxjQUFBLFVBQUE7aUJBQ0EsTUFBQTtpQkFDQSxZQUFBO2lCQUNBLFVBQUE7aUJBQ0EsWUFBQTtpQkFDQSxHQUFBO2lCQUNBLE9BQUE7O1lBRUEsVUFBQSxLQUFBLFNBQUEsS0FBQSxXQUFBOztnQkFFQSxJQUFBLGNBQUEsT0FBQSxPQUFBLFFBQUE7O2dCQUVBLElBQUEsZUFBQSxDQUFBLEdBQUE7b0JBQ0EsT0FBQSxPQUFBLE9BQUEsWUFBQTs7b0JBRUEsTUFBQSxPQUFBLENBQUEsV0FBQSxNQUFBOztvQkFFQSxPQUFBLG1CQUFBO29CQUNBLE9BQUEsbUJBQUE7b0JBQ0EsT0FBQTtvQkFDQSxPQUFBLG1CQUFBOzs7ZUFHQSxXQUFBOzs7OztRQUtBLE9BQUEsbUJBQUE7UUFDQTtZQUNBLFNBQUE7Z0JBQ0EsU0FBQTtxQkFDQSxZQUFBO3FCQUNBLFNBQUE7cUJBQ0EsVUFBQTs7OztRQUlBLE9BQUEsa0JBQUEsVUFBQSxJQUFBLE9BQUE7UUFDQTs7WUFFQSxJQUFBLGNBQUEsVUFBQTtpQkFDQSxNQUFBO2lCQUNBLFlBQUE7aUJBQ0EsVUFBQTtpQkFDQSxZQUFBO2lCQUNBLEdBQUE7aUJBQ0EsT0FBQTs7WUFFQSxVQUFBLEtBQUEsU0FBQSxLQUFBLFdBQUE7O2dCQUVBLElBQUEsY0FBQSxPQUFBLGNBQUEsUUFBQTs7Z0JBRUEsSUFBQSxlQUFBLENBQUEsR0FBQTs7b0JBRUEsTUFBQSxPQUFBLENBQUEsV0FBQSxNQUFBLE1BQUEsU0FBQSxNQUFBLElBQUEsTUFBQSxXQUFBLFVBQUEsUUFBQTt3QkFDQSxPQUFBLGFBQUEsY0FBQSxPQUFBLGNBQUE7dUJBQ0EsVUFBQSxLQUFBOzs7O29CQUlBLE9BQUEsY0FBQSxPQUFBLFlBQUE7b0JBQ0EsT0FBQSxlQUFBO29CQUNBLE9BQUE7b0JBQ0EsT0FBQSxlQUFBOzs7ZUFHQSxXQUFBOzs7OztRQUtBLE9BQUEsbUJBQUE7UUFDQTtZQUNBLFNBQUE7Z0JBQ0EsU0FBQTtxQkFDQSxZQUFBO3FCQUNBLFNBQUE7cUJBQ0EsVUFBQTs7OztRQUlBLE9BQUEsOEJBQUE7UUFDQTtZQUNBLElBQUEsc0JBQUEsUUFBQTtZQUNBLElBQUEsc0JBQUEsRUFBQSxXQUFBLFlBQUE7WUFDQSxJQUFBLHNCQUFBLEVBQUEsZ0JBQUEsWUFBQTs7WUFFQSxJQUFBLHNCQUFBLGVBQUEsZUFBQSxvQkFBQTs7WUFFQSxPQUFBLENBQUEsUUFBQSxLQUFBLGFBQUE7OztRQUdBLE9BQUEseUJBQUE7UUFDQTtZQUNBLElBQUEsMEJBQUEsUUFBQTtZQUNBLElBQUEsMEJBQUEsRUFBQSxXQUFBLFlBQUE7WUFDQSxJQUFBLDBCQUFBLEVBQUEsbUJBQUEsWUFBQTs7WUFFQSxJQUFBLDBCQUFBLGVBQUEsZUFBQSx1QkFBQTs7WUFFQSxPQUFBLENBQUEsUUFBQSxLQUFBLGFBQUE7OztRQUdBLE9BQUEsc0JBQUE7UUFDQTtZQUNBLE9BQUEsQ0FBQSxPQUFBLGdCQUFBLFNBQUE7OztRQUdBLE9BQUEsc0JBQUE7UUFDQTtZQUNBLE9BQUEsT0FBQSxnQkFBQSxTQUFBOzs7UUFHQSxPQUFBLHNCQUFBLFVBQUE7UUFDQTtZQUNBLFFBQUEsT0FBQTtnQkFDQSxLQUFBO29CQUNBLE9BQUEsTUFBQTs7Z0JBRUEsS0FBQTtvQkFDQSxPQUFBLE1BQUE7O2dCQUVBOztvQkFFQSxPQUFBLE1BQUEsa0JBQUEsSUFBQSxNQUFBLGlCQUFBLENBQUEsQ0FBQSxLQUFBLE1BQUEsaUJBQUEsT0FBQSxPQUFBOzs7O1FBSUEsT0FBQSxvQkFBQSxVQUFBO1FBQ0E7WUFDQSxNQUFBLElBQUEsQ0FBQSxXQUFBLE1BQUEsTUFBQSxNQUFBLFVBQUEsS0FBQSxJQUFBLFVBQUEsUUFBQTs7Z0JBRUEsSUFBQSxPQUFBLElBQUEsS0FBQSxFQUFBLE9BQUEsUUFBQTtvQkFDQSxPQUFBOzs7O2dCQUlBLElBQUEsY0FBQSxJQUFBLGdCQUFBO2dCQUNBLElBQUEsY0FBQSxTQUFBLGNBQUE7Z0JBQ0EsRUFBQSxnQkFBQTtnQkFDQSxFQUFBLGdCQUFBO2dCQUNBLEVBQUEsZ0JBQUEsTUFBQSxNQUFBO2dCQUNBLFNBQUEsS0FBQSxZQUFBO2dCQUNBLEVBQUE7O2VBRUEsVUFBQSxPQUFBOzs7OztRQUtBLFFBQUEsaUJBQUEsVUFBQTs7UUFFQSxTQUFBO1FBQ0E7WUFDQSxPQUFBOzs7UUFHQSxPQUFBLElBQUEsY0FBQSxVQUFBLE9BQUE7O1lBRUEsSUFBQSxPQUFBLE9BQUEsYUFBQSxTQUFBLGVBQUEsT0FBQSxPQUFBLGFBQUEsU0FBQSxhQUFBO2dCQUNBLE9BQUEsYUFBQSxLQUFBLFNBQUEsT0FBQSxhQUFBLEtBQUE7Z0JBQ0EsT0FBQSxhQUFBLEtBQUEsV0FBQSxPQUFBLGFBQUEsS0FBQTs7O1lBR0EsT0FBQSxhQUFBLGtCQUFBLE9BQUEsT0FBQSxhQUFBLE1BQUEsT0FBQTs7WUFFQSxNQUFBLE1BQUEsQ0FBQSxPQUFBLE9BQUEsZUFBQSxVQUFBLFFBQUE7O2dCQUVBLElBQUEsa0JBQUEsT0FBQTtnQkFDQSxJQUFBLGtCQUFBLE9BQUEsT0FBQSxJQUFBLFVBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxPQUFBLFFBQUEsTUFBQTs7Z0JBRUEsSUFBQSxlQUFBLENBQUEsR0FBQTs7b0JBRUEsSUFBQSx1QkFBQSxLQUFBLE1BQUEsS0FBQSxVQUFBO29CQUNBLE9BQUEsT0FBQSxRQUFBO29CQUNBLE9BQUEsbUJBQUE7OztlQUdBLFVBQUEsS0FBQTs7Ozs7OztRQU9BLE9BQUEsSUFBQSxnQkFB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V0FBQSxhQUFBLE1BQUEsTUFBQSxhQUFBLGFBQUE7O1FBRUEsT0FBQSxTQUFBLFlBQUE7WUFDQSxLQUFBLE9BQUEsWUFBQTtnQkFDQSxPQUFBLFdBQUE7Ozs7O1FBS0EsT0FBQSx1QkFBQSxVQUFBO1FBQ0E7WUFDQSxZQUFBLGFBQUEsNENBQUEsT0FBQTs7O1FBR0EsT0FBQSx1QkFBQSxVQUFBO1FBQ0E7WUFDQSxZQUFBLGFBQUEsNENBQUEsT0FBQTs7O1FBR0EsT0FBQSxlQUFBLFVBQUEsTUFBQTtRQUNBO1lBQ0EsT0FBQSxNQUFBLE1BQUEsUUFBQSxPQUFBLE9BQUE7O1lBRUEsT0FBQTs7O1FBR0EsT0FBQSxlQUFBLFVBQUE7UUFDQTtZQUNBLElBQUEsQ0FBQSxPQUFBLE1BQUEsTUFBQSxLQUFBLE9BQUE7O1lBRUEsSUFBQSxDQUFBLE9BQUEsTUFBQSxNQUFBLFNBQUE7Z0JBQ0EsT0FBQSxNQUFBLE1BQUEsWUFBQTs7O1lBR0EsT0FBQSxNQUFBLE1BQUEsUUFBQSxLQUFBLE9BQUEsTUFBQSxNQUFBO1lBQ0EsT0FBQSxNQUFBLE1BQUEsT0FBQTs7WUFFQSxPQUFBOzs7UUFHQSxPQUFBLGtCQUFBO1FBQ0E7WUFDQSxZQUFBOzs7UUFHQSxPQUFBLGtCQUFBLFVBQUE7UUFDQTtZQUNBLEtBQUEsVUFBQSxDQUFBLE9BQUEsT0FBQSxNQUFBLE1BQUEsU0FBQSxNQUFBLE9BQUEsVUFBQSxLQUFBOzs7WUFHQSxZQUFBOzs7UUFHQSxZQUFBO1FBQ0EsWUFBQTs7Ozs7QUNoRUEsQ0FBQSxVQUFBO0lBQ0E7Ozs7Ozs7OztJQVNBLFFBQUEsT0FBQSw0QkFBQSxXQUFBLG1FQUFBLFVBQUEsWUFBQSxTQUFBLFFBQUEsT0FBQSxPQUFBOztRQUVBLE9BQUEsa0JBQUE7UUFDQTtZQUNBLE9BQUEsT0FBQTtZQUNBLE9BQUE7WUFDQSxPQUFBO1lBQ0EsT0FBQTtZQUNBLE9BQUE7OztRQUdBLE9BQUEsdUJBQUE7UUFDQTtZQUNBLE9BQUEsS0FBQSxlQUFBOztZQUVBLFFBQUEsUUFBQSxPQUFBLFdBQUEsZ0JBQUEsVUFBQSxNQUFBLEtBQUE7O2dCQUVBLElBQUEsUUFBQSxPQUFBLEtBQUEsYUFBQSxLQUFBLENBQUEsS0FBQSxLQUFBLFFBQUE7Z0JBQ0EsUUFBQSxRQUFBLE1BQUEsVUFBQSxPQUFBLEtBQUE7b0JBQ0EsSUFBQSxRQUFBLElBQUEsT0FBQTtvQkFDQSxPQUFBLEtBQUEsYUFBQSxRQUFBLEdBQUEsT0FBQSxLQUFBLENBQUEsR0FBQSxLQUFBLEdBQUE7Ozs7O1FBS0EsT0FBQSw4QkFBQTtRQUNBO1lBQ0EsT0FBQSxLQUFBLHNCQUFBOztZQUVBLFFBQUEsUUFBQSxPQUFBLFdBQUEsdUJBQUEsVUFBQSxPQUFBLEtBQUE7Z0JBQ0EsSUFBQSxRQUFBLElBQUEsT0FBQTtnQkFDQSxPQUFBLEtBQUEsb0JBQUEsS0FBQSxDQUFBLEtBQUEsS0FBQSxHQUFBOzs7O1FBSUEsT0FBQSxnQkFBQTtRQUNBO1lBQ0EsT0FBQSxLQUFBLE9BQUE7O1lBRUEsUUFBQSxRQUFBLE9BQUEsV0FBQSxNQUFBLFVBQUEsTUFBQSxLQUFBO2dCQUNBLElBQUEsUUFBQSxPQUFBLEtBQUEsS0FBQSxLQUFBLENBQUEsS0FBQSxLQUFBLFFBQUEsSUFBQSxhQUFBLEdBQUEsTUFBQTtnQkFDQSxRQUFBLFFBQUEsTUFBQSxVQUFBLE9BQUEsS0FBQTtvQkFDQSxJQUFBLFFBQUEsSUFBQSxPQUFBO29CQUNBLE9BQUEsS0FBQSxLQUFBLFFBQUEsR0FBQSxPQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQTs7Ozs7UUFLQSxPQUFBLHFCQUFBO1FBQ0E7WUFDQSxPQUFBLEtBQUEsWUFBQTs7WUFFQSxRQUFBLFFBQUEsT0FBQSxXQUFBLFdBQUEsVUFBQSxPQUFBLEtBQUE7Z0JBQ0EsSUFBQSxRQUFBLFFBQUEsVUFBQSxHQUFBLE9BQUE7Z0JBQ0EsT0FBQSxLQUFBLFVBQUEsS0FBQSxDQUFBLEtBQUEsS0FBQSxHQUFBOzs7O1FBSUEsT0FBQSxtQkFBQTtRQUNBO1lBQ0EsT0FBQSxVQUFBOztZQUVBLE9BQUEsUUFBQSxlQUFBO2dCQUNBLE9BQUE7b0JBQ0EsTUFBQTtv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QUE7Z0JBQ0EsT0FBQTs7Ozs7OztBQ2RBLFFBQUEsT0FBQTs7S0FFQSxRQUFBLDZCQUFBLFVBQUEsV0FBQTs7UUFFQSxPQUFBO1lBQ0EsY0FBQSxVQUFBLFVBQUEsT0FBQSxRQUFBOztnQkFFQSxJQUFBLFVBQUE7b0JBQ0EsYUFBQTtvQkFDQSxhQUFBO29CQUNBLHFCQUFBOzs7Z0JBR0EsSUFBQSxRQUFBO29CQUNBLFFBQUEsUUFBQSxPQUFBOzs7Z0JBR0EsT0FBQSxVQUFBLEtBQUE7OztZQUdBLE1BQUEsWUFBQTtnQkFDQSxPQUFBLFVBQUE7OztZQUdBLFFBQUEsWUFBQTtnQkFDQSxPQUFBLFVBQUE7OztZQUdBLE9BQUEsVUFBQSxPQUFBLFFBQUE7Z0JBQ0EsVUFBQTtvQkFDQSxVQUFBO3lCQUNBLE1BQUE7eUJBQ0EsUUFBQTt5QkFDQSxHQUFBOzs7O1lBSUEsU0FBQSxVQUFBLE9BQUEsUUFBQSxTQUFBLEtBQUE7Z0JBQ0EsSUFBQSxjQUFBLFVBQUE7cUJBQ0EsTUFBQSxPQUFBO3FCQUNBLFlBQUEsT0FBQTtxQkFDQSxVQUFBLE9BQUE7cUJBQ0EsWUFBQTtxQkFDQSxHQUFBLE9BQUE7cUJBQ0EsT0FBQSxPQUFBOztnQkFFQSxVQUFBLEtBQUEsU0FBQSxLQUFBLFNBQUE7Ozs7QUFJQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwJywgW1xuICAgICAgICAnY2hlY2tfaW5fYXBwLmNvbnRyb2xsZXJzJyxcbiAgICAgICAgJ2NoZWNrX2luX2FwcC5zZXJ2aWNlcycsXG4gICAgICAgICdjaGVja19pbl9hcHAucm91dGVzJyxcbiAgICAgICAgJ2NoZWNrX2luX2FwcC5jb25maWcnXG4gICAgXSk7XG5cblxuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAucm91dGVzJywgWyd1aS5yb3V0ZXInLCAnbmdTdG9yYWdlJ10pO1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnLCBbJ3VpLnJvdXRlcicsICduZ01hdGVyaWFsJywgJ25nTWVzc2FnZXMnLCAnbmdTdG9yYWdlJywgJ21kUGlja2VycycsICdudmQzJ10pO1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuc2VydmljZXMnLCBbJ25nUmVzb3VyY2UnXSk7XG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5jb25maWcnLCBbJ25nTWF0ZXJpYWwnXSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29uZmlnJykuY29uc3RhbnQoJ0FQSV9VUkwnLCAnYXBpL3YxLycpXG5cbiAgICAuY29uZmlnKGZ1bmN0aW9uKCRtZEljb25Qcm92aWRlcikge1xuICAgICAgICAkbWRJY29uUHJvdmlkZXIuZm9udFNldCgnbWQnLCAnbWF0ZXJpYWwtaWNvbnMnKTtcbiAgICB9KVxuXG4gICAgLmNvbmZpZyhmdW5jdGlvbigkbWRUaGVtaW5nUHJvdmlkZXIpIHtcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdkYXJrLWdyZXknKS5iYWNrZ3JvdW5kUGFsZXR0ZSgnZ3JleScpLmRhcmsoKTtcbiAgICAgICAgJG1kVGhlbWluZ1Byb3ZpZGVyLnRoZW1lKCdkYXJrLW9yYW5nZScpLmJhY2tncm91bmRQYWxldHRlKCdvcmFuZ2UnKS5kYXJrKCk7XG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZGFyay1wdXJwbGUnKS5iYWNrZ3JvdW5kUGFsZXR0ZSgnZGVlcC1wdXJwbGUnKS5kYXJrKCk7XG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZGFyay1ibHVlJykuYmFja2dyb3VuZFBhbGV0dGUoJ2JsdWUnKS5kYXJrKCk7XG4gICAgfSlcblxuICAgIC8vIFRPRE8gdGVtcCBzb2x1dGlvbiwgcmVtb3ZlIHRoaXMgZnJvbSBoZXJlXG4gICAgLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuXG4gICAgICAgICRyb290U2NvcGUuaGFzQWRtaW5BY2Nlc3MgICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkcm9vdFNjb3BlLmF1dGhVc2VyID8gJHJvb3RTY29wZS5hdXRoVXNlci5hZG1pbiA6IDA7XG4gICAgICAgIH07XG4gICAgfSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAucm91dGVzJykuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyLCAkaHR0cFByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuXG4gICAgICAgIC8vIHByZXZlbnRpbmcgXCIhXCJcIiBmcm9tIGFwcGVhcmluZyBpbiB1cmxcbiAgICAgICAgJGxvY2F0aW9uUHJvdmlkZXIuaGFzaFByZWZpeCgnJyk7XG5cbiAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgIC5zdGF0ZSgnc2lnbnVwJywge1xuICAgICAgICAgICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvYXV0aC9hdXRoLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBdXRoQ3RybCcsXG4gICAgICAgICAgICAgICAgcmVnaXN0ZXI6IDFcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ3NpZ25pbicsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvc2lnbmluJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL2F1dGgvYXV0aC5odG1sJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQXV0aEN0cmwnLFxuICAgICAgICAgICAgICAgIHJlZ2lzdGVyOiAwXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdndWVzdHMnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL2d1ZXN0cycsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcuL3ZpZXdzL2FwcC9ndWVzdHMvZ3Vlc3RzLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdHdWVzdEN0cmwnXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdldmVudHMnLCB7XG4gICAgICAgICAgICAgICAgdXJsOiAnL2V2ZW50cycsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcuL3ZpZXdzL2FwcC9ldmVudHMvZXZlbnRzLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdFdmVudEN0cmwnXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKCdzdGF0cycsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvc3RhdHMnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvc3RhdHMvc3RhdHMuaHRtbCcsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ1N0YXRzQ3RybCdcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy9ldmVudHMnKTtcblxuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFsnJHEnLCAnJGxvY2F0aW9uJywgJyRsb2NhbFN0b3JhZ2UnLCBmdW5jdGlvbiAoJHEsICRsb2NhdGlvbiwgJGxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAncmVxdWVzdCc6IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRsb2NhbFN0b3JhZ2UudG9rZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy5oZWFkZXJzLkF1dGhvcml6YXRpb24gPSAnQmVhcmVyICcgKyAkbG9jYWxTdG9yYWdlLnRva2VuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAncmVzcG9uc2VFcnJvcic6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDAgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSA0MDEgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKCcvc2lnbmluJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfV0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgY2hlY2tJbk1hbmFnZXIuY29udHJvbGxlcjpBdXRoQ3RybFxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqICMgQXV0aEN0cmxcbiAgICAgKiBDb250cm9sbGVyIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnKS5jb250cm9sbGVyKCdBdXRoQ3RybCcsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc2NvcGUsICRzdGF0ZSwgJGxvY2F0aW9uLCAkbG9jYWxTdG9yYWdlLCBBdXRoLCBHdWVzdFNydiwgQXV0aFNydikge1xuXG4gICAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3NBdXRoIChyZXMpIHtcbiAgICAgICAgICAgICRsb2NhbFN0b3JhZ2UudG9rZW4gPSByZXMuZGF0YS50b2tlbjtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IFwiIy9ldmVudHNcIjtcblxuICAgICAgICAgICAgLy8gVE9ETyByZW1vdmUgdGhpcyBmcm9tIGhlcmVcbiAgICAgICAgICAgIC8vIHJlbG9hZCBndWVzdHMgYWZ0ZXIgc3VjY2Vzc2Z1bCBsb2dpblxuICAgICAgICAgICAgR3Vlc3RTcnYuZ2V0R3Vlc3RzKCk7XG4gICAgICAgICAgICBBdXRoU3J2LmdldEN1cnJlbnRVc2VyKCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUucGVyZm9ybUxvZ2luID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCRzY29wZS5yZWdpc3Rlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2lnbnVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2lnbmluKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNpZ25pbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBmb3JtRGF0YSA9IHtcbiAgICAgICAgICAgICAgICBlbWFpbDogJHNjb3BlLmNyZWRlbnRpYWxzLmVtYWlsLFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkOiAkc2NvcGUuY3JlZGVudGlhbHMucGFzc3dvcmRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuZXJyb3IgICAgPSBudWxsO1xuXG4gICAgICAgICAgICBBdXRoLnNpZ25pbihmb3JtRGF0YSwgc3VjY2Vzc0F1dGgsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmVycm9yID0gJ0ludmFsaWQgZW1haWwvcGFzc3dvcmQuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaWdudXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZm9ybURhdGEgPSB7XG4gICAgICAgICAgICAgICAgZW1haWw6ICRzY29wZS5jcmVkZW50aWFscy5lbWFpbCxcbiAgICAgICAgICAgICAgICBwYXNzd29yZDogJHNjb3BlLmNyZWRlbnRpYWxzLnBhc3N3b3JkXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLmVycm9yICAgICAgICAgICAgPSBudWxsO1xuXG4gICAgICAgICAgICBBdXRoLnNpZ251cChmb3JtRGF0YSwgc3VjY2Vzc0F1dGgsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLmVycm9ycyAmJiBlcnIuZXJyb3JzWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuZXJyb3IgICAgPSBlcnIuZXJyb3JzWzBdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuZXJyb3IgICAgPSAnRmFpbGVkIHRvIHNpZ251cCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIEF1dGgubG9nb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBcIi9cIjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICAkc2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLnJlZ2lzdGVyICAgICA9ICRzdGF0ZS5jdXJyZW50LnJlZ2lzdGVyO1xuICAgICAgICAgICAgJHNjb3BlLmxvZ2luVGV4dCAgICA9ICRzY29wZS5yZWdpc3RlciA/ICdSZWdpc3RlcicgOiAnTG9naW4nO1xuICAgICAgICAgICAgJHJvb3RTY29wZS5lcnJvciAgICA9IG51bGw7XG4gICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUudG9rZW4gICAgICAgICA9ICRsb2NhbFN0b3JhZ2UudG9rZW47XG4gICAgICAgICRzY29wZS50b2tlbkNsYWltcyAgID0gQXV0aC5nZXRUb2tlbkNsYWltcygpO1xuICAgIH0pO1xuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBjaGVja0luTWFuYWdlci5zZXJ2aWNlOkF1dGhcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIEF1dGhcbiAgICAgKiBTZXJ2aWNlIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuc2VydmljZXMnKS5mYWN0b3J5KCdBdXRoJywgZnVuY3Rpb24gKCRodHRwLCAkbG9jYWxTdG9yYWdlLCBBUElfVVJMKSB7XG4gICAgICAgIGZ1bmN0aW9uIHVybEJhc2U2NERlY29kZShzdHIpIHtcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSBzdHIucmVwbGFjZSgnLScsICcrJykucmVwbGFjZSgnXycsICcvJyk7XG4gICAgICAgICAgICBzd2l0Y2ggKG91dHB1dC5sZW5ndGggJSA0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCArPSAnPT0nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dCArPSAnPSc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdJbGxlZ2FsIGJhc2U2NHVybCBzdHJpbmchJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB3aW5kb3cuYXRvYihvdXRwdXQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0Q2xhaW1zRnJvbVRva2VuKCkge1xuICAgICAgICAgICAgdmFyIHRva2VuID0gJGxvY2FsU3RvcmFnZS50b2tlbjtcbiAgICAgICAgICAgIHZhciB1c2VyID0ge307XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHZhciBlbmNvZGVkID0gdG9rZW4uc3BsaXQoJy4nKVsxXTtcbiAgICAgICAgICAgICAgICB1c2VyID0gSlNPTi5wYXJzZSh1cmxCYXNlNjREZWNvZGUoZW5jb2RlZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdG9rZW5DbGFpbXMgPSBnZXRDbGFpbXNGcm9tVG9rZW4oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2lnbnVwOiBmdW5jdGlvbiAoZGF0YSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KEFQSV9VUkwgKyAndXNlcnMvc2lnbnVwJywgZGF0YSkudGhlbihzdWNjZXNzKS5jYXRjaChlcnJvcik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2lnbmluOiBmdW5jdGlvbiAoZGF0YSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KEFQSV9VUkwgKyAndXNlcnMvc2lnbmluJywgZGF0YSkudGhlbihzdWNjZXNzKS5jYXRjaChlcnJvcik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbG9nb3V0OiBmdW5jdGlvbiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHRva2VuQ2xhaW1zID0ge307XG4gICAgICAgICAgICAgICAgZGVsZXRlICRsb2NhbFN0b3JhZ2UudG9rZW47XG4gICAgICAgICAgICAgICAgc3VjY2VzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFRva2VuQ2xhaW1zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRva2VuQ2xhaW1zO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1lOiBmdW5jdGlvbiAoc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAkaHR0cC5nZXQoQVBJX1VSTCArICdtZScpLnRoZW4oc3VjY2VzcykuY2F0Y2goZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pXG5cbiAgICAuc2VydmljZSgnQXV0aFNydicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoKSB7XG5cbiAgICAgICAgdGhpcy5nZXRDdXJyZW50VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB1c2VyICAgID0gQXV0aC5tZShmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBpbXByb3ZlIHRoaXNcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmF1dGhVc2VyID0gcmVzdWx0LmRhdGEuZGF0YTtcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldEN1cnJlbnRVc2VyKCk7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBjaGVja0luTWFuYWdlci5jb250cm9sbGVyOkRpYWxvZ0N0cmxcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIERpYWxvZ0N0cmxcbiAgICAgKiBDb250cm9sbGVyIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnKS5jb250cm9sbGVyKCdEaWFsb2dDdHJsJywgZnVuY3Rpb24gKCR0aW1lb3V0LCAkcSwgJHJvb3RTY29wZSwgJHNjb3BlLCAkbWREaWFsb2csIGd1ZXN0cywgY3VycmVudEV2ZW50LCBjdXJyZW50R3Vlc3QpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHNjb3BlLmFsbEd1ZXN0cyAgICAgICAgPSBndWVzdHM7XG4gICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQgICAgID0gY3VycmVudEV2ZW50O1xuICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0ICAgICA9IGN1cnJlbnRHdWVzdDtcbiAgICAgICAgJHNjb3BlLmNoZWNrSW5TdGF0dXMgICAgPSBudWxsO1xuXG4gICAgICAgICRzY29wZS5zZWFyY2hHdWVzdHMgPSBmdW5jdGlvbiAoc2VhcmNoS2V5KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoJHNjb3BlLmFsbEd1ZXN0cyA9PT0gbnVsbCB8fCB0eXBlb2YgJHNjb3BlLmFsbEd1ZXN0cyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRPRE8gcHV0IHRoaXMgdG8gZnVuY3Rpb25cbiAgICAgICAgICAgIHZhciBzZWFyY2hLZXlOb3JtYWxpemVkID0gc2VhcmNoS2V5LnJlcGxhY2UoL1vDocOgw6PDosOkXS9naSxcImFcIikucmVwbGFjZSgvW8Opw6jCqMOqXS9naSxcImVcIikucmVwbGFjZSgvW8Otw6zDr8OuXS9naSxcImlcIikucmVwbGFjZSgvW8Ozw7LDtsO0w7VdL2dpLFwib1wiKS5yZXBsYWNlKC9bw7rDucO8w7tdL2dpLCBcInVcIikucmVwbGFjZSgvW8OnXS9naSwgXCJjXCIpLnJlcGxhY2UoL1vDsV0vZ2ksIFwiblwiKTtcblxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJzZWFyY2hpbmcgZ3Vlc3RzIHdpdGggXCIgKyBzZWFyY2hLZXlOb3JtYWxpemVkKTtcbiAgICAgICAgICAgIHZhciBndWVzdHMgICAgICAgICAgICAgID0gJHNjb3BlLmFsbEd1ZXN0cy5maWx0ZXIoZnVuY3Rpb24gKGd1ZXN0KSB7XG5cbiAgICAgICAgICAgICAgICAvLyBUT0RPIHB1dCB0aGlzIHRvIGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgdmFyIGd1ZXN0TmFtZU5vcm1hbGl6ZWQgICAgICAgICA9IGd1ZXN0Lm5hbWUucmVwbGFjZSgvW8Ohw6DDo8Oiw6RdL2dpLFwiYVwiKS5yZXBsYWNlKC9bw6nDqMKow6pdL2dpLFwiZVwiKS5yZXBsYWNlKC9bw63DrMOvw65dL2dpLFwiaVwiKS5yZXBsYWNlKC9bw7PDssO2w7TDtV0vZ2ksXCJvXCIpLnJlcGxhY2UoL1vDusO5w7zDu10vZ2ksIFwidVwiKS5yZXBsYWNlKC9bw6ddL2dpLCBcImNcIikucmVwbGFjZSgvW8OxXS9naSwgXCJuXCIpO1xuICAgICAgICAgICAgICAgIHZhciBndWVzdFNob3J0TmFtZU5vcm1hbGl6ZWQgICAgPSBndWVzdC5zaG9ydF9uYW1lLnJlcGxhY2UoL1vDocOgw6PDosOkXS9naSxcImFcIikucmVwbGFjZSgvW8Opw6jCqMOqXS9naSxcImVcIikucmVwbGFjZSgvW8Otw6zDr8OuXS9naSxcImlcIikucmVwbGFjZSgvW8Ozw7LDtsO0w7VdL2dpLFwib1wiKS5yZXBsYWNlKC9bw7rDucO8w7tdL2dpLCBcInVcIikucmVwbGFjZSgvW8OnXS9naSwgXCJjXCIpLnJlcGxhY2UoL1vDsV0vZ2ksIFwiblwiKTtcblxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIChndWVzdC5lbWFpbCAmJiBndWVzdC5lbWFpbC50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoS2V5Tm9ybWFsaXplZC50b0xvd2VyQ2FzZSgpKSA+IC0xKSB8fFxuICAgICAgICAgICAgICAgICAgICBndWVzdE5hbWVOb3JtYWxpemVkLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihzZWFyY2hLZXlOb3JtYWxpemVkLnRvTG93ZXJDYXNlKCkpID4gLTEgfHxcbiAgICAgICAgICAgICAgICAgICAgKGd1ZXN0LnNsdWcgJiYgZ3Vlc3Quc2x1Zy50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoS2V5Tm9ybWFsaXplZC50b0xvd2VyQ2FzZSgpKSA+IC0xKSB8fFxuICAgICAgICAgICAgICAgICAgICBndWVzdFNob3J0TmFtZU5vcm1hbGl6ZWQudG9Mb3dlckNhc2UoKS5pbmRleE9mKHNlYXJjaEtleU5vcm1hbGl6ZWQudG9Mb3dlckNhc2UoKSkgPiAtMTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gZ3Vlc3RzLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRJdGVtQ2hhbmdlID0gZnVuY3Rpb24gKGl0ZW0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRJdGVtID09PSBudWxsIHx8IHR5cGVvZiAkc2NvcGUuc2VsZWN0ZWRJdGVtID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBicm9hZGNhc3RpbmcgZXZlbnQgdG8gZXZlbnRDb250cm9sbGVyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2NoZWNrSW5FdmVudCcsIHsnZXZlbnQnIDogJHNjb3BlLmN1cnJlbnRFdmVudCwgJ2d1ZXN0JyA6ICRzY29wZS5zZWxlY3RlZEl0ZW19KTtcblxuICAgICAgICAgICAgJHNjb3BlLnNlYXJjaEd1ZXN0ICAgICAgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrSW5TdGF0dXMgICAgPSAkc2NvcGUuc2VsZWN0ZWRJdGVtLnNob3J0X25hbWUgKyAnIGFkZGVkISc7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNlbGYuZmluaXNoRWRpdEd1ZXN0ID0gZnVuY3Rpb24gKCRldmVudCkge1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdzdG9yZUd1ZXN0Jyk7XG4gICAgICAgICAgICBzZWxmLmZpbmlzaCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNlbGYuZmluaXNoRWRpdEV2ZW50ID0gZnVuY3Rpb24gKCRldmVudCkge1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdzdG9yZUV2ZW50Jyk7XG4gICAgICAgICAgICBzZWxmLmZpbmlzaCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNlbGYuY2FuY2VsID0gZnVuY3Rpb24oJGV2ZW50KSB7XG4gICAgICAgICAgICAkbWREaWFsb2cuY2FuY2VsKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2VsZi5maW5pc2ggPSBmdW5jdGlvbigkZXZlbnQpIHtcbiAgICAgICAgICAgICRtZERpYWxvZy5oaWRlKCk7XG4gICAgICAgIH07XG4gICAgfSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGNoZWNrSW5NYW5hZ2VyLmNvbnRyb2xsZXI6RXZlbnRDdHJsXG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogIyBFdmVudEN0cmxcbiAgICAgKiBDb250cm9sbGVyIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnKS5jb250cm9sbGVyKCdFdmVudEN0cmwnLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHdpbmRvdywgJHNjb3BlLCAkaHR0cCwgJHN0YXRlUGFyYW1zLCAkbG9jYXRpb24sICRtZERpYWxvZywgJG1kTWVkaWEsICRtZFRvYXN0LCBBUElfVVJMLCBFdmVudCwgR3Vlc3QsIEd1ZXN0U3J2LCBBdXRoU3J2LCBtb2JpbGVTcnYpIHtcblxuICAgICAgICAvLyBUT0RPIGNoYW5nZSBvcGVuRGlhbG9ncyBsb2NhdGlvblxuICAgICAgICAkc2NvcGUub3Blbkd1ZXN0RGlhbG9nID0gZnVuY3Rpb24gKCRldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrSW5TdGF0dXMgICAgPSBudWxsO1xuXG4gICAgICAgICAgICAkbWREaWFsb2cuc2hvdyh7XG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0RpYWxvZ0N0cmwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvZGlhbG9ncy9ndWVzdF9jaGVja2luJyArIChtb2JpbGVTcnYubW9iaWxlQW5kVGFibGV0Q2hlY2soKSA/ICdfbW9iaWxlJyA6ICcnKSArICcuaHRtbCcsXG4gICAgICAgICAgICAgICAgcGFyZW50OiBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQuYm9keSksXG4gICAgICAgICAgICAgICAgLy8gc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICAvLyBwcmVzZXJ2ZVNjb3BlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGxvY2Fsczoge1xuICAgICAgICAgICAgICAgICAgICBndWVzdHM6ICRzY29wZS5ndWVzdHMsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRFdmVudDogJHNjb3BlLmN1cnJlbnRFdmVudCxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEd1ZXN0OiBudWxsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQ6ICRldmVudCxcbiAgICAgICAgICAgICAgICBjbGlja091dHNpZGVUb0Nsb3NlOnRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5vcGVuRXZlbnREaWFsb2cgPSBmdW5jdGlvbiAoJGV2ZW50LCBuZXdFdmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKG5ld0V2ZW50KSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVuY2hlY2tDdXJyZW50RXZlbnQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coe1xuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdEaWFsb2dDdHJsJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyQXM6ICdjdHJsJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL2RpYWxvZ3MvZWRpdF9ldmVudC5odG1sJyxcbiAgICAgICAgICAgICAgICBsb2NhbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3RzOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50RXZlbnQ6ICRzY29wZS5jdXJyZW50RXZlbnQsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRHdWVzdDogbnVsbCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhcmVudDogYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LmJvZHkpLFxuICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGUsXG4gICAgICAgICAgICAgICAgcHJlc2VydmVTY29wZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB0YXJnZXRFdmVudDogJGV2ZW50LFxuICAgICAgICAgICAgICAgIGNsaWNrT3V0c2lkZVRvQ2xvc2U6dHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLm9wZW5FdmVudE1lbnUgPSBmdW5jdGlvbiAoJG1kT3Blbk1lbnUsIGV2KSB7XG4gICAgICAgICAgICB2YXIgb3JpZ2luYXRvckV2ID0gZXY7XG4gICAgICAgICAgICAkbWRPcGVuTWVudShldik7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNlbGVjdEV2ZW50ICA9IGZ1bmN0aW9uIChldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaCh7J3AnIDogZXZlbnQuc2x1Z30pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5maW5kRXZlbnQgICAgPSBmdW5jdGlvbiAoZXZlbnRTbHVnKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoISRzY29wZS5ldmVudHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciByZXN1bHQgICAgICAgICAgPSAkc2NvcGUuZXZlbnRzLmZpbmQoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnNsdWcgPT0gZXZlbnRTbHVnO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNldEN1cnJlbnRFdmVudCAgPSBmdW5jdGlvbiAoZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5ldmVudElkICAgICAgICAgICAgICA9IGV2ZW50LmlkO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgICAgID0gZXZlbnQ7XG4gICAgICAgICAgICAkc2NvcGUubG9hZGluZ0d1ZXN0cyAgICAgICAgPSB0cnVlO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHMgICAgICAgID0gW107XG5cbiAgICAgICAgICAgIHZhciBnICAgICAgICAgICAgICAgICAgICAgICA9IEV2ZW50LmdldCh7ZXZlbnRTbHVnOiBldmVudC5zbHVnLCBkYXRhOiAnZ3Vlc3RzJ30sIGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgICAgICRzY29wZS5sb2FkaW5nR3Vlc3RzICAgID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHMgICAgPSByZXN1bHQuZGF0YTtcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUudW5jaGVja0N1cnJlbnRFdmVudCAgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuZXZlbnRJZCAgICAgICAgICAgICAgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgICAgID0gMDtcbiAgICAgICAgICAgICRzY29wZS5sb2FkaW5nR3Vlc3RzICAgICAgICA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHMgICAgICAgID0gW107XG5cbiAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2goe30pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5jaGVja0N1cnJlbnRFdmVudCAgICA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgID0gJGxvY2F0aW9uLnNlYXJjaCgpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhcmFtcy5wICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50SWQgPSBwYXJhbXMucDtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnQgICA9ICRzY29wZS5maW5kRXZlbnQoZXZlbnRJZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGV2ZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkc2NvcGUuZXZlbnRJZCAhPT0gZXZlbnQuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zZXRDdXJyZW50RXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIHNldCBmaXJzdCBldmVudCBhcyBkZWZhdWx0XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zb3J0RXZlbnRzICAgPSBmdW5jdGlvbiAoc29ydCwgcmV2ZXJzZSlcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLnNvcnRFdmVudCAgICAgICAgPSBzb3J0O1xuICAgICAgICAgICAgJHNjb3BlLnNvcnRFdmVudFJldmVyc2UgPSByZXZlcnNlO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5jaGVja0luR3Vlc3QgPSBmdW5jdGlvbihldmVudCwgZXZlbnRHdWVzdClcbiAgICAgICAge1xuXG4gICAgICAgICAgICBHdWVzdC5jaGVja0luKHtldmVudFNsdWc6IGV2ZW50LnNsdWcsIGd1ZXN0SWQ6IGV2ZW50R3Vlc3QuaWQsIGRhdGE6ICdjaGVja2luJ30sIGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQuZ3Vlc3RfY291bnQgPSAkc2NvcGUuY3VycmVudEd1ZXN0cy5sZW5ndGg7XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcblxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBndWVzdEluZGV4ICAgICAgPSAkc2NvcGUuY3VycmVudEd1ZXN0cy5tYXAoZnVuY3Rpb24gKGcpIHtyZXR1cm4gZy5pZDsgfSkuaW5kZXhPZihldmVudEd1ZXN0LmlkKTtcblxuICAgICAgICAgICAgaWYgKGd1ZXN0SW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gZ3Vlc3QgYWxyZWFkeSBvbiBsaXN0LCBjaGFuZ2luZyBpdHMgdmFsdWVcbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0c1tndWVzdEluZGV4XS5jaGVja19pbiA9ICEkc2NvcGUuY3VycmVudEd1ZXN0c1tndWVzdEluZGV4XS5jaGVja19pbjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gbmV3IGd1ZXN0LCBhZGRpbmcgaGltIHRvIGFycmF5XG4gICAgICAgICAgICAgICAgdmFyIGd1ZXN0RGF0YSAgICAgICA9IChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGV2ZW50R3Vlc3QpKSk7XG4gICAgICAgICAgICAgICAgZ3Vlc3REYXRhLmNoZWNrX2luICA9IDE7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHMudW5zaGlmdChndWVzdERhdGEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBmb3JjaW5nIHdpbmRvdyByZXNpemUgdG8gdXBkYXRlIHZpcnR1YWwgcmVwZWF0ZXJcbiAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3aW5kb3cpLnRyaWdnZXJIYW5kbGVyKCdyZXNpemUnKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dSZW1vdmVFdmVudCA9IGZ1bmN0aW9uIChldiwgZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIEFwcGVuZGluZyBkaWFsb2cgdG8gZG9jdW1lbnQuYm9keSB0byBjb3ZlciBzaWRlbmF2IGluIGRvY3MgYXBwXG4gICAgICAgICAgICB2YXIgY29uZmlybSAgICAgPSAkbWREaWFsb2cuY29uZmlybSgpXG4gICAgICAgICAgICAgICAgLnRpdGxlKCdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgZXZlbnQ/JylcbiAgICAgICAgICAgICAgICAudGV4dENvbnRlbnQoJ1RoaXMgYWN0aW9uIGNhbm5vdCBiZSB1bmRvbmUuJylcbiAgICAgICAgICAgICAgICAuYXJpYUxhYmVsKCdEZWxldGUgRXZlbnQnKVxuICAgICAgICAgICAgICAgIC50YXJnZXRFdmVudChldilcbiAgICAgICAgICAgICAgICAub2soJ1llcycpXG4gICAgICAgICAgICAgICAgLmNhbmNlbCgnVW5kbycpO1xuXG4gICAgICAgICAgICAkbWREaWFsb2cuc2hvdyhjb25maXJtKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5ndWVzdHMubWFwKGZ1bmN0aW9uIChlKSB7cmV0dXJuIGUuaWQ7IH0pLmluZGV4T2YoZ3Vlc3QuaWQpO1xuICAgICAgICAgICAgICAgIHZhciBldmVudEluZGV4ICA9ICRzY29wZS5ldmVudHMuaW5kZXhPZihldmVudCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmV2ZW50cy5zcGxpY2UoZXZlbnRJbmRleCwgMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgRXZlbnQuZGVsZXRlKHtldmVudFNsdWc6IGV2ZW50LnNsdWd9KTtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50ICAgICA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0cyAgICA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93RXZlbnREZWxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zdGF0dXMgICAgICAgICAgID0gJ0V2ZW50IERlbGV0ZWQuJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2hvd0V2ZW50RGVsZXRlZCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgJG1kVG9hc3Quc2hvdyhcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaW1wbGUoKVxuICAgICAgICAgICAgICAgICAgICAudGV4dENvbnRlbnQoJ0V2ZW50IERlbGV0ZWQhJylcbiAgICAgICAgICAgICAgICAgICAgLnBvc2l0aW9uKCd0b3AgcmlnaHQnKVxuICAgICAgICAgICAgICAgICAgICAuaGlkZURlbGF5KDMwMDApXG4gICAgICAgICAgICApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93UmVtb3ZlR3Vlc3QgPSBmdW5jdGlvbiAoZXYsIGV2ZW50LCBndWVzdClcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gQXBwZW5kaW5nIGRpYWxvZyB0byBkb2N1bWVudC5ib2R5IHRvIGNvdmVyIHNpZGVuYXYgaW4gZG9jcyBhcHBcbiAgICAgICAgICAgIHZhciBjb25maXJtICAgICA9ICRtZERpYWxvZy5jb25maXJtKClcbiAgICAgICAgICAgICAgICAudGl0bGUoJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byByZW1vdmUgdGhpcyBndWVzdD8nKVxuICAgICAgICAgICAgICAgIC50ZXh0Q29udGVudCgnVGhpcyBhY3Rpb24gY2Fubm90IGJlIHVuZG9uZS4nKVxuICAgICAgICAgICAgICAgIC5hcmlhTGFiZWwoJ1JlbW92ZSBHdWVzdCcpXG4gICAgICAgICAgICAgICAgLnRhcmdldEV2ZW50KGV2KVxuICAgICAgICAgICAgICAgIC5vaygnWWVzJylcbiAgICAgICAgICAgICAgICAuY2FuY2VsKCdVbmRvJyk7XG5cbiAgICAgICAgICAgICRtZERpYWxvZy5zaG93KGNvbmZpcm0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gdmFyIGd1ZXN0SW5kZXggID0gJHNjb3BlLmd1ZXN0cy5tYXAoZnVuY3Rpb24gKGUpIHtyZXR1cm4gZS5pZDsgfSkuaW5kZXhPZihndWVzdC5pZCk7XG4gICAgICAgICAgICAgICAgdmFyIGd1ZXN0SW5kZXggID0gJHNjb3BlLmN1cnJlbnRHdWVzdHMuaW5kZXhPZihndWVzdCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZ3Vlc3RJbmRleCAhPT0gLTEpIHtcblxuICAgICAgICAgICAgICAgICAgICBHdWVzdC5yZW1vdmUoe2V2ZW50U2x1ZzogZXZlbnQuc2x1ZywgZ3Vlc3RJZDogZ3Vlc3QuaWQsIGRhdGE6ICdyZW1vdmUnfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudC5ndWVzdF9jb3VudCA9ICRzY29wZS5jdXJyZW50R3Vlc3RzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzLnNwbGljZShndWVzdEluZGV4LCAxKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93R3Vlc3RSZW1vdmVkKCk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zdGF0dXMgICAgICAgPSAnR3Vlc3QgUmVtb3ZlZC4nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93R3Vlc3RSZW1vdmVkID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICAkbWRUb2FzdC5zaG93KFxuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNpbXBsZSgpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0Q29udGVudCgnR3Vlc3QgUmVtb3ZlZCEnKVxuICAgICAgICAgICAgICAgICAgICAucG9zaXRpb24oJ3RvcCByaWdodCcpXG4gICAgICAgICAgICAgICAgICAgIC5oaWRlRGVsYXkoMzAwMClcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdldEV2ZW50R3Vlc3RSZXBlYXRlckhlaWdodCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHdpbmRvd0hlaWdodCAgICAgICAgPSAkd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICAgICAgdmFyIG5hdkJhckhlaWdodCAgICAgICAgPSAkKCcjbmF2YmFyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG4gICAgICAgICAgICB2YXIgZXZlbnRIZWFkZXJIZWlnaHQgICA9ICQoJyNldmVudEhlYWRlcicpLm91dGVySGVpZ2h0KHRydWUpO1xuXG4gICAgICAgICAgICB2YXIgbGlzdEhlaWdodCAgICAgICAgICA9IHdpbmRvd0hlaWdodCAtIG5hdkJhckhlaWdodCAtIGV2ZW50SGVhZGVySGVpZ2h0IC0gMTA7XG5cbiAgICAgICAgICAgIHJldHVybiB7aGVpZ2h0OiAnJyArIGxpc3RIZWlnaHQgKyAncHgnfTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZ2V0RXZlbnRSZXBlYXRlckhlaWdodCA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB3aW5kb3dIZWlnaHQgICAgICAgICAgICA9ICR3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgICAgICB2YXIgbmF2QmFySGVpZ2h0ICAgICAgICAgICAgPSAkKCcjbmF2YmFyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG4gICAgICAgICAgICB2YXIgZXZlbnRTZWFyY2hCYXJIZWlnaHQgICAgPSAkKCcjZXZlbnRTZWFyY2hCYXInKS5vdXRlckhlaWdodCh0cnVlKTtcblxuICAgICAgICAgICAgdmFyIGxpc3RIZWlnaHQgICAgICAgICAgICAgID0gd2luZG93SGVpZ2h0IC0gbmF2QmFySGVpZ2h0IC0gZXZlbnRTZWFyY2hCYXJIZWlnaHQgLSAxMDtcblxuICAgICAgICAgICAgcmV0dXJuIHtoZWlnaHQ6ICcnICsgbGlzdEhlaWdodCArICdweCd9O1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93RXZlbnRMaXN0TW9iaWxlID0gZnVuY3Rpb24gKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICEkc2NvcGUuY3VycmVudEV2ZW50IHx8ICRtZE1lZGlhKCdndC1zbScpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93R3Vlc3RMaXN0TW9iaWxlID0gZnVuY3Rpb24gKClcbiAgICAgICAge1xuICAgICAgICAgICAgcmV0dXJuICRzY29wZS5jdXJyZW50RXZlbnQgfHwgJG1kTWVkaWEoJ2d0LXNtJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmV2ZW50U29ydENvbXBhcmF0b3IgPSBmdW5jdGlvbiAoZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHN3aXRjaCAoJHNjb3BlLnNvcnRFdmVudCkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQuZGF0ZTtcblxuICAgICAgICAgICAgICAgIGNhc2UgJ25hbWUnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQubmFtZTtcblxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIC8vIHVwY29taW5nIC8gcGFzdCBzb3J0XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudC51cGNvbWluZ19pbmRleCA+PSAwID8gZXZlbnQudXBjb21pbmdfaW5kZXggOiAoLTEpICogZXZlbnQudXBjb21pbmdfaW5kZXggKyAkc2NvcGUuZXZlbnRzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZG93bmxvYWRHdWVzdHNDc3YgPSBmdW5jdGlvbiAoZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIEV2ZW50LmdldCh7ZXZlbnRTbHVnOiBldmVudC5zbHVnLCBkYXRhOiAnZ3Vlc3RzJywgY3N2OiAxfSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuXG4gICAgICAgICAgICAgICAgdmFyIGZpbGUgPSBuZXcgQmxvYihbIHJlc3VsdC5kYXRhIF0sIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA6ICdhcHBsaWNhdGlvbi9jc3YnXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvL3RyaWNrIHRvIGRvd25sb2FkIHN0b3JlIGEgZmlsZSBoYXZpbmcgaXRzIFVSTFxuICAgICAgICAgICAgICAgIHZhciBmaWxlVVJMICAgICA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICAgICAgICAgICAgdmFyIGEgICAgICAgICAgID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgICAgIGEuaHJlZiAgICAgICAgICA9IGZpbGVVUkw7XG4gICAgICAgICAgICAgICAgYS50YXJnZXQgICAgICAgID0gJ19ibGFuayc7XG4gICAgICAgICAgICAgICAgYS5kb3dubG9hZCAgICAgID0gZXZlbnQuc2x1ZyArJ19ndWVzdHMuY3N2JztcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICAgICAgICAgICAgICAgIGEuY2xpY2soKTtcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplKTtcblxuICAgICAgICBmdW5jdGlvbiBvblJlc2l6ZSgpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuJG9uKCdzdG9yZUV2ZW50JywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgJHNjb3BlLmN1cnJlbnRFdmVudC50aW1lICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiAkc2NvcGUuY3VycmVudEV2ZW50LmRhdGUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50LmRhdGUuc2V0SG91cnMoJHNjb3BlLmN1cnJlbnRFdmVudC50aW1lLmdldEhvdXJzKCkpO1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQuZGF0ZS5zZXRNaW51dGVzKCRzY29wZS5jdXJyZW50RXZlbnQudGltZS5nZXRNaW51dGVzKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50LmRhdGVfZm9ybWF0dGVkICA9IG1vbWVudCgkc2NvcGUuY3VycmVudEV2ZW50LmRhdGUpLmZvcm1hdCgnREQvTU0vWVkgSEg6bW0nKTtcblxuICAgICAgICAgICAgRXZlbnQuc3RvcmUoe2V2ZW50OiAkc2NvcGUuY3VycmVudEV2ZW50fSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuXG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50ICAgICAgICAgICA9IHJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgIHZhciBldmVudEluZGV4ICAgICAgPSAkc2NvcGUuZXZlbnRzLm1hcChmdW5jdGlvbiAoZSkge3JldHVybiBlLmlkOyB9KS5pbmRleE9mKGV2ZW50LmlkKTtcblxuICAgICAgICAgICAgICAgIGlmIChldmVudEluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBldmVudCBub3Qgb24gbGlzdCwgY3JlYXRpbmcgZW50cnlcbiAgICAgICAgICAgICAgICAgICAgdmFyIGV2ZW50RGF0YSAgICAgICAgICAgPSAoSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShldmVudCkpKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmV2ZW50cy51bnNoaWZ0KGV2ZW50RGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQgICAgID0gZXZlbnREYXRhO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gZXJyb3IgdHJlYXRtZW50XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJFcnJvciBjcmVhdGluZyBldmVudCFcIilcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kb24oJ2NoZWNrSW5FdmVudCcsIGZ1bmN0aW9uKGV2LCBkYXRhKSB7XG5cbiAgICAgICAgICAgIHZhciBldmVudCAgID0gZGF0YS5ldmVudDtcbiAgICAgICAgICAgIHZhciBndWVzdCAgID0gZGF0YS5ndWVzdDtcblxuICAgICAgICAgICAgJHNjb3BlLmNoZWNrSW5HdWVzdChldmVudCwgZ3Vlc3QpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkgeyByZXR1cm4gJGxvY2F0aW9uLnNlYXJjaCgpOyB9LCBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2tDdXJyZW50RXZlbnQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgb25SZXNpemUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJG9uKCdvcGVuRXZlbnREaWFsb2cnLCBmdW5jdGlvbiAoZXZlbnQsIGRhdGEpIHtcbiAgICAgICAgICAgICRzY29wZS5vcGVuRXZlbnREaWFsb2coZGF0YS5ldmVudCwgZGF0YS5uZXdFdmVudCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIEV2ZW50LmdldChmdW5jdGlvbiAocmVzdWx0KSB7XG5cbiAgICAgICAgICAgICRzY29wZS5ldmVudHMgICA9IHJlc3VsdC5kYXRhO1xuXG4gICAgICAgICAgICAvLyBUT0RPIGltcHJvdmUgdGhpc1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5ldmVudHMsIGZ1bmN0aW9uIChldmVudCwga2V5KSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgZGF0ZSAgICAgICAgICAgICAgICAgICAgPSBtb21lbnQoJHNjb3BlLmV2ZW50c1trZXldLmRhdGUuZGF0ZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmV2ZW50c1trZXldLmRhdGUgICAgID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmV2ZW50c1trZXldLnRpbWUgICAgID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgJHNjb3BlLmNoZWNrQ3VycmVudEV2ZW50KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS5sb2FkaW5nR3Vlc3RzICAgID0gZmFsc2U7XG4gICAgICAgICRzY29wZS5zb3J0RXZlbnQgICAgICAgID0gJ3VwY29taW5nJztcbiAgICB9KTtcblxufSkoKTtcbiIsIihmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgY2hlY2tJbk1hbmFnZXIuc2VydmljZTpFdmVudFNydlxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqICMgRXZlbnRTcnZcbiAgICAgKiBTZXJ2aWNlIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuc2VydmljZXMnKS5mYWN0b3J5KCdFdmVudCcsIGZ1bmN0aW9uICgkcmVzb3VyY2UsIEFQSV9VUkwpIHtcbiAgICAgICAgcmV0dXJuICRyZXNvdXJjZShBUElfVVJMICsgXCJldmVudHMvOmV2ZW50U2x1Zy86ZGF0YVwiLCB7fSwge1xuICAgICAgICAgICAgZGVsZXRlOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBBUElfVVJMICsgXCJldmVudHMvOmV2ZW50U2x1Zy9kZWxldGVcIixcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRTbHVnOiAnQGV2ZW50U2x1ZycsXG4gICAgICAgICAgICAgICAgICAgIGNzdjogJ0Bjc3YnLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHN0b3JlOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBBUElfVVJMICsgXCJldmVudHMvc3RvcmVcIixcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQ6ICdAZXZlbnQnLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkoKTtcbiIsIihmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgY2hlY2tJbk1hbmFnZXIuY29udHJvbGxlcjpHdWVzdEN0cmxcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIEd1ZXN0Q3RybFxuICAgICAqIENvbnRyb2xsZXIgb2YgdGhlIGNoZWNrSW5NYW5hZ2VyXG4gICAgICovXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5jb250cm9sbGVycycpLmNvbnRyb2xsZXIoJ0d1ZXN0Q3RybCcsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc2NvcGUsICRodHRwLCAkc3RhdGVQYXJhbXMsICRsb2NhdGlvbiwgJG1kRGlhbG9nLCAkbWRUb2FzdCwgJHdpbmRvdywgQVBJX1VSTCwgR3Vlc3QsIEd1ZXN0U3J2LCBBdXRoU3J2KSB7XG5cbiAgICAgICAgJHNjb3BlLm9wZW5HdWVzdEVkaXREaWFsb2cgPSBmdW5jdGlvbiAoJGV2ZW50LCBlZGl0TW9kZSwgZ3Vlc3QpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5lZGl0TW9kZSAgICAgICAgICAgICA9IGVkaXRNb2RlO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBndWVzdCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgICAgID0gZ3Vlc3Q7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgICAgID0ge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRtZERpYWxvZy5zaG93KHtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRGlhbG9nQ3RybCcsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlckFzOiAnY3RybCcsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcuL3ZpZXdzL2FwcC9kaWFsb2dzL2VkaXRfZ3Vlc3QuaHRtbCcsXG4gICAgICAgICAgICAgICAgbG9jYWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0czogJHNjb3BlLmd1ZXN0cyxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEV2ZW50OiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50R3Vlc3Q6ICRzY29wZS5jdXJyZW50R3Vlc3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5ib2R5KSxcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlU2NvcGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQ6ICRldmVudCxcbiAgICAgICAgICAgICAgICBjbGlja091dHNpZGVUb0Nsb3NlOnRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93RGVsZXRlR3Vlc3QgPSBmdW5jdGlvbiAoZXYsIGd1ZXN0KSB7XG4gICAgICAgICAgICAvLyBBcHBlbmRpbmcgZGlhbG9nIHRvIGRvY3VtZW50LmJvZHkgdG8gY292ZXIgc2lkZW5hdiBpbiBkb2NzIGFwcFxuICAgICAgICAgICAgdmFyIGNvbmZpcm0gICAgID0gJG1kRGlhbG9nLmNvbmZpcm0oKVxuICAgICAgICAgICAgICAgIC50aXRsZSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIGd1ZXN0PycpXG4gICAgICAgICAgICAgICAgLnRleHRDb250ZW50KCdUaGlzIGFjdGlvbiBjYW5ub3QgYmUgdW5kb25lLicpXG4gICAgICAgICAgICAgICAgLmFyaWFMYWJlbCgnRGVsZXRlIEd1ZXN0JylcbiAgICAgICAgICAgICAgICAudGFyZ2V0RXZlbnQoZXYpXG4gICAgICAgICAgICAgICAgLm9rKCdZZXMnKVxuICAgICAgICAgICAgICAgIC5jYW5jZWwoJ1VuZG8nKTtcblxuICAgICAgICAgICAgJG1kRGlhbG9nLnNob3coY29uZmlybSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuZ3Vlc3RzLm1hcChmdW5jdGlvbiAoZSkge3JldHVybiBlLmlkOyB9KS5pbmRleE9mKGd1ZXN0LmlkKTtcbiAgICAgICAgICAgICAgICB2YXIgZ3Vlc3RJbmRleCAgPSAkc2NvcGUuZ3Vlc3RzLmluZGV4T2YoZ3Vlc3QpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGd1ZXN0SW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ndWVzdHMuc3BsaWNlKGd1ZXN0SW5kZXgsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIEd1ZXN0LmRlbGV0ZSh7Z3Vlc3RJZDogZ3Vlc3QuaWR9KTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93R3Vlc3REZWxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5kaWFsb2dTdGF0dXMgPSAnR3Vlc3QgRGVsZXRlZC4nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93R3Vlc3REZWxldGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkbWRUb2FzdC5zaG93KFxuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNpbXBsZSgpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0Q29udGVudCgnR3Vlc3QgRGVsZXRlZCEnKVxuICAgICAgICAgICAgICAgICAgICAucG9zaXRpb24oJ3RvcCByaWdodCcpXG4gICAgICAgICAgICAgICAgICAgIC5oaWRlRGVsYXkoMzAwMClcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdldEd1ZXN0UmVwZWF0ZXJIZWlnaHQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgdmFyIHdpbmRvd0hlaWdodCAgICAgICAgICAgID0gJHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgICAgIHZhciBuYXZCYXJIZWlnaHQgICAgICAgICAgICA9ICQoJyNuYXZiYXInKS5vdXRlckhlaWdodCh0cnVlKTtcbiAgICAgICAgICAgIHZhciBndWVzdExpc3RIZWFkZXJIZWlnaHQgICA9ICQoJyNndWVzdExpc3RIZWFkZXInKS5vdXRlckhlaWdodCh0cnVlKTtcbiAgICAgICAgICAgIHZhciBndWVzdFRhYmxlSGVhZGVySGVpZ2h0ICA9ICQoJyNndWVzdFRhYmxlSGVhZGVyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cbiAgICAgICAgICAgIHZhciBsaXN0SGVpZ2h0ICAgICAgICAgICAgICA9IHdpbmRvd0hlaWdodCAtIG5hdkJhckhlaWdodCAtIGd1ZXN0TGlzdEhlYWRlckhlaWdodCAtIGd1ZXN0VGFibGVIZWFkZXJIZWlnaHQgLSAxMDtcblxuICAgICAgICAgICAgcmV0dXJuIHtoZWlnaHQ6ICcnICsgbGlzdEhlaWdodCArICdweCd9O1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zb3J0R3Vlc3RzICAgPSBmdW5jdGlvbiAoc29ydClcbiAgICAgICAge1xuICAgICAgICAgICAgaWYgKHNvcnQgPT09ICRzY29wZS5zb3J0R3Vlc3QpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc29ydEd1ZXN0UmV2ZXJzZSAgICAgPSAhJHNjb3BlLnNvcnRHdWVzdFJldmVyc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRHdWVzdCAgICAgICAgICAgID0gJHNjb3BlLnNvcnRHdWVzdFJldmVyc2UgPT09IGZhbHNlID8gbnVsbCA6ICRzY29wZS5zb3J0R3Vlc3Q7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzY29wZS5zb3J0R3Vlc3QgICAgICAgICAgICA9IHNvcnQ7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRHdWVzdFJldmVyc2UgICAgID0gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5zb3J0SWNvbiAgICAgICAgICAgICAgICAgPSAkc2NvcGUuc29ydEd1ZXN0UmV2ZXJzZSA/ICdhcnJvd19kcm9wX2Rvd24nIDogJ2Fycm93X2Ryb3BfdXAnO1xuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAkd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplKTtcblxuICAgICAgICBmdW5jdGlvbiBvblJlc2l6ZSgpIHtcbiAgICAgICAgICAgICRzY29wZS4kZGlnZXN0KCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuJG9uKCdzdG9yZUd1ZXN0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cbiAgICAgICAgICAgIEd1ZXN0LnN0b3JlKHtndWVzdDogJHNjb3BlLmN1cnJlbnRHdWVzdH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgICAgIHZhciBndWVzdCAgICAgICA9IHJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5ndWVzdHMubWFwKGZ1bmN0aW9uIChnKSB7cmV0dXJuIGcuaWQ7IH0pLmluZGV4T2YoZ3Vlc3QuaWQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGd1ZXN0SW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGd1ZXN0IG5vdCBvbiBsaXN0LCBjcmVhdGluZyBlbnRyeVxuICAgICAgICAgICAgICAgICAgICB2YXIgZ3Vlc3REYXRhICAgICAgID0gKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZ3Vlc3QpKSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ndWVzdHMudW5zaGlmdChndWVzdERhdGEpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gZXJyb3IgdHJlYXRtZW50XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJFcnJvciBjcmVhdGluZyBndWVzdCFcIilcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBjaGVja0luTWFuYWdlci5zZXJ2aWNlOkd1ZXN0U3J2XG4gICAgICogQGRlc2NyaXB0aW9uXG4gICAgICogIyBHdWVzdFNydlxuICAgICAqIFNlcnZpY2Ugb2YgdGhlIGNoZWNrSW5NYW5hZ2VyXG4gICAgICovXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5zZXJ2aWNlcycpLmZhY3RvcnkoJ0d1ZXN0JywgZnVuY3Rpb24gKCRyZXNvdXJjZSwgQVBJX1VSTCkge1xuICAgICAgICByZXR1cm4gJHJlc291cmNlKEFQSV9VUkwgKyBcImd1ZXN0c1wiLCB7fSwge1xuICAgICAgICAgICAgY2hlY2tJbjoge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwiZXZlbnRzLzpldmVudFNsdWcvZ3Vlc3RzLzpndWVzdElkLzpkYXRhXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50U2x1ZzogJ0BldmVudFNsdWcnLFxuICAgICAgICAgICAgICAgICAgICBndWVzdElkOiAnQGd1ZXN0SWQnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnQGRhdGEnLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlbW92ZToge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwiZXZlbnRzLzpldmVudFNsdWcvZ3Vlc3RzLzpndWVzdElkLzpkYXRhXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50U2x1ZzogJ0BldmVudFNsdWcnLFxuICAgICAgICAgICAgICAgICAgICBndWVzdElkOiAnQGd1ZXN0SWQnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiAnQGRhdGEnLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGRlbGV0ZToge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwiZ3Vlc3RzLzpndWVzdElkL2RlbGV0ZVwiLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBndWVzdElkOiAnQGd1ZXN0SWQnLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHN0b3JlOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBBUElfVVJMICsgXCJndWVzdHMvc3RvcmVcIixcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3Q6ICdAZ3Vlc3QnLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0pXG5cbiAgICAuc2VydmljZSgnR3Vlc3RTcnYnLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgR3Vlc3QpIHtcblxuICAgICAgICB0aGlzLmdldEd1ZXN0cyAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZ3Vlc3RzICA9IEd1ZXN0LmdldChmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBpbXByb3ZlIHRoaXNcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmd1ZXN0cyAgID0gcmVzdWx0LmRhdGE7XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRHdWVzdHMoKTtcbiAgICB9KTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8qKlxuICAgICAqIEBuZ2RvYyBmdW5jdGlvblxuICAgICAqIEBuYW1lIGNoZWNrSW5NYW5hZ2VyLnNlcnZpY2U6SXRlbVNydlxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqICMgSXRlbVNydlxuICAgICAqIFNlcnZpY2Ugb2YgdGhlIGNoZWNrSW5NYW5hZ2VyXG4gICAgICovXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5zZXJ2aWNlcycpLmZhY3RvcnkoJ0l0ZW0nLCBmdW5jdGlvbiAoJHJlc291cmNlLCBBUElfVVJMKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoQVBJX1VSTCArIFwiaXRlbXMvOnR5cGVcIiwge3R5cGU6ICdAdHlwZSd9LCB7XG5cbiAgICAgICAgICAgIHVwZGF0ZUFsbDoge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnQHR5cGUnLFxuICAgICAgICAgICAgICAgICAgICBpdGVtczogJ0BpdGVtcycsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSlcblxuICAgIC5zZXJ2aWNlKCdDYXRlZ29yeVNydicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBJdGVtKSB7XG5cbiAgICAgICAgdGhpcy5nZXRDYXRlZ29yaWVzICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjYXRlZ29yaWVzICA9IEl0ZW0uZ2V0KHt0eXBlOiAnY2F0ZWdvcmllcyd9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiAkcm9vdFNjb3BlLml0ZW1zID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLml0ZW1zID0ge307XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS5pdGVtcy5jYXRlZ29yaWVzID0ge2N1cnJlbnQ6IHJlc3VsdC5kYXRhfTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgfSlcblxuICAgIC5zZXJ2aWNlKCdJbmR1c3RyeVNydicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBJdGVtKSB7XG5cbiAgICAgICAgdGhpcy5nZXRJbmR1c3RyaWVzICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBpbmR1c3RyaWVzICA9IEl0ZW0uZ2V0KHt0eXBlOiAnaW5kdXN0cmllcyd9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiAkcm9vdFNjb3BlLml0ZW1zID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLml0ZW1zID0ge307XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS5pdGVtcy5pbmR1c3RyaWVzID0ge2N1cnJlbnQ6IHJlc3VsdC5kYXRhfTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgfSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvKipcbiAgICAgKiBAbmdkb2MgZnVuY3Rpb25cbiAgICAgKiBAbmFtZSBjaGVja0luTWFuYWdlci5jb250cm9sbGVyOk5hdmJhckN0cmxcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIE5hdmJhckN0cmxcbiAgICAgKiBDb250cm9sbGVyIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuY29udHJvbGxlcnMnKS5jb250cm9sbGVyKCdOYXZiYXJDdHJsJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICR3aW5kb3csICRzY29wZSwgJGh0dHAsICRtZERpYWxvZywgbWREaWFsb2dTcnYsIEF1dGgsIEl0ZW0sIENhdGVnb3J5U3J2LCBJbmR1c3RyeVNydikge1xuXG4gICAgICAgICRzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBBdXRoLmxvZ291dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gXCIvXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuXG4gICAgICAgICRzY29wZS5vcGVuQ2F0ZWdvcmllc0RpYWxvZyA9IGZ1bmN0aW9uIChldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgbWREaWFsb2dTcnYuZnJvbVRlbXBsYXRlKCcuL3ZpZXdzL2FwcC9kaWFsb2dzL2VkaXRfY2F0ZWdvcmllcy5odG1sJywgZXZlbnQsICRzY29wZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLm9wZW5JbmR1c3RyaWVzRGlhbG9nID0gZnVuY3Rpb24gKCRldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgbWREaWFsb2dTcnYuZnJvbVRlbXBsYXRlKCcuL3ZpZXdzL2FwcC9kaWFsb2dzL2VkaXRfaW5kdXN0cmllcy5odG1sJywgZXZlbnQsICRzY29wZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmRlbGV0ZUl0ZW0gICA9IGZ1bmN0aW9uICh0eXBlLCBpbmRleClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLml0ZW1zW3R5cGVdLmN1cnJlbnQuc3BsaWNlKGluZGV4LCAxKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmNyZWF0ZUl0ZW0gICA9IGZ1bmN0aW9uICh0eXBlKVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAoISRzY29wZS5pdGVtc1t0eXBlXS5uZXcpIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKCEkc2NvcGUuaXRlbXNbdHlwZV0uY3VycmVudCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5pdGVtc1t0eXBlXS5jdXJyZW50ICAgPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLml0ZW1zW3R5cGVdLmN1cnJlbnQucHVzaCgkc2NvcGUuaXRlbXNbdHlwZV0ubmV3KTtcbiAgICAgICAgICAgICRzY29wZS5pdGVtc1t0eXBlXS5uZXcgID0gbnVsbDtcblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmNhbmNlbEVkaXRNZW51ICA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIG1kRGlhbG9nU3J2LmNhbmNlbCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5maW5pc2hFZGl0TWVudSAgPSBmdW5jdGlvbiAodHlwZSlcbiAgICAgICAge1xuICAgICAgICAgICAgSXRlbS51cGRhdGVBbGwoe2l0ZW1zOiAkc2NvcGUuaXRlbXNbdHlwZV0uY3VycmVudCwgdHlwZTogdHlwZX0sIGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAvLyBTdWNjZXNzIG1lc3NhZ2U/XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG1kRGlhbG9nU3J2LmhpZGUoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBDYXRlZ29yeVNydi5nZXRDYXRlZ29yaWVzKCk7XG4gICAgICAgIEluZHVzdHJ5U3J2LmdldEluZHVzdHJpZXMoKTtcbiAgICB9KTtcblxufSkoKTtcbiIsIihmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgY2hlY2tJbk1hbmFnZXIuY29udHJvbGxlcjpTdGF0c0N0cmxcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiAjIFN0YXRzQ3RybFxuICAgICAqIENvbnRyb2xsZXIgb2YgdGhlIGNoZWNrSW5NYW5hZ2VyXG4gICAgICovXG4gICAgYW5ndWxhci5tb2R1bGUoJ2NoZWNrX2luX2FwcC5jb250cm9sbGVycycpLmNvbnRyb2xsZXIoJ1N0YXRzQ3RybCcsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkd2luZG93LCAkc2NvcGUsICRodHRwLCBTdGF0cykge1xuXG4gICAgICAgICRzY29wZS5wYXJzZUV2ZW50U3RhdHMgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuZGF0YSA9IHt9O1xuICAgICAgICAgICAgJHNjb3BlLnBhcnNlSW5kdXN0cnlBYnNEYXRhKCk7XG4gICAgICAgICAgICAkc2NvcGUucGFyc2VJbmR1c3RyeVBlcmNlbnRhZ2VEYXRhKCk7XG4gICAgICAgICAgICAkc2NvcGUucGFyc2VUaW1lRGF0YSgpO1xuICAgICAgICAgICAgJHNjb3BlLnBhcnNlQ291bnRyaWVzRGF0YSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5wYXJzZUluZHVzdHJ5QWJzRGF0YSA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5kYXRhLmluZHVzdHJ5X2FicyA9IFtdO1xuXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmV2ZW50U3RhdHMuaW5kdXN0cmllc19hYnMsIGZ1bmN0aW9uIChkYXRhLCBrZXkpIHtcblxuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9ICRzY29wZS5kYXRhLmluZHVzdHJ5X2Ficy5wdXNoKHtrZXk6IGtleSwgdmFsdWVzOiBbXX0pO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChkYXRhLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnJykgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YS5pbmR1c3RyeV9hYnNbaW5kZXggLSAxXS52YWx1ZXMucHVzaCh7eDoga2V5LCB5OiB2YWx1ZX0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnBhcnNlSW5kdXN0cnlQZXJjZW50YWdlRGF0YSA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5kYXRhLmluZHVzdHJ5X3BlcmNlbnRhZ2UgPSBbXTtcblxuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5ldmVudFN0YXRzLmluZHVzdHJpZXNfcGVyY2VudGFnZSwgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnJykgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICRzY29wZS5kYXRhLmluZHVzdHJ5X3BlcmNlbnRhZ2UucHVzaCh7a2V5OiBrZXksIHk6IHZhbHVlfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUucGFyc2VUaW1lRGF0YSA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5kYXRhLnRpbWUgPSBbXTtcblxuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5ldmVudFN0YXRzLnRpbWUsIGZ1bmN0aW9uIChkYXRhLCBrZXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSAkc2NvcGUuZGF0YS50aW1lLnB1c2goe2tleToga2V5LCB2YWx1ZXM6IFtdLCBzdHJva2VXaWR0aDogMiwgYXJlYTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChkYXRhLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnJykgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGF0YS50aW1lW2luZGV4IC0gMV0udmFsdWVzLnB1c2goe3g6IGtleSwgeTogdmFsdWV9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5wYXJzZUNvdW50cmllc0RhdGEgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuZGF0YS5jb3VudHJpZXMgPSBbXTtcblxuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKCRzY29wZS5ldmVudFN0YXRzLmNvdW50cmllcywgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnLS0nIHx8IHZhbHVlID09PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmRhdGEuY291bnRyaWVzLnB1c2goe2tleToga2V5LCB5OiB2YWx1ZX0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNldENoYXJ0c09wdGlvbnMgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUub3B0aW9ucyA9IHt9O1xuXG4gICAgICAgICAgICAkc2NvcGUub3B0aW9ucy5pbmR1c3RyeV9hYnMgPSB7XG4gICAgICAgICAgICAgICAgY2hhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ211bHRpQmFyQ2hhcnQnLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgbWFyZ2luIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiAyMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiAyMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvdHRvbTogNDUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiA0NVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBncm91cFNwYWNpbmc6IDAuNSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcEVkZ2U6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICAgICAgICAgIHN0YWNrZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHJlZHVjZVhUaWNrczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHVzZUludGVyYWN0aXZlR3VpZGVsaW5lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB4QXhpczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgcm90YXRlTGFiZWxzOiAtNDUsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93TWF4TWluOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB5QXhpczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnQXR0ZW5kYW5jZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWxEaXN0YW5jZTogLTIwLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnZCcpKGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnMuaW5kdXN0cnlfcGVyY2VudGFnZSA9IHtcbiAgICAgICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncGllQ2hhcnQnLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDM1MCxcbiAgICAgICAgICAgICAgICAgICAgeDogZnVuY3Rpb24oZCl7cmV0dXJuIGQua2V5O30sXG4gICAgICAgICAgICAgICAgICAgIHk6IGZ1bmN0aW9uKGQpe3JldHVybiBkLnk7fSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd0xhYmVsczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbGFiZWxTdW5iZWFtTGF5b3V0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZG9udXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRvbnV0UmF0aW86IDAuMzUsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsVHlwZTogXCJwZXJjZW50XCIsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsVGhyZXNob2xkOiAwLjAxLFxuICAgICAgICAgICAgICAgICAgICBsZWdlbmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogNSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByaWdodDogMzUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm90dG9tOiA1LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICRzY29wZS5vcHRpb25zLnRpbWUgPSB7XG4gICAgICAgICAgICAgICAgY2hhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2xpbmVDaGFydCcsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogMzAwLFxuICAgICAgICAgICAgICAgICAgICBtYXJnaW4gOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b3A6IDIwLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IDIwLFxuICAgICAgICAgICAgICAgICAgICAgICAgYm90dG9tOiA0MCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IDU1XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKGQpeyByZXR1cm4gZC54OyB9LFxuICAgICAgICAgICAgICAgICAgICB5OiBmdW5jdGlvbihkKXsgcmV0dXJuIGQueTsgfSxcbiAgICAgICAgICAgICAgICAgICAgdXNlSW50ZXJhY3RpdmVHdWlkZWxpbmU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWw6ICdEYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJvdGF0ZUxhYmVsczogLTQ1LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLnRpbWUuZm9ybWF0KCclQiAlWScpKG5ldyBEYXRlKE51bWJlcihkKSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB5QXhpczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsOiAnQXR0ZW5kYW5jZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWxEaXN0YW5jZTogLTEwLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGlja0Zvcm1hdDogZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnZCcpKGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHNjb3BlLm9wdGlvbnMuY291bnRyaWVzID0ge1xuICAgICAgICAgICAgICAgIGNoYXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdwaWVDaGFydCcsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogMzAwLFxuICAgICAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbihkKXtyZXR1cm4gZC5rZXk7fSxcbiAgICAgICAgICAgICAgICAgICAgeTogZnVuY3Rpb24oZCl7cmV0dXJuIGQueTt9LFxuICAgICAgICAgICAgICAgICAgICBzaG93TGFiZWxzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBsYWJlbFN1bmJlYW1MYXlvdXQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkb251dDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsVHlwZTogXCJwZXJjZW50XCIsXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiA1MDAsXG4gICAgICAgICAgICAgICAgICAgIGxhYmVsVGhyZXNob2xkOiAwLjAxLFxuICAgICAgICAgICAgICAgICAgICBsZWdlbmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogNSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByaWdodDogMzUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYm90dG9tOiA1LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IDBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdldEZpbHRlcnMgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN0YXJ0X2RhdGU6ICRzY29wZS5maWx0ZXJzLnN0YXJ0X2RhdGUgICA/IG1vbWVudCgkc2NvcGUuZmlsdGVycy5zdGFydF9kYXRlKS5mb3JtYXQoJ1lZWVkvTU0vREQgSEg6bW0nKSAgOiBudWxsLFxuICAgICAgICAgICAgICAgIGVuZF9kYXRlOiAkc2NvcGUuZmlsdGVycy5lbmRfZGF0ZSAgICAgICA/IG1vbWVudCgkc2NvcGUuZmlsdGVycy5lbmRfZGF0ZSkuZm9ybWF0KCdZWVlZL01NL0REIEhIOm1tJykgICAgOiBudWxsLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZGF0ZVJhbmdlQ2hhbmdlZCA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuZGF0ZVJhbmdlLmtleSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZmlsdGVycyAgICAgICAgICAgICAgPSB7c3RhcnRfZGF0ZTogbnVsbCwgZW5kX2RhdGU6IG51bGx9O1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXN0b21SYW5nZUFjdGl2ZSAgICA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzY29wZS5maWx0ZXJzICAgICAgICAgICAgICA9IHtzdGFydF9kYXRlOiAkc2NvcGUuZGF0ZVJhbmdlLnN0YXJ0X2RhdGUsIGVuZF9kYXRlOiAkc2NvcGUuZGF0ZVJhbmdlLmVuZF9kYXRlfTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZ2V0U3RhdHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2V0Q3VzdG9tRGF0ZVJhbmdlID0gZnVuY3Rpb24gKClcbiAgICAgICAge1xuICAgICAgICAgICAgJHNjb3BlLmN1c3RvbVJhbmdlQWN0aXZlICAgICAgICA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmRhdGVSYW5nZS5kZXNjcmlwdGlvbiAgICA9ICgkc2NvcGUuZmlsdGVycy5zdGFydF9kYXRlID8gbW9tZW50KCRzY29wZS5maWx0ZXJzLnN0YXJ0X2RhdGUpLmZvcm1hdCgnWVlZWS9NTS9ERCcpIDogJ+KInicpICsgJyDihpIgJyArICgkc2NvcGUuZmlsdGVycy5lbmRfZGF0ZSA/IG1vbWVudCgkc2NvcGUuZmlsdGVycy5lbmRfZGF0ZSkuZm9ybWF0KCdZWVlZL01NL0REJykgOiAn4oieJyk7XG4gICAgICAgICAgICAkc2NvcGUuZ2V0U3RhdHMoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuZ2V0U3RhdHMgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICBTdGF0cy5ldmVudHMoJHNjb3BlLmdldEZpbHRlcnMoKSwgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgICRzY29wZS5ldmVudFN0YXRzID0gcmVzLmRhdGE7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnBhcnNlRXZlbnRTdGF0cygpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIFN0YXRzLmdsb2JhbCgkc2NvcGUuZ2V0RmlsdGVycygpLCBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmdsb2JhbFN0YXRzID0gcmVzLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2V0RGVmYXVsdERhdGVSYW5nZUZpbHRlcnMgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuZGF0ZVJhbmdlcyAgID0gW3trZXk6ICdhbGx0aW1lJywgZGVzY3JpcHRpb246ICdBbGwtdGltZSd9LCB7a2V5OiAnbW9udGhseScsIGRlc2NyaXB0aW9uOiAnVGhpcyBNb250aCcsIHN0YXJ0X2RhdGU6IG1vbWVudCgpLnN0YXJ0T2YoJ21vbnRoJykuX2R9LCB7a2V5OiAneWVhcmx5JywgZGVzY3JpcHRpb246ICdUaGlzIFllYXInLCBzdGFydF9kYXRlOiBtb21lbnQoKS5zdGFydE9mKCd5ZWFyJykuX2R9LCB7a2V5OiAnY3VzdG9tJywgZGVzY3JpcHRpb246ICdQaWNrIGEgZGF0ZSByYW5nZS4uLid9XTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2V0RGVmYXVsdERhdGVSYW5nZUZpbHRlcnMoKTtcbiAgICAgICAgJHNjb3BlLmRhdGVSYW5nZSAgICA9ICRzY29wZS5kYXRlUmFuZ2VzWzBdO1xuICAgICAgICAkc2NvcGUuZmlsdGVycyAgICAgID0ge3N0YXJ0X2RhdGU6IG51bGwsIGVuZF9kYXRlOiBudWxsfTtcblxuICAgICAgICAkc2NvcGUuZ2V0U3RhdHMoKTtcbiAgICAgICAgJHNjb3BlLnNldENoYXJ0c09wdGlvbnMoKTtcbiAgICB9KTtcblxufSkoKTtcbiIsIihmdW5jdGlvbigpe1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLyoqXG4gICAgICogQG5nZG9jIGZ1bmN0aW9uXG4gICAgICogQG5hbWUgY2hlY2tJbk1hbmFnZXIuc2VydmljZTpTdGF0c1NydlxuICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAqICMgU3RhdHNTcnZcbiAgICAgKiBTZXJ2aWNlIG9mIHRoZSBjaGVja0luTWFuYWdlclxuICAgICAqL1xuICAgIGFuZ3VsYXIubW9kdWxlKCdjaGVja19pbl9hcHAuc2VydmljZXMnKS5mYWN0b3J5KCdTdGF0cycsIGZ1bmN0aW9uICgkcmVzb3VyY2UsIEFQSV9VUkwpIHtcbiAgICAgICAgcmV0dXJuICRyZXNvdXJjZShBUElfVVJMICsgXCJzdGF0c1wiLCB7fSwge1xuICAgICAgICAgICAgZ2xvYmFsOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBBUElfVVJMICsgXCJzdGF0cy9nbG9iYWxcIixcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJzOiAnQGZpbHRlcnMnLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGV2ZW50czoge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwic3RhdHMvZXZlbnRzXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyczogJ0BmaWx0ZXJzJyxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9KTtcbn0pKCk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLnNlcnZpY2VzJylcblxuICAgIC5mYWN0b3J5KCdtb2JpbGVTcnYnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG1vYmlsZUNoZWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2hlY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAoZnVuY3Rpb24oYSl7aWYoLyhhbmRyb2lkfGJiXFxkK3xtZWVnbykuK21vYmlsZXxhdmFudGdvfGJhZGFcXC98YmxhY2tiZXJyeXxibGF6ZXJ8Y29tcGFsfGVsYWluZXxmZW5uZWN8aGlwdG9wfGllbW9iaWxlfGlwKGhvbmV8b2QpfGlyaXN8a2luZGxlfGxnZSB8bWFlbW98bWlkcHxtbXB8bW9iaWxlLitmaXJlZm94fG5ldGZyb250fG9wZXJhIG0ob2J8aW4paXxwYWxtKCBvcyk/fHBob25lfHAoaXhpfHJlKVxcL3xwbHVja2VyfHBvY2tldHxwc3B8c2VyaWVzKDR8NikwfHN5bWJpYW58dHJlb3x1cFxcLihicm93c2VyfGxpbmspfHZvZGFmb25lfHdhcHx3aW5kb3dzIGNlfHhkYXx4aWluby9pLnRlc3QoYSl8fC8xMjA3fDYzMTB8NjU5MHwzZ3NvfDR0aHB8NTBbMS02XWl8Nzcwc3w4MDJzfGEgd2F8YWJhY3xhYyhlcnxvb3xzXFwtKXxhaShrb3xybil8YWwoYXZ8Y2F8Y28pfGFtb2l8YW4oZXh8bnl8eXcpfGFwdHV8YXIoY2h8Z28pfGFzKHRlfHVzKXxhdHR3fGF1KGRpfFxcLW18ciB8cyApfGF2YW58YmUoY2t8bGx8bnEpfGJpKGxifHJkKXxibChhY3xheil8YnIoZXx2KXd8YnVtYnxid1xcLShufHUpfGM1NVxcL3xjYXBpfGNjd2F8Y2RtXFwtfGNlbGx8Y2h0bXxjbGRjfGNtZFxcLXxjbyhtcHxuZCl8Y3Jhd3xkYShpdHxsbHxuZyl8ZGJ0ZXxkY1xcLXN8ZGV2aXxkaWNhfGRtb2J8ZG8oY3xwKW98ZHMoMTJ8XFwtZCl8ZWwoNDl8YWkpfGVtKGwyfHVsKXxlcihpY3xrMCl8ZXNsOHxleihbNC03XTB8b3N8d2F8emUpfGZldGN8Zmx5KFxcLXxfKXxnMSB1fGc1NjB8Z2VuZXxnZlxcLTV8Z1xcLW1vfGdvKFxcLnd8b2QpfGdyKGFkfHVuKXxoYWllfGhjaXR8aGRcXC0obXxwfHQpfGhlaVxcLXxoaShwdHx0YSl8aHAoIGl8aXApfGhzXFwtY3xodChjKFxcLXwgfF98YXxnfHB8c3x0KXx0cCl8aHUoYXd8dGMpfGlcXC0oMjB8Z298bWEpfGkyMzB8aWFjKCB8XFwtfFxcLyl8aWJyb3xpZGVhfGlnMDF8aWtvbXxpbTFrfGlubm98aXBhcXxpcmlzfGphKHR8dilhfGpicm98amVtdXxqaWdzfGtkZGl8a2VqaXxrZ3QoIHxcXC8pfGtsb258a3B0IHxrd2NcXC18a3lvKGN8ayl8bGUobm98eGkpfGxnKCBnfFxcLyhrfGx8dSl8NTB8NTR8XFwtW2Etd10pfGxpYnd8bHlueHxtMVxcLXd8bTNnYXxtNTBcXC98bWEodGV8dWl8eG8pfG1jKDAxfDIxfGNhKXxtXFwtY3J8bWUocmN8cmkpfG1pKG84fG9hfHRzKXxtbWVmfG1vKDAxfDAyfGJpfGRlfGRvfHQoXFwtfCB8b3x2KXx6eil8bXQoNTB8cDF8diApfG13YnB8bXl3YXxuMTBbMC0yXXxuMjBbMi0zXXxuMzAoMHwyKXxuNTAoMHwyfDUpfG43KDAoMHwxKXwxMCl8bmUoKGN8bSlcXC18b258dGZ8d2Z8d2d8d3QpfG5vayg2fGkpfG56cGh8bzJpbXxvcCh0aXx3dil8b3Jhbnxvd2cxfHA4MDB8cGFuKGF8ZHx0KXxwZHhnfHBnKDEzfFxcLShbMS04XXxjKSl8cGhpbHxwaXJlfHBsKGF5fHVjKXxwblxcLTJ8cG8oY2t8cnR8c2UpfHByb3h8cHNpb3xwdFxcLWd8cWFcXC1hfHFjKDA3fDEyfDIxfDMyfDYwfFxcLVsyLTddfGlcXC0pfHF0ZWt8cjM4MHxyNjAwfHJha3N8cmltOXxybyh2ZXx6byl8czU1XFwvfHNhKGdlfG1hfG1tfG1zfG55fHZhKXxzYygwMXxoXFwtfG9vfHBcXC0pfHNka1xcL3xzZShjKFxcLXwwfDEpfDQ3fG1jfG5kfHJpKXxzZ2hcXC18c2hhcnxzaWUoXFwtfG0pfHNrXFwtMHxzbCg0NXxpZCl8c20oYWx8YXJ8YjN8aXR8dDUpfHNvKGZ0fG55KXxzcCgwMXxoXFwtfHZcXC18diApfHN5KDAxfG1iKXx0MigxOHw1MCl8dDYoMDB8MTB8MTgpfHRhKGd0fGxrKXx0Y2xcXC18dGRnXFwtfHRlbChpfG0pfHRpbVxcLXx0XFwtbW98dG8ocGx8c2gpfHRzKDcwfG1cXC18bTN8bTUpfHR4XFwtOXx1cChcXC5ifGcxfHNpKXx1dHN0fHY0MDB8djc1MHx2ZXJpfHZpKHJnfHRlKXx2ayg0MHw1WzAtM118XFwtdil8dm00MHx2b2RhfHZ1bGN8dngoNTJ8NTN8NjB8NjF8NzB8ODB8ODF8ODN8ODV8OTgpfHczYyhcXC18ICl8d2ViY3x3aGl0fHdpKGcgfG5jfG53KXx3bWxifHdvbnV8eDcwMHx5YXNcXC18eW91cnx6ZXRvfHp0ZVxcLS9pLnRlc3QoYS5zdWJzdHIoMCw0KSkpIGNoZWNrID0gdHJ1ZTt9KShuYXZpZ2F0b3IudXNlckFnZW50fHxuYXZpZ2F0b3IudmVuZG9yfHx3aW5kb3cub3BlcmEpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGVjaztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG1vYmlsZUFuZFRhYmxldENoZWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgY2hlY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAoZnVuY3Rpb24oYSl7aWYoLyhhbmRyb2lkfGJiXFxkK3xtZWVnbykuK21vYmlsZXxhdmFudGdvfGJhZGFcXC98YmxhY2tiZXJyeXxibGF6ZXJ8Y29tcGFsfGVsYWluZXxmZW5uZWN8aGlwdG9wfGllbW9iaWxlfGlwKGhvbmV8b2QpfGlyaXN8a2luZGxlfGxnZSB8bWFlbW98bWlkcHxtbXB8bW9iaWxlLitmaXJlZm94fG5ldGZyb250fG9wZXJhIG0ob2J8aW4paXxwYWxtKCBvcyk/fHBob25lfHAoaXhpfHJlKVxcL3xwbHVja2VyfHBvY2tldHxwc3B8c2VyaWVzKDR8NikwfHN5bWJpYW58dHJlb3x1cFxcLihicm93c2VyfGxpbmspfHZvZGFmb25lfHdhcHx3aW5kb3dzIGNlfHhkYXx4aWlub3xhbmRyb2lkfGlwYWR8cGxheWJvb2t8c2lsay9pLnRlc3QoYSl8fC8xMjA3fDYzMTB8NjU5MHwzZ3NvfDR0aHB8NTBbMS02XWl8Nzcwc3w4MDJzfGEgd2F8YWJhY3xhYyhlcnxvb3xzXFwtKXxhaShrb3xybil8YWwoYXZ8Y2F8Y28pfGFtb2l8YW4oZXh8bnl8eXcpfGFwdHV8YXIoY2h8Z28pfGFzKHRlfHVzKXxhdHR3fGF1KGRpfFxcLW18ciB8cyApfGF2YW58YmUoY2t8bGx8bnEpfGJpKGxifHJkKXxibChhY3xheil8YnIoZXx2KXd8YnVtYnxid1xcLShufHUpfGM1NVxcL3xjYXBpfGNjd2F8Y2RtXFwtfGNlbGx8Y2h0bXxjbGRjfGNtZFxcLXxjbyhtcHxuZCl8Y3Jhd3xkYShpdHxsbHxuZyl8ZGJ0ZXxkY1xcLXN8ZGV2aXxkaWNhfGRtb2J8ZG8oY3xwKW98ZHMoMTJ8XFwtZCl8ZWwoNDl8YWkpfGVtKGwyfHVsKXxlcihpY3xrMCl8ZXNsOHxleihbNC03XTB8b3N8d2F8emUpfGZldGN8Zmx5KFxcLXxfKXxnMSB1fGc1NjB8Z2VuZXxnZlxcLTV8Z1xcLW1vfGdvKFxcLnd8b2QpfGdyKGFkfHVuKXxoYWllfGhjaXR8aGRcXC0obXxwfHQpfGhlaVxcLXxoaShwdHx0YSl8aHAoIGl8aXApfGhzXFwtY3xodChjKFxcLXwgfF98YXxnfHB8c3x0KXx0cCl8aHUoYXd8dGMpfGlcXC0oMjB8Z298bWEpfGkyMzB8aWFjKCB8XFwtfFxcLyl8aWJyb3xpZGVhfGlnMDF8aWtvbXxpbTFrfGlubm98aXBhcXxpcmlzfGphKHR8dilhfGpicm98amVtdXxqaWdzfGtkZGl8a2VqaXxrZ3QoIHxcXC8pfGtsb258a3B0IHxrd2NcXC18a3lvKGN8ayl8bGUobm98eGkpfGxnKCBnfFxcLyhrfGx8dSl8NTB8NTR8XFwtW2Etd10pfGxpYnd8bHlueHxtMVxcLXd8bTNnYXxtNTBcXC98bWEodGV8dWl8eG8pfG1jKDAxfDIxfGNhKXxtXFwtY3J8bWUocmN8cmkpfG1pKG84fG9hfHRzKXxtbWVmfG1vKDAxfDAyfGJpfGRlfGRvfHQoXFwtfCB8b3x2KXx6eil8bXQoNTB8cDF8diApfG13YnB8bXl3YXxuMTBbMC0yXXxuMjBbMi0zXXxuMzAoMHwyKXxuNTAoMHwyfDUpfG43KDAoMHwxKXwxMCl8bmUoKGN8bSlcXC18b258dGZ8d2Z8d2d8d3QpfG5vayg2fGkpfG56cGh8bzJpbXxvcCh0aXx3dil8b3Jhbnxvd2cxfHA4MDB8cGFuKGF8ZHx0KXxwZHhnfHBnKDEzfFxcLShbMS04XXxjKSl8cGhpbHxwaXJlfHBsKGF5fHVjKXxwblxcLTJ8cG8oY2t8cnR8c2UpfHByb3h8cHNpb3xwdFxcLWd8cWFcXC1hfHFjKDA3fDEyfDIxfDMyfDYwfFxcLVsyLTddfGlcXC0pfHF0ZWt8cjM4MHxyNjAwfHJha3N8cmltOXxybyh2ZXx6byl8czU1XFwvfHNhKGdlfG1hfG1tfG1zfG55fHZhKXxzYygwMXxoXFwtfG9vfHBcXC0pfHNka1xcL3xzZShjKFxcLXwwfDEpfDQ3fG1jfG5kfHJpKXxzZ2hcXC18c2hhcnxzaWUoXFwtfG0pfHNrXFwtMHxzbCg0NXxpZCl8c20oYWx8YXJ8YjN8aXR8dDUpfHNvKGZ0fG55KXxzcCgwMXxoXFwtfHZcXC18diApfHN5KDAxfG1iKXx0MigxOHw1MCl8dDYoMDB8MTB8MTgpfHRhKGd0fGxrKXx0Y2xcXC18dGRnXFwtfHRlbChpfG0pfHRpbVxcLXx0XFwtbW98dG8ocGx8c2gpfHRzKDcwfG1cXC18bTN8bTUpfHR4XFwtOXx1cChcXC5ifGcxfHNpKXx1dHN0fHY0MDB8djc1MHx2ZXJpfHZpKHJnfHRlKXx2ayg0MHw1WzAtM118XFwtdil8dm00MHx2b2RhfHZ1bGN8dngoNTJ8NTN8NjB8NjF8NzB8ODB8ODF8ODN8ODV8OTgpfHczYyhcXC18ICl8d2ViY3x3aGl0fHdpKGcgfG5jfG53KXx3bWxifHdvbnV8eDcwMHx5YXNcXC18eW91cnx6ZXRvfHp0ZVxcLS9pLnRlc3QoYS5zdWJzdHIoMCw0KSkpIGNoZWNrID0gdHJ1ZTt9KShuYXZpZ2F0b3IudXNlckFnZW50fHxuYXZpZ2F0b3IudmVuZG9yfHx3aW5kb3cub3BlcmEpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGVjaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuXG4iLCJhbmd1bGFyLm1vZHVsZSgnY2hlY2tfaW5fYXBwLnNlcnZpY2VzJylcblxuICAgIC5mYWN0b3J5KCdtZERpYWxvZ1NydicsIGZ1bmN0aW9uICgkbWREaWFsb2cpIHtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZnJvbVRlbXBsYXRlOiBmdW5jdGlvbiAodGVtcGxhdGUsIGV2ZW50LCAkc2NvcGUpIHtcblxuICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGUsXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50OiBldmVudCxcbiAgICAgICAgICAgICAgICAgICAgY2xpY2tPdXRzaWRlVG9DbG9zZTogdHJ1ZVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuc2NvcGUgPSAkc2NvcGUuJG5ldygpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiAkbWREaWFsb2cuc2hvdyhvcHRpb25zKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGhpZGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJG1kRGlhbG9nLmhpZGUoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGNhbmNlbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkbWREaWFsb2cuY2FuY2VsKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhbGVydDogZnVuY3Rpb24gKHRpdGxlLCBjb250ZW50KXtcbiAgICAgICAgICAgICAgICAkbWREaWFsb2cuc2hvdyhcbiAgICAgICAgICAgICAgICAgICAgJG1kRGlhbG9nLmFsZXJ0KClcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aXRsZSh0aXRsZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jb250ZW50KGNvbnRlbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAub2soJ09rJylcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgY29uZmlybTogZnVuY3Rpb24gKGV2ZW50LCBwYXJhbXMsIHN1Y2Nlc3MsIGVycikge1xuICAgICAgICAgICAgICAgIHZhciBjb25maXJtICAgICA9ICRtZERpYWxvZy5jb25maXJtKClcbiAgICAgICAgICAgICAgICAgICAgLnRpdGxlKHBhcmFtcy50aXRsZSlcbiAgICAgICAgICAgICAgICAgICAgLnRleHRDb250ZW50KHBhcmFtcy50ZXh0Q29udGVudClcbiAgICAgICAgICAgICAgICAgICAgLmFyaWFMYWJlbChwYXJhbXMuYXJpYUxhYmVsKVxuICAgICAgICAgICAgICAgICAgICAudGFyZ2V0RXZlbnQoZXZlbnQpXG4gICAgICAgICAgICAgICAgICAgIC5vayhwYXJhbXMub2spXG4gICAgICAgICAgICAgICAgICAgIC5jYW5jZWwocGFyYW1zLmNhbmNlbCk7XG5cbiAgICAgICAgICAgICAgICAkbWREaWFsb2cuc2hvdyhjb25maXJtKS50aGVuKHN1Y2Nlc3MsIGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG4iXX0=
