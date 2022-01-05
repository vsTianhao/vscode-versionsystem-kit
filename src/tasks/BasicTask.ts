import TaskItemBtn from '../views/TaskItemBtn'
import LoggerFactory from '../LoggerFactory'

export default class BasicTask {

    private logger = LoggerFactory("task")
    private allTasks = {
        build: ["all", "编译", "html", "单独编译index.html"],
        run: ["dev", "运行开发服务器", "shutdown", "关闭开发服务器", "signalServer", "查看信号服务器的连接"],
        upload: ["dist", "上传./dist到服务器", "assert", "上传./assert到服务器"],
        others: ["config", "查看当前环境的配置", "log", "查看Output", "close", "尝试process.exit"]
    }

    list(taskGroup: string): TaskItemBtn[] {
        if (this.allTasks[taskGroup]) {
            const tasks: string[] = this.allTasks[taskGroup]
            const taskBtns: TaskItemBtn[] = new Array<TaskItemBtn>()
            for (let index = 0; index < tasks.length;) {
                taskBtns.push(new TaskItemBtn(taskGroup + "-" + tasks[index++], tasks[index++]))
            }
            return taskBtns
        }
        return []
    }

}
