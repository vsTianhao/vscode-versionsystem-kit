import * as vscode from "vscode"
import * as log4js from "log4js"
import Configuration from "./Configuration"

let isConfigure = false
const channel: vscode.OutputChannel = vscode.window.createOutputChannel("Versionsystem-Kit")

const defaultLogConfig: log4js.Configuration = {
	appenders: {
		vscodeOutput: {
			type: {
				configure: function (config, layouts): ((event: log4js.LoggingEvent) => void) {
					let layout = layouts.colouredLayout
					if (config.layout) {
						layout = layouts.layout(config.layout.type, config.layout)
					}
					return (loggingEvent: log4js.LoggingEvent): void => {
						channel.appendLine(`${layout(loggingEvent, config.timezoneOffset)}\n`)
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
	categories: { default: { appenders: ['vscodeOutput'], level: Configuration("logLevel") } }
}

export default function LoggerFactory(category): log4js.Logger {
	if (!isConfigure) {
		isConfigure = true
		log4js.configure(defaultLogConfig)
	}
	return log4js.getLogger(category)
}
