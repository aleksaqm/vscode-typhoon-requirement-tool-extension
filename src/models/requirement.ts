import { TreeNode } from "./treeNode";
import * as vscode from 'vscode';

export class Requirement extends TreeNode{
    constructor(
        public readonly id: string,
        public readonly name: string,
        public description: string,
        public priority: "High" | "Medium" | "Low" = "Medium"	
    ){
        super(id, name, vscode.TreeItemCollapsibleState.Collapsed, 'requirement');
        this.tooltip = `${this.name} - ${this.description}`;
        this.description = this.description || 'No description available';
        this.priority = this.priority;
    }

    canHaveChildren(): boolean {
        return true;
    }
}
