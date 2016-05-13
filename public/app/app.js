angular.module('checkInManager', [

    //Dependancies
    // 'ngRoute',   
    'ui.router',
    'checkInManager.controllers',
    'checkInManager.services',
    // 'ngResource'
    // 'ngStorage',
    // 'ui.bootstrap',
    //App
    // 'routes',
    ])

    .constant('API_URL', 'api/v1/')

    .config(function ($stateProvider, $urlRouterProvider) {

        $stateProvider

            .state('home', { 
                url: '/', 
                templateUrl: './app/views/home.html',
                controller: 'EventListController'
            })
            .state('events', { 
                url: '/events', 
                templateUrl: './app/views/events.html',
                controller: 'EventListController'
            })
            .state('event', { 
                url: '/event/:eventId', 
                templateUrl: './app/views/event.html',
                controller: 'EventController'
            });

        $urlRouterProvider.otherwise('/');
    });

    // .config(function ($routeProvider) {

    //     $routeProvider.
    //         when('/', {
    //             templateUrl: './app/views/home.html',
    //         }).
    //         when('/events', {
    //             templateUrl: './app/views/events.html',
    //             controller: 'EventListController'
    //         }).
    //         when('/event/:eventId', {
    //             templateUrl: './app/views/event.html',
    //             controller: 'EventController'
    //         }).
    //         otherwise({
    //             redirectTo: '/'
    //         });
    // });