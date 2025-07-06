import * as vscode from 'vscode';
import { Requirement } from './models/requirement';
import { RequirementTreeProvider } from './views/requirementTreeViewProvider';
import { TreeNode } from './models/treeNode';
import { TestNode } from './models/test';
import { TestCase } from './models/testCase';
import { DetailsViewProvider } from './views/detailsViewProvider';
import { TabularViewProvider } from './views/tabularViewProvider';
import { ReqifFileManager } from './utils/reqifFileManager';
import { spawn } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { CoverageCheckWebviewProvider } from './views/coverageCheckWebViewProvider';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "typhoon-requirement-tool" is now active!');
	let coverageActive : boolean = false;
	const detailsViewProvider = new DetailsViewProvider(context);

	const requirementDataProvider = new RequirementTreeProvider(detailsViewProvider);

	const treeView = vscode.window.createTreeView('typhoon-requirement-tool.tree', {
        treeDataProvider: requirementDataProvider,
    });

	vscode.window.registerWebviewViewProvider(DetailsViewProvider.viewType, detailsViewProvider);

	treeView.onDidChangeSelection((event) => {
        const selectedNode = event.selection[0];
        if (selectedNode) {
            requirementDataProvider.onNodeSelected(selectedNode);
        }else{
			requirementDataProvider.clearSelection();
		}
    });

    context.subscriptions.push(treeView);


	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.helloQm', () => {
		vscode.window.showInformationMessage('Hello Qm from Typhoon Requirement Tool!');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.addRequirement', () => {
		requirementDataProvider.addRequirement();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.addTest', (node: TreeNode) => {
		if (!node) {
			vscode.window.showErrorMessage('No requirement selected. You cant add test without requirement.');
			return;
		}
		requirementDataProvider.addTest(node);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.addTestCase', (node: TreeNode) => {
		if (!node) {
			vscode.window.showErrorMessage('No test selected. You cant add test case without test.');
			return;
		}
		requirementDataProvider.addTestCase(node);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.editRequirement', (node: Requirement) => {
		requirementDataProvider.editRequirement(node);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.editTest', (node: TestNode) => {
		requirementDataProvider.editTest(node);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.editTestCase', (node: TestCase) => {
		requirementDataProvider.editTestCase(node);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.editUnknownRequirment', (node: TreeNode) => {
		requirementDataProvider.editUnknownRequirement(node);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.deleteNode', (node: TreeNode) => {
		requirementDataProvider.deleteNode(node);
	}));

	context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-requirement-tool.selectNode', (node: TreeNode) => {
            requirementDataProvider.onNodeSelected(node);
        })
    );

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.restart', () => {
		requirementDataProvider.restart();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.exportToReqIF', async () => {
		const saveUri = await vscode.window.showSaveDialog({
			filters: { 'ReqIF Files': ['reqif'] },
			defaultUri: vscode.Uri.file('requirements'),
		});

		if (!saveUri) {
			vscode.window.showErrorMessage('Export cancelled. No file selected.');
			return;
		}
		try{
			const reqifContent = ReqifFileManager.exportToReqIF(requirementDataProvider.getAllNodes(), requirementDataProvider.projectId);
			await vscode.workspace.fs.writeFile(saveUri, Buffer.from(reqifContent, 'utf-8'));
			vscode.window.showInformationMessage('Requirements exported to ReqIF file successfully!');
		}catch (error : any) {
			vscode.window.showErrorMessage('Error exporting requirements to ReqIF: ' + error.message);
		}

	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.importFromReqIF', async () => {
		const openUri = await vscode.window.showOpenDialog({
			filters: { 'ReqIF Files': ['reqif'] },
			canSelectMany: false,
		});

		if (!openUri || openUri.length === 0) {
			vscode.window.showErrorMessage('Import cancelled. No file selected.');
			return;
		}

		try{
			const fileContent = await vscode.workspace.fs.readFile(openUri[0]);
			const reqifContent = fileContent.toString();
			const nodes = await ReqifFileManager.importFromReqIF(reqifContent);
			requirementDataProvider.updateTree(nodes);
			if (nodes.length === 0){
				vscode.window.showErrorMessage('No valid requirements found in the ReqIF file.');
			}else{
				vscode.window.showInformationMessage(`Requirements imported from ${openUri[0].fsPath}`);
			}
		}catch (error : any) {
			vscode.window.showErrorMessage('Error importing requirements from ReqIF: ' + error.message);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.exportToCSV', async () => {
		const saveUri = await vscode.window.showSaveDialog({
			filters: { 'CSV Files': ['csv'] },
			defaultUri: vscode.Uri.file('requirements.csv'),
		});
	
		if (!saveUri) {
			vscode.window.showErrorMessage('Export canceled.');
			return;
		}
	
		try {
			const csvContent = requirementDataProvider.exportToReqViewCSV();
			await vscode.workspace.fs.writeFile(saveUri, Buffer.from(csvContent, 'utf-8'));
			vscode.window.showInformationMessage(`Requirements exported to ${saveUri.fsPath}`);
		} catch (error : any) {
			vscode.window.showErrorMessage(`Failed to export requirements: ${error.message}`);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.importFromCSV', async () => {
		const openUri = await vscode.window.showOpenDialog({
			filters: { 'CSV Files': ['csv'] },
			canSelectMany: false,
		});
	
		if (!openUri || openUri.length === 0) {
			vscode.window.showErrorMessage('No file selected.');
			return;
		}
	
		try {
			const fileContent = await vscode.workspace.fs.readFile(openUri[0]);
			const csvContent = fileContent.toString();
			requirementDataProvider.importFromReqViewCSV(csvContent);
			vscode.window.showInformationMessage(`Requirements imported from ${openUri[0].fsPath}`);
		} catch (error : any) {
			vscode.window.showErrorMessage(`Failed to import requirements: ${error.message}`);
		}
	}));


	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.openTabularView', () => {
		// TabularViewProvider.coverageActive = coverageActive;
		TabularViewProvider.show(requirementDataProvider);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.generateTestsFromReqif', async () => {
		try{
			const openUri = await vscode.window.showOpenDialog({
				filters: { 'ReqIF Files': ['reqif'] },
				canSelectMany: false,
			});

			if (!openUri || openUri.length === 0) {
				vscode.window.showErrorMessage('Import cancelled. No file selected.');
				return;
			}

			const outputFolder = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false });
			if (!outputFolder || outputFolder.length === 0) {
				vscode.window.showErrorMessage('No output folder selected.');
				return;
			}
			const reqifPath = openUri[0].fsPath;
			const outputPath = outputFolder[0].fsPath;

			const ignoreName = ".typhoonignore";
			const ignorePath = path.join(outputPath, ignoreName);
			fs.writeFileSync(ignorePath, "", 'utf-8');

			await runTestGeneration(reqifPath, outputPath);
		}catch (err: any){
			vscode.window.showErrorMessage(`Unexpected error during test generation: ${err.message}`);
		}
		
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.generateTests', async () => {
		try {
			if (requirementDataProvider.isEmpty()){
				vscode.window.showErrorMessage("No requirement data");
				return;
			}
			const folderUri = await vscode.window.showOpenDialog({
				canSelectFolders: true,
				openLabel: 'Select folder to generate tests',
			});
			if (!folderUri || folderUri.length === 0) {
				vscode.window.showWarningMessage('Test generation cancelled: No folder selected.');
				return;
			}
			const outputDir = folderUri[0].fsPath;

			const reqifContent = ReqifFileManager.exportToReqIF(requirementDataProvider.getAllNodes(), requirementDataProvider.projectId);
			const fileName = `requirements_${Date.now()}.reqif`;
			const reqifPath = path.join(outputDir, fileName);
			fs.writeFileSync(reqifPath, reqifContent, 'utf-8');

			const ignoreName = ".typhoonignore";
			const ignorePath = path.join(outputDir, ignoreName);
			fs.writeFileSync(ignorePath, "", 'utf-8');
	
			await runTestGeneration(reqifPath, outputDir);
	
		} catch (err: any) {
			vscode.window.showErrorMessage(`Unexpected error during test generation: ${err.message}`);
		}

	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.removeIcons', () => {
		const allNodes = requirementDataProvider.getAllNodes();
		if (allNodes.length === 0) {
			vscode.window.showErrorMessage("No requirement data");
			return;
		}
		function clearIcons(node: any) {
			node.iconPath = new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("charts.white"));
		}
		allNodes.forEach(clearIcons);
		requirementDataProvider.refresh();
		vscode.commands.executeCommand('setContext', 'typhoonRequirementTool.coverageActive', false);
		coverageActive = false;
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.coverageCheck', async () => {
		try {
			if (requirementDataProvider.isEmpty()){
				vscode.window.showErrorMessage("No requirement data");
				return;
			}
			const folderUri = await vscode.window.showOpenDialog({
				canSelectFolders: true,
				openLabel: 'Select folder where are tests',
			});
			if (!folderUri || folderUri.length === 0) {
				vscode.window.showWarningMessage('Coverage check cancelled: No folder selected.');
				return;
			}
			const outputDir = folderUri[0].fsPath;

			vscode.window.showInformationMessage(
				"You can specify an ignore file (like .gitignore) to exclude files or folders from coverage check. " +
				"This file should be in the root of your test project and list patterns to ignore, one per line. (e.g., *.tmp, /build/, test_data/)"
			);
			const ignoreFileName = '.typhoonignore';
			const defaultIgnoreFilePath = path.join(outputDir, ignoreFileName);

			if (!fs.existsSync(defaultIgnoreFilePath)) {
				const choice = await vscode.window.showInformationMessage(
					'There is no ignore file for coverage check. Do you want to create a new one or continue without it?',
					'Create', 'Continue without'
				);
				if (choice === 'Create') {
					fs.writeFileSync(defaultIgnoreFilePath, '', 'utf-8');
					vscode.window.showInformationMessage(`Created ${ignoreFileName} in ${outputDir}`);
				}
			}

			const coverageCheckProvider = new CoverageCheckWebviewProvider(requirementDataProvider, outputDir);
			coverageCheckProvider.generateCoverageReport();

			// vscode.commands.executeCommand('setContext', 'typhoonRequirementTool.coverageActive', true);
			coverageActive = true;

		} catch (err: any) {
			vscode.window.showErrorMessage(`Unexpected error during test generation: ${err.message}`);
		}
	}));

}

