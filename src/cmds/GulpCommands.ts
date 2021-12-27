import * as vscode from "vscode"
import gulp from 'gulp'
import LoggerFactory from '../LoggerFactory'
import Configuration from '../Configuration'
import CommonFile from '../types/CommonFile'
import eventStream from 'event-stream'
import { exec } from 'child_process'

const logger = LoggerFactory("gulp-task")

export async function run(type = "dev"): Promise<void> {
    try {
        if (type === "dev") {
            logger.info("准备启动开发服务器")
            await gulp.series('dev-index-html', "dev-app-scss", 'devCSS', 'watch', 'web-server')(void 0)
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
