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