export function deactivate() {}

async function getPythonInterpreterPath(): Promise<string | undefined> {
    const extension = vscode.extensions.getExtension('ms-python.python');
    if (!extension) {return undefined;}
    if (!extension.isActive) {
        await extension.activate();
    }
    // @ts-ignore
    const pythonPath = extension.exports.settings.getExecutionDetails().execCommand[0];
    return pythonPath;
}

async function runTestGeneration(reqifPath: string, outputPath: string) {
    const pythonPath = await getPythonInterpreterPath();
    if (!pythonPath) {
        vscode.window.showErrorMessage('Could not determine Python interpreter path.');
        return;
    }

    let venvBinDir: string | undefined = undefined;
    if (pythonPath) {
        const venvDir = path.dirname(path.dirname(pythonPath));
        venvBinDir = path.join(venvDir, os.platform() === 'win32' ? 'Scripts' : 'bin');
    }

    const env = { ...process.env };
    if (venvBinDir) {
        env.PATH = venvBinDir + path.delimiter + env.PATH;
    }

    const processSpawn = spawn('typhoon_testgen', [reqifPath, outputPath], { env });
    let output = '';
    let error = '';

    processSpawn.stdout.on('data', (data) => {
        output += data.toString();
    });
    processSpawn.stderr.on('data', (data) => {
        error += data.toString();
    });
    processSpawn.on('close', (code) => {
        if (code === 0) {
            vscode.window.showInformationMessage('Tests generated successfully!');
        } else {
            vscode.window.showErrorMessage(`Test generation failed: ${error || output}`);
        }
    });
}




