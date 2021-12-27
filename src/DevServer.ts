import serveStatic from 'serve-static'
import connectLivereload from 'connect-livereload'
import connect from 'connect'
import { fastify, FastifyInstance } from 'fastify'
import Middie from 'middie'

export interface DevServerParams {
	host: string;//开发服务器的地址，一般是'127.0.0.1'或'0.0.0.0'
	port: number;//开发服务器端口
	folder: string;//服务器的文件夹
}

export async function DevServer(config: DevServerParams, tinyLr): Promise<FastifyInstance> {

	const app = fastify({
		logger: false
	})

	await app.register(Middie)

	// https://github.com/mklabs/tiny-lr/blob/907f6b6b04ff42f06d58b972107be4a5d5bd7ead/lib/server.js#L86
	// 35729是标准Livereload端口
	const tinyLrServer = tinyLr()
	tinyLrServer.listen(35729, config.host)
	app.use(connectLivereload({ port: 35729 }) as connect.SimpleHandleFunction)

	app.listen(config.port, config.host)

	app.use("/", serveStatic(config.folder))
	app.use(tinyLr.middleware({ app }))

	app.addHook('onClose', async () => {
		tinyLrServer.close()
	})

	return app
}
