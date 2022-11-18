import gulp from 'gulp'
import rimraf from 'rimraf'
import Browserify from './Browserify'
import source from 'vinyl-source-stream'
import buffer from 'vinyl-buffer'
import babel from 'gulp-babel'
import uglify from 'gulp-uglify-integrated'
import path from 'path'
import globule from 'globule'
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
import GulpSort from './GulpSort'

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
                return content.replace(/\.\.\/\.\.\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                    .replace(/\/bower_components\//g, "/" + Configuration("projectName") + "/bower_components/")
            }))
            .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
                logger.info("所有SCSS都已编译, 合并于: " + file.basename)
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
            .pipe(GulpSort())
            .pipe(concat("templates-cache-html.js"))
            .pipe(change((content) => {
                return content.replace(/\.\.\/\.\.\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                    .replace(/\.\.\/\.\.\/bower_components/g, "/" + Configuration("projectName") + "/bower_components")
            }))
            .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
                logger.info("所有HTML都已编译, 合并为模板JS: " + file.basename)
                done(null, file)
            }))
            .pipe(gw.destDir("tmp"))
    })

    const buildCoreJS = (entries: string[], name: string): NodeJS.ReadableStream => {
        const _browserify = new Browserify({
            entries: entries,
            basedir: path.join(Configuration("cwd"), Configuration("rootPath"))
        })
        return _browserify.bundle().pipe(source(name))
            .pipe(buffer())
            .pipe(babel({
                compact: true,
                "presets": [babelPresetEnv]
            }))
            .pipe(ngAnnotate())
            .pipe(uglify({ logger }))
            .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
                logger.info(file.basename + "已经执行完转义, 注入, 混淆操作")
                done(null, file)
            }))
            .on('error', (message) => this.logger.error(message))
    }

    task('build-app-main', (): void => {
        logger.info("开始编译main (client/app/app.js)")
        return buildCoreJS([Configuration("mainJS")], 'main.js').pipe(change((content) => {
            return content.replace(/\.\.\/\.\.\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                .replace(/.serviceRoot="[a-zA-Z:/0-9.]+"/, `.serviceRoot="/${Configuration("projectName")}"`)
                .replace(/app\/i18n/g, "/" + Configuration("projectName") + "/app/i18n")
                .replace(/bower_components\/kendo-ui/g, "/" + Configuration("projectName") + "/bower_components/kendo-ui")
        }))
            .pipe(gw.destDir("tmp"))
    })

    task('build-app-modules-js', (): void => {
        logger.info("开始编译app (client/app/**/*.js)")
        return buildCoreJS(globule.find({
            src: Configuration("entries"),
            srcBase: path.join(Configuration("cwd"), Configuration("rootPath"))
        }), 'app.js').pipe(change((content) => {
            return content.replace(/\.\.\/\.\.\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                .replace(/app\/i18n/g, "/" + Configuration("projectName") + "/app/i18n")
        })).pipe(gw.destDir("tmp"))
    })

    task('build-internal-code', gulp.parallel('build-css', 'build-template-cache', 'build-app-main', 'build-app-modules-js'))

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
            .pipe(inject(gw.folderGet('compileCSS'), {
                addPrefix: "app",
                starttag: "<!-- generate-header -->",
                endtag: "<!-- endinjector -->"
            }))
            .pipe(inject(gw.folderGet('compileJS'), {
                addPrefix: "app",
                starttag: "<!-- generate-code-start -->",
                endtag: "<!-- endinjector -->"
            }))
            .pipe(change((content) => {
                return "<%@ page language=\"java\" import=\"java.util.*\" contentType=\"text/html; charset=UTF-8\" %>\n" + content
                    .replace(/app\//g, Configuration("projectName") + "/app/")
                    .replace(/assets\/js/g, "/" + Configuration("projectName") + "/assets/js")
                    .replace(/assets\/css/g, "/" + Configuration("projectName") + "/assets/css")
                    .replace(/\.\.\/\.\.\/assets\//g, "/" + Configuration("projectName") + "/assets/")
                    .replace(/bower_components\//g, "/" + Configuration("projectName") + "/bower_components/")
                    .replace(/common-lib\.js\?v=\d+/g, "common-lib.js?v=" + new Date().toJSON().replace(/:/g, "-"))
            }))
            .pipe(eventStream.map((file: CommonFile, done: (nope: void, file: CommonFile) => void) => {
                logger.info("home.jsp编译完成")
                done(null, file)
            }))
            .pipe(gw.dest())
    })

    task('set-gw-cwd', (done): void => {
        gw.cwd = "rootPath"
        done()
    })

}
