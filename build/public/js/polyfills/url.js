(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

(function (scope) {
    'use strict';

    // feature detect for URL constructor
    var hasWorkingUrl = false;
    if (!scope.forceJURL) {
        try {
            var u = new URL('b', 'http://a');
            u.pathname = 'c%20d';
            hasWorkingUrl = u.href === 'http://a/c%20d';
        } catch (e) {}
    }

    if (hasWorkingUrl) return;

    var relative = Object.create(null);
    relative['ftp'] = 21;
    relative['file'] = 0;
    relative['gopher'] = 70;
    relative['http'] = 80;
    relative['https'] = 443;
    relative['ws'] = 80;
    relative['wss'] = 443;

    var relativePathDotMapping = Object.create(null);
    relativePathDotMapping['%2e'] = '.';
    relativePathDotMapping['.%2e'] = '..';
    relativePathDotMapping['%2e.'] = '..';
    relativePathDotMapping['%2e%2e'] = '..';

    function isRelativeScheme(scheme) {
        return relative[scheme] !== undefined;
    }

    function invalid() {
        clear.call(this);
        this._isInvalid = true;
    }

    function IDNAToASCII(h) {
        if ('' == h) {
            invalid.call(this);
        }
        // XXX
        return h.toLowerCase();
    }

    function percentEscape(c) {
        var unicode = c.charCodeAt(0);
        if (unicode > 0x20 && unicode < 0x7F &&
        // " # < > ? `
        [0x22, 0x23, 0x3C, 0x3E, 0x3F, 0x60].indexOf(unicode) == -1) {
            return c;
        }
        return encodeURIComponent(c);
    }

    function percentEscapeQuery(c) {
        // XXX This actually needs to encode c using encoding and then
        // convert the bytes one-by-one.

        var unicode = c.charCodeAt(0);
        if (unicode > 0x20 && unicode < 0x7F &&
        // " # < > ` (do not escape '?')
        [0x22, 0x23, 0x3C, 0x3E, 0x60].indexOf(unicode) == -1) {
            return c;
        }
        return encodeURIComponent(c);
    }

    var EOF = undefined,
        ALPHA = /[a-zA-Z]/,
        ALPHANUMERIC = /[a-zA-Z0-9\+\-\.]/;

    function parse(input, stateOverride, base) {
        function err(message) {
            errors.push(message);
        }

        var state = stateOverride || 'scheme start',
            cursor = 0,
            buffer = '',
            seenAt = false,
            seenBracket = false,
            errors = [];

        loop: while ((input[cursor - 1] != EOF || cursor == 0) && !this._isInvalid) {
            var c = input[cursor];
            switch (state) {
                case 'scheme start':
                    if (c && ALPHA.test(c)) {
                        buffer += c.toLowerCase(); // ASCII-safe
                        state = 'scheme';
                    } else if (!stateOverride) {
                        buffer = '';
                        state = 'no scheme';
                        continue;
                    } else {
                        err('Invalid scheme.');
                        break loop;
                    }
                    break;

                case 'scheme':
                    if (c && ALPHANUMERIC.test(c)) {
                        buffer += c.toLowerCase(); // ASCII-safe
                    } else if (':' == c) {
                            this._scheme = buffer;
                            buffer = '';
                            if (stateOverride) {
                                break loop;
                            }
                            if (isRelativeScheme(this._scheme)) {
                                this._isRelative = true;
                            }
                            if ('file' == this._scheme) {
                                state = 'relative';
                            } else if (this._isRelative && base && base._scheme == this._scheme) {
                                state = 'relative or authority';
                            } else if (this._isRelative) {
                                state = 'authority first slash';
                            } else {
                                state = 'scheme data';
                            }
                        } else if (!stateOverride) {
                            buffer = '';
                            cursor = 0;
                            state = 'no scheme';
                            continue;
                        } else if (EOF == c) {
                            break loop;
                        } else {
                            err('Code point not allowed in scheme: ' + c);
                            break loop;
                        }
                    break;

                case 'scheme data':
                    if ('?' == c) {
                        query = '?';
                        state = 'query';
                    } else if ('#' == c) {
                        this._fragment = '#';
                        state = 'fragment';
                    } else {
                        // XXX error handling
                        if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
                            this._schemeData += percentEscape(c);
                        }
                    }
                    break;

                case 'no scheme':
                    if (!base || !isRelativeScheme(base._scheme)) {
                        err('Missing scheme.');
                        invalid.call(this);
                    } else {
                        state = 'relative';
                        continue;
                    }
                    break;

                case 'relative or authority':
                    if ('/' == c && '/' == input[cursor + 1]) {
                        state = 'authority ignore slashes';
                    } else {
                        err('Expected /, got: ' + c);
                        state = 'relative';
                        continue;
                    }
                    break;

                case 'relative':
                    this._isRelative = true;
                    if ('file' != this._scheme) this._scheme = base._scheme;
                    if (EOF == c) {
                        this._host = base._host;
                        this._port = base._port;
                        this._path = base._path.slice();
                        this._query = base._query;
                        this._username = base._username;
                        this._password = base._password;
                        break loop;
                    } else if ('/' == c || '\\' == c) {
                        if ('\\' == c) err('\\ is an invalid code point.');
                        state = 'relative slash';
                    } else if ('?' == c) {
                        this._host = base._host;
                        this._port = base._port;
                        this._path = base._path.slice();
                        this._query = '?';
                        this._username = base._username;
                        this._password = base._password;
                        state = 'query';
                    } else if ('#' == c) {
                        this._host = base._host;
                        this._port = base._port;
                        this._path = base._path.slice();
                        this._query = base._query;
                        this._fragment = '#';
                        this._username = base._username;
                        this._password = base._password;
                        state = 'fragment';
                    } else {
                        var nextC = input[cursor + 1];
                        var nextNextC = input[cursor + 2];
                        if ('file' != this._scheme || !ALPHA.test(c) || nextC != ':' && nextC != '|' || EOF != nextNextC && '/' != nextNextC && '\\' != nextNextC && '?' != nextNextC && '#' != nextNextC) {
                            this._host = base._host;
                            this._port = base._port;
                            this._username = base._username;
                            this._password = base._password;
                            this._path = base._path.slice();
                            this._path.pop();
                        }
                        state = 'relative path';
                        continue;
                    }
                    break;

                case 'relative slash':
                    if ('/' == c || '\\' == c) {
                        if ('\\' == c) {
                            err('\\ is an invalid code point.');
                        }
                        if ('file' == this._scheme) {
                            state = 'file host';
                        } else {
                            state = 'authority ignore slashes';
                        }
                    } else {
                        if ('file' != this._scheme) {
                            this._host = base._host;
                            this._port = base._port;
                            this._username = base._username;
                            this._password = base._password;
                        }
                        state = 'relative path';
                        continue;
                    }
                    break;

                case 'authority first slash':
                    if ('/' == c) {
                        state = 'authority second slash';
                    } else {
                        err("Expected '/', got: " + c);
                        state = 'authority ignore slashes';
                        continue;
                    }
                    break;

                case 'authority second slash':
                    state = 'authority ignore slashes';
                    if ('/' != c) {
                        err("Expected '/', got: " + c);
                        continue;
                    }
                    break;

                case 'authority ignore slashes':
                    if ('/' != c && '\\' != c) {
                        state = 'authority';
                        continue;
                    } else {
                        err('Expected authority, got: ' + c);
                    }
                    break;

                case 'authority':
                    if ('@' == c) {
                        if (seenAt) {
                            err('@ already seen.');
                            buffer += '%40';
                        }
                        seenAt = true;
                        for (var i = 0; i < buffer.length; i++) {
                            var cp = buffer[i];
                            if ('\t' == cp || '\n' == cp || '\r' == cp) {
                                err('Invalid whitespace in authority.');
                                continue;
                            }
                            // XXX check URL code points
                            if (':' == cp && null === this._password) {
                                this._password = '';
                                continue;
                            }
                            var tempC = percentEscape(cp);
                            null !== this._password ? this._password += tempC : this._username += tempC;
                        }
                        buffer = '';
                    } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
                        cursor -= buffer.length;
                        buffer = '';
                        state = 'host';
                        continue;
                    } else {
                        buffer += c;
                    }
                    break;

                case 'file host':
                    if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
                        if (buffer.length == 2 && ALPHA.test(buffer[0]) && (buffer[1] == ':' || buffer[1] == '|')) {
                            state = 'relative path';
                        } else if (buffer.length == 0) {
                            state = 'relative path start';
                        } else {
                            this._host = IDNAToASCII.call(this, buffer);
                            buffer = '';
                            state = 'relative path start';
                        }
                        continue;
                    } else if ('\t' == c || '\n' == c || '\r' == c) {
                        err('Invalid whitespace in file host.');
                    } else {
                        buffer += c;
                    }
                    break;

                case 'host':
                case 'hostname':
                    if (':' == c && !seenBracket) {
                        // XXX host parsing
                        this._host = IDNAToASCII.call(this, buffer);
                        buffer = '';
                        state = 'port';
                        if ('hostname' == stateOverride) {
                            break loop;
                        }
                    } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c) {
                        this._host = IDNAToASCII.call(this, buffer);
                        buffer = '';
                        state = 'relative path start';
                        if (stateOverride) {
                            break loop;
                        }
                        continue;
                    } else if ('\t' != c && '\n' != c && '\r' != c) {
                        if ('[' == c) {
                            seenBracket = true;
                        } else if (']' == c) {
                            seenBracket = false;
                        }
                        buffer += c;
                    } else {
                        err('Invalid code point in host/hostname: ' + c);
                    }
                    break;

                case 'port':
                    if (/[0-9]/.test(c)) {
                        buffer += c;
                    } else if (EOF == c || '/' == c || '\\' == c || '?' == c || '#' == c || stateOverride) {
                        if ('' != buffer) {
                            var temp = parseInt(buffer, 10);
                            if (temp != relative[this._scheme]) {
                                this._port = temp + '';
                            }
                            buffer = '';
                        }
                        if (stateOverride) {
                            break loop;
                        }
                        state = 'relative path start';
                        continue;
                    } else if ('\t' == c || '\n' == c || '\r' == c) {
                        err('Invalid code point in port: ' + c);
                    } else {
                        invalid.call(this);
                    }
                    break;

                case 'relative path start':
                    if ('\\' == c) err("'\\' not allowed in path.");
                    state = 'relative path';
                    if ('/' != c && '\\' != c) {
                        continue;
                    }
                    break;

                case 'relative path':
                    if (EOF == c || '/' == c || '\\' == c || !stateOverride && ('?' == c || '#' == c)) {
                        if ('\\' == c) {
                            err('\\ not allowed in relative path.');
                        }
                        var tmp;
                        if (tmp = relativePathDotMapping[buffer.toLowerCase()]) {
                            buffer = tmp;
                        }
                        if ('..' == buffer) {
                            this._path.pop();
                            if ('/' != c && '\\' != c) {
                                this._path.push('');
                            }
                        } else if ('.' == buffer && '/' != c && '\\' != c) {
                            this._path.push('');
                        } else if ('.' != buffer) {
                            if ('file' == this._scheme && this._path.length == 0 && buffer.length == 2 && ALPHA.test(buffer[0]) && buffer[1] == '|') {
                                buffer = buffer[0] + ':';
                            }
                            this._path.push(buffer);
                        }
                        buffer = '';
                        if ('?' == c) {
                            this._query = '?';
                            state = 'query';
                        } else if ('#' == c) {
                            this._fragment = '#';
                            state = 'fragment';
                        }
                    } else if ('\t' != c && '\n' != c && '\r' != c) {
                        buffer += percentEscape(c);
                    }
                    break;

                case 'query':
                    if (!stateOverride && '#' == c) {
                        this._fragment = '#';
                        state = 'fragment';
                    } else if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
                        this._query += percentEscapeQuery(c);
                    }
                    break;

                case 'fragment':
                    if (EOF != c && '\t' != c && '\n' != c && '\r' != c) {
                        this._fragment += c;
                    }
                    break;
            }

            cursor++;
        }
    }

    function clear() {
        this._scheme = '';
        this._schemeData = '';
        this._username = '';
        this._password = null;
        this._host = '';
        this._port = '';
        this._path = [];
        this._query = '';
        this._fragment = '';
        this._isInvalid = false;
        this._isRelative = false;
    }

    // Does not process domain names or IP addresses.
    // Does not handle encoding for the query parameter.
    function jURL(url, base /* , encoding */) {
        if (base !== undefined && !(base instanceof jURL)) base = new jURL(String(base));

        this._url = url;
        clear.call(this);

        var input = url.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '');
        // encoding = encoding || 'utf-8'

        parse.call(this, input, null, base);
    }

    jURL.prototype = Object.defineProperties({
        toString: function toString() {
            return this.href;
        }
    }, {
        href: {
            get: function get() {
                if (this._isInvalid) return this._url;

                var authority = '';
                if ('' != this._username || null != this._password) {
                    authority = this._username + (null != this._password ? ':' + this._password : '') + '@';
                }

                return this.protocol + (this._isRelative ? '//' + authority + this.host : '') + this.pathname + this._query + this._fragment;
            },
            set: function set(href) {
                clear.call(this);
                parse.call(this, href);
            },
            configurable: true,
            enumerable: true
        },
        protocol: {
            get: function get() {
                return this._scheme + ':';
            },
            set: function set(protocol) {
                if (this._isInvalid) return;
                parse.call(this, protocol + ':', 'scheme start');
            },
            configurable: true,
            enumerable: true
        },
        host: {
            get: function get() {
                return this._isInvalid ? '' : this._port ? this._host + ':' + this._port : this._host;
            },
            set: function set(host) {
                if (this._isInvalid || !this._isRelative) return;
                parse.call(this, host, 'host');
            },
            configurable: true,
            enumerable: true
        },
        hostname: {
            get: function get() {
                return this._host;
            },
            set: function set(hostname) {
                if (this._isInvalid || !this._isRelative) return;
                parse.call(this, hostname, 'hostname');
            },
            configurable: true,
            enumerable: true
        },
        port: {
            get: function get() {
                return this._port;
            },
            set: function set(port) {
                if (this._isInvalid || !this._isRelative) return;
                parse.call(this, port, 'port');
            },
            configurable: true,
            enumerable: true
        },
        pathname: {
            get: function get() {
                return this._isInvalid ? '' : this._isRelative ? '/' + this._path.join('/') : this._schemeData;
            },
            set: function set(pathname) {
                if (this._isInvalid || !this._isRelative) return;
                this._path = [];
                parse.call(this, pathname, 'relative path start');
            },
            configurable: true,
            enumerable: true
        },
        search: {
            get: function get() {
                return this._isInvalid || !this._query || '?' == this._query ? '' : this._query;
            },
            set: function set(search) {
                if (this._isInvalid || !this._isRelative) return;
                this._query = '?';
                if ('?' == search[0]) search = search.slice(1);
                parse.call(this, search, 'query');
            },
            configurable: true,
            enumerable: true
        },
        hash: {
            get: function get() {
                return this._isInvalid || !this._fragment || '#' == this._fragment ? '' : this._fragment;
            },
            set: function set(hash) {
                if (this._isInvalid) return;
                this._fragment = '#';
                if ('#' == hash[0]) hash = hash.slice(1);
                parse.call(this, hash, 'fragment');
            },
            configurable: true,
            enumerable: true
        },
        origin: {
            get: function get() {
                var host;
                if (this._isInvalid || !this._scheme) {
                    return '';
                }
                // javascript: Gecko returns String(""), WebKit/Blink String("null")
                // Gecko throws error for "data://"
                // data: Gecko returns "", Blink returns "data://", WebKit returns "null"
                // Gecko returns String("") for file: mailto:
                // WebKit/Blink returns String("SCHEME://") for file: mailto:
                switch (this._scheme) {
                    case 'data':
                    case 'file':
                    case 'javascript':
                    case 'mailto':
                        return 'null';
                }
                host = this.host;
                if (!host) {
                    return '';
                }
                return this._scheme + '://' + host;
            },
            configurable: true,
            enumerable: true
        }
    });

    // Copy over the static methods
    var OriginalURL = scope.URL;
    if (OriginalURL) {
        jURL.createObjectURL = function (blob) {
            // IE extension allows a second optional options argument.
            // http://msdn.microsoft.com/en-us/library/ie/hh772302(v=vs.85).aspx
            return OriginalURL.createObjectURL.apply(OriginalURL, arguments);
        };
        jURL.revokeObjectURL = function (url) {
            OriginalURL.revokeObjectURL(url);
        };
    }

    scope.URL = jURL;
})(self);

},{}]},{},[1])

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYWRvbnRoYWxhL1dlYnN0b3JtUHJvamVjdHMvRWdlbi1GZWVkcy9wdWJsaWMvanMvcG9seWZpbGxzL3VybC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0FDR0EsQ0FBQyxVQUFTLEtBQUssRUFBRTtBQUNiLGdCQUFZLENBQUM7OztBQUdiLFFBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztBQUMxQixRQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRTtBQUNsQixZQUFJO0FBQ0EsZ0JBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUNqQyxhQUFDLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztBQUNyQix5QkFBYSxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssZ0JBQWdCLENBQUM7U0FDL0MsQ0FBQyxPQUFNLENBQUMsRUFBRSxFQUFFO0tBQ2hCOztBQUVELFFBQUksYUFBYSxFQUNiLE9BQU87O0FBRVgsUUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNuQyxZQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3JCLFlBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDckIsWUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUN4QixZQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3RCLFlBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUM7QUFDeEIsWUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNwQixZQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDOztBQUV0QixRQUFJLHNCQUFzQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENB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QU1ELHdCQUFRLElBQUksQ0FBQyxPQUFPO0FBQ2hCLHlCQUFLLE1BQU0sQ0FBQztBQUNaLHlCQUFLLE1BQU0sQ0FBQztBQUNaLHlCQUFLLFlBQVksQ0FBQztBQUNsQix5QkFBSyxRQUFRO0FBQ1QsK0JBQU8sTUFBTSxDQUFDO0FBQUEsaUJBQ3JCO0FBQ0Qsb0JBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ2pCLG9CQUFJLENBQUMsSUFBSSxFQUFFO0FBQ1AsMkJBQU8sRUFBRSxDQUFDO2lCQUNiO0FBQ0QsdUJBQU8sSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDO2FBQ3RDOzs7O01BQ0osQ0FBQzs7O0FBR0YsUUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztBQUM1QixRQUFJLFdBQVcsRUFBRTtBQUNiLFlBQUksQ0FBQyxlQUFlLEdBQUcsVUFBUyxJQUFJLEVBQUU7OztBQUdsQyxtQkFBTyxXQUFXLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7U0FDcEUsQ0FBQztBQUNGLFlBQUksQ0FBQyxlQUFlLEdBQUcsVUFBUyxHQUFHLEVBQUU7QUFDakMsdUJBQVcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDcEMsQ0FBQztLQUNMOztBQUVELFNBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDO0NBRXBCLENBQUEsQ0FBRSxJQUFJLENBQUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBBbnkgY29weXJpZ2h0IGlzIGRlZGljYXRlZCB0byB0aGUgUHVibGljIERvbWFpbi5cbiAqIGh0dHA6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL3B1YmxpY2RvbWFpbi96ZXJvLzEuMC8gKi9cblxuKGZ1bmN0aW9uKHNjb3BlKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gZmVhdHVyZSBkZXRlY3QgZm9yIFVSTCBjb25zdHJ1Y3RvclxuICAgIHZhciBoYXNXb3JraW5nVXJsID0gZmFsc2U7XG4gICAgaWYgKCFzY29wZS5mb3JjZUpVUkwpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhciB1ID0gbmV3IFVSTCgnYicsICdodHRwOi8vYScpO1xuICAgICAgICAgICAgdS5wYXRobmFtZSA9ICdjJTIwZCc7XG4gICAgICAgICAgICBoYXNXb3JraW5nVXJsID0gdS5ocmVmID09PSAnaHR0cDovL2EvYyUyMGQnO1xuICAgICAgICB9IGNhdGNoKGUpIHt9XG4gICAgfVxuXG4gICAgaWYgKGhhc1dvcmtpbmdVcmwpXG4gICAgICAgIHJldHVybjtcblxuICAgIHZhciByZWxhdGl2ZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgcmVsYXRpdmVbJ2Z0cCddID0gMjE7XG4gICAgcmVsYXRpdmVbJ2ZpbGUnXSA9IDA7XG4gICAgcmVsYXRpdmVbJ2dvcGhlciddID0gNzA7XG4gICAgcmVsYXRpdmVbJ2h0dHAnXSA9IDgwO1xuICAgIHJlbGF0aXZlWydodHRwcyddID0gNDQzO1xuICAgIHJlbGF0aXZlWyd3cyddID0gODA7XG4gICAgcmVsYXRpdmVbJ3dzcyddID0gNDQzO1xuXG4gICAgdmFyIHJlbGF0aXZlUGF0aERvdE1hcHBpbmcgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHJlbGF0aXZlUGF0aERvdE1hcHBpbmdbJyUyZSddID0gJy4nO1xuICAgIHJlbGF0aXZlUGF0aERvdE1hcHBpbmdbJy4lMmUnXSA9ICcuLic7XG4gICAgcmVsYXRpdmVQYXRoRG90TWFwcGluZ1snJTJlLiddID0gJy4uJztcbiAgICByZWxhdGl2ZVBhdGhEb3RNYXBwaW5nWyclMmUlMmUnXSA9ICcuLic7XG5cbiAgICBmdW5jdGlvbiBpc1JlbGF0aXZlU2NoZW1lKHNjaGVtZSkge1xuICAgICAgICByZXR1cm4gcmVsYXRpdmVbc2NoZW1lXSAhPT0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGludmFsaWQoKSB7XG4gICAgICAgIGNsZWFyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuX2lzSW52YWxpZCA9IHRydWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gSUROQVRvQVNDSUkoaCkge1xuICAgICAgICBpZiAoJycgPT0gaCkge1xuICAgICAgICAgICAgaW52YWxpZC5jYWxsKHRoaXMpXG4gICAgICAgIH1cbiAgICAgICAgLy8gWFhYXG4gICAgICAgIHJldHVybiBoLnRvTG93ZXJDYXNlKClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwZXJjZW50RXNjYXBlKGMpIHtcbiAgICAgICAgdmFyIHVuaWNvZGUgPSBjLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIGlmICh1bmljb2RlID4gMHgyMCAmJlxuICAgICAgICAgICAgdW5pY29kZSA8IDB4N0YgJiZcbiAgICAgICAgICAgIC8vIFwiICMgPCA+ID8gYFxuICAgICAgICAgICAgWzB4MjIsIDB4MjMsIDB4M0MsIDB4M0UsIDB4M0YsIDB4NjBdLmluZGV4T2YodW5pY29kZSkgPT0gLTFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gYztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KGMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBlcmNlbnRFc2NhcGVRdWVyeShjKSB7XG4gICAgICAgIC8vIFhYWCBUaGlzIGFjdHVhbGx5IG5lZWRzIHRvIGVuY29kZSBjIHVzaW5nIGVuY29kaW5nIGFuZCB0aGVuXG4gICAgICAgIC8vIGNvbnZlcnQgdGhlIGJ5dGVzIG9uZS1ieS1vbmUuXG5cbiAgICAgICAgdmFyIHVuaWNvZGUgPSBjLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgIGlmICh1bmljb2RlID4gMHgyMCAmJlxuICAgICAgICAgICAgdW5pY29kZSA8IDB4N0YgJiZcbiAgICAgICAgICAgIC8vIFwiICMgPCA+IGAgKGRvIG5vdCBlc2NhcGUgJz8nKVxuICAgICAgICAgICAgWzB4MjIsIDB4MjMsIDB4M0MsIDB4M0UsIDB4NjBdLmluZGV4T2YodW5pY29kZSkgPT0gLTFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm4gYztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KGMpO1xuICAgIH1cblxuICAgIHZhciBFT0YgPSB1bmRlZmluZWQsXG4gICAgICAgIEFMUEhBID0gL1thLXpBLVpdLyxcbiAgICAgICAgQUxQSEFOVU1FUklDID0gL1thLXpBLVowLTlcXCtcXC1cXC5dLztcblxuICAgIGZ1bmN0aW9uIHBhcnNlKGlucHV0LCBzdGF0ZU92ZXJyaWRlLCBiYXNlKSB7XG4gICAgICAgIGZ1bmN0aW9uIGVycihtZXNzYWdlKSB7XG4gICAgICAgICAgICBlcnJvcnMucHVzaChtZXNzYWdlKVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN0YXRlID0gc3RhdGVPdmVycmlkZSB8fCAnc2NoZW1lIHN0YXJ0JyxcbiAgICAgICAgICAgIGN1cnNvciA9IDAsXG4gICAgICAgICAgICBidWZmZXIgPSAnJyxcbiAgICAgICAgICAgIHNlZW5BdCA9IGZhbHNlLFxuICAgICAgICAgICAgc2VlbkJyYWNrZXQgPSBmYWxzZSxcbiAgICAgICAgICAgIGVycm9ycyA9IFtdO1xuXG4gICAgICAgIGxvb3A6IHdoaWxlICgoaW5wdXRbY3Vyc29yIC0gMV0gIT0gRU9GIHx8IGN1cnNvciA9PSAwKSAmJiAhdGhpcy5faXNJbnZhbGlkKSB7XG4gICAgICAgICAgICB2YXIgYyA9IGlucHV0W2N1cnNvcl07XG4gICAgICAgICAgICBzd2l0Y2ggKHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnc2NoZW1lIHN0YXJ0JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgJiYgQUxQSEEudGVzdChjKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyICs9IGMudG9Mb3dlckNhc2UoKTsgLy8gQVNDSUktc2FmZVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAnc2NoZW1lJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICghc3RhdGVPdmVycmlkZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdubyBzY2hlbWUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnIoJ0ludmFsaWQgc2NoZW1lLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWsgbG9vcDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgJ3NjaGVtZSc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChjICYmIEFMUEhBTlVNRVJJQy50ZXN0KGMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgKz0gYy50b0xvd2VyQ2FzZSgpOyAvLyBBU0NJSS1zYWZlXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJzonID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3NjaGVtZSA9IGJ1ZmZlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlT3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhayBsb29wO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzUmVsYXRpdmVTY2hlbWUodGhpcy5fc2NoZW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2lzUmVsYXRpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCdmaWxlJyA9PSB0aGlzLl9zY2hlbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdyZWxhdGl2ZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2lzUmVsYXRpdmUgJiYgYmFzZSAmJiBiYXNlLl9zY2hlbWUgPT0gdGhpcy5fc2NoZW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAncmVsYXRpdmUgb3IgYXV0aG9yaXR5JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5faXNSZWxhdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ2F1dGhvcml0eSBmaXJzdCBzbGFzaCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ3NjaGVtZSBkYXRhJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICghc3RhdGVPdmVycmlkZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3IgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAnbm8gc2NoZW1lJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEVPRiA9PSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhayBsb29wO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyKCdDb2RlIHBvaW50IG5vdCBhbGxvd2VkIGluIHNjaGVtZTogJyArIGMpXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhayBsb29wO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAnc2NoZW1lIGRhdGEnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoJz8nID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5ID0gJz8nO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAncXVlcnknO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCcjJyA9PSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9mcmFnbWVudCA9ICcjJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ2ZyYWdtZW50JztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFhYWCBlcnJvciBoYW5kbGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEVPRiAhPSBjICYmICdcXHQnICE9IGMgJiYgJ1xcbicgIT0gYyAmJiAnXFxyJyAhPSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2NoZW1lRGF0YSArPSBwZXJjZW50RXNjYXBlKGMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAnbm8gc2NoZW1lJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFiYXNlIHx8ICEoaXNSZWxhdGl2ZVNjaGVtZShiYXNlLl9zY2hlbWUpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyKCdNaXNzaW5nIHNjaGVtZS4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGludmFsaWQuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ3JlbGF0aXZlJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAncmVsYXRpdmUgb3IgYXV0aG9yaXR5JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCcvJyA9PSBjICYmICcvJyA9PSBpbnB1dFtjdXJzb3IrMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ2F1dGhvcml0eSBpZ25vcmUgc2xhc2hlcyc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnIoJ0V4cGVjdGVkIC8sIGdvdDogJyArIGMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAncmVsYXRpdmUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgJ3JlbGF0aXZlJzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faXNSZWxhdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmICgnZmlsZScgIT0gdGhpcy5fc2NoZW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2NoZW1lID0gYmFzZS5fc2NoZW1lO1xuICAgICAgICAgICAgICAgICAgICBpZiAoRU9GID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2hvc3QgPSBiYXNlLl9ob3N0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcG9ydCA9IGJhc2UuX3BvcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wYXRoID0gYmFzZS5fcGF0aC5zbGljZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcXVlcnkgPSBiYXNlLl9xdWVyeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3VzZXJuYW1lID0gYmFzZS5fdXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wYXNzd29yZCA9IGJhc2UuX3Bhc3N3b3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWsgbG9vcDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgnLycgPT0gYyB8fCAnXFxcXCcgPT0gYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCdcXFxcJyA9PSBjKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycignXFxcXCBpcyBhbiBpbnZhbGlkIGNvZGUgcG9pbnQuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdyZWxhdGl2ZSBzbGFzaCc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJz8nID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2hvc3QgPSBiYXNlLl9ob3N0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcG9ydCA9IGJhc2UuX3BvcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wYXRoID0gYmFzZS5fcGF0aC5zbGljZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcXVlcnkgPSAnPyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl91c2VybmFtZSA9IGJhc2UuX3VzZXJuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGFzc3dvcmQgPSBiYXNlLl9wYXNzd29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ3F1ZXJ5JztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgnIycgPT0gYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5faG9zdCA9IGJhc2UuX2hvc3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wb3J0ID0gYmFzZS5fcG9ydDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BhdGggPSBiYXNlLl9wYXRoLnNsaWNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9xdWVyeSA9IGJhc2UuX3F1ZXJ5O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZnJhZ21lbnQgPSAnIyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl91c2VybmFtZSA9IGJhc2UuX3VzZXJuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGFzc3dvcmQgPSBiYXNlLl9wYXNzd29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ2ZyYWdtZW50JztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXh0QyA9IGlucHV0W2N1cnNvcisxXVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5leHROZXh0QyA9IGlucHV0W2N1cnNvcisyXVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdmaWxlJyAhPSB0aGlzLl9zY2hlbWUgfHwgIUFMUEhBLnRlc3QoYykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAobmV4dEMgIT0gJzonICYmIG5leHRDICE9ICd8JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoRU9GICE9IG5leHROZXh0QyAmJiAnLycgIT0gbmV4dE5leHRDICYmICdcXFxcJyAhPSBuZXh0TmV4dEMgJiYgJz8nICE9IG5leHROZXh0QyAmJiAnIycgIT0gbmV4dE5leHRDKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2hvc3QgPSBiYXNlLl9ob3N0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BvcnQgPSBiYXNlLl9wb3J0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3VzZXJuYW1lID0gYmFzZS5fdXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGFzc3dvcmQgPSBiYXNlLl9wYXNzd29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wYXRoID0gYmFzZS5fcGF0aC5zbGljZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BhdGgucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdyZWxhdGl2ZSBwYXRoJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAncmVsYXRpdmUgc2xhc2gnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoJy8nID09IGMgfHwgJ1xcXFwnID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnXFxcXCcgPT0gYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycignXFxcXCBpcyBhbiBpbnZhbGlkIGNvZGUgcG9pbnQuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJ2ZpbGUnID09IHRoaXMuX3NjaGVtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ2ZpbGUgaG9zdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ2F1dGhvcml0eSBpZ25vcmUgc2xhc2hlcyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJ2ZpbGUnICE9IHRoaXMuX3NjaGVtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2hvc3QgPSBiYXNlLl9ob3N0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BvcnQgPSBiYXNlLl9wb3J0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3VzZXJuYW1lID0gYmFzZS5fdXNlcm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGFzc3dvcmQgPSBiYXNlLl9wYXNzd29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ3JlbGF0aXZlIHBhdGgnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdhdXRob3JpdHkgZmlyc3Qgc2xhc2gnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoJy8nID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ2F1dGhvcml0eSBzZWNvbmQgc2xhc2gnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyKFwiRXhwZWN0ZWQgJy8nLCBnb3Q6IFwiICsgYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdhdXRob3JpdHkgaWdub3JlIHNsYXNoZXMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdhdXRob3JpdHkgc2Vjb25kIHNsYXNoJzpcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAnYXV0aG9yaXR5IGlnbm9yZSBzbGFzaGVzJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKCcvJyAhPSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnIoXCJFeHBlY3RlZCAnLycsIGdvdDogXCIgKyBjKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAnYXV0aG9yaXR5IGlnbm9yZSBzbGFzaGVzJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCcvJyAhPSBjICYmICdcXFxcJyAhPSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdhdXRob3JpdHknO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnIoJ0V4cGVjdGVkIGF1dGhvcml0eSwgZ290OiAnICsgYyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdhdXRob3JpdHknOlxuICAgICAgICAgICAgICAgICAgICBpZiAoJ0AnID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWVuQXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnIoJ0AgYWxyZWFkeSBzZWVuLicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciArPSAnJTQwJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlZW5BdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1ZmZlci5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjcCA9IGJ1ZmZlcltpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJ1xcdCcgPT0gY3AgfHwgJ1xcbicgPT0gY3AgfHwgJ1xccicgPT0gY3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyKCdJbnZhbGlkIHdoaXRlc3BhY2UgaW4gYXV0aG9yaXR5LicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gWFhYIGNoZWNrIFVSTCBjb2RlIHBvaW50c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnOicgPT0gY3AgJiYgbnVsbCA9PT0gdGhpcy5fcGFzc3dvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcGFzc3dvcmQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wQyA9IHBlcmNlbnRFc2NhcGUoY3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChudWxsICE9PSB0aGlzLl9wYXNzd29yZCkgPyB0aGlzLl9wYXNzd29yZCArPSB0ZW1wQyA6IHRoaXMuX3VzZXJuYW1lICs9IHRlbXBDO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoRU9GID09IGMgfHwgJy8nID09IGMgfHwgJ1xcXFwnID09IGMgfHwgJz8nID09IGMgfHwgJyMnID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvciAtPSBidWZmZXIubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdob3N0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyICs9IGM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdmaWxlIGhvc3QnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRU9GID09IGMgfHwgJy8nID09IGMgfHwgJ1xcXFwnID09IGMgfHwgJz8nID09IGMgfHwgJyMnID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChidWZmZXIubGVuZ3RoID09IDIgJiYgQUxQSEEudGVzdChidWZmZXJbMF0pICYmIChidWZmZXJbMV0gPT0gJzonIHx8IGJ1ZmZlclsxXSA9PSAnfCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAncmVsYXRpdmUgcGF0aCc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGJ1ZmZlci5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ3JlbGF0aXZlIHBhdGggc3RhcnQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9ob3N0ID0gSUROQVRvQVNDSUkuY2FsbCh0aGlzLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ3JlbGF0aXZlIHBhdGggc3RhcnQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJ1xcdCcgPT0gYyB8fCAnXFxuJyA9PSBjIHx8ICdcXHInID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycignSW52YWxpZCB3aGl0ZXNwYWNlIGluIGZpbGUgaG9zdC4nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciArPSBjO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAnaG9zdCc6XG4gICAgICAgICAgICAgICAgY2FzZSAnaG9zdG5hbWUnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoJzonID09IGMgJiYgIXNlZW5CcmFja2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBYWFggaG9zdCBwYXJzaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9ob3N0ID0gSUROQVRvQVNDSUkuY2FsbCh0aGlzLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdwb3J0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnaG9zdG5hbWUnID09IHN0YXRlT3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhayBsb29wO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEVPRiA9PSBjIHx8ICcvJyA9PSBjIHx8ICdcXFxcJyA9PSBjIHx8ICc/JyA9PSBjIHx8ICcjJyA9PSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9ob3N0ID0gSUROQVRvQVNDSUkuY2FsbCh0aGlzLCBidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdyZWxhdGl2ZSBwYXRoIHN0YXJ0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGF0ZU92ZXJyaWRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWsgbG9vcDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCdcXHQnICE9IGMgJiYgJ1xcbicgIT0gYyAmJiAnXFxyJyAhPSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJ1snID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWVuQnJhY2tldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCddJyA9PSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VlbkJyYWNrZXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciArPSBjO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyKCdJbnZhbGlkIGNvZGUgcG9pbnQgaW4gaG9zdC9ob3N0bmFtZTogJyArIGMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAncG9ydCc6XG4gICAgICAgICAgICAgICAgICAgIGlmICgvWzAtOV0vLnRlc3QoYykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciArPSBjO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEVPRiA9PSBjIHx8ICcvJyA9PSBjIHx8ICdcXFxcJyA9PSBjIHx8ICc/JyA9PSBjIHx8ICcjJyA9PSBjIHx8IHN0YXRlT3ZlcnJpZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnJyAhPSBidWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcCA9IHBhcnNlSW50KGJ1ZmZlciwgMTApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZW1wICE9IHJlbGF0aXZlW3RoaXMuX3NjaGVtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcG9ydCA9IHRlbXAgKyAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGVPdmVycmlkZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrIGxvb3A7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdyZWxhdGl2ZSBwYXRoIHN0YXJ0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCdcXHQnID09IGMgfHwgJ1xcbicgPT0gYyB8fCAnXFxyJyA9PSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnIoJ0ludmFsaWQgY29kZSBwb2ludCBpbiBwb3J0OiAnICsgYyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnZhbGlkLmNhbGwodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdyZWxhdGl2ZSBwYXRoIHN0YXJ0JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCdcXFxcJyA9PSBjKVxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyKFwiJ1xcXFwnIG5vdCBhbGxvd2VkIGluIHBhdGguXCIpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdyZWxhdGl2ZSBwYXRoJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKCcvJyAhPSBjICYmICdcXFxcJyAhPSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgJ3JlbGF0aXZlIHBhdGgnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRU9GID09IGMgfHwgJy8nID09IGMgfHwgJ1xcXFwnID09IGMgfHwgKCFzdGF0ZU92ZXJyaWRlICYmICgnPycgPT0gYyB8fCAnIycgPT0gYykpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJ1xcXFwnID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnIoJ1xcXFwgbm90IGFsbG93ZWQgaW4gcmVsYXRpdmUgcGF0aC4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0bXA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodG1wID0gcmVsYXRpdmVQYXRoRG90TWFwcGluZ1tidWZmZXIudG9Mb3dlckNhc2UoKV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0bXA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJy4uJyA9PSBidWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wYXRoLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnLycgIT0gYyAmJiAnXFxcXCcgIT0gYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wYXRoLnB1c2goJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJy4nID09IGJ1ZmZlciAmJiAnLycgIT0gYyAmJiAnXFxcXCcgIT0gYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BhdGgucHVzaCgnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCcuJyAhPSBidWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJ2ZpbGUnID09IHRoaXMuX3NjaGVtZSAmJiB0aGlzLl9wYXRoLmxlbmd0aCA9PSAwICYmIGJ1ZmZlci5sZW5ndGggPT0gMiAmJiBBTFBIQS50ZXN0KGJ1ZmZlclswXSkgJiYgYnVmZmVyWzFdID09ICd8Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSBidWZmZXJbMF0gKyAnOic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3BhdGgucHVzaChidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJz8nID09IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9xdWVyeSA9ICc/JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9ICdxdWVyeSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCcjJyA9PSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZnJhZ21lbnQgPSAnIyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAnZnJhZ21lbnQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCdcXHQnICE9IGMgJiYgJ1xcbicgIT0gYyAmJiAnXFxyJyAhPSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgKz0gcGVyY2VudEVzY2FwZShjKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdGF0ZU92ZXJyaWRlICYmICcjJyA9PSBjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9mcmFnbWVudCA9ICcjJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gJ2ZyYWdtZW50JztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChFT0YgIT0gYyAmJiAnXFx0JyAhPSBjICYmICdcXG4nICE9IGMgJiYgJ1xccicgIT0gYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcXVlcnkgKz0gcGVyY2VudEVzY2FwZVF1ZXJ5KGMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAnZnJhZ21lbnQnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoRU9GICE9IGMgJiYgJ1xcdCcgIT0gYyAmJiAnXFxuJyAhPSBjICYmICdcXHInICE9IGMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2ZyYWdtZW50ICs9IGM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGN1cnNvcisrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgICAgIHRoaXMuX3NjaGVtZSA9ICcnO1xuICAgICAgICB0aGlzLl9zY2hlbWVEYXRhID0gJyc7XG4gICAgICAgIHRoaXMuX3VzZXJuYW1lID0gJyc7XG4gICAgICAgIHRoaXMuX3Bhc3N3b3JkID0gbnVsbDtcbiAgICAgICAgdGhpcy5faG9zdCA9ICcnO1xuICAgICAgICB0aGlzLl9wb3J0ID0gJyc7XG4gICAgICAgIHRoaXMuX3BhdGggPSBbXTtcbiAgICAgICAgdGhpcy5fcXVlcnkgPSAnJztcbiAgICAgICAgdGhpcy5fZnJhZ21lbnQgPSAnJztcbiAgICAgICAgdGhpcy5faXNJbnZhbGlkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2lzUmVsYXRpdmUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBEb2VzIG5vdCBwcm9jZXNzIGRvbWFpbiBuYW1lcyBvciBJUCBhZGRyZXNzZXMuXG4gICAgLy8gRG9lcyBub3QgaGFuZGxlIGVuY29kaW5nIGZvciB0aGUgcXVlcnkgcGFyYW1ldGVyLlxuICAgIGZ1bmN0aW9uIGpVUkwodXJsLCBiYXNlIC8qICwgZW5jb2RpbmcgKi8pIHtcbiAgICAgICAgaWYgKGJhc2UgIT09IHVuZGVmaW5lZCAmJiAhKGJhc2UgaW5zdGFuY2VvZiBqVVJMKSlcbiAgICAgICAgICAgIGJhc2UgPSBuZXcgalVSTChTdHJpbmcoYmFzZSkpO1xuXG4gICAgICAgIHRoaXMuX3VybCA9IHVybDtcbiAgICAgICAgY2xlYXIuY2FsbCh0aGlzKTtcblxuICAgICAgICB2YXIgaW5wdXQgPSB1cmwucmVwbGFjZSgvXlsgXFx0XFxyXFxuXFxmXSt8WyBcXHRcXHJcXG5cXGZdKyQvZywgJycpO1xuICAgICAgICAvLyBlbmNvZGluZyA9IGVuY29kaW5nIHx8ICd1dGYtOCdcblxuICAgICAgICBwYXJzZS5jYWxsKHRoaXMsIGlucHV0LCBudWxsLCBiYXNlKTtcbiAgICB9XG5cbiAgICBqVVJMLnByb3RvdHlwZSA9IHtcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaHJlZjtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0IGhyZWYoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5faXNJbnZhbGlkKVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl91cmw7XG5cbiAgICAgICAgICAgIHZhciBhdXRob3JpdHkgPSAnJztcbiAgICAgICAgICAgIGlmICgnJyAhPSB0aGlzLl91c2VybmFtZSB8fCBudWxsICE9IHRoaXMuX3Bhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgYXV0aG9yaXR5ID0gdGhpcy5fdXNlcm5hbWUgK1xuICAgICAgICAgICAgICAgICAgICAobnVsbCAhPSB0aGlzLl9wYXNzd29yZCA/ICc6JyArIHRoaXMuX3Bhc3N3b3JkIDogJycpICsgJ0AnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wcm90b2NvbCArXG4gICAgICAgICAgICAgICAgKHRoaXMuX2lzUmVsYXRpdmUgPyAnLy8nICsgYXV0aG9yaXR5ICsgdGhpcy5ob3N0IDogJycpICtcbiAgICAgICAgICAgICAgICB0aGlzLnBhdGhuYW1lICsgdGhpcy5fcXVlcnkgKyB0aGlzLl9mcmFnbWVudDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0IGhyZWYoaHJlZikge1xuICAgICAgICAgICAgY2xlYXIuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHBhcnNlLmNhbGwodGhpcywgaHJlZik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0IHByb3RvY29sKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NjaGVtZSArICc6JztcbiAgICAgICAgfSxcbiAgICAgICAgc2V0IHByb3RvY29sKHByb3RvY29sKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5faXNJbnZhbGlkKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHBhcnNlLmNhbGwodGhpcywgcHJvdG9jb2wgKyAnOicsICdzY2hlbWUgc3RhcnQnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXQgaG9zdCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc0ludmFsaWQgPyAnJyA6IHRoaXMuX3BvcnQgP1xuICAgICAgICAgICAgdGhpcy5faG9zdCArICc6JyArIHRoaXMuX3BvcnQgOiB0aGlzLl9ob3N0O1xuICAgICAgICB9LFxuICAgICAgICBzZXQgaG9zdChob3N0KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5faXNJbnZhbGlkIHx8ICF0aGlzLl9pc1JlbGF0aXZlKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHBhcnNlLmNhbGwodGhpcywgaG9zdCwgJ2hvc3QnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXQgaG9zdG5hbWUoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faG9zdDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0IGhvc3RuYW1lKGhvc3RuYW1lKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5faXNJbnZhbGlkIHx8ICF0aGlzLl9pc1JlbGF0aXZlKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIHBhcnNlLmNhbGwodGhpcywgaG9zdG5hbWUsICdob3N0bmFtZScpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldCBwb3J0KCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BvcnQ7XG4gICAgICAgIH0sXG4gICAgICAgIHNldCBwb3J0KHBvcnQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc0ludmFsaWQgfHwgIXRoaXMuX2lzUmVsYXRpdmUpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgcGFyc2UuY2FsbCh0aGlzLCBwb3J0LCAncG9ydCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldCBwYXRobmFtZSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc0ludmFsaWQgPyAnJyA6IHRoaXMuX2lzUmVsYXRpdmUgP1xuICAgICAgICAgICAgJy8nICsgdGhpcy5fcGF0aC5qb2luKCcvJykgOiB0aGlzLl9zY2hlbWVEYXRhO1xuICAgICAgICB9LFxuICAgICAgICBzZXQgcGF0aG5hbWUocGF0aG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pc0ludmFsaWQgfHwgIXRoaXMuX2lzUmVsYXRpdmUpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgdGhpcy5fcGF0aCA9IFtdO1xuICAgICAgICAgICAgcGFyc2UuY2FsbCh0aGlzLCBwYXRobmFtZSwgJ3JlbGF0aXZlIHBhdGggc3RhcnQnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXQgc2VhcmNoKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzSW52YWxpZCB8fCAhdGhpcy5fcXVlcnkgfHwgJz8nID09IHRoaXMuX3F1ZXJ5ID9cbiAgICAgICAgICAgICAgICAnJyA6IHRoaXMuX3F1ZXJ5O1xuICAgICAgICB9LFxuICAgICAgICBzZXQgc2VhcmNoKHNlYXJjaCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzSW52YWxpZCB8fCAhdGhpcy5faXNSZWxhdGl2ZSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB0aGlzLl9xdWVyeSA9ICc/JztcbiAgICAgICAgICAgIGlmICgnPycgPT0gc2VhcmNoWzBdKVxuICAgICAgICAgICAgICAgIHNlYXJjaCA9IHNlYXJjaC5zbGljZSgxKTtcbiAgICAgICAgICAgIHBhcnNlLmNhbGwodGhpcywgc2VhcmNoLCAncXVlcnknKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXQgaGFzaCgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc0ludmFsaWQgfHwgIXRoaXMuX2ZyYWdtZW50IHx8ICcjJyA9PSB0aGlzLl9mcmFnbWVudCA/XG4gICAgICAgICAgICAgICAgJycgOiB0aGlzLl9mcmFnbWVudDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0IGhhc2goaGFzaCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzSW52YWxpZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB0aGlzLl9mcmFnbWVudCA9ICcjJztcbiAgICAgICAgICAgIGlmICgnIycgPT0gaGFzaFswXSlcbiAgICAgICAgICAgICAgICBoYXNoID0gaGFzaC5zbGljZSgxKTtcbiAgICAgICAgICAgIHBhcnNlLmNhbGwodGhpcywgaGFzaCwgJ2ZyYWdtZW50Jyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0IG9yaWdpbigpIHtcbiAgICAgICAgICAgIHZhciBob3N0O1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzSW52YWxpZCB8fCAhdGhpcy5fc2NoZW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gamF2YXNjcmlwdDogR2Vja28gcmV0dXJucyBTdHJpbmcoXCJcIiksIFdlYktpdC9CbGluayBTdHJpbmcoXCJudWxsXCIpXG4gICAgICAgICAgICAvLyBHZWNrbyB0aHJvd3MgZXJyb3IgZm9yIFwiZGF0YTovL1wiXG4gICAgICAgICAgICAvLyBkYXRhOiBHZWNrbyByZXR1cm5zIFwiXCIsIEJsaW5rIHJldHVybnMgXCJkYXRhOi8vXCIsIFdlYktpdCByZXR1cm5zIFwibnVsbFwiXG4gICAgICAgICAgICAvLyBHZWNrbyByZXR1cm5zIFN0cmluZyhcIlwiKSBmb3IgZmlsZTogbWFpbHRvOlxuICAgICAgICAgICAgLy8gV2ViS2l0L0JsaW5rIHJldHVybnMgU3RyaW5nKFwiU0NIRU1FOi8vXCIpIGZvciBmaWxlOiBtYWlsdG86XG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuX3NjaGVtZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2RhdGEnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2ZpbGUnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2phdmFzY3JpcHQnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ21haWx0byc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnbnVsbCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBob3N0ID0gdGhpcy5ob3N0O1xuICAgICAgICAgICAgaWYgKCFob3N0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NjaGVtZSArICc6Ly8nICsgaG9zdDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBDb3B5IG92ZXIgdGhlIHN0YXRpYyBtZXRob2RzXG4gICAgdmFyIE9yaWdpbmFsVVJMID0gc2NvcGUuVVJMO1xuICAgIGlmIChPcmlnaW5hbFVSTCkge1xuICAgICAgICBqVVJMLmNyZWF0ZU9iamVjdFVSTCA9IGZ1bmN0aW9uKGJsb2IpIHtcbiAgICAgICAgICAgIC8vIElFIGV4dGVuc2lvbiBhbGxvd3MgYSBzZWNvbmQgb3B0aW9uYWwgb3B0aW9ucyBhcmd1bWVudC5cbiAgICAgICAgICAgIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9oaDc3MjMwMih2PXZzLjg1KS5hc3B4XG4gICAgICAgICAgICByZXR1cm4gT3JpZ2luYWxVUkwuY3JlYXRlT2JqZWN0VVJMLmFwcGx5KE9yaWdpbmFsVVJMLCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuICAgICAgICBqVVJMLnJldm9rZU9iamVjdFVSTCA9IGZ1bmN0aW9uKHVybCkge1xuICAgICAgICAgICAgT3JpZ2luYWxVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgc2NvcGUuVVJMID0galVSTDtcblxufSkoc2VsZik7Il19