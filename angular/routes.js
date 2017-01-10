(function(){
    "use strict";

    angular.module('check_in_app.routes').config(function ($stateProvider, $urlRouterProvider, $httpProvider, $locationProvider) {

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
    });
})();