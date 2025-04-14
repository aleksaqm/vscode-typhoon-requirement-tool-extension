import * as vscode from 'vscode';
import { TreeNode } from '../models/treeNode';
import { Requirement } from '../models/requirement';
import { getUniqueId } from '../utils/idGenerator';
import { TestNode } from '../models/test';
import { TestCase } from '../models/testCase';

export class RequirementTreeProvider implements vscode.TreeDataProvider<TreeNode>{
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | void> = new vscode.EventEmitter<TreeNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | void> = this._onDidChangeTreeData.event;

    private requirements: TreeNode[] = [];

    constructor() {}

    getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeNode): Thenable<TreeNode[]> {
        if (element) {
            return Promise.resolve(element.children);
        } else {
            const rootElements = this.requirements.filter(req => !req.parent);
            return Promise.resolve(rootElements);
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async addRequirement(parent: TreeNode | null): Promise<void> {
        const name = await vscode.window.showInputBox({ prompt: 'Enter requirement name' });
        const description = await vscode.window.showInputBox({ prompt: 'Enter requirement description' });
        if (name && description) {
            const newRequirement = new Requirement(getUniqueId(),name, description);
            if (parent) {
                parent.children.push(newRequirement);
                newRequirement.parent = parent;
            }
            parent?.children.push(newRequirement);
            this.requirements.push(newRequirement);
            this.refresh();
        }
    }

    async addTest(parent: TreeNode): Promise<void> {
        const name = await vscode.window.showInputBox({ prompt: 'Enter test name' });
        const description = await vscode.window.showInputBox({ prompt: 'Enter test description' });
        if (name && description) {
            const newTest = new TestNode(getUniqueId(),name, description);
            parent.children.push(newTest);
            newTest.parent = parent;
            this.refresh();
        }
    }

    async addTestCase(parent: TreeNode): Promise<void> {
        const name = await vscode.window.showInputBox({ prompt: 'Enter test case name' });
        const scenario = await vscode.window.showInputBox({ prompt: 'Enter test case scenario' });
        const steps = await vscode.window.showInputBox({ prompt: 'Enter test case steps (comma separated)' });
        const prerequisites = await vscode.window.showInputBox({ prompt: 'Enter test case prerequisites (comma separated)' });
        const expectedResults = await vscode.window.showInputBox({ prompt: 'Enter test case expected results (comma separated)' });

        if (name && scenario && steps && prerequisites && expectedResults) {
            const newTestCase = new TestCase(getUniqueId(), name, scenario, steps.split(','), prerequisites.split(','), expectedResults.split(','));
            parent.children.push(newTestCase);
            newTestCase.parent = parent;
            this.refresh();
        }
    }



    

}
