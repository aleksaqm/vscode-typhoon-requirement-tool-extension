import * as vscode from 'vscode';
import { Requirement } from './models/requirement';
import { RequirementTreeProvider } from './views/requirementTreeViewProvider';
import { TreeNode } from './models/treeNode';
import { TestNode } from './models/test';
import { TestCase } from './models/testCase';
import { DetailsViewProvider } from './views/detailsViewProvider';
import { TabularViewProvider } from './views/tabularViewProvider';
import { ReqifFileManager } from './utils/reqifFileManager';

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
        }
    });

    context.subscriptions.push(treeView);


	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.helloQm', () => {
		vscode.window.showInformationMessage('Hello Qm from Typhoon Requirement Tool!');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.addRequirement', (node: Requirement) => {
		requirementDataProvider.addRequirement(node);
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

}

export function deactivate() {}



