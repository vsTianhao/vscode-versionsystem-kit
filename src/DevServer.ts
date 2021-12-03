import serveStatic from 'serve-static'
import connectLivereload from 'connect-livereload'
import connect from 'connect'
import eventStream from 'event-stream'
import fastify from 'fastify'
import Middie from 'middie'
import LoggerFactory from './LoggerFactory'
import CommonFile from './types/CommonFile'
import * as http from "http"

export default async function (tinyLr, options): Promise<eventStream.MapStream> {

	const logger = LoggerFactory("server")

	const config = Object.assign({
		host: '127.0.0.1',
		path: '/'
	}, options)

	const app = fastify({
		logger: false
	})

	await app.register(Middie)

	const stream = eventStream.map(function (file: CommonFile, done: (nope?: void, file?: CommonFile) => void) {
		app.use(config.path, serveStatic(file.path))
		app.use(tinyLr.middleware({ app }))
		done()
	})

	// https://github.com/mklabs/tiny-lr/blob/907f6b6b04ff42f06d58b972107be4a5d5bd7ead/lib/server.js#L86
	// 35729是标准Livereload端口
	app.use((req: connect.IncomingMessage, res: http.ServerResponse) => {
		const loadFn: connect.ErrorHandleFunction = connectLivereload({ port: 35729 }) as connect.ErrorHandleFunction
		loadFn(null, req, res, null)
	})
	tinyLr().listen(35729, config.host)

	app.listen(config.port, '0.0.0.0')

	logger.info("前端服务器启动完成: http://" + config.host + ":" + config.port)

	return stream
}
