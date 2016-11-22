(function() {
    "use strict";
    angular.module('egen-feed')
        .config(config);

    config.$inject = ['$stateProvider', '$locationProvider'];
    /* @ngInject */
    function config($stateProvider, $locationProvider) {
        $locationProvider.html5Mode(true).hashPrefix('!');
        $stateProvider
            .state('bing', {
                url: '/bing',
                controller: 'welcomeController',
                controllerAs: 'wCtrl',
                templateUrl: '/templates/welcome.html'
            })
            .state('webhose', {
                url: '/webhose',
                controller: 'hoseController',
                controllerAs: 'wCtrl',
                templateUrl: '/templates/welcome.html'
            });
    }
})();