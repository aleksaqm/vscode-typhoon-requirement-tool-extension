import * as vscode from 'vscode';
import { TreeNode } from '../models/treeNode';
import { Requirement } from '../models/requirement';
import { getUniqueId } from '../utils/idGenerator';
import { TestNode } from '../models/test';
import { TestCase } from '../models/testCase';
import { AddRequirementWebviewProvider } from './addRequirementWebViewProvider';
import { AddTestWebviewProvider } from './addTestWebViewProvider';
import { AddTestCaseWebviewProvider } from './addTestCaseWebViewProvider';

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

    async addRequirement(parent: TreeNode | null = null): Promise<void> {
        AddRequirementWebviewProvider.show(parent, (requirement: Requirement) => {
            if (parent) {
                parent.children.push(requirement);
                requirement.parent = parent;
            }
            this.requirements.push(requirement);
            this.refresh();
        });
    }

    async addTest(parent: TreeNode): Promise<void> {
        AddTestWebviewProvider.show(parent, (test: TestNode) => {
            parent.children.push(test);
            test.parent = parent;
            this.requirements.push(test);
            this.refresh();
        });
    }

    async addTestCase(parent: TreeNode): Promise<void> {
        AddTestCaseWebviewProvider.show(parent, (testCase: TestCase) => {
            parent.children.push(testCase);
            testCase.parent = parent;
            this.requirements.push(testCase);
            this.refresh();
        });
    }

}
