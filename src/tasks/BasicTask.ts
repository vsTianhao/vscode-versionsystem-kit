import TaskItemBtn from '../views/TaskItemBtn'
import LoggerFactory from '../LoggerFactory'

export default class BasicTask {

    private logger = LoggerFactory("task")

    contain(task: string): boolean {
        if (task === "compile") {
            return true
        }
        return false
    }

    list(task: string): TaskItemBtn[] {
        if (task === "build") {
            return [new TaskItemBtn("build-all", "全部编译"), new TaskItemBtn("build-html", "单独编译index.html")]
        } else if (task === "run") {
            return [new TaskItemBtn("run-dev", "运行开发服务器")]
        } else if (task === "upload") {
            return [new TaskItemBtn("upload-dist", "上传./dist到服务器"), new TaskItemBtn("upload-assert", "上传./assert到服务器")]
        } else if (task === "other") {
            return [new TaskItemBtn("config-all", "查看当前环境的配置")]
        }
        return []
    }

}
