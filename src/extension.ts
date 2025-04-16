import * as vscode from 'vscode';
import { Requirement } from './models/requirement';
import { RequirementTreeProvider } from './views/requirementTreeViewProvider';
import { TreeNode } from './models/treeNode';
import { TestNode } from './models/test';
import { TestCase } from './models/testCase';
import { DetailsViewProvider } from './views/detailsViewProvider';

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
			const reqifContent = requirementDataProvider.exportToReqIF();
			await vscode.workspace.fs.writeFile(saveUri, Buffer.from(reqifContent, 'utf-8'));
			vscode.window.showInformationMessage('Requirements exported to ReqIF file successfully!');
		}catch (error : any) {
			vscode.window.showErrorMessage('Error exporting requirements to ReqIF: ' + error.message);
		}

	}));

}

export function deactivate() {}
