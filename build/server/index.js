'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _Server = require('./Server');

var _Server2 = _interopRequireDefault(_Server);

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

var argv = (0, _minimist2['default'])(process.argv, {
    'default': {
        'server-port': process.env.PORT || 8080
    }
});

var server = new _Server2['default'](argv['server-port']);
server._listen();