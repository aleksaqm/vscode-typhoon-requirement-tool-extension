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
import * as xml2js from 'xml2js';

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

    onNodeSelected(node: TreeNode | null): void {
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
        this.onNodeSelected(null);
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
                testCaseNode.parameters = updatedTestCase.parameters;
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
            specObject.ele('TYPE', node.contextValue);
            // specObject.ele('TYPE', node.type);

            if (node.children && node.children.length > 0) {
                const childSpecifications = specObject.ele('CHILDREN');
                this.serializeTree(node.children, childSpecifications);
            }
        }
    }

    async importFromReqIF(reqifContent: string): Promise<void> {
        const parser = new xml2js.Parser({ explicitArray: false });
        try {
            const parsedData = await parser.parseStringPromise(reqifContent);

            const specifications = parsedData['REQ-IF']['CORE-CONTENT']['SPECIFICATIONS']['SPEC-OBJECT'];

            if (!specifications) {
                vscode.window.showErrorMessage('No specifications found in the ReqIF file.');
                return;
            }

            this.requirements = [];

            this.parseSpecifications(specifications);

            this.refresh();
        } catch (error : any) {
            vscode.window.showErrorMessage(`Failed to parse ReqIF file: ${error.message}`);
        }
    }

    private parseSpecifications(specifications: any): void{
        const parseNode = (spec: any, parent: TreeNode | null = null): TreeNode | null => {
            var node : TreeNode;	
            if (spec['TYPE'] === 'requirement'){
                node = new Requirement(
                    spec['IDENTIFIER'],
                    spec['NAME'],
                    spec['DESCRIPTION'] || ''
                );
            }else if (spec['TYPE'] === 'test'){
                node = new TestNode(
                    spec['IDENTIFIER'],
                    spec['NAME'],
                    spec['DESCRIPTION'] || '',
                );
            }else{
                return null;
            }
            node.description = spec['DESCRIPTION'] || '';
            node.parent = parent;

            if (spec['CHILDREN'] && spec['CHILDREN']['SPEC-OBJECT']) {
                const children = Array.isArray(spec['CHILDREN']['SPEC-OBJECT'])
                    ? spec['CHILDREN']['SPEC-OBJECT']
                    : [spec['CHILDREN']['SPEC-OBJECT']];
                node.children = children
                    .map((childSpec: any) => parseNode(childSpec, node))
                    .filter((child): child is TreeNode => child !== null);
                node.children.forEach(child => {
                    this.requirements.push(child);
                });
            }
            return node;
        };

        const specsArray = Array.isArray(specifications) ? specifications : [specifications];
        for (const spec of specsArray) {
            const parsedNode = parseNode(spec);
            if (parsedNode) {
                this.requirements.push(parsedNode);
            }
        }
    }

    exportToCSV(): string {
        const rows: string[] = [];
        rows.push('ID,Name,Description,Type,ParentID');
    
        const serializeNode = (node: TreeNode, parentID: string | null) => {
            rows.push(`${node.id},${node.label},${node.description || ''},${node.contextValue},${parentID || ''}`);
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => serializeNode(child, node.id));
            }
        };
    
        const rootNodes = this.requirements.filter(node => !node.parent);
        rootNodes.forEach(node => serializeNode(node, null));
    
        return rows.join('\n');
    }

    importFromCSV(csvContent: string): void {
        const rows = csvContent.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        const header = rows.shift();
        if (!header || header !== 'ID,Name,Description,Type,ParentID') {
            vscode.window.showErrorMessage('Invalid CSV format.');
            return;
        }
    
        const nodesMap: Map<string, TreeNode> = new Map();
        const rootNodes: TreeNode[] = [];
    
        rows.forEach(row => {
            const [id, name, description, type, parentID] = row.split(',');
    
            let node: TreeNode;
            if (type === 'requirement') {
                node = new Requirement(id, name, description);
            } else if (type === 'test') {
                node = new TestNode(id, name, description);
            } 
            else {
                return;
            }
    
            node.contextValue = type;
            nodesMap.set(id, node);
    
            if (parentID) {
                const parentNode = nodesMap.get(parentID);
                if (parentNode) {
                    parentNode.children.push(node);
                    node.parent = parentNode;
                    this.requirements.push(node);
                }
            } else {
                rootNodes.push(node);
                this.requirements.push(node);
            }
        });
    
        this.refresh();
    }

}
