(function() {
    "use strict";
    angular.module('egen-feed')
        .directive('loaderEffect', loaderEffect);

    function loaderEffect() {
        return {
            restrict: 'E',
            templateUrl: 'templates/loader.html'
        };
    }
})();