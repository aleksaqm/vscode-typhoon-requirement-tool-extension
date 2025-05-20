import * as vscode from 'vscode';
import { Requirement } from './models/requirement';
import { RequirementTreeProvider } from './views/requirementTreeViewProvider';
import { TreeNode } from './models/treeNode';
import { TestNode } from './models/test';
import { TestCase } from './models/testCase';
import { DetailsViewProvider } from './views/detailsViewProvider';
import { TabularViewProvider } from './views/tabularViewProvider';
import { ReqifFileManager } from './utils/reqifFileManager';
import { exec, spawn } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { CoverageCheckWebviewProvider } from './views/coverageCheckWebViewProvider';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "typhoon-requirement-tool" is now active!');

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

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.deleteNode', (node: TreeNode) => {
		requirementDataProvider.deleteNode(node);
	}));

	context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-requirement-tool.selectNode', (node: TreeNode) => {
            requirementDataProvider.onNodeSelected(node);
        })
    );

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
			const reqifContent = ReqifFileManager.exportToReqIF(requirementDataProvider.getAllNodes());
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
			vscode.window.showInformationMessage(`Requirements imported from ${openUri[0].fsPath}`);
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
		TabularViewProvider.show(requirementDataProvider);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.generateTestsFromReqif', async () => {
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

		runTestGeneration(reqifPath, outputPath);
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

			const reqifContent = ReqifFileManager.exportToReqIF(requirementDataProvider.getAllNodes());
			const fileName = `requirements_${Date.now()}.reqif`;
			const reqifPath = path.join(outputDir, fileName);
			fs.writeFileSync(reqifPath, reqifContent, 'utf-8');
	
			runTestGeneration(reqifPath, outputDir);
	
		} catch (err: any) {
			vscode.window.showErrorMessage(`Unexpected error during test generation: ${err.message}`);
		}

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

			const reqifContent = ReqifFileManager.exportToReqIF(requirementDataProvider.getAllNodes());
			const tempDir = os.tmpdir();
			const fileName = `temp_${Date.now()}.reqif`;
			const tempPath = path.join(tempDir, fileName);
			fs.writeFileSync(tempPath, reqifContent, 'utf-8');
	
			const process = spawn('coverage_check', [tempPath, outputDir]);
			let result = '';
			let error = '';

			process.stdout.on('data', (data) => { result += data.toString(); });
			process.stderr.on('data', (data) => {
				error += data.toString();
			});
			process.on('close', (code) => {
				if (code === 0) {
					const diff = JSON.parse(result);
					console.log(diff);
					CoverageCheckWebviewProvider.show(diff, requirementDataProvider);
					changeNodeColors(diff);
				} else {
					vscode.window.showErrorMessage(`Coverage check failed. ${error}`);
				}
			});
			


		} catch (err: any) {
			vscode.window.showErrorMessage(`Unexpected error during test generation: ${err.message}`);
		}
	}));

	function changeNodeColors(diff: any) {
		const allNodes = requirementDataProvider.getRootNodes();
		function processNode(node: any) {
			node.iconPath = undefined;

			switch (node.contextValue) {
				case 'requirement':
					console.log('requirement ' + node.label);
					if (diff.missing_folders){
						for (const folder of diff.missing_folders){
							console.log('----------------');
							const tokens = folder.toLowerCase().replace(/\\/g, '/').split('/');
							console.log(node.label.replace(' ', '_').toLowerCase());
							console.log('----------------');
							if (tokens[tokens.length - 1] === node.label.replace(' ', '_').toLowerCase()){
								node.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
							}
						}
					}
					break;
				case 'test':
					const file_name = (node.parent.label + "/test_" + node.label).replace(' ', '_').toLowerCase();
					if (diff.missing_files){
						for (const file of diff.missing_files) {
							if (file.replace(/\\/g, '/').toLowerCase().includes(file_name)){
								node.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconQueued'));
							}
						}
					}
					break;
				case 'testCase':
					console.log('test case ' + node.label);
					if (diff.modified_tests){
						Object.entries(diff.modified_tests).forEach(([file, tests]) => {
							Object.entries(tests as any).forEach(([testName, changes]) => {
								if (testName === node.label){
									node.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconQueued'));
									return;
								}
							});
						});
					}
					break;
			}

			if (node.children && node.children.length > 0) {
				node.children.forEach(processNode);
			}
		}

		allNodes.forEach(processNode);
		requirementDataProvider.refresh();
	}

}

export function deactivate() {}


function runTestGeneration(reqifPath: string, outputPath: string) {
    const process = spawn('typhoon_testgen', [reqifPath, outputPath]);
	let output = '';
	let error = '';

	process.stdout.on('data', (data) => {
		output += data.toString();
	});
	process.stderr.on('data', (data) => {
		error += data.toString();
	});
	process.on('close', (code) => {
		if (code === 0) {
			vscode.window.showInformationMessage('Tests generated successfully!');
		} else {
			vscode.window.showErrorMessage(`Test generation failed: ${error || output}`);
		}
	});
}





