import originSass from 'sass'
import path from 'path'
import concat from "gulp-concat"
import eventStream from 'event-stream'
import Configuration from '../Configuration'
import GulpWrapper from '../gulp/GulpWrapper'
import LoggerFactory from '../LoggerFactory'

const logger = LoggerFactory("css-loader")
const gw = new GulpWrapper()
const gulpSass = (opts): eventStream.MapStream => {
    return eventStream.map((file, done) => {
        if (file.isNull()) {
            return done(null, file)
        }

        opts.data = file.contents.toString()
        opts.file = file.path
        if (path.extname(file.path) === '.sass') {
            opts.indentedSyntax = true
        }
        opts.includePaths.unshift(path.dirname(file.path))
        originSass.render(opts, (error, sassObj) => {
            try {
                if (error) {
                    throw new Error(error.message)
                }
                file.contents = sassObj.css
                file.path = file.path + '.css'

                if (file.stat) {
                    file.stat.atime = file.stat.mtime = file.stat.ctime = new Date()
                }
                done(null, file)
            } catch (error) {
                logger.error("SCSS编译失败，请确认SCSS版本无误及SCSS语法无误")
                logger.error(error)
            }
        })
    })
}

export default function (): NodeJS.ReadableStream {
    return gw.srcLoad("mainCSS")
        .pipe(gulpSass({
            includePaths: [
                path.join(Configuration("cwd"), "./client/bower_components"),
                path.join(Configuration("cwd"), "./client/components")]
        }))
        .pipe(concat("app.css"))
}
