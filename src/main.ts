import * as vscode from "vscode"
// import * as path from "path"
import LeftBarViewer from "./views/LeftBarViewer"
import Configuration from './Configuration'
import LoggerFactory from './LoggerFactory'
// import chalk from 'chalk'

export function activate(context: vscode.ExtensionContext): void {
	const logger = LoggerFactory("main")

	logger.info('Extension "vscode-versionsystem-kit" is now active (*^▽^*)')
	logger.info("VS-Kit parameter list:"
	+ ['', 'dev 开发运行', 'build 编译', 'upload 上传./dist到服务器', 'upload-assert 上传./assert到服务器(包括里面的common-lib.js)', 'upload-i18n 上传./client/app/i18n到服务器', 'json 查看环境配置', 'dev-index-html 扫描client/app/**/*.js注入到index.html', 'app-js 切换app.js的使用(使用本地后台且禁止git跟踪 / 使用服务器后台且允许git跟踪)', 'test', 'help', 'version'].join('\n').replace(/\n[a-z0-9-]+/g, (e) => "\n- " + (e.substring(1))))//chalk.bold.green

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.currentPath", () => {
		vscode.window.showInformationMessage(vscode.workspace.name)
	}))

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.checkCurrentConfig", () => {
		vscode.window.showInformationMessage(Configuration("logPattern"))
	}))

	context.subscriptions.push(vscode.window.registerTreeDataProvider("vskit.views.leftBar", new LeftBarViewer()))
}
