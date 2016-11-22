import express from 'express';
import http from 'http';
import path from 'path';
import bodyParser from 'body-parser';

export default class Server {
    constructor(port) {
        this._app = express();
        this._port = port;
        this._appServerUp = false;
        this._appServer = http.createServer(this._app);
        this._app.use(bodyParser.urlencoded({ extended: true }));
        this._app.use(bodyParser.json());
        this._serveStaticFiles();
        this._app.get('*', (req, res) => {
            res.sendFile(path.resolve(__dirname, '../public/index.html'));
        });
    }

    _serveStaticFiles() {
        this._app.use('/js', express.static('../public/js', { maxAge: '1d' }));
        this._app.use('/styles', express.static('../public/styles', { maxAge: '1d' }));
        this._app.use('/sw.js', express.static('../public/sw.js', { maxAge: 0 }));
        this._app.use('/manifest.json', express.static('../public/manifest.json', { maxAge: 0}));
        this._app.use('/imgs', express.static('../public/imgs', { maxAge: 0 }));
        this._app.use('/json', express.static('../public/json', { maxAge: 0 }));
        this._app.use('/fonts', express.static('../public/fonts', { maxAge: '1y' }));
        this._app.use('/templates', express.static('../public/templates', { maxAge: '1y' }));
    }
    _listen() {
        if (!this._appServerUp) {
            this._appServer.listen(process.env.PORT || this._port, "0.0.0.0", _ => {
                console.log("\n\n ***** Server Listening on localhost:" + this._port + " ***** \n\n");
            });
            this._appServerUp = true;
        }
    }
}