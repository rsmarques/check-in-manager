angular.module('checkInManager', [

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

    .config(function ($stateProvider, $urlRouterProvider, $httpProvider) {

        $stateProvider

            .state('signup', {
                url: '/',
                templateUrl: './app/views/login.html',
                controller: 'HomeController',
                register: 1
            });
            // .state('signin', {
            //     url: '/signin',
            //     templateUrl: './app/views/login.html',
            //     controller: 'HomeController',
            //     register: 0
            // })
            // .state('guests', {
            //     url: '/guests',
            //     templateUrl: './app/views/guests.html',
            //     controller: 'GuestController'
            // })
            // .state('events', {
            //     url: '/events',
            //     templateUrl: './app/views/events.html',
            //     controller: 'EventListController'
            // });

        $urlRouterProvider.otherwise('/');

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
    })

    .config(function($mdIconProvider) {
        $mdIconProvider.fontSet('md', 'material-icons');
    })

    .config(function($mdThemingProvider) {
        $mdThemingProvider.theme('dark-grey').backgroundPalette('grey').dark();
        $mdThemingProvider.theme('dark-orange').backgroundPalette('orange').dark();
        $mdThemingProvider.theme('dark-purple').backgroundPalette('deep-purple').dark();
        $mdThemingProvider.theme('dark-blue').backgroundPalette('blue').dark();
    });
