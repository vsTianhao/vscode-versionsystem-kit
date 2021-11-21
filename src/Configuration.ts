import * as vscode from "vscode"

export default function Configuration<T>(key: string): T {
    return vscode.workspace.getConfiguration("vskit").get(key)
}
