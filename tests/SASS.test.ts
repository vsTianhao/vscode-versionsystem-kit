import * as path from "path"
import gulp from "gulp"
import concat from "gulp-concat"
import sass from "sass"
import eventStream from 'event-stream'

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
        sass.render(opts, (error, sassObj) => {
            file.contents = sassObj.css
            file.path = file.path + '.css'

            if (file.stat) {
                file.stat.atime = file.stat.mtime = file.stat.ctime = new Date()
            }
            done(null, file)
        })
    })
}

const cwd = 'e:\\idea\\EmrWebApp'

gulp.src("client/app/app.scss", { cwd })
    .pipe(gulpSass({
        includePaths: [
            path.join(cwd, "client/bower_components"),
            path.join(cwd, "client/components")]
    }))
    .pipe(concat("app2.css"))
    .pipe(gulp.dest(cwd))

