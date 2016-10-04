(function() {
    "use strict";
    angular.module('egen-feed')
        .run(run);

    run.$inject = ['$state', '$rootScope'];
    /* @ngInject */
    function run($state, $rootScope) {
        $rootScope.socket = io.connect(location.protocol + "//" + location.host);
        $rootScope.socket.emit('get-tweets');

        function registerServiceWorker() {
            if (!navigator.serviceWorker) {
                return;
            }
            return navigator.serviceWorker.register('/sw.js').then(function(registrationObject) {
                if (!navigator.serviceWorker.controller) {
                    return;
                }
                if (registrationObject.waiting) { //means service worker is ready to be updated
                    update(registrationObject.waiting);
                }
                if (registrationObject.installing) {
                    trackInstall(registrationObject.installing);
                    return;
                }
                registrationObject.addEventListener('updatefound', function() {
                    trackInstall(registrationObject.installing);
                });
                navigator.serviceWorker.controller.addEventListener('controllerchange', function() {
                    window.location.reload();
                });

            });
        }

        function trackInstall(worker) {
            worker.addEventListener('statechange', function() {
                if (worker.state == 'installed') {
                    update(worker);
                }
            })
        }

        function update(worker) {
            worker.postMessage({skipWait: true});
        }

        registerServiceWorker();
    }
})();