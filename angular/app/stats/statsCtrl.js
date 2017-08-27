(function(){
    "use strict";

    /**
     * @ngdoc function
     * @name checkInManager.controller:StatsCtrl
     * @description
     * # StatsCtrl
     * Controller of the checkInManager
     */
    angular.module('check_in_app.controllers').controller('StatsCtrl', function ($rootScope, $window, $scope, $http, Stats) {

        $scope.parseEventStats = function ()
        {
            $scope.data = {};
            $scope.parseIndustryAbsData();
            $scope.parseIndustryPercentageData();
            $scope.parseTimeData();
            $scope.parseCountriesData();
        };

        $scope.parseIndustryAbsData = function ()
        {
            $scope.data.industry_abs = [];

            angular.forEach($scope.eventStats.industries_abs, function (data, key) {

                var index = $scope.data.industry_abs.push({key: key, values: []});
                angular.forEach(data, function (value, key) {
                    if (key === '') return false;
                    $scope.data.industry_abs[index - 1].values.push({x: key, y: value});
                });
            });
        };

        $scope.parseIndustryPercentageData = function ()
        {
            $scope.data.industry_percentage = [];

            angular.forEach($scope.eventStats.industries_percentage, function (value, key) {
                if (key === '') return false;
                $scope.data.industry_percentage.push({key: key, y: value});
            });
        };

        $scope.parseTimeData = function ()
        {
            $scope.data.time = [];

            angular.forEach($scope.eventStats.time, function (data, key) {
                var index = $scope.data.time.push({key: key, values: [], strokeWidth: 2, area: true});
                angular.forEach(data, function (value, key) {
                    if (key === '') return false;
                    $scope.data.time[index - 1].values.push({x: key, y: value});
                });
            });
        };

        $scope.parseCountriesData = function ()
        {
            $scope.data.countries = [];

            angular.forEach($scope.eventStats.countries, function (value, key) {
                if (key === '--' || value === 0) return false;
                $scope.data.countries.push({key: key, y: value});
            });
        };

        $scope.setChartsOptions = function ()
        {
            $scope.options = {};

            $scope.options.industry_abs = {
                chart: {
                    type: 'multiBarChart',
                    height: 300,
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
                    reduceXTicks: false,
                    useInteractiveGuideline: true,
                    xAxis: {
                        rotateLabels: -45,
                        showMaxMin: false
                    },
                    yAxis: {
                        axisLabel: 'Attendance',
                        axisLabelDistance: -20,
                        tickFormat: function(d){
                            return d3.format('d')(d);
                        }
                    }
                }
            };

            $scope.options.industry_percentage = {
                chart: {
                    type: 'pieChart',
                    height: 350,
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

            $scope.options.time = {
                chart: {
                    type: 'lineChart',
                    height: 300,
                    margin : {
                        top: 20,
                        right: 20,
                        bottom: 40,
                        left: 55
                    },
                    x: function(d){ return d.x; },
                    y: function(d){ return d.y; },
                    useInteractiveGuideline: true,
                    xAxis: {
                        axisLabel: 'Date',
                        // rotateLabels: -45,
                        tickFormat: function(d){
                            return d3.time.format('%B %Y')(new Date(Number(d)));
                        }
                    },
                    yAxis: {
                        axisLabel: 'Attendance',
                        axisLabelDistance: -10,
                        tickFormat: function(d){
                            return d3.format('d')(d);
                        }
                    }
                }
            };

            $scope.options.countries = {
                chart: {
                    type: 'pieChart',
                    height: 300,
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
        };

        $scope.getFilters = function ()
        {
            return {
                start_date: $scope.filters.start_date   ? moment($scope.filters.start_date).format('YYYY/MM/DD HH:mm')  : null,
                end_date: $scope.filters.end_date       ? moment($scope.filters.end_date).format('YYYY/MM/DD HH:mm')    : null,
            };
        };

        $scope.dateRangeChanged = function ()
        {
            if ($scope.dateRange.key === 'custom') {
                $scope.filters              = {start_date: null, end_date: null};
                $scope.customRangeActive    = true;
            } else {
                $scope.filters              = {start_date: $scope.dateRange.start_date, end_date: $scope.dateRange.end_date};
                $scope.getStats();
            }
        };

        $scope.setCustomDateRange = function ()
        {
            $scope.customRangeActive        = false;
            $scope.dateRange.description    = ($scope.filters.start_date ? moment($scope.filters.start_date).format('YYYY/MM/DD') : '∞') + ' → ' + ($scope.filters.end_date ? moment($scope.filters.end_date).format('YYYY/MM/DD') : '∞');
            $scope.getStats();
        };

        $scope.getStats = function ()
        {
            Stats.events($scope.getFilters(), function (res) {
                $scope.eventStats = res.data;
                $scope.parseEventStats();
            });

            Stats.global($scope.getFilters(), function (res) {
                $scope.globalStats = res.data;
            });
        };

        $scope.setDefaultDateRangeFilters = function ()
        {
            $scope.dateRanges   = [{key: 'alltime', description: 'All-time'}, {key: 'monthly', description: 'This Month', start_date: moment().startOf('month')._d}, {key: 'yearly', description: 'This Year', start_date: moment().startOf('year')._d}, {key: 'custom', description: 'Pick a date range...'}];
        };

        $scope.downloadStatsCsv = function ()
        {
            Stats.csv($scope.getFilters(), function (res) {

                var file = new Blob([ res.data ], {
                    type : 'application/csv'
                });

                //trick to download store a file having its URL
                var fileURL     = URL.createObjectURL(file);
                var a           = document.createElement('a');
                a.href          = fileURL;
                a.target        = '_blank';
                a.download      = 'stats.csv';
                document.body.appendChild(a);
                a.click();

            }, function (error) {
                // TODO error message
            });
        };

        $scope.setDefaultDateRangeFilters();
        $scope.dateRange    = $scope.dateRanges[0];
        $scope.filters      = {start_date: null, end_date: null};

        $scope.getStats();
        $scope.setChartsOptions();
    });

})();
