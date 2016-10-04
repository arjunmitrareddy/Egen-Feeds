(function() {
    "use strict";
    angular.module('egen-feed')
        .controller('welcomeController', welcomeController);

    welcomeController.$inject = ['serviceConnectorFactory', '$rootScope', '$scope'];

    function welcomeController(serviceConnectorFactory, $rootScope, $scope) {

        var wCtrl = this;
        wCtrl.tweetsLoaded = false;
        wCtrl.pubsLoaded = false;
        wCtrl.categories = [
            {
                category: 'Twitter',
                class:'link-blue',
                selected: false,
                fa: 'fa-twitter-square'
            },
            {
                category: 'Publications',
                class:'link-red',
                selected: false,
                fa: 'fa-file-text'
            }, 
            {
                category: 'Startup Beat',
                class:'link-yellow',
                selected: false,
                fa: 'fa-building'
            }, 
            {
                category: 'Influencers',
                class:'link-green',
                selected: false,
                fa: 'fa-users'
            }, 
            {
                category: 'Competitors',
                class:'link-orange',
                selected: false,
                fa: 'fa-user-secret'
            }
        ];
        wCtrl.defaultLoader = true;
        wCtrl.selectCategory = function(category) {
            wCtrl.categories.forEach(function(cat, index) {
                wCtrl.categories[index].selected = (cat.category === category);
            });
            wCtrl.defaultLoader = false;
            if (category == "Publications") {
                serviceConnectorFactory.get('/getPublications').then(function(data) {
                    _.forEach(data.res, function (news) {
                        if (!wCtrl.publications.has(news.article.title)) {
                            wCtrl.publications.set(news.article.title, news);
                        }
                        wCtrl.finalPublications = Array.from(wCtrl.publications).reverse();
                        wCtrl.pubsLoaded = true;
                    })
                })
            }
            if (category == "Twitter") {
                serviceConnectorFactory.get('/getTweets').then(function(data) {
                    _.forEach(data.res, function(tweet) {
                        if (!wCtrl.tweets.has(tweet.tweet)) {
                            wCtrl.tweets.set(tweet.tweet, tweet);
                        }
                    });
                    wCtrl.finalTweets = Array.from(wCtrl.tweets).reverse();
                    wCtrl.tweetsLoaded = true;
                })
            }
        };
        
        wCtrl.publications = new Map();
        wCtrl.finalPublications = null;
        wCtrl.finalTweets = null;
        wCtrl.tweets = new Map();

        $rootScope.socket.on('new-publications', function (data) {
            if (!wCtrl.publications.has(data.news.article.title)) {
                wCtrl.publications.set(data.news.article.title, data.news);
            }
            wCtrl.finalPublications = Array.from(wCtrl.publications).reverse();
            $scope.$apply();
        });

        $rootScope.socket.on('new-tweets', function (data) {
            _.forEach(data.tweets, function(tweet) {
                if (!wCtrl.tweets.has(tweet.tweet)) {
                    wCtrl.tweets.set(tweet.tweet, tweet);
                    wCtrl.finalTweets.unshift([tweet.tweet, tweet]);
                }
            });
            $scope.$apply();
        });

        $rootScope.socket.on('refetch-images', function () {
            serviceConnectorFactory.get('/getPublications').then(function(data) {
                _.forEach(data.res, function (news) {
                    if (!wCtrl.publications.has(news.article.title)) {
                        wCtrl.publications.set(news.article.title, news);
                    }
                    wCtrl.finalPublications = Array.from(wCtrl.publications).reverse();
                })
            });
            $scope.$apply();
        });

        $(function () {

            var links = $('.sidebar-links > a');

            links.on('click', function () {

                links.removeClass('selected');
                $(this).addClass('selected');

            })
        });


    }
})();