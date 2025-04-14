import * as vscode from 'vscode';
import { Requirement } from './models/requirement';
import { RequirementTreeProvider } from './views/requirementTreeViewProvider';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "typhoon-requirement-tool" is now active!');

	

	const requirementDataProvider = new RequirementTreeProvider();
	vscode.window.registerTreeDataProvider('typhoon-requirement-tool.tree', requirementDataProvider);

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.helloQm', () => {
		vscode.window.showInformationMessage('Hello Qm from Typhoon Requirement Tool!');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.addRequirement', () => {
		requirementDataProvider.addRequirement(null);
	}));

	// context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.addTest', () => {
	// 	requirementDataProvider.addTest(null);
	// }));
	
	// context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.addTestCase', () => {
	// 	requirementDataProvider.addTestCase(null);
	// }));

}

export function deactivate() {}
