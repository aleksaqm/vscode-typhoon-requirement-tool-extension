import * as vscode from 'vscode';
import { Requirement } from './models/requirement';
import { RequirementTreeProvider } from './views/requirementTreeViewProvider';
import { TreeNode } from './models/treeNode';
<<<<<<< Updated upstream
=======
import { TestNode } from './models/test';
import { TestCase } from './models/testCase';
import { RequirementDetailsViewProvider } from './views/requirementDetailsViewProvider';
>>>>>>> Stashed changes

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "typhoon-requirement-tool" is now active!');

	const detailsViewProvider = new RequirementDetailsViewProvider(context.extensionUri);
	const requirementDataProvider = new RequirementTreeProvider(detailsViewProvider);

	vscode.window.registerTreeDataProvider('typhoon-requirement-tool.tree', requirementDataProvider);

	vscode.window.registerWebviewViewProvider('qm', detailsViewProvider);

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.helloQm', () => {
		vscode.window.showInformationMessage('Hello Qm from Typhoon Requirement Tool!');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.addRequirement', (node: TreeNode) => {
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

<<<<<<< Updated upstream
=======
	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.deleteNode', (node: TreeNode) => {
		requirementDataProvider.deleteNode(node);
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

	// context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.selectNode', (node: TestCase) => {
	// 	requirementDataProvider.onNodeSelected(node);
	// }));

>>>>>>> Stashed changes
}

export function deactivate() {}
