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
                        "q": "internet of things",
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
                            return !!article.thread.main_image;
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