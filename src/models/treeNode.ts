import * as vscode from 'vscode';

export class TreeNode extends vscode.TreeItem {
    public children: TreeNode[] = [];
    public parent: TreeNode | null = null;

    constructor(
        public id : string,
        public label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public contextValue: string,
        public iconPath?: vscode.ThemeIcon | {light: vscode.Uri, dark: vscode.Uri},
    ) {
        super(label, collapsibleState);
    }

    canHaveChildren(): boolean{
        return true;
    }
}