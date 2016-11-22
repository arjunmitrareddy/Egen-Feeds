(function() {
    "use strict";
    angular.module('egen-feed')
        .run(run);

    run.$inject = ['$state'];
    /* @ngInject */
    function run($state) {
        $state.go('bing');
    }
})();