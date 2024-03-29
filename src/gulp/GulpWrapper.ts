import gulp from 'gulp'
import fs from 'fs'
import path from 'path'
import Configuration from '../Configuration'
import LoggerFactory from '../LoggerFactory'
import GulpSort from './GulpSort'

export default class GulpWrapper {

    public cwd = "rootPath"
    private getGulpOptions = (): { cwd: string } => ({ cwd: path.join(Configuration("cwd"), Configuration(this.cwd)) })
    private watchArray: fs.FSWatcher[] = Array<fs.FSWatcher>()
    private logger = LoggerFactory("gulp-wrapper")

    srcLoad(pathKey: string): NodeJS.ReadWriteStream {
        return gulp.src(Configuration(pathKey), this.getGulpOptions())
            .on('error', (message) => this.logger.error(message))
    }

    /**
     * 扫描文件夹并排序
     */
    folderScan(pathKey: string): NodeJS.ReadWriteStream {
        return gulp.src(Configuration(pathKey), { cwd: path.join(Configuration("cwd"), Configuration(this.cwd)), read: false })
            .pipe(GulpSort())
            .on('error', (message) => this.logger.error(message))
    }

    /**
     * 获取文件夹不排序
     */
    folderGet(pathKey: string): NodeJS.ReadWriteStream {
        return gulp.src(Configuration(pathKey), { cwd: path.join(Configuration("cwd"), Configuration(this.cwd)), read: false })
            .on('error', (message) => this.logger.error(message))
    }

    dest(): NodeJS.ReadWriteStream {
        this.cwd = "dist"
        return gulp.dest("./", this.getGulpOptions())
            .on('error', (message) => this.logger.error(message))
    }

    destDir(pathKey?: string): NodeJS.ReadWriteStream {
        return gulp.dest(pathKey ? Configuration(pathKey) : "./", this.getGulpOptions())
            .on('error', (message) => this.logger.error(message))
    }

    watchFiles(pathKeyOrFiles: gulp.Globs, infoStr: string): fs.FSWatcher {
        let searchGlobs
        if (pathKeyOrFiles instanceof Array) {
            searchGlobs = pathKeyOrFiles
        } else {
            searchGlobs = Configuration(pathKeyOrFiles + "")
        }
        this.logger.info(`监听此项${infoStr}:${searchGlobs}`)
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
