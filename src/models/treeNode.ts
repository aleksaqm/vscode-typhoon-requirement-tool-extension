import * as vscode from 'vscode';

export class TreeNode extends vscode.TreeItem {
    public children: TreeNode[] = [];
    public parent: TreeNode | null = null;
    public level: string = '';

    constructor(
        public id : string,
        public label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public contextValue: string,
        public iconPath?: vscode.ThemeIcon | {id: string, color: vscode.ThemeColor},
    ) {
        super(label, collapsibleState);
    }

    canHaveChildren(): boolean{
        return true;
    }

    assignLevels(prefix: string = '') {
        if (!this.parent) {
            this.level = prefix || '1';
        } else {
            const idx = this.parent.children.indexOf(this) + 1;
            this.level = prefix ? `${prefix}.${idx}` : `${idx}`;
        }
        this.children.forEach((child, i) => {
            child.parent = this;
            child.assignLevels(this.level);
        });
    }
}