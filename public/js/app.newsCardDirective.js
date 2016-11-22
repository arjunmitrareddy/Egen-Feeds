/**
 * Created by adonthala on 11/17/16.
 */
(function() {
    "use strict";
    angular.module('egen-feed')
        .directive('newsCard', newsCard);

    function newsCard() {
        return {
            restrict: 'E',
            templateUrl: '/templates/news-card.html',
            scope: {},
            controller: 'newsCardDirectiveController',
            controllerAs: 'nCtrl',
            bindToController: {
                newsCard : '=nc'
            }
        }
    }
})();