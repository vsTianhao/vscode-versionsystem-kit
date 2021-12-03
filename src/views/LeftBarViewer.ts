import * as vscode from 'vscode'
import TaskItemBtn from './TaskItemBtn'
import LoggerFactory from '../LoggerFactory'
import CoreTaskGroup from '../tasks/CoreTaskGroup'
import BasicTask from '../tasks/BasicTask'
export default class LeftBarViewer implements vscode.TreeDataProvider<TaskItemBtn> {

    private logger = LoggerFactory("task")

    private group = LoggerFactory("group")

    getTreeItem(element: TaskItemBtn): vscode.TreeItem {
        return element
    }

    /**
     * 以"-"来区分任务组与任务
     */
    getChildren(element?: TaskItemBtn): TaskItemBtn[] {
        if (!element) {
            // 任务组
            return CoreTaskGroup()
        }
        const basicTask = new BasicTask()
        if (element.taskId.indexOf("-") === -1) {// && basicTask.contain(element.taskId)
            // 展示具体任务
            const tasks: TaskItemBtn[] = basicTask.list(element.taskId)
            if (tasks.length) {
                return tasks
            }
            return [new TaskItemBtn("other-unknown", "这个任务组暂未实现任何具体的任务")]
        }
        // 执行任务
        // const result: TaskResult = basicTask.exec(element.taskId)
        // if (result.code === "UNKNOW") {
        //     this.logger.error("Unknown task:" + element.taskId)
        // }
        // if (result.code === "SUCCESS") {
        //     this.logger.info(`[${element.taskId}] 已经成功执行`)
        // }
        // if (result.code === "ERROR") {
        //     this.logger.info(result.msg)
        //     this.logger.info(`[${element.taskId}] 失败了`)
        // }
        // if (result.code === "TARGET") {
        //     this.logger.info(`[${element.taskId}] 想要触发[${result.msg}]任务`)
        // }
        return null
    }

}
