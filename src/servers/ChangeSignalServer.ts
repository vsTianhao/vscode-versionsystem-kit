import fs from 'fs'
import http from 'http'
import events from 'events'
import { parse } from 'url'
// import anybody from 'body/any'
// import qs from 'qs'
// import livereloadService from 'livereload-js'
import WebSocket from 'faye-websocket'
import objectAssign from 'object-assign'

const CONTENT_TYPE = 'content-type'
const FORM_TYPE = 'application/x-www-form-urlencoded'

class Client extends events.EventEmitter {

    public id: string;
    private ws: WebSocket;

    constructor(req, socket, head) {
        super()
        this.ws = new WebSocket(req, socket, head)
        // this.ws.onmessage = (event): unknown => {
        //     const data = this.data(event)
        //     if (this[data.command]) return this[data.command](data)
        // }
        this.ws.onclose = this.close.bind(this)
        this.id = 'ws' + Math.random()
    }

    close(event): void {
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
        this.emit('end', event)
    }

    // info(data): void {
    //     if (data) {
    //         this.emit('info', objectAssign({}, data, { id: this.id }))
    //         this.url = data.url
    //     }

    //     return objectAssign({}, data || {}, { id: this.id, url: this.url })
    // }

    reload(file: string): void {
        this.send({
            command: 'reload',
            path: file,
            liveCSS: true,
            reloadMissingCSS: true,
            liveImg: true
        })
    }

    data(event): unknown {
        let data// TODO grammar 有趣的地方，应该能const
        try {
            data = JSON.parse(event.data)
        } catch (e) {
            data = { error: e }
        }
        return data
    }

    send(data): void {
        if (!this.ws) return
        this.ws.send(JSON.stringify(data))
    }

}

/**
 * 传递修改信号的服务器
 */
export default class extends events.EventEmitter {

    private server: http.Server;
    private rootPath: string;
    private clients: unknown;

    constructor() {
        super()
        this.rootPath = "/"
        this.clients = {}
        this.server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse): void => {
            // const next = this.defaultHandler.bind(this, res)
            req.headers[CONTENT_TYPE] = req.headers[CONTENT_TYPE] || FORM_TYPE
            // anybody(req, res, (err, body) => {
            //     if (err) return next(err)
            //     req.body = body
            //     if (!req.query) {
            //         req.query = req.url.indexOf('?') !== -1
            //             ? qs.parse(parse(req.url).query)
            //             : {}
            //     }

            //     return this.handle(req, res, next)
            // })
        })
        this.server.on('upgrade', this.websocketify.bind(this))
        this.server.on('error', this.error.bind(this))
        this.on(`GET ${this.rootPath}`, this.index.bind(this))
        this.on(`GET ${this.rootPath}changed`, this.changed.bind(this))
        this.on(`POST ${this.rootPath}changed`, this.changed.bind(this))
        this.on(`GET ${this.rootPath}livereload.js`, async (req, res) => {
            res.setHeader('Content-Type', 'application/javascript')
            fs.createReadStream('../resources/js/livereload.min.js').pipe(res)
        })
        this.on(`GET ${this.rootPath}kill`, this.close.bind(this))
    }

    listen(port: number, host: string): void {
        this.server.listen(port, host)
    }

    index(req: http.IncomingMessage, res: http.ServerResponse): void {
        res.setHeader('Content-Type', 'application/json')
        res.write(JSON.stringify({
            tinylr: 'Welcome',
            version: "Undecided version"
        }))

        res.end()
    }

    handle(req, res, next): void {
        const url = parse(req.url)
        const middleware = typeof next === 'function'
        const route = req.method + ' ' + url.pathname
        const respond = this.emit(route, req, res)
        if (respond) return

        if (middleware) return next()
        return this.notFound(res)
    }

    defaultHandler(res, err): void {
        if (!err) return this.notFound(res)
        this.error(err)
        res.setHeader('Content-Type', 'text/plain')
        res.statusCode = 500
        res.end('Error: ' + err.stack)
    }

    notFound(res): void {
        res.setHeader('Content-Type', 'application/json')
        res.writeHead(404)
        res.write(JSON.stringify({
            error: 'not_found',
            reason: 'no such route'
        }))
        res.end()
    }

    websocketify(req, socket, head): void {
        const client = new Client(req, socket, head)
        this.clients[client.id] = client
        socket.on('error', (e) => {
            if (e.code === 'ECONNRESET') return
            this.error(e)
        })

        client.once('info', (data) => {
            this.emit('MSG /create', data.id, data.url)
        })

        client.once('end', () => {
            // this.emit('MSG /destroy', client.id, client.url)
            this.emit('MSG /destroy', client.id)
            delete this.clients[client.id]
        })
    }

    close(): void {
        Object.keys(this.clients).forEach(function (id) {
            this.clients[id].close()
        }, this)
        this.server.close()
    }

    error(e): void {
        if (typeof e === 'undefined') {
            console.error('... Uhoh. Got error %s ...')
            return
        }
        console.error('... Uhoh. Got error %s ...', e.message)
        console.error(e.stack)
        if (e.code !== 'EADDRINUSE') return
        console.error('You already have a server listen')
        console.error('You should stop it and try again.')
    }

    changed(path: string): void {
        Object.keys(this.clients).map(function (id) {
            const client = this.clients[id]
            client.reload(path)
            return {
                id: client.id,
                url: client.url
            }
        }, this)
    }

    param(name, req): void {
        let param
        if (req.body && req.body[name]) param = req.body[name]
        else if (req.params && req.params[name]) param = req.params[name]
        else if (req.query && req.query[name]) param = req.query[name]

        if (name === 'files') {
            param = Array.isArray(param) ? param
                : typeof param === 'string' ? param.split(/[\s,]/)
                    : []
        }
        return param
    }
}
