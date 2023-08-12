// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';

class LogcatSession {
	static sessionIdSeed: number = 0

	sessionId: number = LogcatSession.sessionIdSeed++
	active: boolean = false
	outputChannel?: vscode.OutputChannel
	process?: ChildProcess

	public get name(): string {
		return `Logcat ${this.sessionId}`
	}

	public start() {
		if (this.active) {
			return
		}
		const outputChannel = vscode.window.createOutputChannel(this.name, 'log')
		outputChannel.show()
		outputChannel.appendLine('================ ADB Logcat Started ================')

		// TODO: filters and format
		const adbProcess = spawn('adb', ['logcat'])
		adbProcess.stdout?.on('data', (data) => {
			outputChannel.append(data.toString())
		})
		adbProcess.stderr?.on('data', (data) => {
			outputChannel.append(data.toString())
		})
		adbProcess.on('close', (code) => {
			outputChannel.appendLine(`================ ADB Logcat Stopped[${code ?? '0'}] ================`)
		})

		this.outputChannel = outputChannel
		this.process = adbProcess
		this.active = true
	}

	public stop() {
		if (!this.active) {
			return
		}
		this.active = false
		this.process?.kill()
		this.process = undefined
	}

	public dispose() {
		this.stop()
		this.outputChannel?.dispose()
		this.outputChannel = undefined
	}
}

const logcatSessions: LogcatSession[] = []

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vsclogcat" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('vsclogcat.startLogcat', () => {
		const session = new LogcatSession()
		logcatSessions.push(session)
		session.start()
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vsclogcat.stopLogcat', async () => {
		const activeSessions = logcatSessions.filter((session) => session.active)
		if (activeSessions.length === 0) {
			return
		}
		if (activeSessions.length === 1) {
			const session = logcatSessions[0]
			session?.stop()
			return
		}

		const options = activeSessions.map((session) => session.name)
		const selected = await vscode.window.showQuickPick(options, { title: 'Choose logcat session' })
		const index = options.indexOf(selected || '')
		if (index >= 0) {
			const session = activeSessions[index]
			session?.stop()
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vsclogcat.stopAll', async () => {
		const activeSessions = logcatSessions.filter((session) => session.active)
		activeSessions.forEach((session) => session.stop())
	}));

	context.subscriptions.push({
		dispose() {
			logcatSessions.forEach((session) => session.dispose())
		},
	})
}

// This method is called when your extension is deactivated
export function deactivate() {}
