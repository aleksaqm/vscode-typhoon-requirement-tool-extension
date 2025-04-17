import * as vscode from 'vscode';

export class TreeNode extends vscode.TreeItem {
    public children: TreeNode[] = [];
    public parent: TreeNode | null = null;

    constructor(
        public id : string,
        public label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public contextValue: string
    ) {
        super(label, collapsibleState);
    }

    canHaveChildren(): boolean{
        return true;
    }
}