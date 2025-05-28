import { TreeNode } from "./treeNode";
import * as vscode from 'vscode';

export class TestCase extends TreeNode{
    constructor(
        public readonly id: string,
        public name: string,
        public scenario: string,
        public steps: string[],
        public prerequisites: string[],
        public testData: string[],
        public expectedResults: string[],
        public parameters: Parameter[] = [],
    ){
        super(id, name, vscode.TreeItemCollapsibleState.None, 'testCase');
        this.description = this.scenario;
        this.tooltip = this.name;
    }

    canHaveChildren(): boolean {
        return false;
    }
}

export class Parameter{
    public name: string;
    public type: string;
    public value: any[];


    constructor(name: string)
    constructor(name: string, type: string, value: any[])
    constructor(name: string, type?: string, value?: any[])
    {
        this.name = name;
        this.type = type ?? 'string';
        this.value = value ?? [];
    }
}