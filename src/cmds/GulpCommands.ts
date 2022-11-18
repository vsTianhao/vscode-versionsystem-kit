import * as vscode from "vscode"
import gulp from 'gulp'
import LoggerFactory from '../LoggerFactory'
import Configuration from '../Configuration'
import CommonFile from '../types/CommonFile'
import eventStream from 'event-stream'
import GulpWrapper from '../gulp/GulpWrapper'
import { exec } from 'child_process'
import * as path from 'path'
import { DevServer, DevServerParams } from '../servers/DevServer'

const logger = LoggerFactory("gulp-task")
const gw = new GulpWrapper()
let serverEstablished = false
let instanceServer: DevServer

const taskBeforeValidateFn = (): boolean => {
    if (!Configuration("devServerPort")) {
        logger.error("没有开发端口号, 是否在项目下的./.vscode目录中缺少配置？也可以配置成全局的, 请查看当前环境的配置")
        return true
    }
    if (!Configuration("mainJS")) {
        logger.error("在VSCode的settings中必须要有完整的配置, 目前约有十几项, 那些配置是必备的")
        return true
    }
    if (!gulp.task('clean')) {
        logger.warn('没有初始化扩展')
        logger.warn('正在尝试初始化')
        vscode.commands.executeCommand("vscode-versionsystem-kit.init")
        logger.warn('请在扩展初始化后重试')
        return true
    }
    return false
}

export async function run(type = "dev"): Promise<void> {
    if (taskBeforeValidateFn()) {
        return
    }
    try {
        if (type === "dev") {
            if (serverEstablished) {
                logger.error("你不能重复的打开前端开发服务器 (即使确定前端开发服务器已经关闭, 也必须尝试在面板上再关闭一下)")
                return
            }
            serverEstablished = true
            logger.info("准备启动前端开发服务器")
            logger.info("开始前置准备")
            await new Promise((resolve) => gulp.series('dev-index-html', "change-css-files", 'dev-css')(resolve))
            logger.info("前置准备已经妥善")
            const entries: string[] = Configuration("entries")
            gw.watchFiles("entries", "用于新增或删除js时,更新index.html中的引入列表").on('add', gulp.series('dev-index-html'))
                .on('unlink', gulp.series('dev-index-html'))
            gw.watchFiles("cssMatch", "用于新增或删除scss时,更新app.scss中的引入列表").on('add', gulp.series('change-css-files'))
                .on('unlink', gulp.series('change-css-files'))
                .on("change", gulp.series('dev-css'))
            gw.watchFiles("mainCSS", "用于修改scss时,重新编译出app.css").on("change", gulp.series('dev-css'))
            gw.watchFiles(entries.concat([Configuration("frondendMainHTML"), Configuration("appHTML"), Configuration("componentsHTML"), Configuration("mainJS")]), "用于js与html修改时,通知浏览器").on('change', (_path) => {
                instanceServer.changed(_path)
                logger.info("文件修改已通知:" + _path)
            })
            gw.watchFiles("integratedCSS", "用于css修改时,通知浏览器").on("change", (_path) => {
                instanceServer.changed(_path)
                logger.info("样式调整已经通知")
            })

            const config: DevServerParams = {
                host: '127.0.0.1',
                port: Configuration("devServerPort"),
                folder: path.join(Configuration("cwd"), "client")
            }
            instanceServer = new DevServer(config)
            await instanceServer.load()
            logger.info("前端开发服务器启动成功: http://" + config.host + ":" + config.port)
            logger.info("完毕")
        } else if (type === "shutdown") {
            if (!serverEstablished) {
                logger.warn("前端开发服务器标记为已关闭状态")
                return
            }
            logger.info("准备关闭前端开发服务器")
            serverEstablished = false
            const watchSize = gw.closeWatchs()
            logger.info("已经关闭" + watchSize + "个监听器")
            await instanceServer.close()
        } else if (type === "signalServer") {
            if (!serverEstablished || !instanceServer) {
                logger.error("想查看信号服务器的连接情况必须先启动前端开发服务器")
                logger.error("前端开发服务器关闭状态")
                return
            }
            const clients = instanceServer.clients()
            if (!clients.length) {
                vscode.window.showInformationMessage("信号服务器已开启, 但没有任何连接")
                return
            }
            vscode.window.showQuickPick(clients, {
                title: "所有连接到信号服务器的WebSocket",
                placeHolder: "搜索"
            }).then((e) => {
                vscode.env.clipboard.writeText(e)
            })
        }
    } catch (error) {
        logger.error("gulp task error ↓")
        logger.error(error)
    }
}

export function build(type = "all"): void {
    if (taskBeforeValidateFn()) {
        return
    }
    if (type === "all") {
        gulp.series('clean',
            'build-internal-code',
            'copy-html',
            'rename-hash-file',
            "compile-jsp",
            "set-gw-cwd",
            (done) => {
                logger.info("完毕")
                vscode.window.showInformationMessage(
                    "编译完成上传到服务器吗?",
                    ...["是", "否"]
                ).then((answer) => {
                    if (answer === "是") {
                        vscode.commands.executeCommand("vscode-versionsystem-kit.upload")
                    }
                })
                done()
            })()
    }
}

export function appJS(type = "needAssume"): void {
    gulp.src(Configuration("mainJS"))
        .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
            let content = file.contents.toString()
            if (~content.indexOf(Configuration("serverURL"))) {
                logger.info("当前是服务器IP, 将改为本地IP")
                content = content.replace(Configuration("serverURL"), Configuration("localURL"))
                // content = content.replace("/*comment begin*/", "/*comment begin*/");
                if (type === "needAssume") {
                    exec("git update-index --assume-unchanged " + Configuration("mainJS"))
                }
            } else if (~content.indexOf(Configuration("localURL"))) {
                logger.info("当前是本地IP, 将改为服务器IP")
                content = content.replace(Configuration("localURL"), Configuration("serverURL"))
                // content = content.replace("/*comment begin*/", "/*comment begin*/");
                if (type === "needAssume") {
                    exec("git update-index --no-assume-unchanged " + Configuration("mainJS"))
                }
            }
            file.contents = Buffer.from(content)
            done(null, file)
        }))
        .pipe(gulp.dest(Configuration("appPath")))
}
