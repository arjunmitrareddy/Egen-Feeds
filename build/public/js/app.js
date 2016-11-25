(function() {
    "use strict";
    angular.module('egen-feed',
        [
            'ui.router',
            'ui.bootstrap'
        ]);
})();
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
/**
 * Created by adonthala on 11/22/16.
 */
(function() {
    "use strict";
    angular.module('egen-feed')
        .controller('hoseController', hoseController);

    hoseController.$inject = ['serviceConnectorFactory', '$interval', '$scope', '$timeout'];

    function hoseController(serviceConnectorFactory, $interval, $scope, $timeout) {

        var wCtrl = this;
        wCtrl.articles = null;
        if (localStorage.getItem('webhoseNews')) {
            wCtrl.articles = JSON.parse(localStorage.getItem('webhoseNews'));
        }
        function getNews() {
                var request = {
                    params: {
                        "q": "iot",
                        "token": "32902d09-a4d2-40ff-ab15-3228d81f5a84",
                        "size": 100,
                        "format": "json",
                        "language": "english"
                    }
                };
                if (!localStorage.getItem('webhoseNews') || (new Date().getTime()/1000 - localStorage.webhoseTime > 3600)) {
                    serviceConnectorFactory.get('https://webhose.io/search', request).then((data) => {
                        wCtrl.articles = data.posts;

                        wCtrl.articles = _.map(_.filter(wCtrl.articles, (article) => {
                            return !!article.thread.main_image && !!article.title;
                        }), (article) => {
                            article.image = article.thread.main_image;
                            article.name = article.title;
                            article.description = article.text.split(" ").slice(0, 50).join(" ") + " ...";
                            return article;
                        });
                        console.log(wCtrl.articles);
                        localStorage.setItem("webhoseNews", JSON.stringify(wCtrl.articles));
                        localStorage.webhoseTime = new Date().getTime() / 1000;
                    });
                }
            }
        getNews();
        $interval(getNews, 60 * 60 * 1000);
    }
})();
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
/**
 * Created by adonthala on 11/18/16.
 */
(function() {
    "use strict";
    angular.module('egen-feed')
        .controller('newsCardDirectiveController', newsCardDirectiveController);

    newsCardDirectiveController.$inject = [];

    function newsCardDirectiveController() {
        var nCtrl = this;

        nCtrl.cardUrl = nCtrl.newsCard.url;
        nCtrl.title = nCtrl.newsCard.name;
        nCtrl.description = nCtrl.newsCard.description;
    }

})();
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
angular.module('egen-feed').run(['$templateCache', function($templateCache) {$templateCache.put('/templates/news-card.html','<div class=DIV_25><div class=DIV_26><a href={{nCtrl.cardUrl}} class=A_27><div class=grid><figure class=effect-apollo><img src={{nCtrl.newsCard.image}} alt=img18><figcaption><h2><span></span></h2><p>{{nCtrl.title}}</p></figcaption></figure></div></a><div class=DIV_28><h3 class=H3_41><a href={{nCtrl.cardUrl}} class=A_42>{{nCtrl.title}}</a></h3><p class=P_43>{{nCtrl.description}}</p></div></div></div>');
$templateCache.put('/templates/welcome.html','<div id=HEADERDIV1><div id=HEADERDIV6><nav id=HEADERNAV1><a ui-sref=bing class=A_10>BING</a> <a ui-sref=webhose class=A_10>WEBHOSE</a></nav></div></div><div id=DIV_1><div id=DIV_2><div id=DIV_3><div id=DIV_4></div><div id=DIV_5><div id=DIV_6><h1 id=H1_19><a href="/review/three-powerful-conversations-managers-must-have-to-develop-their-people/" id=A_20>If you think that the internet has changed your life, think again. The IoT is about to change it all over again!</a></h1></div></div></div></div><div id=DIV_21><div id=DIV_22><div id=DIV_23><div id=DIV_24><news-card ng-repeat="card in wCtrl.articles" nc=card></news-card></div></div></div></div></div>');}]);
(function() {
    "use strict";
    angular.module('egen-feed')
        .controller('welcomeController', welcomeController);

    welcomeController.$inject = ['serviceConnectorFactory', '$interval', '$scope', '$timeout'];

    function welcomeController(serviceConnectorFactory, $interval, $scope, $timeout) {

        var wCtrl = this;
        wCtrl.articles = null;


        if (localStorage.getItem('bingNews')) {
            wCtrl.articles = JSON.parse(localStorage.getItem('bingNews'));
        }
        $timeout(function() {$scope.$apply()}, 0);
        function getNews() {
               var request = {
                   params: {
                       "q": "iot",
                       "count": 100,
                       "mkt": "en-us"
                   },
                   headers: {
                       "Ocp-Apim-Subscription-Key": "88c0525888554830868fab2fee8b6755"
                   }
               };

               if (!localStorage.getItem('bingNews') || (new Date().getTime()/1000 - localStorage.bingTime > 3600)) {
                   serviceConnectorFactory.get('https://api.cognitive.microsoft.com/bing/v5.0/news/search', request).then((data) => {
                       wCtrl.articles = data.value;
                       wCtrl.articles = _.map(_.filter(wCtrl.articles, (article) => {
                           return !!article.image;
                       }), (article) => {
                           article.image = article.image.thumbnail.contentUrl.replace('&pid=News', '');
                           return article;
                       });
                       console.log(wCtrl.articles);
                       localStorage.setItem("bingNews", JSON.stringify(wCtrl.articles));
                       localStorage.bingTime = new Date().getTime() / 1000;
                   });
               }
        }
        getNews();
        $interval(getNews, 60 * 60 * 1000);
    }
})();