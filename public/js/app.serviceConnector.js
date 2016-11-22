(function () {
    'use strict';

    angular.module('egen-feed')
        .factory('serviceConnectorFactory', serviceConnectorFactory);
    /* @ngInject */
    serviceConnectorFactory.$inject = [
        '$http'
    ];
    function serviceConnectorFactory($http) {
        return {
            get: getHandler,
            post: postHandler
        };
        function getHandler(url, config) {
            return $http.get(url, config)
                .then(function(response) { return response.data})
                .catch(function(err) {console.log(err)});
        }
        function postHandler(url, payload) {
            return $http.post(url, payload)
                .then(function(response) {return response.data})
                .catch(function(err) {console.log(err)});
        }
    }
})();