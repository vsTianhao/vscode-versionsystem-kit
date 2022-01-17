import gulp from 'gulp'
import del from 'del'
import globule from 'globule'
// import browserify from 'browserify'
import source from 'vinyl-source-stream'
import buffer from 'vinyl-buffer'
import babel from 'gulp-babel'
// import uglify from 'gulp-uglify'
import uglify from 'gulp-uglify-integrated'
// import babelify from 'babelify'
import path from 'path'
import change from 'gulp-change'
import inject from 'gulp-inject'
import concat from "gulp-concat"
import cleanCss from 'gulp-clean-css'
import eventStream from 'event-stream'
import ngAnnotate from 'gulp-ng-annotate'
import templateCache from 'gulp-angular-templatecache'
import CacheBuster from 'gulp-cachebust'//这个应该不需要了
import babelPresetEnv from "@babel/preset-env"
import LoggerFactory from '../LoggerFactory'
import CommonFile from '../types/CommonFile'
import CSSLoader from '../measure/CSSLoader'
import Configuration from '../Configuration'
import ServerPreparation from '../servers/ServerPreparation'

export default function (): void {
    const logger = LoggerFactory("gulp")

    const cachebust = new CacheBuster()
    const task = gulp.task
    const distDir: string = Configuration("dist") || "./dist"

    ServerPreparation()

    task('clean', (done) => {
        process.chdir(path.join(distDir, ".."))
        logger.info("删除:" + distDir)
        del([distDir], done)
    })

    task('build-css', (): void => {
        logger.info("开始编译SASS")
        return CSSLoader()
            .pipe(cleanCss())
            .pipe(change((content) => {
                return content.replace(/..\/..\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                    .replace(/\/bower_components\//g, "/" + Configuration("projectName") + "/bower_components/")
            }))
            .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
                logger.info("所有SCSS都已编译，合并于: " + file.basename)
                done(null, file)
            }))
            .pipe(gulp.dest(path.join(distDir, ".tmp")))
    })

    task('build-template-cache', (): void => {
        logger.info("开始编译HTML")
        return eventStream.merge(gulp.src(Configuration("appHTML"))
            .pipe(templateCache({
                module: Configuration("moduleName"),
                transformUrl(url) {
                    return "app" + url
                }
            })), gulp.src(Configuration("componentsHTML"))
                .pipe(templateCache({
                    module: Configuration("moduleName"),
                    transformUrl(url) {
                        return "components" + url
                    }
                })))
            .pipe(concat("templates-cache.html.js"))
            .pipe(change((content) => {
                return content.replace(/..\/..\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                    .replace(/..\/..\/bower_components/g, "/" + Configuration("projectName") + "/bower_components")
            }))
            .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
                logger.info("所有HTML都已编译，合并为模板JS: " + file.basename)
                done(null, file)
            }))
            .pipe(gulp.dest(path.join(distDir, '.tmp')))
    })

    // const buildCoreJS = (entries, name): NodeJS.ReadableStream => browserify({
    //     entries,
    //     paths: ["" + Configuration("appPath")],
    // }).transform(babelify).bundle()
    // const buildCoreJS = (entries, name): NodeJS.ReadableStream => gulp.src({
    //     entries,
    //     paths: ["" + Configuration("appPath")],
    // }).transform(babelify).bundle()
    const buildCoreJS = (entries, name): NodeJS.ReadableStream => gulp.src(entries)
        .pipe(source(name))
        .pipe(buffer())
        .pipe(babel({
            compact: true,
            "presets": [babelPresetEnv]
        }))
        .pipe(ngAnnotate())
        .pipe(uglify())
        .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
            logger.info(file.basename + "已经执行完转义，注入，混淆操作")
            done(null, file)
        }))
        .on('error', logger.error)

    task('build-app-main', (): void => {
        logger.info("开始编译main (client/app/app.js)")
        return buildCoreJS(Configuration("mainJS"), 'main.js').pipe(change((content) => {
            return content.replace(/..\/..\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                .replace(/.serviceRoot="[a-zA-Z:/0-9.]+"/, `.serviceRoot="/${Configuration("projectName")}"`)
                .replace(/app\/i18n/g, "/" + Configuration("projectName") + "/app/i18n")
                .replace(/bower_components\/kendo-ui/g, "/" + Configuration("projectName") + "/bower_components/kendo-ui")
        }))
            .on('error', logger.error)
            .pipe(gulp.dest(path.join(distDir, '.tmp')))
    })

    task('build-app-modules-js', (): void => {
        logger.info("开始编译app (client/app/**/*.js)")
        // console.log(globule.find(Configuration("entries")));
        return buildCoreJS(globule.find(Configuration("entries")), 'app.js').pipe(change((content) => {
            return content.replace(/..\/..\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                .replace(/app\/i18n/g, "/" + Configuration("projectName") + "/app/i18n")
                .replace(/..\/..\/bower_components\/bootstrap\/dist\/js/g, "/" + Configuration("projectName") + "/bower_components/bootstrap/dist/js")
        })).pipe(gulp.dest(path.join(distDir, '.tmp')))
    })

    task('build-internal-code', gulp.parallel('build-css', 'build-template-cache', 'build-app-main', 'build-app-modules-js'))

    task('copy-html', () => gulp.src(Configuration("frondendMainHTML"))
        .pipe(concat(Configuration("backendMainHTML")))
        .pipe(gulp.dest(distDir)))

    task('rename-hash-file', (): void => {
        logger.info("正在对文件进行重命名")
        process.chdir(distDir)
        return gulp.src('.tmp/*.*')
            .pipe(cachebust.resources())
            .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
                logger.info("导出: " + file.basename)
                done(null, file)
            }))
            .pipe(gulp.dest(distDir))
    })

    task('compile-jsp', (): void => {
        process.chdir(distDir)
        return gulp.src("home.jsp")
            .pipe(inject(gulp.src('app.*.css', { read: false }), {
                addPrefix: "app",
                starttag: "<!-- generate-header -->",
                endtag: "<!-- endinjector -->"
            }))
            .pipe(inject(gulp.src(['main.*.js', 'app.*.js', 'templates-*.*.js'], { read: false }), {
                addPrefix: "app",
                starttag: "<!-- generate-code-start -->",
                endtag: "<!-- endinjector -->"
            }))
            .pipe(change((content) => {
                return "<%@ page language=\"java\" import=\"java.util.*\" contentType=\"text/html; charset=UTF-8\" %>\n" + content
                    // return content.replace(/<!DOCTYPE html>/, "<%@ page language=\"java\" import=\"java.util.*\" contentType=\"text/html; charset=UTF-8\" %>\n<!DOCTYPE html>")
                    .replace(/app\//g, Configuration("projectName") + "/app/")
                    .replace(/assets\/js/g, "/" + Configuration("projectName") + "/assets/js")
                    .replace(/assets\/css/g, "/" + Configuration("projectName") + "/assets/css")
                    .replace(/..\/..\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                    .replace(/bower_components\//g, "/" + Configuration("projectName") + "/bower_components/")
                    .replace(/common-lib\.js\?v=\d+/g, "common-lib.js?v=" + new Date().toJSON().replace(/:/g, "-"))
            }))
            .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
                logger.info("home.jsp编译完成")
                done(null, file)
            }))
            .pipe(gulp.dest(distDir))
    })

    // const uploadDir = (type): void => prompt.get(['password'], (err, result) => {
    //     //, done: Undertaker.TaskFunction
    //     if (err) {
    //         logger.error(err)
    //     }
    // })

    // task('upload', () => {
    //     uploadDir('dist')
    // })

    // task('upload-assert', () => {
    //     uploadDir('assert')
    // })

    // task('upload-i18n', () => {
    //     uploadDir('i18n')
    // })

}
