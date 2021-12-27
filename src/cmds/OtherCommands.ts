import * as vscode from "vscode"
import LoggerFactory from '../LoggerFactory'
const logger = LoggerFactory("vskit-other-task")

export default async function (type = "config"): Promise<void> {
    if (type === "config") {
        const doc = await vscode.workspace.openTextDocument({
            language: "json",
            content: JSON.stringify(vscode.workspace.getConfiguration("vskit"), null, "\t")
        })
        vscode.window.showTextDocument(doc, { preview: true })
    } else if (type === "close") {
        logger.log("尝试process.exit, 当然这会引起vscode报错")
        process.exit(0)
    }
}
