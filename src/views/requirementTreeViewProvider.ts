import * as vscode from 'vscode';
import { TreeNode } from '../models/treeNode';
import { Requirement } from '../models/requirement';
import { getUniqueId } from '../utils/idGenerator';
import { TestNode } from '../models/test';
import { TestCase } from '../models/testCase';
import { RequirementWebviewProvider } from './requirementWebViewProvider';
import { TestWebviewProvider } from './testWebViewProvider';
import { TestCaseWebviewProvider } from './testCaseWebViewProvider';
import { DetailsViewProvider } from './detailsViewProvider';
import * as xmlbuilder from 'xmlbuilder';

export class RequirementTreeProvider implements vscode.TreeDataProvider<TreeNode>{
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | void> = new vscode.EventEmitter<TreeNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | void> = this._onDidChangeTreeData.event;

    private requirements: TreeNode[] = [];
    private detailsViewProvider?: DetailsViewProvider;

    constructor(detailsViewProvider?: DetailsViewProvider) {
        this.detailsViewProvider = detailsViewProvider;
    }

    getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeNode): Thenable<TreeNode[]> {
        if (element) {
            return Promise.resolve(element.children);
        } else {
            const rootElements = this.requirements.filter(req => !req.parent);
            return Promise.resolve(rootElements);
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    onNodeSelected(node: TreeNode): void {
        if (this.detailsViewProvider) {
            this.detailsViewProvider.updateDetails(node);
        }
    }

    async addRequirement(parent: TreeNode | null = null): Promise<void> {
        RequirementWebviewProvider.show(undefined, (requirement: Requirement) => {
            if (parent) {
                parent.children.push(requirement);
                requirement.parent = parent;
            }
            this.requirements.push(requirement);
            this.refresh();
        });
    }

    async addTest(parent: TreeNode): Promise<void> {
        TestWebviewProvider.show(undefined, (test: TestNode) => {
            parent.children.push(test);
            test.parent = parent;
            this.requirements.push(test);
            this.refresh();
        });
    }

    async addTestCase(parent: TreeNode): Promise<void> {
        TestCaseWebviewProvider.show(undefined, (testCase: TestCase) => {
            parent.children.push(testCase);
            testCase.parent = parent;
            this.requirements.push(testCase);
            this.refresh();
        });
    }

    async deleteNode(node: TreeNode): Promise<void> {
        const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: `Delete requirement "${node.label}"?`,
        });
        if (confirm === 'No') {
            return;
        }
    
        if (node.parent) {
            const parentIndex = node.parent.children.indexOf(node);
            if (parentIndex > -1) {
                node.parent.children.splice(parentIndex, 1);
            }
        }
    
        const index = this.requirements.indexOf(node);
        if (index > -1) {
            this.requirements.splice(index, 1);
        }
    
        node.children.forEach((child) => {
            this.deleteElement(child);
        });
    
        this.refresh();
    }

    deleteElement(node: TreeNode): void {
        const index = this.requirements.indexOf(node);
        if (index > -1) {
            this.requirements.splice(index, 1);
            this.refresh();
        }
    }

    editRequirement(node: Requirement): void {
        RequirementWebviewProvider.show(node, (requirement: Requirement) => {
            const req = this.requirements.find(req => req.id === node.id);
            if (req) {
                req.label = requirement.name;
                req.description = requirement.description;
            }
            this.refresh();
            this.onNodeSelected(req!);
        });
    }

    editTest(node: TestNode): void {
        TestWebviewProvider.show(node, (test: TestNode) => {
            const testNode = this.requirements.find(req => req.id === node.id);
            if (testNode) {
                testNode.label = test.name;
                testNode.description = test.description;
            }
            this.refresh();
            this.onNodeSelected(testNode!);
        });
    }

    editTestCase(node: TestCase): void {
        TestCaseWebviewProvider.show(node, (updatedTestCase: TestCase) => {
            const testCaseNode = this.requirements.find(req => req.id === node.id);
            if (testCaseNode && testCaseNode instanceof TestCase) {
                testCaseNode.label = updatedTestCase.name;
                testCaseNode.scenario = updatedTestCase.scenario;
                testCaseNode.steps = updatedTestCase.steps;
                testCaseNode.prerequisites = updatedTestCase.prerequisites;
                testCaseNode.testData = updatedTestCase.testData;
                testCaseNode.expectedResults = updatedTestCase.expectedResults;
            }
            this.refresh();
            this.onNodeSelected(testCaseNode!);
        });
    }

    exportToReqIF(): string{
        const root = xmlbuilder.create('REQ-IF', { version: '1.0', encoding: 'UTF-8' })
            .att('xmlns', 'http://www.omg.org/spec/ReqIF/20110401/reqif.xsd');

        const header = root.ele('REQ-IF-HEADER');
        header.ele('CREATION-TIME', new Date().toISOString());
        header.ele('TITLE', 'Exported Requirements');

        const coreContent = root.ele('CORE-CONTENT');
        const specifications = coreContent.ele('SPECIFICATIONS');

        const rootNodes = this.requirements.filter(node => !node.parent);
        this.serializeTree(rootNodes, specifications);

        return root.end({ pretty: true });
    }

    private serializeTree(nodes: TreeNode[], parentXml: xmlbuilder.XMLElement): void {
        for (const node of nodes) {
            if (node instanceof TestCase){
                continue;
            }
            const specObject = parentXml.ele('SPEC-OBJECT');
            specObject.ele('IDENTIFIER', node.id);
            specObject.ele('NAME', node.label);
            specObject.ele('DESCRIPTION', node.description || '');
            // specObject.ele('TYPE', node.type);

            if (node.children && node.children.length > 0) {
                const childSpecifications = specObject.ele('CHILDREN');
                this.serializeTree(node.children, childSpecifications);
            }
        }

    }

}
