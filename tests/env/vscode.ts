const configObj = {
	"vskit.projectName": "THCMSApplication-Client",
	"vskit.cwd": "e:\\idea\\THCMSApplication-Client",
	"vskit.dist": "e:\\idea\\THCMSApplication-Client\\dist",
	"vskit.appHTML": "client/app/**/*.html",
	"vskit.componentsHTML": "client/components/*/*.html",
	"vskit.frondendMainHTML": "./client/index.html",
	"vskit.mainCSS": "./client/app/app.scss",
	"vskit.cssMatch": ["./client/app/**/*.scss", "./client/components/**/*.scss", "!./client/app/app.scss"],
	"vskit.entries": ["./client/app/*/*.js", "!./client/app/*/*.spec.js", "./client/components/*/*.js"],
	"vskit.appPath": "./client/app"
}

module.exports = {
	version: "VIRTUAL-TEST VSCODE",
	window: {
		showInformationMessage(text: string): void {
			console.log(`showInformationMessage: ${text}`)
		},
		createOutputChannel(channelName: string): unknown {
			return {
				appendLine(text: string): void {
					console.log(`vscode channel: [${channelName}] ${text}`)
				}
			}
		}
	},
	workspace: {
		getConfiguration(group: string): unknown {
			return {
				// get<T>(key: string): T | undefined {
				get(key: string): string | string[] {
					return configObj[group + "." + key]
					// return configMap.get(group + "." + key)
				}
			}
		}
	}
}
