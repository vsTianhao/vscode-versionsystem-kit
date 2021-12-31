import gulp from 'gulp'
import fs from 'fs'
import Configuration from '../Configuration'
import LoggerFactory from '../LoggerFactory'
import GulpSort from '../GulpSort'

const logger = LoggerFactory("gulp-wrapper")
export function srcLoad(pathKey: string): NodeJS.ReadWriteStream {
    return gulp.src(Configuration(pathKey), { cwd: Configuration("cwd") })
        .on('error', logger.error)
}

export function folderScan(pathKey: string): NodeJS.ReadWriteStream {
    return gulp.src(Configuration(pathKey), { cwd: Configuration("cwd"), read: false })
        .pipe(GulpSort())
        .on('error', logger.error)
}

export function destDir(pathKey: string): NodeJS.ReadWriteStream {
    return gulp.dest(Configuration(pathKey), { cwd: Configuration("cwd") })
        .on('error', logger.error)
}

export function watchFiles(pathKeyOrFiles: gulp.Globs): fs.FSWatcher {
    if (pathKeyOrFiles instanceof Array) {
        return gulp.watch(pathKeyOrFiles, { cwd: Configuration("cwd") } as gulp.WatchOptions)
    }
    return gulp.watch(Configuration(pathKeyOrFiles + ""), { cwd: Configuration("cwd") } as gulp.WatchOptions)
}
