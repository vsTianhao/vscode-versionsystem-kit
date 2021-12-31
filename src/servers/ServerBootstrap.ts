import gulp from 'gulp'
import inject from 'gulp-inject'
import path from 'path'
import { DevServer, DevServerParams } from '../servers/DevServer'
import LoggerFactory from '../LoggerFactory'
import Configuration from '../Configuration'
import CSSLoader from '../measure/CSSLoader'
import { srcLoad, destDir, folderScan, watchFiles } from '../core/GulpWrapper'

export default function (): void {
    const logger = LoggerFactory("dev-server-task")

    const task = gulp.task
    let instanceServer: DevServer

    task('dev-index-html', (): NodeJS.ReadWriteStream => {
        // const mainHTML: string = Configuration("frondendMainHTML")
        // const entries: string[] = Configuration("entries")
        // logger.info(`准备向HTML入口"${mainHTML}"进行注入: ${entries}`)
        return srcLoad("frondendMainHTML")
            .pipe(inject(folderScan("entries"), {
                starttag: "<!-- injector:js -->",
                endtag: "<!-- endinjector -->",
                transform(filepath) {
                    return `<script src="${filepath.replace(/^\/client\//, '')}"></script>`
                }
            })).on('error', logger.error).pipe(destDir("rootPath"))
    })

    task('change-css-files', (): NodeJS.ReadWriteStream => {
        logger.info("注入 scss")
        return srcLoad("mainCSS")
            .pipe(inject(folderScan("cssMatch"), {
                starttag: "// injector",
                endtag: "// endinjector",
                transform(filepath) {
                    return `@import '${filepath.replace(/^\/client\/app\//, '').replace(/^\/client\/components\//, '')}';`
                }
            }))
            .on('error', logger.error)
            .pipe(destDir("appPath"))
    })

    task('dev-css', (): NodeJS.ReadWriteStream => {
        logger.info("生成 app/app.css")
        return CSSLoader().pipe(destDir("appPath"))
    })

    task('watch', (done) => {
        const entries: string[] = Configuration("entries")
        watchFiles("entries").on('add', gulp.series('dev-index-html'))
        watchFiles("entries").on('unlink', gulp.series('dev-index-html'))
        watchFiles("cssMatch").on('add', gulp.series('change-css-files'))
        watchFiles("cssMatch").on('unlink', gulp.series('change-css-files'))
        watchFiles(entries.concat([Configuration("frondendMainHTML"), Configuration("appHTML"), Configuration("componentsHTML"), Configuration("mainJS")])).on('change', (_path) => {
            logger.info("文件修改已知会:" + _path)
            instanceServer.changed(_path)
        })
        watchFiles("cssMatch").on("change", gulp.series('dev-css'))
        watchFiles("mainCSS").on("change", gulp.series('dev-css'))
        watchFiles("integratedCSS").on("change", (_path) => {
            logger.info("CSS已经更新")
            instanceServer.changed(_path)
        })
        return done()
    })

    task('web-server', async () => {
        const config: DevServerParams = {
            host: '127.0.0.1',
            port: Configuration("devServerPort"),
            folder: path.join(Configuration("cwd"), "client")
        }
        instanceServer = new DevServer(config)
        await instanceServer.load()
        logger.info("前端开发服务器启动成功: http://" + config.host + ":" + config.port)
        logger.info("完毕")
    })

    task('close-web-server', async () => {
        await instanceServer.close()
    })
}