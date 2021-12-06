import * as vscode from "vscode"
import gulp from 'gulp'

export function run(type = "dev"): void {
    vscode.window.showInformationMessage(type)
    gulp.task("dev")(() => void 0)
}

export function build(type = "all"): void {
    vscode.window.showInformationMessage("build")
    vscode.window.showInformationMessage(type)
}
