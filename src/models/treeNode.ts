import * as vscode from 'vscode';

export abstract class TreeNode extends vscode.TreeItem {
    public children: TreeNode[] = [];
    public parent: TreeNode | null = null;

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    ) {
        super(label, collapsibleState);
    }

    abstract canHaveChildren(): boolean;
}