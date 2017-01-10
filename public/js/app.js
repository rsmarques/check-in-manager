
    DialogController.$inject = ["$timeout", "$q", "$rootScope", "$scope", "$mdDialog", "Events", "guests", "currentEvent", "currentGuest"];angular.module('checkInManager', [

    //Dependancies
    // 'ngRoute',
    'ui.router',
    'checkInManager.controllers',
    'checkInManager.services',
    'ngMaterial',
    'ngMessages',
    'ngStorage',
    'mdPickers',
    // 'ngResource'
    // 'ngStorage',
    // 'ui.bootstrap',
    //App
    // 'routes',
    ])

    .constant('API_URL', 'api/v1/')

    .config(["$stateProvider", "$urlRouterProvider", "$httpProvider", "$locationProvider", function ($stateProvider, $urlRouterProvider, $httpProvider, $locationProvider) {
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
    }])

    // TODO temp solution, remove this from here
    .run(["$rootScope", function ($rootScope) {

        $rootScope.hasAdminAccess   = function () {
            return $rootScope.authUser ? $rootScope.authUser.admin : 0;
        }
    }])

    .config(["$mdIconProvider", function($mdIconProvider) {
        $mdIconProvider.fontSet('md', 'material-icons');
    }])

    .config(["$mdThemingProvider", function($mdThemingProvider) {
        $mdThemingProvider.theme('dark-grey').backgroundPalette('grey').dark();
        $mdThemingProvider.theme('dark-orange').backgroundPalette('orange').dark();
        $mdThemingProvider.theme('dark-purple').backgroundPalette('deep-purple').dark();
        $mdThemingProvider.theme('dark-blue').backgroundPalette('blue').dark();
    }]);

angular.module('checkInManager.controllers', [])

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
        }

        $scope.signin = function () {
            var formData = {
                email: $scope.credentials.email,
                password: $scope.credentials.password
            };

            $rootScope.error    = null;

            Auth.signin(formData, successAuth, function () {
                $rootScope.error = 'Invalid email/password.';
            })
        };

        $scope.signup = function () {
            var formData = {
                email: $scope.credentials.email,
                password: $scope.credentials.password
            };

            $rootScope.error            = null;

            Auth.signup(formData, successAuth, function (err) {
                if (err['errors'] && err['errors'][0]) {
                    $rootScope.error    = err['errors'][0];
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
        }

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
        }

        $scope.openEventMenu = function ($mdOpenMenu, ev) {
            originatorEv = ev;
            $mdOpenMenu(ev);
        };

        $scope.selectEvent  = function (event)
        {
            // console.log("EventListController :: Selecting Event " + event.slug);
            $location.search({'p' : event.slug});
        }

        $scope.findEvent    = function (eventSlug)
        {
            if (!$scope.events) {
                return false;
            }

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

            var g                       = Events.get({eventSlug: event.slug, data: 'guests'}, function (result) {

                $scope.loadingGuests    = false;
                $scope.currentGuests    = result.data;

            }, function (error) {
                // TODO error message
            });
        }

        $scope.uncheckCurrentEvent  = function ()
        {
            $scope.eventId              = null;
            $scope.currentEvent         = 0;
            $scope.loadingGuests        = false;
            $scope.currentGuests        = [];

            $location.search({});
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

        $scope.sortEvents   = function (sort, reverse)
        {
            $scope.sortEvent        = sort;
            $scope.sortEventReverse = reverse;
        }

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
        }

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
        }

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
        }

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
        }

        $scope.showGuestListMobile = function ()
        {
            return $scope.currentEvent || $mdMedia('gt-sm');
        }

        $scope.eventSortComparator = function (event)
        {
            switch ($scope.sortEvent) {
                case 'date':
                    return event.date;
                    break;

                case 'name':
                    return event.name;
                    break;

                default:
                    // upcoming / past sort
                    return event.upcoming_index >= 0 ? event.upcoming_index : (-1) * event.upcoming_index + $scope.events.length;
            }
        }

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
        }

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

        $scope.$watch(function() { return $location.search() }, function (params) {
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

            return true
        }

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
        }

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

