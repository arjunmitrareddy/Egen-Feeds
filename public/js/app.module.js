function loadScripts(urls, controller, failure) {
    var count = urls.length;
    var errored = false;

    if (urls.length == 0) return;

    urls.forEach((url) => {
        var script = document.createElement('script');
        script.onload = function() {
            if (errored) return;
            if (!--count) controller();
        };

        script.onerror = function() {
            if (errored) return;
            failure();
            errored = true;
        };
        script.src = url;
        document.head.insertBefore(script, document.head.firstChild);
    });
}
const polyfillsNeeded = [];

if (!('Promise' in self)) polyfillsNeeded.push('/js/polyfills/promise.js');

try {
    new URL('b', 'http://a');
}
catch(e) {
    polyfillsNeeded.push('/js/polyfills/url.js');
}

loadScripts(polyfillsNeeded);

(function() {
    "use strict";
    angular.module('egen-feed',
        [
            'ui.router',
            'ui.bootstrap'
        ]);
})();