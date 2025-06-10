import { TreeNode } from "./treeNode";
import * as vscode from 'vscode';

export class TestNode extends TreeNode{
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly description: string,
    ){
        super(id, name, vscode.TreeItemCollapsibleState.Collapsed, 'test');
        this.tooltip = `${this.name} - ${this.description}`;
        this.description = this.description || 'No description available';
    }

    canHaveChildren(): boolean {
        return true;
    }
}