angular.module('checkInManager.services', ['ngResource'])

    .factory('Auth', function ($http, $localStorage, API_URL) {
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
    })

    .factory('Events', function ($resource, API_URL) {
        return $resource(API_URL + "events/:eventSlug/:data", {}, {
            delete: {
                url: API_URL + "events/:eventSlug/delete",
                method: 'POST',
                params: {
                    eventSlug: '@eventSlug',
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
    })

    .factory('Guests', function ($resource, API_URL) {
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
    })

    .factory('Users', function ($resource, API_URL) {
        return $resource(API_URL + "me", {}, {
            me: {
                url: API_URL + "me",
                method: 'GET'
            },
        });
    })

    .service('GuestsService', function ($rootScope, Guests) {

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
    })

    .service('UsersService', function ($rootScope, Users) {

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
    });
