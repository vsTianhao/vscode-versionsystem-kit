import * as vscode from "vscode"
import * as path from "path"
import LeftBarViewer from "./views/LeftBarViewer"
import LoggerFactory from './LoggerFactory'
import * as GulpCommands from './cmds/GulpCommands'
import OtherCommands from './cmds/OtherCommands'
import GulpOperate from "./GulpOperate"

export function activate(context: vscode.ExtensionContext): void {
	const logger = LoggerFactory("main")

	logger.info('扩展"vscode-versionsystem-kit"已激活')

	context.subscriptions.push(vscode.window.registerTreeDataProvider("vskit.views.leftBar", new LeftBarViewer()))

	vscode.workspace.getConfiguration("vskit").update("projectName", vscode.workspace.name)
	vscode.workspace.getConfiguration("vskit").update("cwd", vscode.workspace.rootPath)
	vscode.workspace.getConfiguration("vskit").update("dist", path.join(vscode.workspace.rootPath, 'dist'))

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.run", GulpCommands.run))

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.build", GulpCommands.build))

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.others", OtherCommands))

	GulpOperate()

}
