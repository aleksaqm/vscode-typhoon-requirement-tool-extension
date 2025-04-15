import * as vscode from 'vscode';

export abstract class TreeNode extends vscode.TreeItem {
    public children: TreeNode[] = [];
    public parent: TreeNode | null = null;

    constructor(
        public label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string
    ) {
        super(label, collapsibleState);
    }

    abstract canHaveChildren(): boolean;
}