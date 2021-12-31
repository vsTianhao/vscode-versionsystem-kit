import TaskItemBtn from '../views/TaskItemBtn'

/**
 * 作为group task btns，taskId不可以有"-"
 * @returns 所有的group task btn
 */
export default function (): TaskItemBtn[] {

    const coreTaskGroups = new Map(Object.entries({
        build: '构建',
        run: '服务器',
        upload: '上传',
        others: "其他"
    }))

    const groupBtns: TaskItemBtn[] = new Array(coreTaskGroups.size)
    coreTaskGroups.forEach((key, value) => {
        groupBtns.push(new TaskItemBtn(value, key, "group"))
    })

    return groupBtns
}
