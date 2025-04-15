import * as vscode from 'vscode';
import { Requirement } from './models/requirement';
import { RequirementTreeProvider } from './views/requirementTreeViewProvider';
import { TreeNode } from './models/treeNode';
import { TestNode } from './models/test';
import { TestCase } from './models/testCase';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "typhoon-requirement-tool" is now active!');

	const requirementDataProvider = new RequirementTreeProvider();
	vscode.window.registerTreeDataProvider('typhoon-requirement-tool.tree', requirementDataProvider);

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

}

export function deactivate() {}
