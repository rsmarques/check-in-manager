(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:UserCtrl
     * @description
     * # UserCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('UserCtrl', function ($rootScope, $scope, $http, $stateParams, $mdDialog, $mdMedia, $mdToast, User, AuthSrv) {

        $scope.openUserEditDialog = function ($event, user)
        {
            $scope.currentUser     = typeof user !== "undefined" ? user : {};

            $mdDialog.show({
                controller: 'DialogCtrl',
                controllerAs: 'ctrl',
                templateUrl: './views/app/dialogs/edit_user.html',
                locals: {
                    guests: null,
                    currentEvent: null,
                    currentGuest: null,
                    currentGuests: null,
                    currentUser: $scope.currentUser,
                },
                parent: angular.element(document.body),
                scope: $scope,
                preserveScope: true,
                targetEvent: $event,
                clickOutsideToClose:true
            });
        };

        $scope.showDeleteUser = function (ev, user) {
            // Appending dialog to document.body to cover sidenav in docs app
            var confirm     = $mdDialog.confirm()
                .title('Are you sure you want to delete this user?')
                .textContent('This action cannot be undone.')
                .ariaLabel('Delete User')
                .targetEvent(ev)
                .ok('Yes')
                .cancel('Undo');

            $mdDialog.show(confirm).then(function() {
                var userIndex  = $scope.users.indexOf(user);

                if (userIndex !== -1) {
                    $scope.users.splice(userIndex, 1);

                    User.delete({userId: user.id});
                    $scope.currentUser = null;
                    $scope.showUserDeleted();
                    $scope.dialogStatus = 'User Deleted.';
                }

            }, function() {

            });
        };

        $scope.showUserDeleted = function() {
            $mdToast.show(
                $mdToast.simple()
                    .textContent('User Deleted!')
                    .position('top right')
                    .hideDelay(3000)
            );
        };

        $scope.$on('storeUser', function (event) {

            User.store({user: $scope.currentUser}, function (result) {

                var user       = result.data;
                var userIndex  = $scope.users.map(function (u) {return u.id; }).indexOf(user.id);

                if (userIndex === -1) {
                    // user not on list, creating entry
                    var userData       = (JSON.parse(JSON.stringify(user)));
                    $scope.users.unshift(userData);
                }

            }, function (err) {
                // TODO error treatment
                // console.log("Error creating user!")
                // console.log(err);
            });
        });

        // getting user data
        User.get(function (result) {
            $scope.users    = result.data;
        }, function (err) {
            // console.log(err);
        });

        // $scope.users = [{email: 'ricardo.ds.marques@gmail.com', admin: true}, {email: 'test.user@gmail.com', admin: false}, {email: 'ricardo@gmail.com', admin: true}, {email: 'bernardo@gmail.com', admin: false}];
    });
})();
