import gulp from 'gulp'
import inject from 'gulp-inject'
import LoggerFactory from '../LoggerFactory'
import Configuration from '../Configuration'
import CSSLoader from '../measure/CSSLoader'
import GulpWrapper from '../gulp/GulpWrapper'

export default function (): void {
    const logger = LoggerFactory("dev-server-preparation")

    const task = gulp.task
    const gw = new GulpWrapper()

    task('dev-index-html', (): NodeJS.ReadWriteStream => {
        return gw.srcLoad("frondendMainHTML")
            .pipe(inject(gw.folderScan("entries"), {
                starttag: "<!-- injector:js -->",
                endtag: "<!-- endinjector -->",
                transform(filepath) {
                    return `<script src="${filepath.replace(/^\//, '')}"></script>`
                }
            })).pipe(gw.destDir()).on("end", function () {
                logger.info(Configuration("frondendMainHTML") + "已注入完毕")
            })
    })

    task('change-css-files', (): NodeJS.ReadWriteStream => {
        logger.info("注入scss")
        return gw.srcLoad("mainCSS")
            .pipe(inject(gw.folderScan("cssMatch"), {
                starttag: "// injector",
                endtag: "// endinjector",
                transform(filepath) {
                    return `@import '${filepath.replace(/^\/app\//, '').replace(/^\/components\//, '')}';`
                }
            }))
            .pipe(gw.destDir("appPath"))
    })

    task('dev-css', (): NodeJS.ReadWriteStream => {
        logger.info("编译" + Configuration("integratedCSS"))
        return CSSLoader().pipe(gw.destDir("appPath")).on("end", function () {
            logger.info(Configuration("integratedCSS") + "已生成")
        })
    })

}
