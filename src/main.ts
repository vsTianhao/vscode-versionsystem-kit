import * as vscode from "vscode"
import * as path from "path"
import LeftBarViewer from "./views/LeftBarViewer"
import LoggerFactory from './LoggerFactory'
import * as GulpCommands from './cmds/GulpCommands'
import OtherCommands from './cmds/OtherCommands'
import GulpOperate from "./gulp/GulpOperate"

export function activate(context: vscode.ExtensionContext): void {
	const logger = LoggerFactory("main")

	logger.info('扩展"vscode-versionsystem-kit"已激活')

	context.subscriptions.push(vscode.window.registerTreeDataProvider("vskit.views.leftBar", new LeftBarViewer()))

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.run", GulpCommands.run))

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.build", GulpCommands.build))

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.others", OtherCommands))

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.init", (): void => {
		if (!vscode.workspace.rootPath) {
			logger.error('在没有工作目录的情况下激活扩展会让插件无法初始化，请打开一个项目后重试')
			logger.fatal('已经拒绝初始化')
			return
		}
		vscode.workspace.getConfiguration("vskit").update("cwd", vscode.workspace.rootPath)
		vscode.workspace.getConfiguration("vskit").update("dist", path.join(vscode.workspace.rootPath, 'dist'))
		if (!vscode.workspace.getConfiguration("vskit").get("projectName")) {
			vscode.workspace.getConfiguration("vskit").update("projectName", vscode.workspace.name)
		}
		GulpOperate()
	}))

	vscode.commands.executeCommand("vscode-versionsystem-kit.init")

}
