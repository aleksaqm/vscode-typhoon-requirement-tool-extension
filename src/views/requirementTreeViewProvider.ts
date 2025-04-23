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
import { parseRequirement, parseTest, parseTestCase } from '../utils/reqifParser';

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

    getRootNodes(): TreeNode[] {
        return this.requirements.filter(node => !node.parent);
    }

    updateExportContext(): void {
        const hasRequirements = this.requirements.length > 0;
        vscode.commands.executeCommand('setContext', 'typhoon-requirement-tool.hasRequirements', hasRequirements);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
        this.updateExportContext();
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

            if (req && req instanceof Requirement) {
                req.label = requirement.name;
                req.description = requirement.description;
                req.priority = requirement.priority;
                req.status = requirement.status;
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

    exportToReqIF(): string {
        const now = new Date().toISOString();
    
        const root = xmlbuilder.create('REQ-IF', { version: '1.0', encoding: 'UTF-8' })
            .att('xmlns', 'http://www.omg.org/spec/ReqIF/20110401/reqif.xsd')
            .att('xmlns:configuration', 'http://eclipse.org/rmf/pror/toolextensions/1.0')
            .att('xmlns:id', 'http://pror.org/presentation/id')
            .att('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
    
        const header = root.ele('THE-HEADER').ele('REQ-IF-HEADER', { IDENTIFIER: '_HEADER_ID' });
        header.ele('COMMENT', 'Created by: Typhoon Requirement Tool');
        header.ele('CREATION-TIME', now);
        header.ele('REQ-IF-TOOL-ID', 'Typhoon Requirement Tool');
        header.ele('REQ-IF-VERSION', '1.0');
        header.ele('SOURCE-TOOL-ID', 'Typhoon Requirement Tool');
        header.ele('TITLE', 'Exported Requirements');
    
        const coreContent = root.ele('CORE-CONTENT').ele('REQ-IF-CONTENT');
    
        const datatypes = coreContent.ele('DATATYPES');
        datatypes.ele('DATATYPE-DEFINITION-STRING', {
            IDENTIFIER: '_StringType',
            'LAST-CHANGE': now,
            'LONG-NAME': 'String',
            'MAX-LENGTH': '32000',
        });
        datatypes.ele('DATATYPE-DEFINITION-XHTML', {
            IDENTIFIER: '_XhtmlType',
            'LAST-CHANGE': now,
            'LONG-NAME': 'XHTML',
        });
    
        const specTypes = coreContent.ele('SPEC-TYPES');
        const specObjectType = specTypes.ele('SPEC-OBJECT-TYPE', {
            IDENTIFIER: '_RequirementType',
            'LAST-CHANGE': now,
            'LONG-NAME': 'Requirement Type',
        });
        const specAttributes = specObjectType.ele('SPEC-ATTRIBUTES');
        specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
            IDENTIFIER: '_ForeignID',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.ForeignID',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');

        specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
            IDENTIFIER: '_Title',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.Title',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
        
        specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
            IDENTIFIER: '_Description',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.Description',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');

        specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
            IDENTIFIER: '_Type',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.Type',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');

        specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
            IDENTIFIER: '_Priority',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.Priority',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');

        specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
            IDENTIFIER: '_Status',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.Status',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');

        specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
            IDENTIFIER: '_Steps',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.Steps',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
        
        specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
            IDENTIFIER: '_Prerequisites',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.Prerequisites',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
        
        specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
            IDENTIFIER: '_TestData',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.TestData',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
        
        specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
            IDENTIFIER: '_ExpectedResults',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.ExpectedResults',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
        
        specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
            IDENTIFIER: '_Parameters',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.Parameters',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
    
        const specType = specTypes.ele('SPECIFICATION-TYPE', {
            IDENTIFIER: '_SpecificationType',
            'LAST-CHANGE': now,
            'LONG-NAME': 'Specification Type',
        });

        specType.ele('SPEC-ATTRIBUTES').ele('ATTRIBUTE-DEFINITION-XHTML', {
            IDENTIFIER: '_SpecDescription',
            'LAST-CHANGE': now,
            'LONG-NAME': 'ReqIF.Description',
        }).ele('TYPE').ele('DATATYPE-DEFINITION-XHTML-REF', '_XhtmlType');
    
        const specObjects = coreContent.ele('SPEC-OBJECTS');
        for (const node of this.flattenTree(this.getRootNodes())) {
            const specObject = specObjects.ele('SPEC-OBJECT', {
                IDENTIFIER: node.id,
                'LAST-CHANGE': now,
            });
            const values = specObject.ele('VALUES');
            values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.id })
                .ele('DEFINITION')
                .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_ForeignID');
            values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.label || '' })
                .ele('DEFINITION')
                .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Title');
            values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.description || '' })
                .ele('DEFINITION')
                .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Description');
            values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.contextValue || '' })
                .ele('DEFINITION')
                .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Type');
            if (node instanceof Requirement) {
                values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node instanceof Requirement ? node.priority || '' : '' })
                    .ele('DEFINITION')
                    .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Priority');
                values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node instanceof Requirement ? node.status || '' : '' })
                    .ele('DEFINITION')
                    .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Status');
            }
            else if (node instanceof TestCase) {
                values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.steps.join(',') || '' })
                    .ele('DEFINITION')
                    .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Steps');

                values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.prerequisites.join(',') || '' })
                    .ele('DEFINITION')
                    .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Prerequisites');

                values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.testData.join(',') || '' })
                    .ele('DEFINITION')
                    .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_TestData');

                values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.expectedResults.join(',') || '' })
                    .ele('DEFINITION')
                    .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_ExpectedResults');

                values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': JSON.stringify(node.parameters, null, 2) || '' })
                    .ele('DEFINITION')
                    .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Parameters');
            }
                
            specObject.ele('TYPE').ele('SPEC-OBJECT-TYPE-REF', '_RequirementType');
        }
    
        const specifications = coreContent.ele('SPECIFICATIONS');
        const specification = specifications.ele('SPECIFICATION', {
            IDENTIFIER: '_Specification',
            'LAST-CHANGE': now,
            'LONG-NAME': 'Requirements Document',
        });
        specification.ele('VALUES').ele('ATTRIBUTE-VALUE-XHTML')
            .ele('DEFINITION')
            .ele('ATTRIBUTE-DEFINITION-XHTML-REF', '_SpecDescription')
            .up()
            .up()
            .ele('THE-VALUE')
            .ele('xhtml:div', 'Requirements Document')
            .up()
            .up()
            .ele('THE-ORIGINAL-VALUE')
            .ele('xhtml:div', 'Requirements Document');
        specification.ele('TYPE').ele('SPECIFICATION-TYPE-REF', '_SpecificationType');
    
        const children = specification.ele('CHILDREN');
        this.serializeSpecificationHierarchy(this.requirements.filter(node => !node.parent), children);
    
        const toolExtensions = root.ele('TOOL-EXTENSIONS');
        toolExtensions.ele('REQ-IF-TOOL-EXTENSION')
            .ele('configuration:ProrToolExtension')
            .ele('configuration:generalConfiguration')
            .ele('configuration:ProrGeneralConfiguration')
            .ele('configuration:labelConfiguration')
            .ele('configuration:LabelConfiguration')
            .ele('defaultLabel', 'ReqIF.Description');
    
        return root.end({ pretty: true });
    }

    private serializeSpecificationHierarchy(nodes: TreeNode[], parentXml: xmlbuilder.XMLElement): void {
        for (const node of nodes) {
            const specHierarchy = parentXml.ele('SPEC-HIERARCHY', {
                IDENTIFIER: `_SH-${node.id}`,
                'LAST-CHANGE': new Date().toISOString(),
            });
            specHierarchy.ele('OBJECT').ele('SPEC-OBJECT-REF', node.id);
    
            if (node.children && node.children.length > 0) {
                const children = specHierarchy.ele('CHILDREN');
                this.serializeSpecificationHierarchy(node.children, children);
            }
        }
    }

    private flattenTree(nodes: TreeNode[]): TreeNode[] {
        const result: TreeNode[] = [];
        for (const node of nodes) {
            result.push(node);
            if (node.children?.length) {
                result.push(...this.flattenTree(node.children));
            }
        }
        return result;
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
                node = parseRequirement(spec);
            }
            else if (spec['TYPE'] === 'test'){
                node = parseTest(spec);
            }
            else if (spec['TYPE'] === 'testCase'){
                node = parseTestCase(spec);
            }
            else{
                return null;
            }
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
        rows.push('ID,Name,Description,Priority,Status,Type,ParentID');
    
        const serializeNode = (node: TreeNode, parentID: string | null) => {
            if (node instanceof Requirement){
                rows.push(`${node.id},${node.label},${node.description || ''},${node.priority}, ${node.status},${node.contextValue},${parentID || ''}`);
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => serializeNode(child, node.id));
                }
            }
            else if (node instanceof TestNode){
                rows.push(`${node.id},${node.label},${node.description || ''},'',${node.contextValue},${parentID || ''}`);
                // if (node.children && node.children.length > 0) {
                //     node.children.forEach(child => serializeNode(child, node.id));
                // }
            }
        };
    
        const rootNodes = this.requirements.filter(node => !node.parent);
        rootNodes.forEach(node => serializeNode(node, null));
    
        return rows.join('\n');
    }

    importFromCSV(csvContent: string): void {
        const rows = csvContent.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        const header = rows.shift();
        if (!header || header !== 'ID,Name,Description,Priority,Type,ParentID') {
            vscode.window.showErrorMessage('Invalid CSV format.');
            return;
        }
    
        const nodesMap: Map<string, TreeNode> = new Map();
        const rootNodes: TreeNode[] = [];
        this.requirements = [];
        rows.forEach(row => {
            const [id, name, description,priority, status, type, parentID] = row.split(',');
    
            let node: TreeNode;
            if (type === 'requirement') {
                node = new Requirement(id, name, description, priority as "High" | "Medium" | "Low", status as "Draft" | "Ready" | "Reviewed" | "Approved" | "Released");
            } 
            else if (type === 'test') {
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

    exportToReqViewCSV(): string {
        const rows: string[] = [];
        rows.push('ID,level,heading,text,priority,status,type,parentID');
    
        const serializeNode = (node: TreeNode, parentID: string | null, level=1) => {
            if (node instanceof Requirement){
                rows.push(`${node.id},${level},${node.label},${node.description || ""},${node.priority},${node.status},SEC,${parentID || ""}`);   //SEC stands for SECTION in reqView
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => serializeNode(child, node.id, level+1));
                }
            }
            else if (node instanceof TestNode){
                rows.push(`${node.id},${level},${node.label},${node.description || ""},"","",FR,${parentID || ""}`);
                // if (node.children && node.children.length > 0) {
                //     node.children.forEach(child => serializeNode(child, node.id));
                // }
            }
        };
    
        const rootNodes = this.requirements.filter(node => !node.parent);
        rootNodes.forEach(node => serializeNode(node, null));
    
        return rows.join('\n');
    }

    importFromReqViewCSV(csvContent: string): void {
        const rows = csvContent.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        const header = rows.shift();
        if (!header) {
            vscode.window.showErrorMessage('Invalid CSV format: Missing header.');
            return;
        }
    
        var headers = header.split(';').map(h => this.cleanQuotes(h.trim().toLowerCase()));
        var delimiter = ';';	
        if (headers.length < 2){
            headers = header.split(',').map(h => h.trim().toLowerCase());
            delimiter = ',';
        }
        const idIndex = headers.indexOf("id");
        const levelIndex = headers.indexOf("level");
        const headingIndex = headers.indexOf("heading");
        const textIndex = headers.indexOf("text");
        const priorityIndex = headers.indexOf("priority");
        const statusIndex = headers.indexOf("status");
        const typeIndex = headers.indexOf("type");
    
        if (idIndex === -1 || levelIndex === -1 || headingIndex === -1 || textIndex === -1 || typeIndex === -1) {
            vscode.window.showErrorMessage('Invalid CSV format: Missing required fields.');
            return;
        }
    
        const nodesMap: Map<string, TreeNode> = new Map();
        const rootNodes: TreeNode[] = [];
        this.requirements = [];
    
        const stack: { level: number; node: TreeNode }[] = [];
    
        rows.forEach(row => {
            const columns = row.split(delimiter).map(col => this.cleanQuotes(col.trim()));
            const id = columns[idIndex];
            const level = columns[levelIndex];
            const name = columns[headingIndex];
            const description = columns[textIndex];
            const priority = priorityIndex !== -1 ? columns[priorityIndex] : 'Medium';
            const status = statusIndex !== -1 ? columns[statusIndex] : 'Draft';
            const type = columns[typeIndex];
    
            const parsedLevel = parseInt(level.replace(/"/g, ''));
    
            let node: TreeNode;
            if (type === 'SEC') {
                node = new Requirement(
                    id,
                    name,
                    description,
                    priority as "High" | "Medium" | "Low",
                    status as "Draft" | "Ready" | "Reviewed" | "Approved" | "Released"
                );
            } else if (type === 'FR') {
                node = new TestNode(id, name, description);
            } else {
                return;
            }
    
            nodesMap.set(id, node);
    
            while (stack.length > 0 && stack[stack.length - 1].level >= parsedLevel) {
                stack.pop();
            }
    
            if (stack.length > 0) {
                const parent = stack[stack.length - 1].node;
                parent.children.push(node);
                node.parent = parent;
            } else {
                rootNodes.push(node);
            }
            this.requirements.push(node);
            stack.push({ level: parsedLevel, node });
        });
    
        // this.requirements = rootNodes;
        this.refresh();
    }

    cleanQuotes(value: string): string {
        if (value.startsWith('"') && value.endsWith('"') && value !== '""') {
            return value.slice(1, -1);
        }
        return value;
    }

}
