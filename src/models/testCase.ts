import { TreeNode } from "./treeNode";
import * as vscode from 'vscode';

export class TestCase extends TreeNode{
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly scenario: string,
        public readonly steps: string[],
        public readonly prerequisites: string[],
        public readonly expectedResults: string[],
    ){
        super(name, vscode.TreeItemCollapsibleState.Collapsed, 'testCase');
        this.tooltip = `${this.name} - ${this.description}`;
        this.description = this.description || 'No description available';
    }

    canHaveChildren(): boolean {
        return false;
    }
}