(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:StatsCtrl
     * @description
     * # StatsCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('StatsCtrl', function ($rootScope, $window, $scope, $http) {

        $scope.valueMode = "absolute";
        $scope.options = {};
        $scope.data = {};

        $scope.options.industry_abs = {
            chart: {
                type: 'multiBarChart',
                height: 320,
                margin : {
                    top: 20,
                    right: 20,
                    bottom: 45,
                    left: 45
                },
                groupSpacing: 0.5,
                clipEdge: true,
                duration: 500,
                stacked: true,
                xAxis: {
                    axisLabel: 'Industry',
                    rotateLabels: -45,
                    showMaxMin: false
                },
                yAxis: {
                    axisLabel: 'Attendance',
                    axisLabelDistance: -20,
                    tickFormat: function(d){
                        return d3.format(',.1f')(d);
                    }
                }
            }
        };

        $scope.data.industry_abs = [
            {
                "key":"Masters",
                "values":[
                    {
                        "x":'Advisory Services',
                        "y":1.2664003684956475
                    },
                    {
                        "x":'Finance',
                        "y":1.6795513370727713
                    },
                    {
                        "x":'Consulting',
                        "y":2.2921386673207715
                    },
                    {
                        "x":'Consumer Goods',
                        "y":2.8619498121446107
                    },
                    {
                        "x":'Retail/Distribution',
                        "y":3.5410266547028066
                    },
                    {
                        "x":'Automotive',
                        "y":4.091176894025124
                    },
                    {
                        "x":'Technology',
                        "y":4.551499931914426
                    },
                    {
                        "x":'Other',
                        "y":4.715440921680209
                    },
                    {
                        "x":'Auditing',
                        "y":4.675852604493229
                    },
                    {
                        "x":'Leadership',
                        "y":4.484398210964935
                    }
                ]
            },
            {
                "key":"Bachelor",
                "values":[
                    {
                        "x":'Advisory Services',
                        "y":0.12021273793676855
                    },
                    {
                        "x":'Finance',
                        "y":0.13768817009214815
                    },
                    {
                        "x":'Consulting',
                        "y":0.12204452110121121
                    },
                    {
                        "x":'Consumer Goods',
                        "y":0.12054993382778627
                    },
                    {
                        "x":'Retail/Distribution',
                        "y":0.18426879292854415
                    },
                    {
                        "x":'Automotive',
                        "y":0.17527175080936921
                    },
                    {
                        "x":'Technology',
                        "y":0.1384873449919697
                    },
                    {
                        "x":'Other',
                        "y":0.13694225819915642
                    },
                    {
                        "x":'Auditing',
                        "y":0.18711117296005494
                    },
                    {
                        "x":'Leadership',
                        "y":0.18954643407168156
                    }
                ]
            },
            {
                "key":"Other",
                "values":[
                    {
                        "x":'Advisory Services',
                        "y":0.1387871281835065
                    },
                    {
                        "x":'Finance',
                        "y":0.18212354479384876
                    },
                    {
                        "x":'Consulting',
                        "y":0.16845584598910426
                    },
                    {
                        "x":'Consumer Goods',
                        "y":0.17614274374453373
                    },
                    {
                        "x":'Retail/Distribution',
                        "y":0.15998712084908245
                    },
                    {
                        "x":'Automotive',
                        "y":0.15676179440625723
                    },
                    {
                        "x":'Technology',
                        "y":0.1746058890227924
                    },
                    {
                        "x":'Other',
                        "y":0.17364961027332312
                    },
                    {
                        "x":'Auditing',
                        "y":0.15354579937776675
                    },
                    {
                        "x":'Leadership',
                        "y":0.1247761751552973
                    }
                ]
            }
        ]

        $scope.options.industry_percentage = {
            chart: {
                type: 'pieChart',
                height: 320,
                x: function(d){return d.key;},
                y: function(d){return d.y;},
                showLabels: true,
                labelSunbeamLayout: false,
                donut: true,
                donutRatio: 0.35,
                labelType: "percent",
                duration: 500,
                labelThreshold: 0.01,
                legend: {
                    margin: {
                        top: 5,
                        right: 35,
                        bottom: 5,
                        left: 0
                    }
                }
            }
        };

        $scope.data.industry_percentage = [
            {
                "key":'Advisory Services',
                "y":0.1387871281835065
            },
            {
                "key":'Finance',
                "y":0.18212354479384876
            },
            {
                "key":'Consulting',
                "y":0.16845584598910426
            },
            {
                "key":'Consumer Goods',
                "y":0.17614274374453373
            },
            {
                "key":'Retail/Distribution',
                "y":0.15998712084908245
            },
            {
                "key":'Automotive',
                "y":0.15676179440625723
            },
            {
                "key":'Technology',
                "y":0.1746058890227924
            },
            {
                "key":'Other',
                "y":0.17364961027332312
            },
            {
                "key":'Auditing',
                "y":0.15354579937776675
            },
            {
                "key":'Leadership',
                "y":0.1247761751552973
            }
        ];

        $scope.options.time = {
            chart: {
                type: 'lineChart',
                height: 450,
                margin : {
                    top: 20,
                    right: 20,
                    bottom: 40,
                    left: 55
                },
                x: function(d){ console.log(d); return d.x; },
                y: function(d){ console.log(d); return d.y; },
                useInteractiveGuideline: true,
                xAxis: {
                    axisLabel: 'Date',
                    // rotateLabels: -45,
                    tickFormat: function(d){
                        return d3.time.format('%B %Y')(new Date(d))
                    }
                },
                yAxis: {
                    axisLabel: 'Attendance',
                    axisLabelDistance: -10
                }
            }
        };

        $scope.data.time = [
            {
                values: [{"x": 1472688000000, "y": 400}, {"x": 1475280000000, "y": 300}, {"x": 1477958400000, "y": 128}, {"x": 1480550400000, "y": 333}, {"x": 1485907200000, "y": 520}, {"x": 1488326400000, "y": 400}],      //values - represents the array of {x,y} data points
                key: 'Masters', //key  - the name of the series.
                color: '#ff7f0e',  //color - optional: choose your own line color.
                strokeWidth: 2,
                area: true      //area - set to true if you want this line to turn into a filled area chart.
            },
            {
                values: [{"x": 1472688000000, "y": 132}, {"x": 1475280000000, "y": 221}, {"x": 1477958400000, "y": 60}, {"x": 1480550400000, "y": 120}, {"x": 1485907200000, "y": 400}, {"x": 1488326400000, "y": 200}],      //values - represents the array of {x,y} data points
                key: 'Bachelor',
                color: '#2ca02c',
                area: true      //area - set to true if you want this line to turn into a filled area chart.
            },
            {
                values: [{"x": 1472688000000, "y": 32}, {"x": 1475280000000, "y": 21}, {"x": 1477958400000, "y": 10}, {"x": 1480550400000, "y": 12}, {"x": 1485907200000, "y": 40}, {"x": 1488326400000, "y": 20}],      //values - represents the array of {x,y} data points
                key: 'Other',
                color: '#7777ff',
                area: true      //area - set to true if you want this line to turn into a filled area chart.
            }
        ];

        $scope.options.countries = {
            chart: {
                type: 'pieChart',
                height: 320,
                x: function(d){return d.key;},
                y: function(d){return d.y;},
                showLabels: true,
                labelSunbeamLayout: false,
                donut: false,
                labelType: "percent",
                duration: 500,
                labelThreshold: 0.01,
                legend: {
                    margin: {
                        top: 5,
                        right: 35,
                        bottom: 5,
                        left: 0
                    }
                }
            }
        };

        $scope.data.countries = [
            {
                "key":'Portugal',
                "y":0.8387871281835065
            },
            {
                "key":'Germany',
                "y":0.28212354479384876
            },
            {
                "key":'Brasil',
                "y":0.16845584598910426
            },
            {
                "key":'China',
                "y":0.17614274374453373
            },
            {
                "key":'France',
                "y":0.15998712084908245
            },
            {
                "key":'Thailand',
                "y":0.15676179440625723
            },
            {
                "key":'Spain',
                "y":0.1746058890227924
            },
            {
                "key":'Great Britain',
                "y":0.17364961027332312
            },
            {
                "key":'Other',
                "y":0.35354579937776675
            }
        ];

    });

})();
