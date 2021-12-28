import * as vscode from "vscode"
import gulp from 'gulp'
import LoggerFactory from '../LoggerFactory'
import Configuration from '../Configuration'
import CommonFile from '../types/CommonFile'
import eventStream from 'event-stream'
import { exec } from 'child_process'

const logger = LoggerFactory("gulp-task")
let serverEstablished = false

const taskBeforeValidateFn = (): boolean => {
    if (!Configuration("devServerPort")) {
        logger.error("没有开发端口号，是否在项目下的./.vscode目录中缺少配置？也可以配置成全局的，请查看当前环境的配置")
        return true
    }
    if (!Configuration("appPath")) {
        logger.error("在VSCode的settings中必须要有完整的配置，目前大概有十几项，那些配置是必备的")
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
                logger.error("你不能重复的打开前端开发服务器 (即使确定前端开发服务器已经关闭，也必须尝试在面板上再关闭一下)")
                return
            }
            logger.info("准备启动前端开发服务器")
            serverEstablished = true
            await gulp.series('dev-index-html', "change-css-files", 'devCSS', 'watch', 'web-server')(void 0)
        } else if (type === "shutdown") {
            if (!serverEstablished) {
                logger.warn("前端开发服务器标记已关闭")
                return
            }
            logger.info("准备关闭前端开发服务器")
            serverEstablished = false
            await gulp.series('close-web-server')(void 0)
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
    gulp.series("build")(() => void 0)
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
