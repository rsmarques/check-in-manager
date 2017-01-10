(function(){
    "use strict";

    angular.module('check_in_app.config').constant('API_URL', 'api/v1/')

    .config(function($mdIconProvider) {
        $mdIconProvider.fontSet('md', 'material-icons');
    })

    .config(function($mdThemingProvider) {
        $mdThemingProvider.theme('dark-grey').backgroundPalette('grey').dark();
        $mdThemingProvider.theme('dark-orange').backgroundPalette('orange').dark();
        $mdThemingProvider.theme('dark-purple').backgroundPalette('deep-purple').dark();
        $mdThemingProvider.theme('dark-blue').backgroundPalette('blue').dark();
    })

    // TODO temp solution, remove this from here
    .run(function ($rootScope) {

        $rootScope.hasAdminAccess   = function () {
            return $rootScope.authUser ? $rootScope.authUser.admin : 0;
        };
    });

})();