import gulp from 'gulp'
import fs from 'fs'
import path from 'path'
import Configuration from '../Configuration'
import LoggerFactory from '../LoggerFactory'
import GulpSort from './GulpSort'

export default class GulpWrapper {

    private getGulpOptions = (): { cwd: string } => ({ cwd: path.join(Configuration("cwd"), Configuration("rootPath")) })
    private watchArray: fs.FSWatcher[] = Array<fs.FSWatcher>()
    private logger = LoggerFactory("gulp-wrapper")

    srcLoad(pathKey: string): NodeJS.ReadWriteStream {
        return gulp.src(Configuration(pathKey), this.getGulpOptions())
            .on('error', this.logger.error)
    }

    folderScan(pathKey: string): NodeJS.ReadWriteStream {
        return gulp.src(Configuration(pathKey), { cwd: path.join(Configuration("cwd"), Configuration("rootPath")), read: false })
            .pipe(GulpSort())
            .on('error', this.logger.error)
    }

    destDir(pathKey?: string): NodeJS.ReadWriteStream {
        return gulp.dest(pathKey ? Configuration(pathKey) : "./", this.getGulpOptions())
            .on('error', this.logger.error)
    }

    watchFiles(pathKeyOrFiles: gulp.Globs): fs.FSWatcher {
        let searchGlobs
        if (pathKeyOrFiles instanceof Array) {
            searchGlobs = pathKeyOrFiles
        } else {
            searchGlobs = Configuration(pathKeyOrFiles + "")
        }
        this.logger.info("监听:" + searchGlobs)
        const watcherObj = gulp.watch(searchGlobs, this.getGulpOptions() as gulp.WatchOptions)
        this.watchArray.push(watcherObj)
        return watcherObj
    }

    closeWatchs(): Integer {
        for (const watchItem of this.watchArray) {
            watchItem.close()
        }
        const size = this.watchArray.length
        this.watchArray.length = 0
        return size
    }
}
