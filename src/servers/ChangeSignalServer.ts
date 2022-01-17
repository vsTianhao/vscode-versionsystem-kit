import fs from 'fs'
import http from 'http'
import events from 'events'
import path from 'path'
import { parse } from 'url'
import WebSocket from 'faye-websocket'
import LoggerFactory from '../LoggerFactory'

const CONTENT_TYPE = 'content-type'
const FORM_TYPE = 'application/x-www-form-urlencoded'
const logger = LoggerFactory('change-signal-server')

class Client extends events.EventEmitter {

    public id: string;
    public createTime: string;
    public open: boolean;
    private ws: WebSocket;

    constructor(req, socket, head) {
        super()
        this.id = 'ws-' + Math.floor(Math.random() * 0xfffff).toString(16)
        this.ws = new WebSocket(req, socket, head)
        this.createTime = new Date().toJSON()
        this.open = true
        logger.trace("客户端【" + this.id + "】已经连接")
        this.ws.onmessage = (event): unknown => {
            const data = this.data(event)
            if (this[data.command]) {
                return this[data.command](data)
            } else {
                logger.warn("未知命令:" + data.command)
            }
        }
        this.ws.onclose = (): void => this.close()
    }

    close(): void {
        if (this.ws) {
            logger.trace("客户端【" + this.id + "】已经被关闭")
            this.ws.close()
            this.open = false
            this.ws = null
        }
    }

    hello(): void {
        this.send({
            command: 'hello',
            protocols: [
                'http://livereload.com/protocols/official-7'
            ],
            serverName: 'change-signal-server'
        })
    }

    info(data): void {
        if (data) {
            this.emit('info', Object.assign({}, data, { id: this.id }))
            this.url = data.url
        }
        return { id: this.id, url: this.url }
    }

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
export default class ChangeSignalServer extends events.EventEmitter {

    private server: http.Server;
    private rootPath: string;
    private clients: Map<string, Client>;

    constructor() {
        super()
        this.rootPath = "/"
        this.clients = new Map()
        this.server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse): void => {
            // const next = this.defaultHandler.bind(this, res)
            req.headers[CONTENT_TYPE] = req.headers[CONTENT_TYPE] || FORM_TYPE
            if (req.url.startsWith("/livereload.js")) {

                fs.createReadStream(path.join(__filename, '..', '..', 'resources/js/livereload.js')).pipe(res)
            }
        })
        this.server.on('upgrade', this.websocketify.bind(this))
        this.server.on('error', function (err) {
            logger.error(err)
        })
        this.on(`GET ${this.rootPath}`, this.index.bind(this))
        this.on(`GET ${this.rootPath}changed`, this.changed.bind(this))
        this.on(`POST ${this.rootPath}changed`, this.changed.bind(this))
        this.on(`GET ${this.rootPath}livereload.js`, async (req, res) => {
            res.setHeader('Content-Type', 'application/javascript')
            fs.createReadStream('../resources/js/livereload.min.js').pipe(res)
        })
        this.on(`GET ${this.rootPath}kill`, () => {
            this.close()
        })
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
        logger.error(err)
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
        const client: Client = new Client(req, socket, head)
        this.clients.set(client.id, client)
        socket.on('error', (e) => {
            if (e.code === 'ECONNRESET') return
            logger.error(e)
        })

        client.once('info', (data) => {
            this.emit('MSG /create', data.id, data.url)
        })

        client.once('end', () => {
            // this.emit('MSG /destroy', client.id, client.url)
            this.emit('MSG /destroy', client.id)
            this.clients.delete(client.id)
        })
    }

    close(): void {
        for (const client of this.clients.values()) {
            if (client.open) {
                client.close()
                logger.info("因服务器关闭，已中断与【" + client.id + "】的连接")
            }
        }
        this.server.close()
    }

    changed(_path: string): void {
        for (const clientItem of this.clients.values()) {
            if (clientItem.open) {
                clientItem.reload(_path)
            }
        }
    }

    getClientIDs(): string[] {
        const ret: string[] = new Array<string>()
        for (const clientItem of this.clients.values()) {
            if (!clientItem.open) {
                continue
            }
            ret.push(`${clientItem.id} (${clientItem.createTime})`)
        }
        return ret
    }

}
