<!doctype html>
<html lang="en">
<head>
    <title>Check-in Manager</title>
    <!--Import Google Icon Font-->
    <link href="//fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

    <meta charset="utf-8">
    <!--Let browser know website is optimized for mobile-->
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <!-- <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css"> -->
    <!-- <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/materialize/0.97.6/css/materialize.min.css"> -->

    <!-- Angular Material style sheet -->
    <link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/angular_material/1.1.0-rc2/angular-material.min.css">
    <link rel='stylesheet prefetch' href="//fonts.googleapis.com/css?family=Roboto:400,100,100italic,300,300italic,400italic,500,500italic,700,700italic,900,900italic&subset=latin,cyrillic">

    <!-- Custom -->
    <link rel="stylesheet" href="app/css/style.css">
    <link rel="stylesheet" href="//cdn.rawgit.com/alenaksu/mdPickers/0.7.4/dist/mdPickers.min.css">

    <base href="/">
</head>
<body ng-app="checkInManager">
    <!-- jQuery CDN -->
    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>
    <!-- Angular CDNs -->
    <script src="//cdnjs.cloudflare.com/ajax/libs/angular.js/1.5.1/angular.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/angular.js/1.5.1/angular-resource.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/angular.js/1.5.1/angular-animate.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/angular.js/1.5.1/angular-aria.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/angular.js/1.5.1/angular-messages.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/angular-ui-router/0.3.0/angular-ui-router.min.js"></script>

    <!-- angular material -->
    <script src="//ajax.googleapis.com/ajax/libs/angular_material/1.1.0-rc2/angular-material.min.js"></script>

    <!-- custom -->
    <script src="//cdnjs.cloudflare.com/ajax/libs/moment.js/2.13.0/moment.min.js"></script>
    <script src="//cdn.rawgit.com/alenaksu/mdPickers/0.7.4/dist/mdPickers.min.js"></script>


    <!-- app files -->
    <script src="app/app.js"></script>
    <script src="app/controllers/controllers.js"></script>
    <script src="app/services/services.js"></script>

    <div layout="column" layout-fill ui-view></div>

</body>
</html>