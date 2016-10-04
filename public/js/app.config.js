(function() {
    "use strict";
    angular.module('egen-feed')
        .config(config);

    config.$inject = ['$stateProvider', '$locationProvider'];
    /* @ngInject */
    function config($stateProvider, $locationProvider) {
        $locationProvider.html5Mode(true).hashPrefix('!');
        $stateProvider
            .state('welcome', {
                url: '/',
                controller: 'welcomeController',
                controllerAs: 'wCtrl',
                templateUrl: '/templates/welcome.html'
            });
    }
})();