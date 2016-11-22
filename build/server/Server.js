'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var Server = (function () {
    function Server(port) {
        _classCallCheck(this, Server);

        this._app = (0, _express2['default'])();
        this._port = port;
        this._appServerUp = false;
        this._appServer = _http2['default'].createServer(this._app);
        this._app.use(_bodyParser2['default'].urlencoded({ extended: true }));
        this._app.use(_bodyParser2['default'].json());
        this._serveStaticFiles();
        this._app.get('*', function (req, res) {
            res.sendFile(_path2['default'].resolve(__dirname, '../public/index.html'));
        });
    }

    _createClass(Server, [{
        key: '_serveStaticFiles',
        value: function _serveStaticFiles() {
            this._app.use('/js', _express2['default']['static']('../public/js', { maxAge: '1d' }));
            this._app.use('/styles', _express2['default']['static']('../public/styles', { maxAge: '1d' }));
            this._app.use('/imgs', _express2['default']['static']('../public/imgs', { maxAge: 0 }));
            this._app.use('/fonts', _express2['default']['static']('../public/fonts', { maxAge: '1y' }));
            this._app.use('/templates', _express2['default']['static']('../public/templates', { maxAge: '1y' }));
            this._app.use('/bower_components', _express2['default']['static']('../../bower_components', { maxAge: '1d' }));
        }
    }, {
        key: '_listen',
        value: function _listen() {
            var _this = this;

            if (!this._appServerUp) {
                this._appServer.listen(process.env.PORT || this._port, function (_) {
                    console.log("\n\n ***** Server Listening on localhost:" + _this._port + " ***** \n\n");
                });
                this._appServerUp = true;
            }
        }
    }]);

    return Server;
})();

exports['default'] = Server;
module.exports = exports['default'];