import gulp from 'gulp'
import rimraf from 'rimraf'
// import globule from 'globule'
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
import CacheBuster from 'gulp-cachebust'
import babelPresetEnv from "@babel/preset-env"
import LoggerFactory from '../LoggerFactory'
import GulpWrapper from './GulpWrapper'
import CommonFile from '../types/CommonFile'
import CSSLoader from '../measure/CSSLoader'
import Configuration from '../Configuration'
import ServerPreparation from '../servers/ServerPreparation'

export default function (): void {
    const logger = LoggerFactory("gulp")

    const cachebust = new CacheBuster()
    const task = gulp.task
    const gw = new GulpWrapper()

    ServerPreparation()

    task('clean', (done) => {
        const distDir = path.join(Configuration("cwd"), Configuration("dist"))
        logger.info("删除:" + distDir)
        rimraf(distDir, done)
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
            .pipe(gw.destDir("tmp"))
    })

    task('build-template-cache', (): void => {
        logger.info("开始编译HTML")
        return eventStream.merge(gw.srcLoad("appHTML")
            .pipe(templateCache({
                module: Configuration("moduleName"),
                transformUrl(url) {
                    return "app" + url
                }
            })), gw.srcLoad("componentsHTML")
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
            .pipe(gw.destDir("tmp"))
    })

    const buildCoreJS = (entries, name): NodeJS.ReadableStream => gw.srcLoad(entries)
        // .pipe(source(name))
        // .pipe(buffer())
        .pipe(babel({
            compact: true,
            "presets": [babelPresetEnv]
        }))
        .pipe(ngAnnotate())
        .pipe(uglify({ logger }))
        .pipe(concat(name))
        .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
            logger.info(file.basename + "已经执行完转义，注入，混淆操作")
            done(null, file)
        }))

    task('build-app-main', (): void => {
        logger.info("开始编译main (client/app/app.js)")
        return buildCoreJS("mainJS", 'main.js').pipe(change((content) => {
            return content.replace(/..\/..\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                .replace(/.serviceRoot="[a-zA-Z:/0-9.]+"/, `.serviceRoot="/${Configuration("projectName")}"`)
                .replace(/app\/i18n/g, "/" + Configuration("projectName") + "/app/i18n")
                .replace(/bower_components\/kendo-ui/g, "/" + Configuration("projectName") + "/bower_components/kendo-ui")
        }))
            .pipe(gw.destDir("tmp"))
    })

    task('build-app-modules-js', (): void => {
        logger.info("开始编译app (client/app/**/*.js)")
        //globule.find(Configuration("entries"))
        return buildCoreJS("entries", 'app.js').pipe(change((content) => {
            return content.replace(/..\/..\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                .replace(/app\/i18n/g, "/" + Configuration("projectName") + "/app/i18n")
                .replace(/..\/..\/bower_components\/bootstrap\/dist\/js/g, "/" + Configuration("projectName") + "/bower_components/bootstrap/dist/js")
        })).pipe(gw.destDir("tmp"))
    })

    //parallel
    task('build-internal-code', gulp.series('build-css', 'build-template-cache', 'build-app-main', 'build-app-modules-js'))

    task('copy-html', () => gw.srcLoad("frondendMainHTML")
        .pipe(concat(Configuration("backendMainHTML")))
        .pipe(eventStream.map(function (file: CommonFile, done: (nope: void, file: CommonFile) => void) {
            logger.info(`正在移动: ${Configuration("frondendMainHTML")} => ${Configuration("backendMainHTML")}`)
            done(null, file)
        }))
        .pipe(gw.dest()))

    task('rename-hash-file', (): void => {
        logger.info("正在对文件进行重命名")
        return gw.srcLoad('tmpFiles')
            .pipe(cachebust.resources())
            .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
                logger.info("导出: " + file.basename)
                done(null, file)
            }))
            .pipe(gw.dest())
    })

    task('compile-jsp', (): void => {
        return gw.srcLoad("backendMainHTML")
            .pipe(inject(gw.folderScan('compileCSS'), {
                addPrefix: "app",
                starttag: "<!-- generate-header -->",
                endtag: "<!-- endinjector -->"
            }))
            .pipe(inject(gw.folderScan('compileJS'), {
                addPrefix: "app",
                starttag: "<!-- generate-code-start -->",
                endtag: "<!-- endinjector -->"
            }))
            .pipe(change((content) => {
                return "<%@ page language=\"java\" import=\"java.util.*\" contentType=\"text/html; charset=UTF-8\" %>\n" + content
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
            .pipe(gw.dest())
    })

}
