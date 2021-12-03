import * as vscode from "vscode"

export function run(type = "dev"): void {
    vscode.window.showInformationMessage("run")
    vscode.window.showInformationMessage(type)
}

export function build(type = "all"): void {
    vscode.window.showInformationMessage("build")
    vscode.window.showInformationMessage(type)
}
