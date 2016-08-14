angular.module('checkInManager', [

    //Dependancies
    // 'ngRoute',
    'ui.router',
    'checkInManager.controllers',
    'checkInManager.services',
    'ngMaterial',
    'ngMessages',
    'mdPickers',
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
                // controller: 'EventListController'
            })
            .state('guests', {
                url: '/guests',
                templateUrl: './app/views/guests.html',
                controller: 'GuestController'
            })
            .state('events', {
                url: '/events',
                templateUrl: './app/views/events.html',
                controller: 'EventListController'
            });

        $urlRouterProvider.otherwise('/');
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
