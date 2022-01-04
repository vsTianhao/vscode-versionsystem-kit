import gulp from 'gulp'
import inject from 'gulp-inject'
import path from 'path'
import { DevServer, DevServerParams } from '../servers/DevServer'
import LoggerFactory from '../LoggerFactory'
import Configuration from '../Configuration'
import CSSLoader from '../measure/CSSLoader'
import GulpWrapper from '../core/GulpWrapper'

export default function (): void {
    const logger = LoggerFactory("dev-server-task")

    const task = gulp.task
    const gw = new GulpWrapper()
    let instanceServer: DevServer

    task('dev-index-html', (): NodeJS.ReadWriteStream => {
        // const entries: string[] = Configuration("entries")
        // logger.info(`准备向HTML入口"${mainHTML}"进行注入: ${entries}`)
        return gw.srcLoad("frondendMainHTML")
            .pipe(inject(gw.folderScan("entries"), {
                starttag: "<!-- injector:js -->",
                endtag: "<!-- endinjector -->",
                transform(filepath) {
                    return `<script src="${filepath.replace(/^\/client\//, '')}"></script>`
                }
            })).on('error', logger.error).pipe(gw.destDir("rootPath"))
    })

    task('change-css-files', (): NodeJS.ReadWriteStream => {
        logger.info("注入 scss")
        return gw.srcLoad("mainCSS")
            .pipe(inject(gw.folderScan("cssMatch"), {
                starttag: "// injector",
                endtag: "// endinjector",
                transform(filepath) {
                    return `@import '${filepath.replace(/^\/client\/app\//, '').replace(/^\/client\/components\//, '')}';`
                }
            }))
            .on('error', logger.error)
            .pipe(gw.destDir("appPath"))
    })

    task('dev-css', (): NodeJS.ReadWriteStream => {
        logger.info("生成 app/app.css")
        return CSSLoader().pipe(gw.destDir("appPath"))
    })

    task('watch', (done) => {
        const entries: string[] = Configuration("entries")
        gw.watchFiles("entries").on('add', gulp.series('dev-index-html'))
        gw.watchFiles("entries").on('unlink', gulp.series('dev-index-html'))
        gw.watchFiles("cssMatch").on('add', gulp.series('change-css-files'))
        gw.watchFiles("cssMatch").on('unlink', gulp.series('change-css-files'))
        gw.watchFiles(entries.concat([Configuration("frondendMainHTML"), Configuration("appHTML"), Configuration("componentsHTML"), Configuration("mainJS")])).on('change', (_path) => {
            instanceServer.changed(_path)
            logger.info("文件修改已通知:" + _path)
        })
        gw.watchFiles("cssMatch").on("change", gulp.series('dev-css'))
        gw.watchFiles("mainCSS").on("change", gulp.series('dev-css'))
        gw.watchFiles("integratedCSS").on("change", (_path) => {
            instanceServer.changed(_path)
            logger.info("样式调整已经通知")
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
        const watchSize = gw.closeWatchs()
        logger.info("已经关闭" + watchSize + "个监听器")
        await instanceServer.close()
    })
}