import * as vscode from "vscode"
import LeftBarViewer from "./views/LeftBarViewer"
import LoggerFactory from './LoggerFactory'
import * as GulpCommands from './cmds/GulpCommands'
import * as OtherCommands from './cmds/OtherCommands'

export function activate(context: vscode.ExtensionContext): void {
	const logger = LoggerFactory("main")

	logger.info('Extension "vscode-versionsystem-kit" is now active (*^▽^*)')

	context.subscriptions.push(vscode.window.registerTreeDataProvider("vskit.views.leftBar", new LeftBarViewer()))

	vscode.workspace.getConfiguration("vskit").update("projectName", vscode.workspace.name)
	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.currentPath", () => {
		vscode.window.showInformationMessage(vscode.workspace.name)
	}))

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.run", GulpCommands.run))

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.build", GulpCommands.build))

	context.subscriptions.push(vscode.commands.registerCommand("vscode-versionsystem-kit.config", OtherCommands.config))

}
