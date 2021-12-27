import * as vscode from "vscode"
import gulp from 'gulp'
import LoggerFactory from '../LoggerFactory'
import Configuration from '../Configuration'
import CommonFile from '../types/CommonFile'
import eventStream from 'event-stream'
import { exec } from 'child_process'

const logger = LoggerFactory("gulp-task")
let serverEstablished = false

export async function run(type = "dev"): Promise<void> {
    try {
        if (!Configuration("devServerPort")) {
            vscode.window.showErrorMessage("没有开发端口号，是否在项目下的./.vscode目录中缺少配置？也可以配置成全局的，请查看当前环境的配置")
            return
        }
        if (!Configuration("appPath")) {
            vscode.window.showErrorMessage("在VSCode的settings中必须要有完整的配置，目前大概有十几项，那些配置是必备的")
            return
        }
        if (type === "dev") {
            logger.info("准备启动开发服务器")
            if (serverEstablished) {
                logger.error("你不能重复的打开前端开发服务器 (即使确定前端开发服务器已经关闭，也必须尝试在面板上再关闭一下)")
                return
            }
            serverEstablished = true
            await gulp.series('dev-index-html', "dev-app-scss", 'devCSS', 'watch', 'web-server')(void 0)
        } else if (type === "shutdown") {
            logger.info("准备关闭开发服务器")
            serverEstablished = false
            await gulp.series('close-web-server')(void 0)
        }
    } catch (error) {
        logger.error("gulp task error ↓")
        logger.error(error)
    }
}

export function build(type = "all"): void {
    gulp.task("build")(() => void 0)
    vscode.window.showInformationMessage("build")
    vscode.window.showInformationMessage(type)
}

export function appJS(type = "needAssume"): void {
    gulp.src(Configuration("mainJS"))
        .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
            let content = file.contents.toString()
            if (~content.indexOf(Configuration("serverURL"))) {
                logger.info("当前是服务器IP，将改为本地IP")
                content = content.replace(Configuration("serverURL"), Configuration("localURL"))
                // content = content.replace("/*comment begin*/", "/*comment begin*/");
                if (type === "needAssume") {
                    exec("git update-index --assume-unchanged " + Configuration("mainJS"))
                }
            } else if (~content.indexOf(Configuration("localURL"))) {
                logger.info("当前是本地IP，将改为服务器IP")
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
