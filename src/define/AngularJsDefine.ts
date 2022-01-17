import * as vscode from "vscode"
import LoggerFactory from "../LoggerFactory"

class AngularJsDefineProvider implements vscode.DefinitionProvider {

    private readonly logger = LoggerFactory("define-provider")
    private readonly document: vscode.TextDocument
    private readonly range: vscode.Range
    private readonly search: string

    //, token: vscode.CancellationToken
    provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition | vscode.DefinitionLink[]> {
        if (position.character <= 0) {
            return
        }
        const range = document.getWordRangeAtPosition(position)
        if (!range) {
            return
        }
        this.document = document
        this.search = document.getText(range)
        this.range = range
        if (this.strAt(-6) !== "scope.") {
            return
        }
        if (this.strAt(2) === " =") {
            return this.findScopeReference()
        }
        return this.findScopeDefine()
    }

    /**
     * 在搜索字符串的前后剪裁字符串
     */
    public strAt(index): string {
        if (this.range.start.character + index < 0) {
            return ''
        }
        if (index < 0) {
            const s = new vscode.Range(new vscode.Position(this.range.start.line, this.range.start.character + index),
                this.range.start)
            return this.document.getText(this.document.validateRange(s))
        }
        return this.document.getText(new vscode.Range(
            this.range.end,
            new vscode.Position(this.range.end.line, this.range.end.character + index)))
    }

    /**
     * 搜索scope定义的地方
     */
    public findScopeDefine(): vscode.Definition {
        const thisDocIndex = this.document.getText().indexOf(`scope.${this.search} = `)
        if (thisDocIndex === -1) {
            return
        }
        return new vscode.Location(vscode.Uri.file(this.document.fileName), new vscode.Range(
            this.document.positionAt(thisDocIndex + 6),
            this.document.positionAt(thisDocIndex + 6 + this.search.length)))
    }

    /**
     * 搜索scope引用的地方
     */
    public findScopeReference(): vscode.Definition[] {
        const thisDocArr = [...this.document.getText().matchAll(new RegExp("scope." + this.search, "g"))]
        if (!thisDocArr.length) {
            return
        }
        return thisDocArr.map((item) => {
            return new vscode.Location(vscode.Uri.file(this.document.fileName), new vscode.Range(
                this.document.positionAt(item.index + 6),
                this.document.positionAt(item.index + 6 + this.search.length)))
        })
    }

}

export default class AngularJsDefine {

    constructor() {
        vscode.languages.registerDefinitionProvider({
            scheme: 'file', language: 'javascript'
        }, new AngularJsDefineProvider())
    }

}