angular.module('checkInManager.services', ['ngResource'])

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
                $http.post(API_URL + 'users/signup', data).success(success).error(error)
            },
            signin: function (data, success, error) {
                $http.post(API_URL + 'users/signin', data).success(success).error(error)
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
        }

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
        }

        this.getCurrentUser();
    }]);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9hcHAuanMiLCJhcHAvY29udHJvbGxlcnMvY29udHJvbGxlcnMuanMiLCJhcHAvc2VydmljZXMvc2VydmljZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjsySUFBQSxRQUFBLE9BQUEsa0JBQUE7Ozs7SUFJQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTs7Ozs7Ozs7S0FRQSxTQUFBLFdBQUE7O0tBRUEsc0ZBQUEsVUFBQSxnQkFBQSxvQkFBQSxlQUFBLG1CQUFBOztRQUVBLGtCQUFBLFdBQUE7O1FBRUE7YUFDQSxNQUFBLFVBQUE7Z0JBQ0EsS0FBQTtnQkFDQSxhQUFBO2dCQUNBLFlBQUE7Z0JBQ0EsVUFBQTs7YUFFQSxNQUFBLFVBQUE7Z0JBQ0EsS0FBQTtnQkFDQSxhQUFBO2dCQUNBLFlBQUE7Z0JBQ0EsVUFBQTs7YUFFQSxNQUFBLFVBQUE7Z0JBQ0EsS0FBQTtnQkFDQSxhQUFBO2dCQUNBLFlBQUE7O2FBRUEsTUFBQSxVQUFBO2dCQUNBLEtBQUE7Z0JBQ0EsYUFBQTtnQkFDQSxZQUFBOzs7UUFHQSxtQkFBQSxVQUFBOztRQUVBLGNBQUEsYUFBQSxLQUFBLENBQUEsTUFBQSxhQUFBLGlCQUFBLFVBQUEsSUFBQSxXQUFBLGVBQUE7WUFDQSxPQUFBO2dCQUNBLFdBQUEsVUFBQSxRQUFBO29CQUNBLE9BQUEsVUFBQSxPQUFBLFdBQUE7b0JBQ0EsSUFBQSxjQUFBLE9BQUE7d0JBQ0EsT0FBQSxRQUFBLGdCQUFBLFlBQUEsY0FBQTs7b0JBRUEsT0FBQTs7Z0JBRUEsaUJBQUEsVUFBQSxVQUFBO29CQUNBLElBQUEsU0FBQSxXQUFBLE9BQUEsU0FBQSxXQUFBLE9BQUEsU0FBQSxXQUFBLEtBQUE7d0JBQ0EsVUFBQSxLQUFBOztvQkFFQSxPQUFBLEdBQUEsT0FBQTs7Ozs7OztLQU9BLG1CQUFBLFVBQUEsWUFBQTs7UUFFQSxXQUFBLG1CQUFBLFlBQUE7WUFDQSxPQUFBLFdBQUEsV0FBQSxXQUFBLFNBQUEsUUFBQTs7OztLQUlBLDJCQUFB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QUFBLGdCQUFBLE1BQUEsUUFBQSxTQUFBLE1BQUE7O1lBRUEsUUFBQSxVQUFBLE1BQUEsU0FBQSxPQUFBO2dCQUNBLE1BQUEsS0FBQSxVQUFBLGdCQUFBLE1BQUEsUUFBQSxTQUFBLE1BQUE7O1lBRUEsUUFBQSxVQUFBLFNBQUE7Z0JBQ0EsY0FBQTtnQkFDQSxPQUFBLGNBQUE7Z0JBQ0E7O1lBRUEsZ0JBQUEsWUFBQTtnQkFDQSxPQUFBOzs7OztLQUtBLFFBQUEsbUNBQUEsVUFBQSxXQUFBLFNBQUE7UUFDQSxPQUFBLFVBQUEsVUFBQSwyQkFBQSxJQUFBO1lBQ0EsUUFBQTtnQkFDQSxLQUFBLFVBQUE7Z0JBQ0EsUUFBQTtnQkFDQSxRQUFBO29CQUNBLFdBQUE7b0JBQ0EsS0FBQTs7OztZQUlBLE9BQUE7Z0JBQ0EsS0FBQSxVQUFBO2dCQUNBLFFBQUE7Z0JBQ0EsUUFBQTtvQkFDQSxPQUFBOzs7Ozs7S0FNQSxRQUFBLG1DQUFBLFVBQUEsV0FBQSxTQUFBO1FBQ0EsT0FBQSxVQUFBLFVBQUEsVUFBQSxJQUFBO1lBQ0EsU0FBQTtnQkFDQSxLQUFBLFVBQUE7Z0JBQ0EsUUFBQTtnQkFDQSxRQUFBO29CQUNBLFdBQUE7b0JBQ0EsU0FBQTtvQkFDQSxNQUFBOzs7O1lBSUEsUUFBQTtnQkFDQSxLQUFBLFVBQUE7Z0JBQ0EsUUFBQTtnQkFDQSxRQUFBO29CQUNBLFdBQUE7b0JBQ0EsU0FBQTtvQkFDQSxNQUFBOzs7O1lBSUEsUUFBQTtnQkFDQSxLQUFBLFVBQUE7Z0JBQ0EsUUFBQTtnQkFDQSxRQUFBO29CQUNBLFNBQUE7Ozs7WUFJQSxPQUFBO2dCQUNBLEtBQUEsVUFBQTtnQkFDQSxRQUFBO2dCQUNBLFFBQUE7b0JBQ0EsT0FBQTs7Ozs7O0tBTUEsUUFBQSxrQ0FBQSxVQUFBLFdBQUEsU0FBQTtRQUNBLE9BQUEsVUFBQSxVQUFBLE1BQUEsSUFBQTtZQUNBLElBQUE7Z0JBQ0EsS0FBQSxVQUFBO2dCQUNBLFFBQUE7Ozs7O0tBS0EsUUFBQSwwQ0FBQSxVQUFBLFlBQUEsUUFBQTs7UUFFQSxLQUFBLGFBQUEsWUFBQTtZQUNBLElBQUEsVUFBQSxPQUFBLElBQUEsVUFBQSxRQUFBOztnQkFFQSxXQUFBLFdBQUEsT0FBQTs7ZUFFQSxVQUFBLEtBQUE7Ozs7OztRQU1BLEtBQUE7OztLQUdBLFFBQUEsd0NBQUEsVUFBQSxZQUFBLE9BQUE7O1FBRUEsS0FBQSxpQkFBQSxZQUFBO1lBQ0EsSUFBQSxVQUFBLE1BQUEsR0FBQSxVQUFBLFFBQUE7O2dCQUVBLFdBQUEsV0FBQSxPQUFBOztlQUVBLFVBQUEsS0FBQTs7Ozs7O1FBTUEsS0FBQTs7QUFFQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgnY2hlY2tJbk1hbmFnZXInLCBbXG5cbiAgICAvL0RlcGVuZGFuY2llc1xuICAgIC8vICduZ1JvdXRlJyxcbiAgICAndWkucm91dGVyJyxcbiAgICAnY2hlY2tJbk1hbmFnZXIuY29udHJvbGxlcnMnLFxuICAgICdjaGVja0luTWFuYWdlci5zZXJ2aWNlcycsXG4gICAgJ25nTWF0ZXJpYWwnLFxuICAgICduZ01lc3NhZ2VzJyxcbiAgICAnbmdTdG9yYWdlJyxcbiAgICAnbWRQaWNrZXJzJyxcbiAgICAvLyAnbmdSZXNvdXJjZSdcbiAgICAvLyAnbmdTdG9yYWdlJyxcbiAgICAvLyAndWkuYm9vdHN0cmFwJyxcbiAgICAvL0FwcFxuICAgIC8vICdyb3V0ZXMnLFxuICAgIF0pXG5cbiAgICAuY29uc3RhbnQoJ0FQSV9VUkwnLCAnYXBpL3YxLycpXG5cbiAgICAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyLCAkaHR0cFByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuICAgICAgICAvLyBwcmV2ZW50aW5nIFwiIVwiXCIgZnJvbSBhcHBlYXJpbmcgaW4gdXJsXG4gICAgICAgICRsb2NhdGlvblByb3ZpZGVyLmhhc2hQcmVmaXgoJycpO1xuXG4gICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAuc3RhdGUoJ3NpZ251cCcsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL3ZpZXdzL2xvZ2luLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdIb21lQ29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgcmVnaXN0ZXI6IDFcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ3NpZ25pbicsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvc2lnbmluJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL3ZpZXdzL2xvZ2luLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdIb21lQ29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgcmVnaXN0ZXI6IDBcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoJ2d1ZXN0cycsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvZ3Vlc3RzJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL3ZpZXdzL2d1ZXN0cy5odG1sJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnR3Vlc3RDb250cm9sbGVyJ1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZSgnZXZlbnRzJywge1xuICAgICAgICAgICAgICAgIHVybDogJy9ldmVudHMnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvdmlld3MvZXZlbnRzLmh0bWwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdFdmVudExpc3RDb250cm9sbGVyJ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnL2V2ZW50cycpO1xuXG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goWyckcScsICckbG9jYXRpb24nLCAnJGxvY2FsU3RvcmFnZScsIGZ1bmN0aW9uICgkcSwgJGxvY2F0aW9uLCAkbG9jYWxTdG9yYWdlKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICdyZXF1ZXN0JzogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcuaGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGxvY2FsU3RvcmFnZS50b2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA9ICdCZWFyZXIgJyArICRsb2NhbFN0b3JhZ2UudG9rZW47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICdyZXNwb25zZUVycm9yJzogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMCB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy9zaWduaW4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XSk7XG4gICAgfSlcblxuICAgIC8vIFRPRE8gdGVtcCBzb2x1dGlvbiwgcmVtb3ZlIHRoaXMgZnJvbSBoZXJlXG4gICAgLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuXG4gICAgICAgICRyb290U2NvcGUuaGFzQWRtaW5BY2Nlc3MgICA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkcm9vdFNjb3BlLmF1dGhVc2VyID8gJHJvb3RTY29wZS5hdXRoVXNlci5hZG1pbiA6IDA7XG4gICAgICAgIH1cbiAgICB9KVxuXG4gICAgLmNvbmZpZyhmdW5jdGlvbigkbWRJY29uUHJvdmlkZXIpIHtcbiAgICAgICAgJG1kSWNvblByb3ZpZGVyLmZvbnRTZXQoJ21kJywgJ21hdGVyaWFsLWljb25zJyk7XG4gICAgfSlcblxuICAgIC5jb25maWcoZnVuY3Rpb24oJG1kVGhlbWluZ1Byb3ZpZGVyKSB7XG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZGFyay1ncmV5JykuYmFja2dyb3VuZFBhbGV0dGUoJ2dyZXknKS5kYXJrKCk7XG4gICAgICAgICRtZFRoZW1pbmdQcm92aWRlci50aGVtZSgnZGFyay1vcmFuZ2UnKS5iYWNrZ3JvdW5kUGFsZXR0ZSgnb3JhbmdlJykuZGFyaygpO1xuICAgICAgICAkbWRUaGVtaW5nUHJvdmlkZXIudGhlbWUoJ2RhcmstcHVycGxlJykuYmFja2dyb3VuZFBhbGV0dGUoJ2RlZXAtcHVycGxlJykuZGFyaygpO1xuICAgICAgICAkbWRUaGVtaW5nUHJvdmlkZXIudGhlbWUoJ2RhcmstYmx1ZScpLmJhY2tncm91bmRQYWxldHRlKCdibHVlJykuZGFyaygpO1xuICAgIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2NoZWNrSW5NYW5hZ2VyLmNvbnRyb2xsZXJzJywgW10pXG5cbiAgIC5jb250cm9sbGVyKCdIb21lQ29udHJvbGxlcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkc2NvcGUsICRzdGF0ZSwgJGxvY2F0aW9uLCAkbG9jYWxTdG9yYWdlLCBBdXRoLCBHdWVzdHNTZXJ2aWNlLCBVc2Vyc1NlcnZpY2UpIHtcblxuICAgICAgICBmdW5jdGlvbiBzdWNjZXNzQXV0aCAocmVzKSB7XG4gICAgICAgICAgICAkbG9jYWxTdG9yYWdlLnRva2VuID0gcmVzLnRva2VuO1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gXCIjL2V2ZW50c1wiO1xuXG4gICAgICAgICAgICAvLyBUT0RPIHJlbW92ZSB0aGlzIGZyb20gaGVyZVxuICAgICAgICAgICAgLy8gcmVsb2FkIGd1ZXN0cyBhZnRlciBzdWNjZXNzZnVsIGxvZ2luXG4gICAgICAgICAgICBHdWVzdHNTZXJ2aWNlLmdldEd1ZXN0cygpO1xuICAgICAgICAgICAgVXNlcnNTZXJ2aWNlLmdldEN1cnJlbnRVc2VyKCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUucGVyZm9ybUxvZ2luID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCRzY29wZS5yZWdpc3Rlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2lnbnVwKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAkc2NvcGUuc2lnbmluKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuc2lnbmluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGZvcm1EYXRhID0ge1xuICAgICAgICAgICAgICAgIGVtYWlsOiAkc2NvcGUuY3JlZGVudGlhbHMuZW1haWwsXG4gICAgICAgICAgICAgICAgcGFzc3dvcmQ6ICRzY29wZS5jcmVkZW50aWFscy5wYXNzd29yZFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS5lcnJvciAgICA9IG51bGw7XG5cbiAgICAgICAgICAgIEF1dGguc2lnbmluKGZvcm1EYXRhLCBzdWNjZXNzQXV0aCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuZXJyb3IgPSAnSW52YWxpZCBlbWFpbC9wYXNzd29yZC4nO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc2lnbnVwID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGZvcm1EYXRhID0ge1xuICAgICAgICAgICAgICAgIGVtYWlsOiAkc2NvcGUuY3JlZGVudGlhbHMuZW1haWwsXG4gICAgICAgICAgICAgICAgcGFzc3dvcmQ6ICRzY29wZS5jcmVkZW50aWFscy5wYXNzd29yZFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS5lcnJvciAgICAgICAgICAgID0gbnVsbDtcblxuICAgICAgICAgICAgQXV0aC5zaWdudXAoZm9ybURhdGEsIHN1Y2Nlc3NBdXRoLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVyclsnZXJyb3JzJ10gJiYgZXJyWydlcnJvcnMnXVswXSkge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmVycm9yICAgID0gZXJyWydlcnJvcnMnXVswXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmVycm9yICAgID0gJ0ZhaWxlZCB0byBzaWdudXAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBBdXRoLmxvZ291dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gXCIvXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAgJHNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3VjY2VzcycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5yZWdpc3RlciAgICAgPSAkc3RhdGUuY3VycmVudC5yZWdpc3RlcjtcbiAgICAgICAgICAgICRzY29wZS5sb2dpblRleHQgICAgPSAkc2NvcGUucmVnaXN0ZXIgPyAnUmVnaXN0ZXInIDogJ0xvZ2luJztcbiAgICAgICAgICAgICRyb290U2NvcGUuZXJyb3IgICAgPSBudWxsO1xuICAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLnRva2VuICAgICAgICAgPSAkbG9jYWxTdG9yYWdlLnRva2VuO1xuICAgICAgICAkc2NvcGUudG9rZW5DbGFpbXMgICA9IEF1dGguZ2V0VG9rZW5DbGFpbXMoKTtcbiAgICB9KVxuXG4gICAgLmNvbnRyb2xsZXIoJ0V2ZW50TGlzdENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHdpbmRvdywgJHNjb3BlLCAkaHR0cCwgJHN0YXRlUGFyYW1zLCAkbG9jYXRpb24sICRtZERpYWxvZywgJG1kTWVkaWEsICRtZFRvYXN0LCBBUElfVVJMLCBFdmVudHMsIEd1ZXN0cywgR3Vlc3RzU2VydmljZSwgVXNlcnNTZXJ2aWNlKSB7XG4gICAgICAgIC8vIFRPRE8gY2hhbmdlIG9wZW5EaWFsb2dzIGxvY2F0aW9uXG4gICAgICAgICRzY29wZS5vcGVuR3Vlc3REaWFsb2cgPSBmdW5jdGlvbiAoJGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuY2hlY2tJblN0YXR1cyAgICA9IG51bGw7XG5cbiAgICAgICAgICAgICRtZERpYWxvZy5zaG93KHtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBEaWFsb2dDb250cm9sbGVyLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvdmlld3MvZGlhbG9nX2d1ZXN0X2NoZWNraW4uaHRtbCcsXG4gICAgICAgICAgICAgICAgcGFyZW50OiBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQuYm9keSksXG4gICAgICAgICAgICAgICAgLy8gc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICAvLyBwcmVzZXJ2ZVNjb3BlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGxvY2Fsczoge1xuICAgICAgICAgICAgICAgICAgICBndWVzdHM6ICRzY29wZS5ndWVzdHMsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRFdmVudDogJHNjb3BlLmN1cnJlbnRFdmVudCxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEd1ZXN0OiBudWxsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQ6ICRldmVudCxcbiAgICAgICAgICAgICAgICBjbGlja091dHNpZGVUb0Nsb3NlOnRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLm9wZW5FdmVudERpYWxvZyA9IGZ1bmN0aW9uICgkZXZlbnQsIG5ld0V2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICBpZiAobmV3RXZlbnQpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUudW5jaGVja0N1cnJlbnRFdmVudCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkbWREaWFsb2cuc2hvdyh7XG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogRGlhbG9nQ29udHJvbGxlcixcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyQXM6ICdjdHJsJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy4vdmlld3MvYXBwL3ZpZXdzL2RpYWxvZ19lZGl0X2V2ZW50Lmh0bWwnLFxuICAgICAgICAgICAgICAgIGxvY2Fsczoge1xuICAgICAgICAgICAgICAgICAgICBndWVzdHM6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRFdmVudDogJHNjb3BlLmN1cnJlbnRFdmVudCxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEd1ZXN0OiBudWxsLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFyZW50OiBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQuYm9keSksXG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZSxcbiAgICAgICAgICAgICAgICBwcmVzZXJ2ZVNjb3BlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHRhcmdldEV2ZW50OiAkZXZlbnQsXG4gICAgICAgICAgICAgICAgY2xpY2tPdXRzaWRlVG9DbG9zZTp0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS5vcGVuRXZlbnRNZW51ID0gZnVuY3Rpb24gKCRtZE9wZW5NZW51LCBldikge1xuICAgICAgICAgICAgb3JpZ2luYXRvckV2ID0gZXY7XG4gICAgICAgICAgICAkbWRPcGVuTWVudShldik7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNlbGVjdEV2ZW50ICA9IGZ1bmN0aW9uIChldmVudClcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJFdmVudExpc3RDb250cm9sbGVyIDo6IFNlbGVjdGluZyBFdmVudCBcIiArIGV2ZW50LnNsdWcpO1xuICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaCh7J3AnIDogZXZlbnQuc2x1Z30pO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmZpbmRFdmVudCAgICA9IGZ1bmN0aW9uIChldmVudFNsdWcpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICghJHNjb3BlLmV2ZW50cykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzdWx0ICAgICAgICAgID0gJHNjb3BlLmV2ZW50cy5maW5kKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5zbHVnID09IGV2ZW50U2x1ZztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLnNldEN1cnJlbnRFdmVudCAgPSBmdW5jdGlvbiAoZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5ldmVudElkICAgICAgICAgICAgICA9IGV2ZW50LmlkO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgICAgID0gZXZlbnQ7XG4gICAgICAgICAgICAkc2NvcGUubG9hZGluZ0d1ZXN0cyAgICAgICAgPSB0cnVlO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHMgICAgICAgID0gW107XG5cbiAgICAgICAgICAgIHZhciBnICAgICAgICAgICAgICAgICAgICAgICA9IEV2ZW50cy5nZXQoe2V2ZW50U2x1ZzogZXZlbnQuc2x1ZywgZGF0YTogJ2d1ZXN0cyd9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZ0d1ZXN0cyAgICA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzICAgID0gcmVzdWx0LmRhdGE7XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUudW5jaGVja0N1cnJlbnRFdmVudCAgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuZXZlbnRJZCAgICAgICAgICAgICAgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgICAgID0gMDtcbiAgICAgICAgICAgICRzY29wZS5sb2FkaW5nR3Vlc3RzICAgICAgICA9IGZhbHNlO1xuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHMgICAgICAgID0gW107XG5cbiAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2goe30pO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmNoZWNrQ3VycmVudEV2ZW50ICAgID0gZnVuY3Rpb24gKClcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHBhcmFtcyAgPSAkbG9jYXRpb24uc2VhcmNoKCk7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGFyYW1zLnAgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRJZCA9IHBhcmFtcy5wO1xuICAgICAgICAgICAgICAgIHZhciBldmVudCAgID0gJHNjb3BlLmZpbmRFdmVudChldmVudElkKTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXZlbnQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRzY29wZS5ldmVudElkICE9PSBldmVudC5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNldEN1cnJlbnRFdmVudChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gc2V0IGZpcnN0IGV2ZW50IGFzIGRlZmF1bHRcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuc29ydEV2ZW50cyAgID0gZnVuY3Rpb24gKHNvcnQsIHJldmVyc2UpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5zb3J0RXZlbnQgICAgICAgID0gc29ydDtcbiAgICAgICAgICAgICRzY29wZS5zb3J0RXZlbnRSZXZlcnNlID0gcmV2ZXJzZTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS5jaGVja0luR3Vlc3QgPSBmdW5jdGlvbihldmVudCwgZXZlbnRHdWVzdClcbiAgICAgICAge1xuXG4gICAgICAgICAgICBHdWVzdHMuY2hlY2tJbih7ZXZlbnRTbHVnOiBldmVudC5zbHVnLCBndWVzdElkOiBldmVudEd1ZXN0LmlkLCBkYXRhOiAnY2hlY2tpbid9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG5cbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50Lmd1ZXN0X2NvdW50ID0gJHNjb3BlLmN1cnJlbnRHdWVzdHMubGVuZ3RoO1xuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgZ3Vlc3RJbmRleCAgICAgID0gJHNjb3BlLmN1cnJlbnRHdWVzdHMubWFwKGZ1bmN0aW9uIChnKSB7cmV0dXJuIGcuaWQ7IH0pLmluZGV4T2YoZXZlbnRHdWVzdC5pZCk7XG5cbiAgICAgICAgICAgIGlmIChndWVzdEluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIGd1ZXN0IGFscmVhZHkgb24gbGlzdCwgY2hhbmdpbmcgaXRzIHZhbHVlXG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHNbZ3Vlc3RJbmRleF0uY2hlY2tfaW4gPSAhJHNjb3BlLmN1cnJlbnRHdWVzdHNbZ3Vlc3RJbmRleF0uY2hlY2tfaW47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5ldyBndWVzdCwgYWRkaW5nIGhpbSB0byBhcnJheVxuICAgICAgICAgICAgICAgIHZhciBndWVzdERhdGEgICAgICAgPSAoSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShldmVudEd1ZXN0KSkpO1xuICAgICAgICAgICAgICAgIGd1ZXN0RGF0YS5jaGVja19pbiAgPSAxO1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3RzLnVuc2hpZnQoZ3Vlc3REYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZm9yY2luZyB3aW5kb3cgcmVzaXplIHRvIHVwZGF0ZSB2aXJ0dWFsIHJlcGVhdGVyXG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQod2luZG93KS50cmlnZ2VySGFuZGxlcigncmVzaXplJyk7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLnNob3dSZW1vdmVFdmVudCA9IGZ1bmN0aW9uIChldiwgZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIC8vIEFwcGVuZGluZyBkaWFsb2cgdG8gZG9jdW1lbnQuYm9keSB0byBjb3ZlciBzaWRlbmF2IGluIGRvY3MgYXBwXG4gICAgICAgICAgICB2YXIgY29uZmlybSAgICAgPSAkbWREaWFsb2cuY29uZmlybSgpXG4gICAgICAgICAgICAgICAgLnRpdGxlKCdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgZXZlbnQ/JylcbiAgICAgICAgICAgICAgICAudGV4dENvbnRlbnQoJ1RoaXMgYWN0aW9uIGNhbm5vdCBiZSB1bmRvbmUuJylcbiAgICAgICAgICAgICAgICAuYXJpYUxhYmVsKCdEZWxldGUgRXZlbnQnKVxuICAgICAgICAgICAgICAgIC50YXJnZXRFdmVudChldilcbiAgICAgICAgICAgICAgICAub2soJ1llcycpXG4gICAgICAgICAgICAgICAgLmNhbmNlbCgnVW5kbycpO1xuXG4gICAgICAgICAgICAkbWREaWFsb2cuc2hvdyhjb25maXJtKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5ndWVzdHMubWFwKGZ1bmN0aW9uIChlKSB7cmV0dXJuIGUuaWQ7IH0pLmluZGV4T2YoZ3Vlc3QuaWQpO1xuICAgICAgICAgICAgICAgIHZhciBldmVudEluZGV4ICA9ICRzY29wZS5ldmVudHMuaW5kZXhPZihldmVudCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmV2ZW50cy5zcGxpY2UoZXZlbnRJbmRleCwgMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgRXZlbnRzLmRlbGV0ZSh7ZXZlbnRTbHVnOiBldmVudC5zbHVnfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdHMgICAgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0V2ZW50RGVsZXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3RhdHVzICAgICAgICAgICA9ICdFdmVudCBEZWxldGVkLic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuc2hvd0V2ZW50RGVsZXRlZCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuICAgICAgICAgICAgJG1kVG9hc3Quc2hvdyhcbiAgICAgICAgICAgICAgICAkbWRUb2FzdC5zaW1wbGUoKVxuICAgICAgICAgICAgICAgICAgICAudGV4dENvbnRlbnQoJ0V2ZW50IERlbGV0ZWQhJylcbiAgICAgICAgICAgICAgICAgICAgLnBvc2l0aW9uKCd0b3AgcmlnaHQnKVxuICAgICAgICAgICAgICAgICAgICAuaGlkZURlbGF5KDMwMDApXG4gICAgICAgICAgICApO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93UmVtb3ZlR3Vlc3QgPSBmdW5jdGlvbiAoZXYsIGV2ZW50LCBndWVzdClcbiAgICAgICAge1xuICAgICAgICAgICAgLy8gQXBwZW5kaW5nIGRpYWxvZyB0byBkb2N1bWVudC5ib2R5IHRvIGNvdmVyIHNpZGVuYXYgaW4gZG9jcyBhcHBcbiAgICAgICAgICAgIHZhciBjb25maXJtICAgICA9ICRtZERpYWxvZy5jb25maXJtKClcbiAgICAgICAgICAgICAgICAudGl0bGUoJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byByZW1vdmUgdGhpcyBndWVzdD8nKVxuICAgICAgICAgICAgICAgIC50ZXh0Q29udGVudCgnVGhpcyBhY3Rpb24gY2Fubm90IGJlIHVuZG9uZS4nKVxuICAgICAgICAgICAgICAgIC5hcmlhTGFiZWwoJ1JlbW92ZSBHdWVzdCcpXG4gICAgICAgICAgICAgICAgLnRhcmdldEV2ZW50KGV2KVxuICAgICAgICAgICAgICAgIC5vaygnWWVzJylcbiAgICAgICAgICAgICAgICAuY2FuY2VsKCdVbmRvJyk7XG5cbiAgICAgICAgICAgICRtZERpYWxvZy5zaG93KGNvbmZpcm0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gdmFyIGd1ZXN0SW5kZXggID0gJHNjb3BlLmd1ZXN0cy5tYXAoZnVuY3Rpb24gKGUpIHtyZXR1cm4gZS5pZDsgfSkuaW5kZXhPZihndWVzdC5pZCk7XG4gICAgICAgICAgICAgICAgdmFyIGd1ZXN0SW5kZXggID0gJHNjb3BlLmN1cnJlbnRHdWVzdHMuaW5kZXhPZihndWVzdCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZ3Vlc3RJbmRleCAhPT0gLTEpIHtcblxuICAgICAgICAgICAgICAgICAgICBHdWVzdHMucmVtb3ZlKHtldmVudFNsdWc6IGV2ZW50LnNsdWcsIGd1ZXN0SWQ6IGd1ZXN0LmlkLCBkYXRhOiAncmVtb3ZlJ30sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50RXZlbnQuZ3Vlc3RfY291bnQgPSAkc2NvcGUuY3VycmVudEd1ZXN0cy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcblxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEd1ZXN0cy5zcGxpY2UoZ3Vlc3RJbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc2hvd0d1ZXN0UmVtb3ZlZCgpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3RhdHVzICAgICAgID0gJ0d1ZXN0IFJlbW92ZWQuJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS5zaG93R3Vlc3RSZW1vdmVkID0gZnVuY3Rpb24oKVxuICAgICAgICB7XG4gICAgICAgICAgICAkbWRUb2FzdC5zaG93KFxuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNpbXBsZSgpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0Q29udGVudCgnR3Vlc3QgUmVtb3ZlZCEnKVxuICAgICAgICAgICAgICAgICAgICAucG9zaXRpb24oJ3RvcCByaWdodCcpXG4gICAgICAgICAgICAgICAgICAgIC5oaWRlRGVsYXkoMzAwMClcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdldEV2ZW50R3Vlc3RSZXBlYXRlckhlaWdodCA9IGZ1bmN0aW9uKClcbiAgICAgICAge1xuXG4gICAgICAgICAgICB3aW5kb3dIZWlnaHQgICAgICAgID0gJHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgICAgIG5hdkJhckhlaWdodCAgICAgICAgPSAkKCcjbmF2YmFyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG4gICAgICAgICAgICBldmVudEhlYWRlckhlaWdodCAgID0gJCgnI2V2ZW50SGVhZGVyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG5cbiAgICAgICAgICAgIGxpc3RIZWlnaHQgICAgICAgICAgPSB3aW5kb3dIZWlnaHQgLSBuYXZCYXJIZWlnaHQgLSBldmVudEhlYWRlckhlaWdodCAtIDEwO1xuXG4gICAgICAgICAgICByZXR1cm4ge2hlaWdodDogJycgKyBsaXN0SGVpZ2h0ICsgJ3B4J307XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdldEV2ZW50UmVwZWF0ZXJIZWlnaHQgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG5cbiAgICAgICAgICAgIHdpbmRvd0hlaWdodCAgICAgICAgICAgID0gJHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgICAgIG5hdkJhckhlaWdodCAgICAgICAgICAgID0gJCgnI25hdmJhcicpLm91dGVySGVpZ2h0KHRydWUpO1xuICAgICAgICAgICAgZXZlbnRTZWFyY2hCYXJIZWlnaHQgICAgPSAkKCcjZXZlbnRTZWFyY2hCYXInKS5vdXRlckhlaWdodCh0cnVlKTtcblxuICAgICAgICAgICAgbGlzdEhlaWdodCAgICAgICAgICAgICAgPSB3aW5kb3dIZWlnaHQgLSBuYXZCYXJIZWlnaHQgLSBldmVudFNlYXJjaEJhckhlaWdodCAtIDEwO1xuXG4gICAgICAgICAgICByZXR1cm4ge2hlaWdodDogJycgKyBsaXN0SGVpZ2h0ICsgJ3B4J307XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLnNob3dFdmVudExpc3RNb2JpbGUgPSBmdW5jdGlvbiAoKVxuICAgICAgICB7XG4gICAgICAgICAgICByZXR1cm4gISRzY29wZS5jdXJyZW50RXZlbnQgfHwgJG1kTWVkaWEoJ2d0LXNtJyk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuc2hvd0d1ZXN0TGlzdE1vYmlsZSA9IGZ1bmN0aW9uICgpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUuY3VycmVudEV2ZW50IHx8ICRtZE1lZGlhKCdndC1zbScpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmV2ZW50U29ydENvbXBhcmF0b3IgPSBmdW5jdGlvbiAoZXZlbnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHN3aXRjaCAoJHNjb3BlLnNvcnRFdmVudCkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2RhdGUnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQuZGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICduYW1lJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50Lm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgLy8gdXBjb21pbmcgLyBwYXN0IHNvcnRcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnVwY29taW5nX2luZGV4ID49IDAgPyBldmVudC51cGNvbWluZ19pbmRleCA6ICgtMSkgKiBldmVudC51cGNvbWluZ19pbmRleCArICRzY29wZS5ldmVudHMubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLmRvd25sb2FkR3Vlc3RzQ3N2ID0gZnVuY3Rpb24gKGV2ZW50KVxuICAgICAgICB7XG4gICAgICAgICAgICBFdmVudHMuZ2V0KHtldmVudFNsdWc6IGV2ZW50LnNsdWcsIGRhdGE6ICdndWVzdHMnLCBjc3Y6IDF9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlsZSA9IG5ldyBCbG9iKFsgcmVzdWx0LmRhdGEgXSwge1xuICAgICAgICAgICAgICAgICAgICB0eXBlIDogJ2FwcGxpY2F0aW9uL2NzdidcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vdHJpY2sgdG8gZG93bmxvYWQgc3RvcmUgYSBmaWxlIGhhdmluZyBpdHMgVVJMXG4gICAgICAgICAgICAgICAgdmFyIGZpbGVVUkwgICAgID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgICAgICB2YXIgYSAgICAgICAgICAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgICAgICAgICAgYS5ocmVmICAgICAgICAgID0gZmlsZVVSTDtcbiAgICAgICAgICAgICAgICBhLnRhcmdldCAgICAgICAgPSAnX2JsYW5rJztcbiAgICAgICAgICAgICAgICBhLmRvd25sb2FkICAgICAgPSBldmVudC5zbHVnICsnX2d1ZXN0cy5jc3YnO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYSk7XG4gICAgICAgICAgICAgICAgYS5jbGljaygpO1xuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgJHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBvblJlc2l6ZSk7XG5cbiAgICAgICAgZnVuY3Rpb24gb25SZXNpemUoKVxuICAgICAgICB7XG4gICAgICAgICAgICAkc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLiRvbignc3RvcmVFdmVudCcsIGZ1bmN0aW9uIChldmVudCkge1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mICRzY29wZS5jdXJyZW50RXZlbnQudGltZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YgJHNjb3BlLmN1cnJlbnRFdmVudC5kYXRlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudC5kYXRlLnNldEhvdXJzKCRzY29wZS5jdXJyZW50RXZlbnQudGltZS5nZXRIb3VycygpKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEV2ZW50LmRhdGUuc2V0TWludXRlcygkc2NvcGUuY3VycmVudEV2ZW50LnRpbWUuZ2V0TWludXRlcygpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudC5kYXRlX2Zvcm1hdHRlZCAgPSBtb21lbnQoJHNjb3BlLmN1cnJlbnRFdmVudC5kYXRlKS5mb3JtYXQoJ0REL01NL1lZIEhIOm1tJyk7XG5cbiAgICAgICAgICAgIEV2ZW50cy5zdG9yZSh7ZXZlbnQ6ICRzY29wZS5jdXJyZW50RXZlbnR9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgZXZlbnQgICAgICAgICAgID0gcmVzdWx0LmRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50SW5kZXggICAgICA9ICRzY29wZS5ldmVudHMubWFwKGZ1bmN0aW9uIChlKSB7cmV0dXJuIGUuaWQ7IH0pLmluZGV4T2YoZXZlbnQuaWQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50SW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGV2ZW50IG5vdCBvbiBsaXN0LCBjcmVhdGluZyBlbnRyeVxuICAgICAgICAgICAgICAgICAgICB2YXIgZXZlbnREYXRhICAgICAgICAgICA9IChKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGV2ZW50KSkpO1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZXZlbnRzLnVuc2hpZnQoZXZlbnREYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgPSBldmVudERhdGE7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBlcnJvciB0cmVhdG1lbnRcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkVycm9yIGNyZWF0aW5nIGV2ZW50IVwiKVxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiRvbignY2hlY2tJbkV2ZW50JywgZnVuY3Rpb24oZXYsIGRhdGEpIHtcblxuICAgICAgICAgICAgdmFyIGV2ZW50ICAgPSBkYXRhLmV2ZW50O1xuICAgICAgICAgICAgdmFyIGd1ZXN0ICAgPSBkYXRhLmd1ZXN0O1xuXG4gICAgICAgICAgICAkc2NvcGUuY2hlY2tJbkd1ZXN0KGV2ZW50LCBndWVzdCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7IHJldHVybiAkbG9jYXRpb24uc2VhcmNoKCkgfSwgZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrQ3VycmVudEV2ZW50KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLiRvbignb3BlbkV2ZW50RGlhbG9nJywgZnVuY3Rpb24gKGV2ZW50LCBkYXRhKSB7XG4gICAgICAgICAgICAkc2NvcGUub3BlbkV2ZW50RGlhbG9nKGRhdGEuZXZlbnQsIGRhdGEubmV3RXZlbnQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBFdmVudHMuZ2V0KGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgJHNjb3BlLmV2ZW50cyAgID0gcmVzdWx0LmRhdGE7XG5cbiAgICAgICAgICAgIC8vIFRPRE8gaW1wcm92ZSB0aGlzXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goJHNjb3BlLmV2ZW50cywgZnVuY3Rpb24gKGV2ZW50LCBrZXkpIHtcblxuICAgICAgICAgICAgICAgIGRhdGUgICAgICAgICAgICAgICAgICAgICAgICA9IG1vbWVudCgkc2NvcGUuZXZlbnRzW2tleV0uZGF0ZS5kYXRlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZXZlbnRzW2tleV0uZGF0ZSAgICAgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZXZlbnRzW2tleV0udGltZSAgICAgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkc2NvcGUuY2hlY2tDdXJyZW50RXZlbnQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHNjb3BlLmxvYWRpbmdHdWVzdHMgICAgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLnNvcnRFdmVudCAgICAgICAgPSAndXBjb21pbmcnO1xuICAgIH0pXG5cbiAgICAuY29udHJvbGxlcignR3Vlc3RDb250cm9sbGVyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRzY29wZSwgJGh0dHAsICRzdGF0ZVBhcmFtcywgJGxvY2F0aW9uLCAkbWREaWFsb2csICRtZFRvYXN0LCAkd2luZG93LCBBUElfVVJMLCBFdmVudHMsIEd1ZXN0cywgR3Vlc3RzU2VydmljZSwgVXNlcnNTZXJ2aWNlKSB7XG5cbiAgICAgICAgJHNjb3BlLm9wZW5HdWVzdEVkaXREaWFsb2cgPSBmdW5jdGlvbiAoJGV2ZW50LCBlZGl0TW9kZSwgZ3Vlc3QpXG4gICAgICAgIHtcbiAgICAgICAgICAgICRzY29wZS5lZGl0TW9kZSAgICAgICAgICAgICA9IGVkaXRNb2RlO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBndWVzdCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgICAgID0gZ3Vlc3Q7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgICAgID0ge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRtZERpYWxvZy5zaG93KHtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBEaWFsb2dDb250cm9sbGVyLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ2N0cmwnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnLi92aWV3cy9hcHAvdmlld3MvZGlhbG9nX2VkaXRfZ3Vlc3QuaHRtbCcsXG4gICAgICAgICAgICAgICAgbG9jYWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0czogJHNjb3BlLmd1ZXN0cyxcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEV2ZW50OiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50R3Vlc3Q6ICRzY29wZS5jdXJyZW50R3Vlc3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5ib2R5KSxcbiAgICAgICAgICAgICAgICBzY29wZTogJHNjb3BlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlU2NvcGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdGFyZ2V0RXZlbnQ6ICRldmVudCxcbiAgICAgICAgICAgICAgICBjbGlja091dHNpZGVUb0Nsb3NlOnRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLnNob3dEZWxldGVHdWVzdCA9IGZ1bmN0aW9uIChldiwgZ3Vlc3QpIHtcbiAgICAgICAgICAgIC8vIEFwcGVuZGluZyBkaWFsb2cgdG8gZG9jdW1lbnQuYm9keSB0byBjb3ZlciBzaWRlbmF2IGluIGRvY3MgYXBwXG4gICAgICAgICAgICB2YXIgY29uZmlybSAgICAgPSAkbWREaWFsb2cuY29uZmlybSgpXG4gICAgICAgICAgICAgICAgLnRpdGxlKCdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgZ3Vlc3Q/JylcbiAgICAgICAgICAgICAgICAudGV4dENvbnRlbnQoJ1RoaXMgYWN0aW9uIGNhbm5vdCBiZSB1bmRvbmUuJylcbiAgICAgICAgICAgICAgICAuYXJpYUxhYmVsKCdEZWxldGUgR3Vlc3QnKVxuICAgICAgICAgICAgICAgIC50YXJnZXRFdmVudChldilcbiAgICAgICAgICAgICAgICAub2soJ1llcycpXG4gICAgICAgICAgICAgICAgLmNhbmNlbCgnVW5kbycpO1xuXG4gICAgICAgICAgICAkbWREaWFsb2cuc2hvdyhjb25maXJtKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5ndWVzdHMubWFwKGZ1bmN0aW9uIChlKSB7cmV0dXJuIGUuaWQ7IH0pLmluZGV4T2YoZ3Vlc3QuaWQpO1xuICAgICAgICAgICAgICAgIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5ndWVzdHMuaW5kZXhPZihndWVzdCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZ3Vlc3RJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmd1ZXN0cy5zcGxpY2UoZ3Vlc3RJbmRleCwgMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgR3Vlc3RzLmRlbGV0ZSh7Z3Vlc3RJZDogZ3Vlc3QuaWR9KTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRHdWVzdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5zaG93R3Vlc3REZWxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5kaWFsb2dTdGF0dXMgPSAnR3Vlc3QgRGVsZXRlZC4nO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS5zaG93R3Vlc3REZWxldGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkbWRUb2FzdC5zaG93KFxuICAgICAgICAgICAgICAgICRtZFRvYXN0LnNpbXBsZSgpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0Q29udGVudCgnR3Vlc3QgRGVsZXRlZCEnKVxuICAgICAgICAgICAgICAgICAgICAucG9zaXRpb24oJ3RvcCByaWdodCcpXG4gICAgICAgICAgICAgICAgICAgIC5oaWRlRGVsYXkoMzAwMClcbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgJHNjb3BlLmdldEd1ZXN0UmVwZWF0ZXJIZWlnaHQgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgd2luZG93SGVpZ2h0ICAgICAgICAgICAgPSAkd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICAgICAgbmF2QmFySGVpZ2h0ICAgICAgICAgICAgPSAkKCcjbmF2YmFyJykub3V0ZXJIZWlnaHQodHJ1ZSk7XG4gICAgICAgICAgICBndWVzdExpc3RIZWFkZXJIZWlnaHQgICA9ICQoJyNndWVzdExpc3RIZWFkZXInKS5vdXRlckhlaWdodCh0cnVlKTtcbiAgICAgICAgICAgIGd1ZXN0VGFibGVIZWFkZXJIZWlnaHQgID0gJCgnI2d1ZXN0VGFibGVIZWFkZXInKS5vdXRlckhlaWdodCh0cnVlKTtcblxuICAgICAgICAgICAgbGlzdEhlaWdodCAgICAgICAgICAgICAgPSB3aW5kb3dIZWlnaHQgLSBuYXZCYXJIZWlnaHQgLSBndWVzdExpc3RIZWFkZXJIZWlnaHQgLSBndWVzdFRhYmxlSGVhZGVySGVpZ2h0IC0gMTA7XG5cbiAgICAgICAgICAgIHJldHVybiB7aGVpZ2h0OiAnJyArIGxpc3RIZWlnaHQgKyAncHgnfTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuc29ydEd1ZXN0cyAgID0gZnVuY3Rpb24gKHNvcnQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmIChzb3J0ID09PSAkc2NvcGUuc29ydEd1ZXN0KSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRHdWVzdFJldmVyc2UgICAgID0gISRzY29wZS5zb3J0R3Vlc3RSZXZlcnNlO1xuICAgICAgICAgICAgICAgICRzY29wZS5zb3J0R3Vlc3QgICAgICAgICAgICA9ICRzY29wZS5zb3J0R3Vlc3RSZXZlcnNlID09PSBmYWxzZSA/IG51bGwgOiAkc2NvcGUuc29ydEd1ZXN0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuc29ydEd1ZXN0ICAgICAgICAgICAgPSBzb3J0O1xuICAgICAgICAgICAgICAgICRzY29wZS5zb3J0R3Vlc3RSZXZlcnNlICAgICA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUuc29ydEljb24gICAgICAgICAgICAgICAgID0gJHNjb3BlLnNvcnRHdWVzdFJldmVyc2UgPyAnYXJyb3dfZHJvcF9kb3duJyA6ICdhcnJvd19kcm9wX3VwJztcblxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuXG4gICAgICAgICR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgb25SZXNpemUpO1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uUmVzaXplKCkge1xuICAgICAgICAgICAgJHNjb3BlLiRkaWdlc3QoKTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kb24oJ3N0b3JlR3Vlc3QnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblxuICAgICAgICAgICAgR3Vlc3RzLnN0b3JlKHtndWVzdDogJHNjb3BlLmN1cnJlbnRHdWVzdH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcblxuICAgICAgICAgICAgICAgIHZhciBndWVzdCAgICAgICA9IHJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgIHZhciBndWVzdEluZGV4ICA9ICRzY29wZS5ndWVzdHMubWFwKGZ1bmN0aW9uIChnKSB7cmV0dXJuIGcuaWQ7IH0pLmluZGV4T2YoZ3Vlc3QuaWQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGd1ZXN0SW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGd1ZXN0IG5vdCBvbiBsaXN0LCBjcmVhdGluZyBlbnRyeVxuICAgICAgICAgICAgICAgICAgICB2YXIgZ3Vlc3REYXRhICAgICAgID0gKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZ3Vlc3QpKSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ndWVzdHMudW5zaGlmdChndWVzdERhdGEpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gZXJyb3IgdHJlYXRtZW50XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJFcnJvciBjcmVhdGluZyBndWVzdCFcIilcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplKTtcbiAgICAgICAgfSk7XG4gICAgfSlcblxuICAgIC5jb250cm9sbGVyKCdOYXZCYXJDb250cm9sbGVyJywgZnVuY3Rpb24gKCR0aW1lb3V0LCAkcSwgJHJvb3RTY29wZSwgJHNjb3BlKSB7XG5cbiAgICB9KTtcblxuICAgIC8vIFRPRE8gcHV0IHRoaXMgb24gYSBqcyBmaWxlXG4gICAgZnVuY3Rpb24gRGlhbG9nQ29udHJvbGxlciAoJHRpbWVvdXQsICRxLCAkcm9vdFNjb3BlLCAkc2NvcGUsICRtZERpYWxvZywgRXZlbnRzLCBndWVzdHMsIGN1cnJlbnRFdmVudCwgY3VycmVudEd1ZXN0KSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkc2NvcGUuYWxsR3Vlc3RzICAgICAgICA9IGd1ZXN0cztcbiAgICAgICAgJHNjb3BlLmN1cnJlbnRFdmVudCAgICAgPSBjdXJyZW50RXZlbnQ7XG4gICAgICAgICRzY29wZS5jdXJyZW50R3Vlc3QgICAgID0gY3VycmVudEd1ZXN0O1xuICAgICAgICAkc2NvcGUuY2hlY2tJblN0YXR1cyAgICA9IG51bGw7XG5cbiAgICAgICAgJHNjb3BlLnNlYXJjaEd1ZXN0cyA9IGZ1bmN0aW9uIChzZWFyY2hLZXkpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuYWxsR3Vlc3RzID09PSBudWxsIHx8IHR5cGVvZiAkc2NvcGUuYWxsR3Vlc3RzID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVE9ETyBwdXQgdGhpcyB0byBmdW5jdGlvblxuICAgICAgICAgICAgc2VhcmNoS2V5Tm9ybWFsaXplZCA9IHNlYXJjaEtleS5yZXBsYWNlKC9bw6HDoMOjw6LDpF0vZ2ksXCJhXCIpLnJlcGxhY2UoL1vDqcOowqjDql0vZ2ksXCJlXCIpLnJlcGxhY2UoL1vDrcOsw6/Drl0vZ2ksXCJpXCIpLnJlcGxhY2UoL1vDs8Oyw7bDtMO1XS9naSxcIm9cIikucmVwbGFjZSgvW8O6w7nDvMO7XS9naSwgXCJ1XCIpLnJlcGxhY2UoL1vDp10vZ2ksIFwiY1wiKS5yZXBsYWNlKC9bw7FdL2dpLCBcIm5cIik7XG5cbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2VhcmNoaW5nIGd1ZXN0cyB3aXRoIFwiICsgc2VhcmNoS2V5Tm9ybWFsaXplZCk7XG4gICAgICAgICAgICBndWVzdHMgICAgICAgICAgICAgID0gJHNjb3BlLmFsbEd1ZXN0cy5maWx0ZXIoZnVuY3Rpb24gKGd1ZXN0KSB7XG5cbiAgICAgICAgICAgICAgICAvLyBUT0RPIHB1dCB0aGlzIHRvIGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgZ3Vlc3ROYW1lTm9ybWFsaXplZCAgICAgICAgID0gZ3Vlc3QubmFtZS5yZXBsYWNlKC9bw6HDoMOjw6LDpF0vZ2ksXCJhXCIpLnJlcGxhY2UoL1vDqcOowqjDql0vZ2ksXCJlXCIpLnJlcGxhY2UoL1vDrcOsw6/Drl0vZ2ksXCJpXCIpLnJlcGxhY2UoL1vDs8Oyw7bDtMO1XS9naSxcIm9cIikucmVwbGFjZSgvW8O6w7nDvMO7XS9naSwgXCJ1XCIpLnJlcGxhY2UoL1vDp10vZ2ksIFwiY1wiKS5yZXBsYWNlKC9bw7FdL2dpLCBcIm5cIik7XG4gICAgICAgICAgICAgICAgZ3Vlc3RTaG9ydE5hbWVOb3JtYWxpemVkICAgID0gZ3Vlc3Quc2hvcnRfbmFtZS5yZXBsYWNlKC9bw6HDoMOjw6LDpF0vZ2ksXCJhXCIpLnJlcGxhY2UoL1vDqcOowqjDql0vZ2ksXCJlXCIpLnJlcGxhY2UoL1vDrcOsw6/Drl0vZ2ksXCJpXCIpLnJlcGxhY2UoL1vDs8Oyw7bDtMO1XS9naSxcIm9cIikucmVwbGFjZSgvW8O6w7nDvMO7XS9naSwgXCJ1XCIpLnJlcGxhY2UoL1vDp10vZ2ksIFwiY1wiKS5yZXBsYWNlKC9bw7FdL2dpLCBcIm5cIik7XG5cblxuICAgICAgICAgICAgICAgIHJldHVybiAoZ3Vlc3QuZW1haWwgJiYgZ3Vlc3QuZW1haWwudG9Mb3dlckNhc2UoKS5pbmRleE9mKHNlYXJjaEtleU5vcm1hbGl6ZWQudG9Mb3dlckNhc2UoKSkgPiAtMSkgfHxcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3ROYW1lTm9ybWFsaXplZC50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoS2V5Tm9ybWFsaXplZC50b0xvd2VyQ2FzZSgpKSA+IC0xIHx8XG4gICAgICAgICAgICAgICAgICAgIChndWVzdC5zbHVnICYmIGd1ZXN0LnNsdWcudG9Mb3dlckNhc2UoKS5pbmRleE9mKHNlYXJjaEtleU5vcm1hbGl6ZWQudG9Mb3dlckNhc2UoKSkgPiAtMSkgfHxcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3RTaG9ydE5hbWVOb3JtYWxpemVkLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihzZWFyY2hLZXlOb3JtYWxpemVkLnRvTG93ZXJDYXNlKCkpID4gLTE7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGd1ZXN0cy5zbGljZSgwLCAxMCk7XG4gICAgICAgIH1cblxuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRJdGVtQ2hhbmdlID0gZnVuY3Rpb24gKGl0ZW0pXG4gICAgICAgIHtcbiAgICAgICAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRJdGVtID09PSBudWxsIHx8IHR5cGVvZiAkc2NvcGUuc2VsZWN0ZWRJdGVtID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBicm9hZGNhc3RpbmcgZXZlbnQgdG8gZXZlbnRDb250cm9sbGVyXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2NoZWNrSW5FdmVudCcsIHsnZXZlbnQnIDogJHNjb3BlLmN1cnJlbnRFdmVudCwgJ2d1ZXN0JyA6ICRzY29wZS5zZWxlY3RlZEl0ZW19KTtcblxuICAgICAgICAgICAgJHNjb3BlLnNlYXJjaEd1ZXN0ICAgICAgPSBudWxsO1xuICAgICAgICAgICAgJHNjb3BlLmNoZWNrSW5TdGF0dXMgICAgPSAkc2NvcGUuc2VsZWN0ZWRJdGVtLnNob3J0X25hbWUgKyAnIGFkZGVkISc7XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5maW5pc2hFZGl0R3Vlc3QgPSBmdW5jdGlvbiAoJGV2ZW50KSB7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ3N0b3JlR3Vlc3QnKTtcbiAgICAgICAgICAgIHNlbGYuZmluaXNoKCk7XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLmZpbmlzaEVkaXRFdmVudCA9IGZ1bmN0aW9uICgkZXZlbnQpIHtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnc3RvcmVFdmVudCcpO1xuICAgICAgICAgICAgc2VsZi5maW5pc2goKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuY2FuY2VsID0gZnVuY3Rpb24oJGV2ZW50KSB7XG4gICAgICAgICAgICAkbWREaWFsb2cuY2FuY2VsKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2VsZi5maW5pc2ggPSBmdW5jdGlvbigkZXZlbnQpIHtcbiAgICAgICAgICAgICRtZERpYWxvZy5oaWRlKCk7XG4gICAgICAgIH07XG4gICAgfVxuIiwiYW5ndWxhci5tb2R1bGUoJ2NoZWNrSW5NYW5hZ2VyLnNlcnZpY2VzJywgWyduZ1Jlc291cmNlJ10pXG5cbiAgICAuZmFjdG9yeSgnQXV0aCcsIGZ1bmN0aW9uICgkaHR0cCwgJGxvY2FsU3RvcmFnZSwgQVBJX1VSTCkge1xuICAgICAgICBmdW5jdGlvbiB1cmxCYXNlNjREZWNvZGUoc3RyKSB7XG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gc3RyLnJlcGxhY2UoJy0nLCAnKycpLnJlcGxhY2UoJ18nLCAnLycpO1xuICAgICAgICAgICAgc3dpdGNoIChvdXRwdXQubGVuZ3RoICUgNCkge1xuICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQgKz0gJz09JztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgICBvdXRwdXQgKz0gJz0nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnSWxsZWdhbCBiYXNlNjR1cmwgc3RyaW5nISc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gd2luZG93LmF0b2Iob3V0cHV0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldENsYWltc0Zyb21Ub2tlbigpIHtcbiAgICAgICAgICAgIHZhciB0b2tlbiA9ICRsb2NhbFN0b3JhZ2UudG9rZW47XG4gICAgICAgICAgICB2YXIgdXNlciA9IHt9O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICB2YXIgZW5jb2RlZCA9IHRva2VuLnNwbGl0KCcuJylbMV07XG4gICAgICAgICAgICAgICAgdXNlciA9IEpTT04ucGFyc2UodXJsQmFzZTY0RGVjb2RlKGVuY29kZWQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRva2VuQ2xhaW1zID0gZ2V0Q2xhaW1zRnJvbVRva2VuKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNpZ251cDogZnVuY3Rpb24gKGRhdGEsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgICAgICAgICAgICAgJGh0dHAucG9zdChBUElfVVJMICsgJ3VzZXJzL3NpZ251cCcsIGRhdGEpLnN1Y2Nlc3Moc3VjY2VzcykuZXJyb3IoZXJyb3IpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2lnbmluOiBmdW5jdGlvbiAoZGF0YSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAkaHR0cC5wb3N0KEFQSV9VUkwgKyAndXNlcnMvc2lnbmluJywgZGF0YSkuc3VjY2VzcyhzdWNjZXNzKS5lcnJvcihlcnJvcilcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsb2dvdXQ6IGZ1bmN0aW9uIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgdG9rZW5DbGFpbXMgPSB7fTtcbiAgICAgICAgICAgICAgICBkZWxldGUgJGxvY2FsU3RvcmFnZS50b2tlbjtcbiAgICAgICAgICAgICAgICBzdWNjZXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VG9rZW5DbGFpbXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9rZW5DbGFpbXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSlcblxuICAgIC5mYWN0b3J5KCdFdmVudHMnLCBmdW5jdGlvbiAoJHJlc291cmNlLCBBUElfVVJMKSB7XG4gICAgICAgIHJldHVybiAkcmVzb3VyY2UoQVBJX1VSTCArIFwiZXZlbnRzLzpldmVudFNsdWcvOmRhdGFcIiwge30sIHtcbiAgICAgICAgICAgIGRlbGV0ZToge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwiZXZlbnRzLzpldmVudFNsdWcvZGVsZXRlXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50U2x1ZzogJ0BldmVudFNsdWcnLFxuICAgICAgICAgICAgICAgICAgICBjc3Y6ICdAY3N2JyxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzdG9yZToge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwiZXZlbnRzL3N0b3JlXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50OiAnQGV2ZW50JyxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9KVxuXG4gICAgLmZhY3RvcnkoJ0d1ZXN0cycsIGZ1bmN0aW9uICgkcmVzb3VyY2UsIEFQSV9VUkwpIHtcbiAgICAgICAgcmV0dXJuICRyZXNvdXJjZShBUElfVVJMICsgXCJndWVzdHNcIiwge30sIHtcbiAgICAgICAgICAgIGNoZWNrSW46IHtcbiAgICAgICAgICAgICAgICB1cmw6IEFQSV9VUkwgKyBcImV2ZW50cy86ZXZlbnRTbHVnL2d1ZXN0cy86Z3Vlc3RJZC86ZGF0YVwiLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBldmVudFNsdWc6ICdAZXZlbnRTbHVnJyxcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3RJZDogJ0BndWVzdElkJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ0BkYXRhJyxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICByZW1vdmU6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEFQSV9VUkwgKyBcImV2ZW50cy86ZXZlbnRTbHVnL2d1ZXN0cy86Z3Vlc3RJZC86ZGF0YVwiLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBldmVudFNsdWc6ICdAZXZlbnRTbHVnJyxcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3RJZDogJ0BndWVzdElkJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ0BkYXRhJyxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBkZWxldGU6IHtcbiAgICAgICAgICAgICAgICB1cmw6IEFQSV9VUkwgKyBcImd1ZXN0cy86Z3Vlc3RJZC9kZWxldGVcIixcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgZ3Vlc3RJZDogJ0BndWVzdElkJyxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzdG9yZToge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwiZ3Vlc3RzL3N0b3JlXCIsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGd1ZXN0OiAnQGd1ZXN0JyxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9KVxuXG4gICAgLmZhY3RvcnkoJ1VzZXJzJywgZnVuY3Rpb24gKCRyZXNvdXJjZSwgQVBJX1VSTCkge1xuICAgICAgICByZXR1cm4gJHJlc291cmNlKEFQSV9VUkwgKyBcIm1lXCIsIHt9LCB7XG4gICAgICAgICAgICBtZToge1xuICAgICAgICAgICAgICAgIHVybDogQVBJX1VSTCArIFwibWVcIixcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9KVxuXG4gICAgLnNlcnZpY2UoJ0d1ZXN0c1NlcnZpY2UnLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgR3Vlc3RzKSB7XG5cbiAgICAgICAgdGhpcy5nZXRHdWVzdHMgID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGd1ZXN0cyAgPSBHdWVzdHMuZ2V0KGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGltcHJvdmUgdGhpc1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuZ3Vlc3RzICAgPSByZXN1bHQuZGF0YTtcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiR3Vlc3RzU2VydmljZSA6OiBFcnJvciBnZXR0aW5nIGd1ZXN0cyFcIik7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5nZXRHdWVzdHMoKTtcbiAgICB9KVxuXG4gICAgLnNlcnZpY2UoJ1VzZXJzU2VydmljZScsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBVc2Vycykge1xuXG4gICAgICAgIHRoaXMuZ2V0Q3VycmVudFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdXNlciAgICA9IFVzZXJzLm1lKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIGltcHJvdmUgdGhpc1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuYXV0aFVzZXIgPSByZXN1bHQuZGF0YTtcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiR3Vlc3RzU2VydmljZSA6OiBFcnJvciBnZXR0aW5nIGd1ZXN0cyFcIik7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5nZXRDdXJyZW50VXNlcigpO1xuICAgIH0pO1xuIl19
