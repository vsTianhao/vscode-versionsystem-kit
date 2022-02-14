import * as vscode from "vscode"
import LoggerFactory from '../LoggerFactory'
import globule from 'globule'
import client from 'scp2'
import RemoteFile from '../types/RemoteFile'
import Configuration from '../Configuration'
import * as path from 'path'

const logger = LoggerFactory("upload-cmd")

export default async function (type = "dist"): Promise<void> {
    if (!Configuration("remoteHost")) {
        logger.error("没有remoteHost")
        return
    }
    const password = await vscode.window.showInputBox({
        prompt: "服务器那边的密码"
    })
    const remoteFiles: RemoteFile[] = Configuration("remoteFiles")
    remoteFiles.map(distItem => {
        if (distItem.type !== type) {
            return
        }
        distItem.sourceFile.map(matchItem => {
            const dest = path.join(Configuration("remotePrefix"), Configuration("projectName"), distItem.dest).replace(/\\/g, '/')
            globule.find({
                src: path.join(distItem.sourcePath, matchItem),
                srcBase: Configuration("cwd")
            }).map((src) => {
                client.scp(path.join(Configuration("cwd"), src), `administrator:${password}@${Configuration("remoteHost")}:${dest}`, (scpErr) => {
                    if (scpErr) {
                        logger.error("failure:" + src + "\n\t=> " + dest)
                        logger.error(scpErr)
                        return
                    }
                    logger.info("success:" + src + "\n\t=> " + dest)
                })
            })
        })
    })
    return
}
