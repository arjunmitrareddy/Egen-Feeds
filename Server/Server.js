import express from 'express';
import http from 'http';
import path from 'path';
import bodyParser from 'body-parser';
import socketio from 'socket.io';
import events from 'events';
import fs from 'fs';
import _ from 'lodash';
import gScraper from 'google-search-scraper';
import mongo from 'mongodb';
import Twitter from 'Twit';
import Request from 'request';
import Bing from 'bing.search';
import ImageScraper from 'images-scraper';

const RES_LIMIT = 20;
const PUBLICATIONS_FETCH = 1000 * 60 * 60;
const PUBLICATIONS_FETCH2 = 1000 * 15;
const TWEETS_FETCH = 1000 * 30;

const NEWS_SOURCES = '../public/json/newsSources.json';

events.EventEmitter.prototype._maxListeners = 10000;

export default class Server {
    constructor(port) {

        this._app = express();
        this._port = port;
        this._appServerUp = false;
        this._appServer = http.createServer(this._app);
        this._MongoClient = mongo.MongoClient;
        this._CrawlerDbUrl = 'mongodb://localhost:27017/crawler';
        this._MongoClient.connect(this._CrawlerDbUrl, (err, db) => {
            this._crawlerDb = db;
            this._publicationsCollection = this._crawlerDb.collection('publications');
            this._influencersCollection = this._crawlerDb.collection('influencers');
            this._twitterCollection = this._crawlerDb.collection('tweets');
            this._sio = socketio.listen(this._appServer);
            this._sio.sockets.on('connection', (socket) => {
                this._beginGather(socket);
                this._backgroundScraper(socket);
            });
        });
        this._app.use(bodyParser.urlencoded({ extended: true }));
        this._app.use(bodyParser.json());
        this._serveStaticFiles();
        this._gScraperOptions = {
                query: 'Internet of things industrial',
                host: 'www.bing.com',
                lang: 'en',
                age: 'h1', // last 24 hours ([hdwmy]\d? as in google URL)
                limit: RES_LIMIT
               // solver: captchaSolver
        };
        this._app.get('/getPublications', (req, res) => {
           var cursor = this._publicationsCollection.find().sort({ $natural : 1 });
             cursor.toArray(function(err, results) {
             if (err) throw err;
             res.send({res: results});
             });
        });

        this._app.get('/getTweets', (req, res) => {
            var cursor = this._twitterCollection.find().sort({ $natural : 1 });
            cursor.toArray(function(err, results) {
                if (err) throw err;
                res.send({res: results});
            });
        });
        this._app.get('*', (req, res) => {
            res.sendFile(path.resolve(__dirname, '../public/index.html'));
        });
    }
    _getPublicationsBing(socket) {
        var collection = this._publicationsCollection;
        var B = new Bing('ux1GpuUhX3eY/fkeL6cGHcHXxjRy/UBLyzEJClkxu1U');
        B.news("Industrial IOT", {
            top: 10
        }, function(error, results){
            _.forEach(results, (result) => {
                var article = {
                    author: "",
                    title: result.title,
                    description: result.description,
                    url: result.url,
                    urlToImage: "",
                    publishedAt: result.date
                };
                var news = {
                    title: result.title,
                    article: article,
                    source: result.source
                };
                collection.insert(news);
                if (socket) socket.emit('new-publications', {news: news});
            });
        });
        B.news("Industrial Internet of Things", {
            top: 10
        }, function(error, results){
            _.forEach(results, (result) => {
                var article = {
                    author: "",
                    title: result.title,
                    description: result.description,
                    url: result.url,
                    urlToImage: "",
                    publishedAt: result.date
                };
                var news = {
                    title: result.title,
                    article: article,
                    source: result.source
                };
                collection.insert(news);
                if (socket) socket.emit('new-publications', {news: news});
            });
        });
        B.news("Internet of Things", {
            top: 10
        }, function(error, results){
            _.forEach(results, (result) => {
                var article = {
                    author: "",
                    title: result.title,
                    description: result.description,
                    url: result.url,
                    urlToImage: "",
                    publishedAt: result.date
                };
                var news = {
                    title: result.title,
                    article: article,
                    source: result.source
                };
                collection.insert(news);
                if (socket) socket.emit('new-publications', {news: news});
            });
        });

    }
    _getPublications(socket) {
        /*gScraper.search(this._gScraperOptions, (err, url) => {
         if (err) throw err;
         var regex = /^https?\:\/\/[^\/]+\/?$/;
         console.log(url);
         if (!regex.test(url)) {
         this._publicationsCollection.insert({url: url},(err, inserted) => {
         console.log('Successfully inserted ' + JSON.stringify(inserted));
         this._socketInstance.emit('new-publications', {url:url});
         });
         }
         });*/
        var collection = this._publicationsCollection;
        fs.readFile(NEWS_SOURCES, 'utf-8', (err, data) => {
           var sources = JSON.parse(data);
           _.forEach(sources, function(source) {
               var src = source.id;
               var url = `https://newsapi.org/v1/articles?source=${src}&sort=popular&apiKey=82f53e7dbcf14533afac7c3d6aea75be`;
               Request(url, (err, res, body) => {
                       if (err) console.log(err);
                       if (!err && res.statusCode == 200) {
                           var jsonBody = JSON.parse(body);
                           jsonBody.articles.forEach((article) => {
                               if (article.description) {
                                   if (article.description.indexOf("IIOT") != -1
                                       || article.description.indexOf("Industrial Internet Of Things") != -1
                                       || article.description.indexOf("Industrial IOT") != -1
                                       || article.description.indexOf("Internet of Things") != -1) {
                                       console.log("NEWS");
                                       var news = {
                                           title: article.title,
                                           article: article,
                                           source: jsonBody.source
                                       };
                                       collection.insert(news);
                                       if (socket) socket.emit('new-publications', {news: news});
                                   }
                               }
                           });
                       }
                   });
               url = `https://newsapi.org/v1/articles?source=${src}&sort=latest&apiKey=82f53e7dbcf14533afac7c3d6aea75be`;
               Request(url, (err, res, body) => {
                   if (!err && res.statusCode == 200) {
                       var jsonBody = JSON.parse(body);
                       jsonBody.articles.forEach((article) => {
                           if (article.description) {
                               if (article.description.indexOf("IIOT") != -1
                                   || article.description.indexOf("Industrial Internet Of Things") != -1
                                   || article.description.indexOf("Industrial IOT") != -1
                                   || article.description.indexOf("Internet of Things") != -1) {
                                   var news = {
                                       title: article.title,
                                       article: article,
                                       source: jsonBody.source
                                   };
                                   collection.insert(news);
                                   if (socket) socket.emit('new-publications', {news: news});
                               }
                           }
                       });
                   }
               });
               url = `https://newsapi.org/v1/articles?source=${src}&sort=top&apiKey=82f53e7dbcf14533afac7c3d6aea75be`;
               Request(url, (err, res, body) => {
                   if (!err && res.statusCode == 200) {
                       var jsonBody = JSON.parse(body);
                       jsonBody.articles.forEach((article) => {
                           if (article.description) {
                               if (article.description.indexOf("IIOT") != -1
                                   || article.description.indexOf("Industrial Internet Of Things") != -1
                                   || article.description.indexOf("Industrial IOT") != -1
                                   || article.description.indexOf("Internet of Things") != -1) {
                                   var news = {
                                       title: article.title,
                                       article: article,
                                       source: jsonBody.source
                                   };
                                   collection.insert(news);
                                   if (socket) socket.emit('new-publications', {news: news});
                               }
                           }
                       });
                   }
               });
           })
        });
    }
    _getTweets(socket) {
        var collection = this._twitterCollection;
        var T = new Twitter({
            consumer_key:         'n2kuJxaYssa023iXpf6gXgqB1',
            consumer_secret:      'V5b2kp4Hd09haWeMHvKp1eim1tm7cW8h2oDwBZri3iJZ6Rkg10',
            access_token:         '309264747-fsdc4Xy0YJM6iQ4WeqrZtfZNsOhtVdfjIZ4bze65',
            access_token_secret:  'QKf5VNVT2CYBSOmmgDwE7MeUYjeP8vNo5KO0B8TQ0recf'
        });
            var date = new Date();
            var since = date.getFullYear().toString() + "-" + (date.getMonth() + 1) + (date.getDate()-7);
            T.get('search/tweets', { q: 'Industrial IOT', count: 20 }, function(err, data, response) {
                if (data && data.statuses) {
                var cleanData = data.statuses.map(function(tweet) {
                    var regexp = new RegExp('#([^\\s]*)','g');
                    tweet.text = tweet.text.replace(regexp, '');
                    tweet.text = tweet.text.replace(/RT\s*@\S+/g, '');
                    return {
                        date: tweet.created_at,
                        src: tweet.source,
                        tweet: tweet.text,
                        user: tweet.user,
                        retweets: tweet.retweet_count,
                        other: tweet.entities,
                        meta: tweet.metadata,
                        stat: tweet.retweeted_status
                    }
                });
                    _.forEach(data.statuses, function (tweet) {
                        var regexp = new RegExp('#([^\\s]*)','g');
                        tweet.text = tweet.text.replace(regexp, '');
                        tweet.text = tweet.text.replace(/RT\s*@\S+/g, '');
                        var tweetObj = {
                            date: tweet.created_at,
                            src: tweet.source,
                            tweet: tweet.text,
                            user: tweet.user,
                            retweets: tweet.retweet_count,
                            other: tweet.entities,
                            meta: tweet.metadata,
                            stat: tweet.retweeted_status
                        };
                        collection.insert(tweetObj);
                    })
                }
                if (socket) socket.emit('new-tweets', {tweets: cleanData});
            });
            T.get('search/tweets', { q: 'IIOT', count: 10 }, function(err, data, response) {
                if (data && data.statuses) {
                    var cleanData = data.statuses.map(function (tweet) {
                        var regexp = new RegExp('#([^\\s]*)', 'g');
                        tweet.text = tweet.text.replace(regexp, '');
                        tweet.text = tweet.text.replace(/RT\s*@\S+/g, '');
                        return {
                            date: tweet.created_at,
                            src: tweet.source,
                            tweet: tweet.text,
                            user: tweet.user,
                            retweets: tweet.retweet_count,
                            other: tweet.entities,
                            meta: tweet.metadata,
                            stat: tweet.retweeted_status
                        }
                    });
                    _.forEach(data.statuses, function (tweet) {
                        var regexp = new RegExp('#([^\\s]*)','g');
                        tweet.text = tweet.text.replace(regexp, '');
                        tweet.text = tweet.text.replace(/RT\s*@\S+/g, '');
                        var tweetObj = {
                            date: tweet.created_at,
                            src: tweet.source,
                            tweet: tweet.text,
                            user: tweet.user,
                            retweets: tweet.retweet_count,
                            other: tweet.entities,
                            meta: tweet.metadata,
                            stat: tweet.retweeted_status
                        };
                        collection.insert(tweetObj);
                    })
                }
                if (socket) socket.emit('new-tweets', {tweets: cleanData});
            });
            T.get('search/tweets', { q: 'Industrial Internet of Things', count: 20 }, function(err, data, response) {
                if (data && data.statuses) {
                    var cleanData = data.statuses.map(function (tweet) {
                        var regexp = new RegExp('#([^\\s]*)', 'g');
                        tweet.text = tweet.text.replace(regexp, '');
                        tweet.text = tweet.text.replace(/RT\s*@\S+/g, '');
                        return {
                            date: tweet.created_at,
                            src: tweet.source,
                            tweet: tweet.text,
                            user: tweet.user,
                            retweets: tweet.retweet_count,
                            other: tweet.entities,
                            meta: tweet.metadata,
                            stat: tweet.retweeted_status
                        }
                    });
                    _.forEach(data.statuses, function (tweet) {
                        var regexp = new RegExp('#([^\\s]*)','g');
                        tweet.text = tweet.text.replace(regexp, '');
                        tweet.text = tweet.text.replace(/RT\s*@\S+/g, '');
                        var tweetObj = {
                            date: tweet.created_at,
                            src: tweet.source,
                            tweet: tweet.text,
                            user: tweet.user,
                            retweets: tweet.retweet_count,
                            other: tweet.entities,
                            meta: tweet.metadata,
                            stat: tweet.retweeted_status
                        };
                        collection.insert(tweetObj);
                    })
                }
                if (socket) socket.emit('new-tweets', {tweets: cleanData});
            })
        

    }
    _serveStaticFiles() {
        this._app.use('/js', express.static('../public/js', { maxAge: '1d' }));
        this._app.use('/styles', express.static('../public/styles', { maxAge: '1d' }));
        this._app.use('/sw.js', express.static('../public/sw.js', { maxAge: 0 }));
        this._app.use('/manifest.json', express.static('../public/manifest.json', { maxAge: 0}));
        this._app.use('/imgs', express.static('../public/imgs', { maxAge: '1y' }));
        this._app.use('/json', express.static('../public/json', { maxAge: 0 }));
        this._app.use('/fonts', express.static('../public/fonts', { maxAge: '1y' }));
        this._app.use('/templates', express.static('../public/templates', { maxAge: '1d' }));
    }
    _listen() {
        if (!this._appServerUp) {
            this._appServer.listen(process.env.PORT || this._port, _ => {
                console.log("\n\n ***** Server Listening on localhost:" + this._port + " ***** \n\n");
            });
            this._appServerUp = true;
        }
    }
    _beginGather(socket) {

        setInterval(() => {
            this._getPublications(socket);
        }, PUBLICATIONS_FETCH);

        setInterval(() => {
            this._getPublicationsBing(socket);
        }, PUBLICATIONS_FETCH2  );
        
        setInterval(() => {
            this._getTweets(socket);
        }, TWEETS_FETCH);

        setInterval((socket) => {
            this._backgroundScraper();
        }, 10000);

    }
    _backgroundScraper(socket) {

        var collection = this._publicationsCollection;
        var googleScraper = new ImageScraper.Bing();
        var cursor = collection.find().sort({ $natural : 1 });
        cursor.toArray((err, results) => {
            if (err) throw err;
            results.forEach(function (result) {
                if (result.article.urlToImage == "") {
                    googleScraper.list({
                        keyword: result.article.url,
                        num: 1,
                        rlimit: '1',
                        timeout: 10000,
                        nightmare: {
                            show: true
                        }
                    }).then((res)=> {
                        if (res.length > 0 && res[0].url.indexOf()) {
                            collection.update(
                                {title: result.title},
                                {
                                    "$set": {
                                        "article.urlToImage": res[0].url
                                    }
                                }, (err, object) => {
                                    if (err) console.log(err);
                                });
                        }
                        else {
                            googleScraper.list({
                                keyword: result.title,
                                num: 1,
                                rlimit: '1',
                                timeout: 10000,
                                nightmare: {
                                    show: true
                                }
                            }).then((res)=> {
                                if (res.length > 0) {
                                    collection.update(
                                        {title: result.title},
                                        {
                                            "$set": {
                                                "article.urlToImage": res[0].url
                                            }
                                        }, (err, object) => {
                                            if (err) console.log(err);
                                        });
                                }
                            });
                        }
                    });
                }
            });

        });
        if (socket) socket.emit("refetch-images");
    };
}