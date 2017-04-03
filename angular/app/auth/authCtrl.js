(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:AuthCtrl
     * @description
     * # AuthCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('AuthCtrl', function ($rootScope, $scope, $state, $location, $localStorage, Auth, GuestSrv, AuthSrv) {

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
    });

})();
