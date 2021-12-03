import * as vscode from "vscode"

export async function config(): void {
    const doc = await vscode.workspace.openTextDocument({
        language: "json",
        content: JSON.stringify(vscode.workspace.getConfiguration("vskit"), null, "\t")
    })
    vscode.window.showTextDocument(doc, { preview: true })
}
