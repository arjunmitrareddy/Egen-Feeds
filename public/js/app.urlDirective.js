(function() {
    "use strict";
    angular.module('egen-feed')
        .directive('loader', loader);

    function loader() {
        return {
            restrict: 'E',
            templateUrl: 'templates/page.html',
            scope: {
                url: '@'
            }
        };
    }
})();