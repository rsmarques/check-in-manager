<!doctype html>
<html lang="en" ng-app="checkInManager">
<head>
    <title>Check-in Manager</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css">
    <base href="/">
</head>
<body>

    @include('navBar')
    <div>
        <!-- angular templating -->
        <!-- this is where content will be injected -->
        <div ui-view></div>
    </div>
    <!-- jQuery (necessary for Bootstrap's JavaScript plugins) -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
    <!-- Include all compiled plugins (below), or include individual files as needed -->
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script>

    <script src="<?= asset('app/lib/angular/angular.min.js') ?>"></script>
    <script src="<?= asset('app/lib/angular/angular-route.min.js') ?>"></script>
    <script src="<?= asset('app/lib/angular/angular-resource.min.js') ?>"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/angular-ui-router/0.2.15/angular-ui-router.js"></script>


    <script src="<?= asset('app/app.js') ?>"></script>
    <script src="<?= asset('app/controllers/controllers.js') ?>"></script>
    <script src="<?= asset('app/services/services.js') ?>"></script>

</body>
</html>