import tinyLr from 'tiny-lr'
import path from 'path'
import { DevServer, DevServerParams } from './servers/DevServer'
import prompt from 'prompt'

const server = (async function (): Promise<void> {
    const config: DevServerParams = {
        host: '127.0.0.1',
        port: 1234,
        folder: path.join("e:/idea/EmrWebApp-PAN", "client")
    }
    const app = await DevServer(config, tinyLr)
    console.log("前端服务器启动完成: http://" + config.host + ":" + config.port)
    prompt.get(['password'], async (err, result) => {
        console.log(result)
        await app.close()
        console.log("前端服务器已经关闭")
    })
})
server()
// DevServer(tinyLr)
