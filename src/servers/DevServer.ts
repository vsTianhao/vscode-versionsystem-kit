import serveStatic from 'serve-static'
import connectLivereload from 'connect-livereload'
import connect from 'connect'
import ChangeSignalServer from './ChangeSignalServer'
import { fastify, FastifyInstance } from 'fastify'
import Middie from 'middie'
import LoggerFactory from '../LoggerFactory'

export interface DevServerParams {
	host: string;//开发服务器的地址, 一般是'127.0.0.1'或'0.0.0.0'
	port: number;//开发服务器端口
	folder: string;//服务器的文件夹
}

/**
 * 前端开发服务器的具体实现
 */
export class DevServer {

	private changeSignalServer: ChangeSignalServer;
	private app: FastifyInstance;
	private config: DevServerParams;
    private logger = LoggerFactory("dev-server")

	constructor(config: DevServerParams) {
		this.app = fastify({
			logger: false
		})
		this.changeSignalServer = new ChangeSignalServer()
		this.config = config
	}

	async load(): Promise<void> {
		await this.app.register(Middie)

		// http://livereload.com/tips/change-port-number-livereload-listens-on/
		// 35729是标准Livereload端口
		this.changeSignalServer.listen(35729, this.config.host)
		this.logger.info("35729 信号服务器已伴随启动")
		this.app.use(connectLivereload({ port: 35729 }) as connect.SimpleHandleFunction)

		this.app.listen(this.config.port, this.config.host)

		this.app.use("/", serveStatic(this.config.folder))

		this.app.addHook('onClose', async () => {
			this.changeSignalServer.close()
			this.logger.info("35729 信号服务器伴随前端开发服务器停止")
		})
	}

	async close(): Promise<void> {
		await this.app.close()
        this.logger.info("前端开发服务器已停止")
	}

	changed(path: string): void {
		this.changeSignalServer.changed(path)
	}

	clients(): void {
		return this.changeSignalServer.getClientIDs()
	}

}
