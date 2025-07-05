import * as vscode from 'vscode';
import { TreeNode } from '../models/treeNode';
import { Requirement } from '../models/requirement';
import { getUniqueId } from '../utils/idGenerator';
import { TestNode } from '../models/test';
import { Parameter, TestCase } from '../models/testCase';
import { RequirementWebviewProvider } from './requirementWebViewProvider';
import { TestWebviewProvider } from './testWebViewProvider';
import { TestCaseWebviewProvider } from './testCaseWebViewProvider';
import { DetailsViewProvider } from './detailsViewProvider';
import { UnknownRequirementWebViewProvider } from './unknownRequirementWebViewProvider';

export class RequirementTreeProvider implements vscode.TreeDataProvider<TreeNode>{
    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | void> = new vscode.EventEmitter<TreeNode | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | void> = this._onDidChangeTreeData.event;

    private requirements: TreeNode[] = [];
    private detailsViewProvider?: DetailsViewProvider;
    private selectedNode: TreeNode | null = null;
    public projectId : string;

    constructor(detailsViewProvider?: DetailsViewProvider) {
        this.detailsViewProvider = detailsViewProvider;
        this.projectId = getUniqueId();
    }

    getTreeItem(element: TreeNode): vscode.TreeItem {
        const hasChildren = element.children && element.children.length > 0;
    
        const treeItem: vscode.TreeItem = {
            label: element.level ? `${element.level} | ${element.label}` : element.label,
            collapsibleState: hasChildren
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None,
            contextValue: element.contextValue,
        };
        if (element.iconPath){
            treeItem.iconPath = element.iconPath;
        }
        else {
            treeItem.iconPath = this.getIconForRequirement('default');
        }
    
        return treeItem;
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

    getAllNodes(): TreeNode[] {
        return this.requirements;
    }

    getNodeById(id: string): TreeNode | undefined {
        return this.requirements.find(node => node.id === id);
    }

    deleteById(id: string){
        const index = this.requirements.findIndex(obj => obj.id === id);
        const testCase : TreeNode = this.requirements[index];
        if (testCase.parent && testCase.parent.children){
            const childIndex : number = testCase.parent?.children.findIndex(obj => obj.id === id);
            testCase.parent?.children.splice(childIndex, 1);
        }
        if (index > -1) {
            this.requirements.splice(index, 1);
        }
        this.updateLevels();
        this.refresh();
    }

    getNodePath(node: TreeNode){
        let pathParts: string[] = [node.label.replace(" ", "_")];
        while (node.parent){
            pathParts.unshift(node.parent.label.replace(" ", "_"));
            node = node.parent;
        }
        return pathParts.join('/');
    }

    updateNode(node: TreeNode): void{
        const index = this.requirements.findIndex(req => req.id === node.id);
        if (index !== -1) {
            this.requirements[index] = node;
            this.refresh();
        } else {
            vscode.window.showErrorMessage(`Node with ID ${node.id} not found.`);
        }
    }

    updateTree(nodes: TreeNode[]): void {
        this.requirements = nodes;
        this.updateLevels();
        this.refresh();        
    }

    updateLevels(): void {
        this.getRootNodes().forEach((root, idx) => {
            root.assignLevels((idx + 1).toString());
        });
    }

    updateExportContext(): void {
        const hasRequirements = this.requirements.length > 0;
        vscode.commands.executeCommand('setContext', 'typhoon-requirement-tool.hasRequirements', hasRequirements);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
        this.updateExportContext();
    }

    restart(): void{
        this.requirements = [];
        this._onDidChangeTreeData.fire();
        this.projectId = getUniqueId();
        this.clearSelection();
        this.refresh();
    }

    onNodeSelected(node: TreeNode | null): void {
        this.selectedNode = node;
        if (this.detailsViewProvider) {
            this.detailsViewProvider.updateDetails(node);
        }
    }

    clearSelection(): void {
        this.selectedNode = null;
        if (this.detailsViewProvider) {
            this.detailsViewProvider.updateDetails(null);
        }
    }

    isEmpty(): boolean{
        return (this.requirements.length === 0);
    }

    private getIconForRequirement(iconType: string): vscode.ThemeIcon | { light: vscode.Uri; dark: vscode.Uri } {
        switch (iconType) {
            case "default":
                return new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("charts.white"));
            case "Ready":
                return new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("charts.orange"));
            case "Reviewed":
                return new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("charts.yellow"));
            case "blue":
                return new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("charts.blue"));
            case "Released":
                return new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("charts.green"));
            default:
                return new vscode.ThemeIcon("circle-outline");
        }
    }

    async addRequirement(): Promise<void> {
        RequirementWebviewProvider.show(undefined, (requirement: Requirement) => {
            if (this.selectedNode) {
                this.selectedNode.children.push(requirement);
                requirement.parent = this.selectedNode;
            }
            this.requirements.push(requirement);

            this.updateLevels();
            this.refresh();
        });
    }

    async addTest(parent: TreeNode): Promise<void> {
        TestWebviewProvider.show(undefined, (test: TestNode) => {
            parent.children.push(test);
            test.parent = parent;
            this.requirements.push(test);
            this.updateLevels();
            this.refresh();
        });
    }

    async addTestCase(parent: TreeNode): Promise<void> {
        TestCaseWebviewProvider.show(undefined, (testCase: TestCase) => {
            parent.children.push(testCase);
            testCase.parent = parent;
            this.requirements.push(testCase);
            this.updateLevels();
            this.refresh();
        });
    }

    // async addUnknownRequirement(parent: TreeNode): Promise<void> {
    //     UnknownRequirementWebViewProvider.show(parent, (requirement: TreeNode) => {
    //         if (this.selectedNode) {
    //             this.selectedNode.children.push(requirement);
    //             requirement.parent = this.selectedNode;
    //         }
    //         this.requirements.push(requirement);

    //         this.updateLevels();
    //         this.refresh();
    //     });
    // }

    addNode(node: TreeNode) {
        this.requirements.push(node);
        if (node.parent){
            var parent = this.getNodeById(node.parent.id);
            parent?.children.push(node);
        }
        this.updateLevels;
        this.updateTree;
        this.refresh;
    }

    async deleteNode(node: TreeNode): Promise<Boolean> {
        const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: `Delete requirement "${node.label}"?`,
        });
        if (confirm !== 'Yes') {
            return false;
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
        this.updateLevels();
        this.refresh();
        this.onNodeSelected(null);
        return true;
    }

    deleteElement(node: TreeNode): void {
        const index = this.requirements.indexOf(node);
        if (index > -1) {
            this.requirements.splice(index, 1);
            this.updateLevels();
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
                req.otherData = requirement.otherData;
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
                testCaseNode.name = updatedTestCase.name;
                testCaseNode.scenario = updatedTestCase.scenario;
                testCaseNode.description = updatedTestCase.scenario;
                testCaseNode.steps = updatedTestCase.steps;
                testCaseNode.prerequisites = updatedTestCase.prerequisites;
                testCaseNode.parameters = updatedTestCase.parameters;
            }
            this.refresh();
            this.onNodeSelected(testCaseNode!);
        });
    }

    editUnknownRequirement(node: TreeNode): void {
        UnknownRequirementWebViewProvider.show(node, (node: TreeNode) => {
            console.log("robija");
            const req = this.requirements.find(req => req.id === node.id);
            if (req){
                req.label = node.label;
                req.otherData = node.otherData;
            }
            this.refresh();
            this.onNodeSelected(req!);
        });
    }

    addExtraRequirement(nodeNames: string[], type: string){
        let forLooking = this.getRootNodes();
        let parent = null;
        for (var i = 0; i< nodeNames.length; i += 1){
            const node = forLooking.find((node) => node.label.replace(" ", "_").toLowerCase() === nodeNames[i]);
            if (!node){
                if (i === nodeNames.length-1){
                    break;
                }else{
                    const newRequirement = new Requirement(getUniqueId(), nodeNames[i], "Default description", "Medium", "Draft");
                    this.simpleAddNode(newRequirement, parent);
                    parent = newRequirement;
                    forLooking = [];
                    continue;
                }
            }
            parent = node;
            forLooking = node.children;
        }
        const node = forLooking.find((node) => node.label.replace(" ", "_").toLowerCase() === nodeNames[i]);
        if (node || i === nodeNames.length){
            return node;
        }
        if (type === 'requirement'){
            const newRequirement = new Requirement(getUniqueId(), nodeNames[i], "Default description", "Medium", "Draft");
            this.simpleAddNode(newRequirement, parent);
            return newRequirement;
        }
        else if (type === 'test'){
            var testName = nodeNames[i];
            if (testName.startsWith("test_")){
                testName = testName.slice(5);
            }
            if (testName.endsWith(".py")){
                testName = testName.slice(0,-3);
            }
            const node = forLooking.find((node) => node.label.replace(" ", "_").toLowerCase() === testName);
            if (node){
                return node;
            }
            const newTest = new TestNode(getUniqueId(), testName, "Default description");
            this.simpleAddNode(newTest, parent);
            return newTest;
        }
    }


    async deleteMissingRequirement(nodeNames: string[]) : Promise<boolean>{
        let forLooking = this.getRootNodes();
        let nodeForDelete = null;
        for (var i = 0; i< nodeNames.length; i+=1){
            const node = forLooking.find((node) => node.label.replace(" ", "_").toLowerCase() === nodeNames[i]);
            if (!node){
                vscode.window.showErrorMessage("Requirement doesn't exist");
                break;
            }
            if (i === nodeNames.length -1){
                nodeForDelete = node;
            }else{
                forLooking = node.children;
            }
        }
        if (nodeForDelete){
            const compleated = await this.deleteNode(nodeForDelete);
            if (compleated){
                vscode.window.showInformationMessage(`Conflict resolved!`);
                return true;
            }
            return false;
        }
        return false;
    }

    addExtraTestCase(nodeNames: string[], testCaseData: any, testName: string, parameters : Parameter[]){
        const createdTest = this.addExtraRequirement(nodeNames, 'test');
        if (createdTest){
            const node = createdTest.children.find((node) => node.label.replace(" ", "_").toLowerCase() === testName);
            if (node){
                vscode.window.showErrorMessage(`There is test case with same name in ${createdTest.label}`);
                return;
            }
            const newTestCase = new TestCase(getUniqueId(), testName, testCaseData['scenario'], [], [], parameters);
            createdTest?.children.push(newTestCase);
            newTestCase.parent = createdTest;
            this.requirements.push(newTestCase);
            this.updateLevels();
            this.refresh();
        }
    }

    
    simpleAddNode(newRequirement: TreeNode, parent : any){
        newRequirement.parent = parent;
        parent?.children.push(newRequirement);
        this.requirements.push(newRequirement);
        this.updateLevels();
        this.refresh();
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
        this.updateLevels();
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
        this.updateLevels();
        this.refresh();
    }

    cleanQuotes(value: string): string {
        if (value.startsWith('"') && value.endsWith('"') && value !== '""') {
            return value.slice(1, -1);
        }
        return value;
    }

}
