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