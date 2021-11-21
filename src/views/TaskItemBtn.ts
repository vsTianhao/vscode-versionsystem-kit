import * as vscode from 'vscode'
import * as path from 'path'

export class TaskItemBtn extends vscode.TreeItem {

    public taskId: string
    public type: string

    constructor(
        taskId: string, name: string, type = "task"
    ) {
        super(name, type === "group" ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
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