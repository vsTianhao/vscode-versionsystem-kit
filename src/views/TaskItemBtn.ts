import * as vscode from 'vscode'
import * as path from 'path'

export default class TaskItemBtn extends vscode.TreeItem {

    public taskId: string
    public type: string

    constructor(taskId: string, name: string, type = "task") {
        super(name, type === "group" ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None)
        if (taskId.indexOf("-") !== -1) {
            const [group, type] = taskId.split("-")
            this.command = {
                title: "vscode-versionsystem-kit." + group,
                command: "vscode-versionsystem-kit." + group,
                arguments: [type]
            }
        }
        this.taskId = taskId
        this.type = type
        this.tooltip = name
        this.iconPath = {
            light: path.join(__filename, '..', '..', '..', 'resources', 'light', this.type + '.svg'),
            dark: path.join(__filename, '..', '..', '..', 'resources', 'dark', this.type + '.svg')
        }
        // this.description = description
    }

}