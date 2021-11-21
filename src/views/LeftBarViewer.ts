import * as vscode from 'vscode'
import { TaskItemBtn } from './TaskItemBtn'
import LoggerFactory from '../LoggerFactory'
export default class LeftBarViewer implements vscode.TreeDataProvider<TaskItemBtn> {

	private logger = LoggerFactory("operate")

	private group = LoggerFactory("group")

    getTreeItem(element: TaskItemBtn): vscode.TreeItem {
        return element
    }

    getChildren(element?: TaskItemBtn): TaskItemBtn[] {
        if (!element) {
            return [new TaskItemBtn("compile", "编译", "group")]
        }
        if (element.taskId === "compile") {
            return [new TaskItemBtn("compile-all", "全部编译")]
        }
        this.logger.info(element.taskId)
        if (element.taskId === "compile-all") {
            return null
        }
    }

}
