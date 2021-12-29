import * as vscode from "vscode"
import * as log4js from "log4js"
import Configuration from "./Configuration"

/**
 * log4js.d.ts 里面没有这个两个类型
 */
declare interface LayoutsConfigType {
	layout: log4js.Layout;
	timezoneOffset: number;
}
declare type LayoutFunction = (le: log4js.LoggingEvent, tz: number) => string;
declare interface LayoutsType {
	colouredLayout: LayoutFunction;
	layout: (type: string, layouts: log4js.Layout) => LayoutFunction;
}

let isConfigure = false
const channel: vscode.OutputChannel = vscode.window.createOutputChannel("Versionsystem-Kit")
const defaultLogConfig: log4js.Configuration = {
	appenders: {
		vscodeOutput: {
			type: {
				// print to vscode
				configure: function (config: LayoutsConfigType, layouts: LayoutsType): ((event: log4js.LoggingEvent) => void) {
					let layout = layouts.colouredLayout
					if (config.layout) {
						layout = layouts.layout(config.layout.type, config.layout)
					}
					return (loggingEvent: log4js.LoggingEvent): void => {
						channel.appendLine(`${layout(loggingEvent, config.timezoneOffset)}\n`)
						if (loggingEvent.level.levelStr === "ERROR") {
							vscode.window.showErrorMessage(loggingEvent.data[0])
							channel.show()
						} else if (loggingEvent.level.levelStr === "INFO" && loggingEvent.data[0] === "完毕") {
							channel.show()
						}
					}
				}
			},
			layout: {
				type: 'pattern',
				// https://github.com/log4js-node/log4js-node/blob/f8d46a939279c0ab4efc8bb5f0478c4b0949a4cf/docs/layouts.md
				pattern: Configuration("logPattern")
			}
		}
	},
	categories: { default: { appenders: ['vscodeOutput'], level: Configuration("logLevel") || "INFO" } }
}

export default function LoggerFactory(category: string): log4js.Logger {
	if (!isConfigure) {
		isConfigure = true
		log4js.configure(defaultLogConfig)
	}
	return log4js.getLogger(category)
}
