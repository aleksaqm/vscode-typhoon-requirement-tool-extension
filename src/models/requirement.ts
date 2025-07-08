import { TreeNode } from "./treeNode";
import * as vscode from 'vscode';

export class Requirement extends TreeNode{
    constructor(
        public readonly id: string,
        public readonly name: string,
        public description: string,
        public priority: "High" | "Medium" | "Low" = "Medium",
        public status: "Draft" | "Ready" | "Reviewed" | "Approved" | "Released" = "Draft",
    ){
        super(id, name, vscode.TreeItemCollapsibleState.Collapsed, 'requirement');
        this.tooltip = `${this.name} - ${this.description}`;
        this.description = this.description || 'No description available';
        if (!priority){
            priority = "Medium";
        }
        this.priority = this.priority;
        if (!status){
            status = "Draft";
        }
        this.status = this.status;
    }

    canHaveChildren(): boolean {
        return true;
    }
}
