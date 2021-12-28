import gulp from 'gulp'
import del from 'del'
import globule from 'globule'
import gulpSass from 'gulp-sass'
import originSass from 'sass'
// import browserify from 'browserify'
import source from 'vinyl-source-stream'
import buffer from 'vinyl-buffer'
import babel from 'gulp-babel'
// import uglify from 'gulp-uglify'
// import babelify from 'babelify'
import path from 'path'
import change from 'gulp-change'
import inject from 'gulp-inject'
import concat from "gulp-concat"
import cleanCss from 'gulp-clean-css'
import prompt from 'prompt'
import client from 'scp2'
import eventStream from 'event-stream'
import ngAnnotate from 'gulp-ng-annotate'
import tinyLr from 'tiny-lr'
import templateCache from 'gulp-angular-templatecache'
import CacheBuster from 'gulp-cachebust'
import babelPresetEnv from "@babel/preset-env"
import { DevServer, DevServerParams } from './DevServer'
import LoggerFactory from './LoggerFactory'
import RemoteFile from './types/RemoteFile'
import CommonFile from './types/CommonFile'
import Configuration from './Configuration'
import GulpSort from './GulpSort'

export default function (): void {
    const logger = LoggerFactory("gulp")

    const cachebust = new CacheBuster()
    const task = gulp.task
    const distDir: string = Configuration("dist") || "./dist"
    let instanceServer

    task('clean', (done) => {
        process.chdir(path.join(distDir, ".."))
        logger.info("删除:" + distDir)
        del([distDir], done)
    })

    const getCSS = (): NodeJS.ReadableStream => {
        return gulp.src(Configuration("mainCSS"), { cwd: Configuration("cwd") })
            // .pipe(sourcemaps.init())
            .pipe(gulpSass(originSass)({
                includePaths: [
                    path.join(Configuration("cwd"), "./client/bower_components"),
                    path.join(Configuration("cwd"), "./client/components")]
            }))
            .on('error', logger.error)
    }

    task('build-css', (): void => {
        logger.info("开始编译SASS")
        return getCSS()
            // .pipe(sourcemaps.write('./maps'))
            .pipe(concat("app.css"))
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
            .pipe(concat("templates-cache.html.js")).pipe(change((content) => {
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
        // .pipe(uglify()) // TODO uglify
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

    task('build', gulp.series('clean', (done) => { console.log("\n↓↓↓↓↓↓↓↓↓↓ 准备并行编译"), done() },
        'build-internal-code', (done) => { console.log("↑↑↑↑↑↑↑↑↑↑ 并行编译完成, 串行编译\n"), done() },
        'copy-html', (done) => { logger.info("index.html已经复制到dist并重命名为home.jsp"), done() },
        'rename-hash-file',
        "compile-jsp",
        (done) => { logger.info("编译结束，可执行" + "vs-kit upload" + "上传到服务器"), done() }))

    const uploadDir = (type): void => prompt.get(['password'], (err, result) => {
        //, done: Undertaker.TaskFunction
        if (err) {
            logger.error(err)
        }
        const remoteFiles: RemoteFile[] = Configuration("remoteFiles")
        remoteFiles.map(distItem => {
            if (distItem.type !== type) {
                return
            }
            distItem.sourceFile.map(matchItem => {
                const dest = path.join(Configuration("remotePrefix"), Configuration("projectName"), distItem.dest).replace(/\\/g, '/')
                globule.find(path.join(Configuration(type), matchItem)).map((src) => {
                    client.scp(src, `administrator:${result.password}@${Configuration("remoteHost")}:${dest}`, (scpErr) => {
                        if (scpErr) {
                            logger.error("failure:" + src + "\n\t=> " + dest)
                            logger.error(scpErr)
                            return
                        }
                        logger.info("success:" + src + "\n\t=> " + dest)
                    })
                })
            })
        })
    })

    task('upload', () => {
        uploadDir('dist')
    })

    task('upload-assert', () => {
        uploadDir('assert')
    })

    task('upload-i18n', () => {
        uploadDir('i18n')
    })

    task('dev-index-html', (): void => {
        const mainHTML: string = Configuration("frondendMainHTML")
        const entries: string[] = Configuration("entries")
        logger.info(`准备向HTML入口"${mainHTML}"进行注入: ${entries}`)
        return gulp.src(mainHTML, { cwd: Configuration("cwd") })
            .pipe(inject(gulp.src(entries, { read: false }).pipe(GulpSort()), {
                starttag: "<!-- injector:js -->",
                endtag: "<!-- endinjector -->",
                transform(filepath) {
                    return `<script src="${filepath.replace(/^\/client\//, '')}"></script>`
                }
            })).on('error', logger.error).pipe(gulp.dest('client'))
    })

    task('change-css-files', (): void => {
        logger.info("注入 scss")
        return gulp.src(Configuration("mainCSS"), { cwd: Configuration("cwd") })
            .pipe(inject(gulp.src(Configuration("cssMatch"), { read: false }).pipe(GulpSort()), {
                starttag: "// injector",
                endtag: "// endinjector",
                transform(filepath) {
                    return `@import '${filepath.replace(/^\/client\/app\//, '').replace(/^\/client\/components\//, '')}';`
                }
            }))
            .on('error', logger.error)
            .pipe(gulp.dest('client/app'))
    })

    task('devCSS', (): void => {
        logger.info("生成 app/app.css")
        return getCSS().pipe(concat("app.css")).pipe(gulp.dest("client/app/"))
    })

    task('watch', (done) => {
        gulp.watch(Configuration("entries")).on('add', gulp.series('dev-index-html'))
        gulp.watch(Configuration("entries")).on('unlink', gulp.series('dev-index-html'))
        gulp.watch(Configuration("cssMatch")).on('add', gulp.series('change-css-files'))
        gulp.watch(Configuration("cssMatch")).on('unlink', gulp.series('change-css-files'))
        const entries: string[] = Configuration("entries")
        gulp.watch(entries.concat([Configuration("appHTML"), Configuration("componentsHTML"), Configuration("mainJS")])).on('change', (_path) => {
            logger.info("文件修改已知会:" + _path)
            tinyLr.changed(_path)
        })
        gulp.watch(Configuration("cssMatch"), gulp.series('devCSS'))
        gulp.watch(Configuration("mainCSS"), gulp.series('devCSS'))
        gulp.watch("client/app.css").on("change", (_path) => {
            logger.info("CSS已经更新")
            tinyLr.changed(_path)
        })
        return done()
    })

    task('web-server', async () => {
        const config: DevServerParams = {
            host: '127.0.0.1',
            port: Configuration("devServerPort"),
            folder: path.join(Configuration("cwd"), "client")
        }
        instanceServer = await DevServer(config, tinyLr)
        logger.info("前端服务器启动完成: http://" + config.host + ":" + config.port)
    })

    task('close-web-server', async () => {
        await instanceServer.close()
        logger.info("前端服务器已经关闭")
    })

}
