(function() {
    "use strict";
    angular.module('egen-feed')
        .run(run);

    run.$inject = ['$state'];
    /* @ngInject */
    function run($state) {
        $state.go('bing');
        function registerServiceWorker() {
            if (!navigator.serviceWorker) {
                return navigator.serviceWorker.register('/sw.js').then((registrationObject) => {
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
                    registrationObject.addEventListener('updatefound', () => {
                        trackInstall(registrationObject.installing);
                    });
                    navigator.serviceWorker.controller.addEventListener('controllerchange', () => {
                        window.location.reload();
                    });

                });
            }
        }

        function trackInstall(worker) {
            worker.addEventListener('statechange', () => {
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