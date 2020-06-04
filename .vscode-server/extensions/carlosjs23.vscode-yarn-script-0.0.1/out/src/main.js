"use strict";
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const vscode_1 = require('vscode');
const run_in_terminal_1 = require('run-in-terminal');
const tree_kill_1 = require('tree-kill');
class ProcessItem {
    constructor(label, description, pid) {
        this.label = label;
        this.description = description;
        this.pid = pid;
    }
}
const runningProcesses = new Map();
let outputChannel;
let terminal = null;
let lastScript = null;
function activate(context) {
    registerCommands(context);
    outputChannel = vscode_1.window.createOutputChannel('yarn');
    context.subscriptions.push(outputChannel);
}
exports.activate = activate;
function deactivate() {
    if (terminal) {
        terminal.dispose();
    }
}
exports.deactivate = deactivate;
function registerCommands(context) {
    context.subscriptions.push(vscode_1.commands.registerCommand('yarn-script.install-yarn', runYarnInstaller), vscode_1.commands.registerCommand('yarn-script.install', runYarnInstall), vscode_1.commands.registerCommand('yarn-script.test', runYarnTest), vscode_1.commands.registerCommand('yarn-script.start', runYarnStart), vscode_1.commands.registerCommand('yarn-script.run', runYarnScript), vscode_1.commands.registerCommand('yarn-script.showOutput', showYarnOutput), vscode_1.commands.registerCommand('yarn-script.rerun-last-script', rerunLastScript), vscode_1.commands.registerCommand('yarn-script.build', runYarnBuild), vscode_1.commands.registerCommand('yarn-script.terminate-script', terminateScript));
}
function runYarnInstaller() {
    runNpmCommand(['install --global yarn']);
}
function runYarnInstall() {
    let dirs = getIncludedDirectories();
    for (let dir of dirs) {
        runYarnCommand(['install'], dir);
    }
}
function runYarnTest() {
    runYarnCommand(['test']);
}
function runYarnStart() {
    runYarnCommand(['start']);
}
function runYarnBuild() {
    runYarnCommand(['run', 'build']);
}
function showYarnOutput() {
    outputChannel.show(vscode_1.ViewColumn.Three);
}
function runYarnScript() {
    let scripts = readScripts();
    if (!scripts) {
        return;
    }
    let scriptList = [];
    for (let s of scripts) {
        let label = s.name;
        if (s.relativePath) {
            label = `${s.relativePath}: ${label}`;
        }
        scriptList.push({
            label: label,
            description: s.cmd,
            scriptName: s.name,
            cwd: s.absolutePath,
            execute() {
                lastScript = this;
                let script = this.scriptName;
                // quote the script name, when it contains white space
                if (/\s/g.test(script)) {
                    script = `"${script}"`;
                }
                let command = ['run', script];
                runYarnCommand(command, this.cwd);
            }
        });
    }
    vscode_1.window.showQuickPick(scriptList).then(script => {
        if (script) {
            return script.execute();
        }
    });
}
;
function rerunLastScript() {
    if (lastScript) {
        lastScript.execute();
    }
    else {
        runYarnScript();
    }
}
function terminateScript() {
    if (useTerminal()) {
        vscode_1.window.showInformationMessage('Killing is only supported when the setting "runInTerminal" is "false"');
    }
    else {
        let items = [];
        runningProcesses.forEach((value) => {
            items.push(new ProcessItem(value.cmd, `kill the process ${value.process.pid}`, value.process.pid));
        });
        vscode_1.window.showQuickPick(items).then((value) => {
            if (value) {
                outputChannel.appendLine('');
                outputChannel.appendLine(`Killing process ${value.label} (pid: ${value.pid})`);
                outputChannel.appendLine('');
                tree_kill_1.kill(value.pid, 'SIGTERM');
            }
        });
    }
}
function readScripts() {
    let includedDirectories = getIncludedDirectories();
    let scripts = [];
    let fileName = "";
    let dir;
    for (dir of includedDirectories) {
        try {
            fileName = path.join(dir, 'package.json');
            let contents = fs.readFileSync(fileName).toString();
            let json = JSON.parse(contents);
            if (json.scripts) {
                var jsonScripts = json.scripts;
                var absolutePath = dir;
                var relativePath = absolutePath.substring(vscode_1.workspace.rootPath.length + 1);
                Object.keys(jsonScripts).forEach(key => {
                    scripts.push({
                        absolutePath: absolutePath,
                        relativePath: relativePath,
                        name: `${key}`,
                        cmd: `${jsonScripts[key]}`
                    });
                });
            }
        }
        catch (e) {
            vscode_1.window.showInformationMessage(`Cannot read '${fileName}'`);
            return undefined;
        }
    }
    if (scripts.length === 0) {
        vscode_1.window.showInformationMessage('No scripts are defined');
        return undefined;
    }
    return scripts;
}
function runYarnCommand(args, cwd) {
    if (runSilent()) {
        args.push('--silent');
    }
    vscode_1.workspace.saveAll().then(() => {
        if (!cwd) {
            cwd = vscode_1.workspace.rootPath;
        }
        if (useTerminal()) {
            if (typeof vscode_1.window.createTerminal === 'function') {
                runCommandInIntegratedTerminal(args, cwd);
            }
            else {
                runCommandInTerminal(args, cwd);
            }
        }
        else {
            outputChannel.clear();
            runCommandInOutputWindow(args, cwd);
        }
    });
}
function runNpmCommand(args, cwd) {
    vscode_1.workspace.saveAll().then(() => {
        if (!cwd) {
            cwd = vscode_1.workspace.rootPath;
        }
        runNpmCommandInIntegratedTerminal(args, cwd);
    });
}
function runCommandInOutputWindow(args, cwd) {
    let cmd = getYarnBin() + ' ' + args.join(' ');
    let p = cp.exec(cmd, { cwd: cwd, env: process.env });
    runningProcesses.set(p.pid, { process: p, cmd: cmd });
    p.stderr.on('data', (data) => {
        outputChannel.append(data);
    });
    p.stdout.on('data', (data) => {
        outputChannel.append(data);
    });
    p.on('exit', (code, signal) => {
        runningProcesses.delete(p.pid);
        if (signal === 'SIGTERM') {
            outputChannel.appendLine('Successfully killed process');
            outputChannel.appendLine('-----------------------');
            outputChannel.appendLine('');
        }
        else {
            outputChannel.appendLine('-----------------------');
            outputChannel.appendLine('');
        }
    });
    showYarnOutput();
}
function runCommandInTerminal(args, cwd) {
    run_in_terminal_1.runInTerminal(getYarnBin(), args, { cwd: cwd, env: process.env });
}
function runCommandInIntegratedTerminal(args, cwd) {
    if (!terminal) {
        terminal = vscode_1.window.createTerminal('yarn');
    }
    terminal.show();
    args.splice(0, 0, getYarnBin());
    terminal.sendText(args.join(' '));
}
function runNpmCommandInIntegratedTerminal(args, cwd) {
    if (!terminal) {
        terminal = vscode_1.window.createTerminal('yarn');
    }
    terminal.show();
    args.splice(0, 0, getNpmBin());
    terminal.sendText(args.join(' '));
}
function useTerminal() {
    return vscode_1.workspace.getConfiguration('yarn')['runInTerminal'];
}
function runSilent() {
    return vscode_1.workspace.getConfiguration('yarn')['runSilent'];
}
function getIncludedDirectories() {
    let dirs = [];
    if (vscode_1.workspace.getConfiguration('yarn')['useRootDirectory'] !== false) {
        dirs.push(vscode_1.workspace.rootPath);
    }
    if (vscode_1.workspace.getConfiguration('yarn')['includeDirectories'].length > 0) {
        for (let dir of vscode_1.workspace.getConfiguration('yarn')['includeDirectories']) {
            dirs.push(path.join(vscode_1.workspace.rootPath, dir));
        }
    }
    return dirs;
}
function getYarnBin() {
    return vscode_1.workspace.getConfiguration('yarn')['bin'] || 'yarn';
}
function getNpmBin() {
    return vscode_1.workspace.getConfiguration('npm')['bin'] || 'npm';
}
//# sourceMappingURL=main.js.map