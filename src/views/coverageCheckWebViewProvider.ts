import * as vscode from 'vscode';
import { RequirementTreeProvider } from './requirementTreeViewProvider';
import { Parameter, TestCase } from '../models/testCase';
import { ReqifFileManager } from '../utils/reqifFileManager';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';


export class CoverageCheckWebviewProvider {
    private requirementDataProvider: RequirementTreeProvider;
    private outputDir: string;
    private panel?: vscode.WebviewPanel;
    private diff?: any;

    constructor(requirementDataProvide: RequirementTreeProvider, outputDir: string){
        this.requirementDataProvider = requirementDataProvide;
        this.outputDir = outputDir;
    }

    public generateCoverageReport(updateExisting = false){
        const reqifContent = ReqifFileManager.exportToReqIF(this.requirementDataProvider.getAllNodes());
        const tempDir = os.tmpdir();
        const fileName = `temp_${Date.now()}.reqif`;
        const tempPath = path.join(tempDir, fileName);
        fs.writeFileSync(tempPath, reqifContent, 'utf-8');

        const process = spawn('coverage_check', [tempPath, this.outputDir]);
        let result = '';
        let error = '';

        process.stdout.on('data', (data) => { result += data.toString(); });
        process.stderr.on('data', (data) => {
            error += data.toString();
        });
        process.on('close', (code) => {
            if (code === 0) {
                const diff = JSON.parse(result);
                console.log(diff);
                this.diff = diff;

                if (updateExisting && this.panel) {
                    this.panel.webview.html = this.getHtml(diff);
                } else {
                    this.show(diff);
                    this.changeNodeColors(diff);
                }
            } else {
                vscode.window.showErrorMessage(`Coverage check failed. ${error}`);
            }
        });

        vscode.commands.executeCommand('setContext', 'typhoonRequirementTool.coverageActive', true);
    }

    private changeNodeColors(diff: any) {
        const allNodes = this.requirementDataProvider.getRootNodes();
        const processNode = (node: any) => {
            node.iconPath = undefined;

            switch (node.contextValue) {
                case 'requirement':
                    console.log('requirement ' + node.label);
                    if (diff.missing_folders){
                        for (const folder of diff.missing_folders){
                            const tokens = folder.toLowerCase().replace(/\\/g, '/').split('/');
                            if (tokens[tokens.length - 1] === node.label.replace(' ', '_').toLowerCase()){
                                node.iconPath = new vscode.ThemeIcon('diff-removed', new vscode.ThemeColor('testing.iconFailed'));
                            }
                        }
                    }
                    break;
                case 'test':
                    const file_name = (node.parent.label + "/test_" + node.label).replace(' ', '_').toLowerCase();
                    if (diff.missing_files){
                        for (const file of diff.missing_files) {
                            if (file.replace(/\\/g, '/').toLowerCase().includes(file_name)){
                                node.iconPath = new vscode.ThemeIcon('diff-removed', new vscode.ThemeColor('testing.iconFailed'));
                            }
                        }
                    }
                    break;
                case 'testCase':
                    console.log('test case ' + node.label);
                    if (diff.modified_tests){
                        Object.entries(diff.modified_tests).forEach(([file, tests]) => {
                            Object.entries(tests as any).forEach(([id, changes]) => {
                                if (id === node.id){
                                    node.iconPath = new vscode.ThemeIcon('diff-modified', new vscode.ThemeColor('testing.iconQueued'));
                                    return;
                                }
                            });
                        });
                    }
                    if (diff.missing_tests){
                        Object.entries(diff.missing_tests).forEach(([file, tests]) => {
                            Object.entries(tests as any).forEach(([testName, changes]) => {
                                if (testName === node.label){
                                    node.iconPath = new vscode.ThemeIcon('diff-removed', new vscode.ThemeColor('testing.iconFailed'));
                                    return;
                                }
                            });
                        });
                    }
                    const nodePath = this.requirementDataProvider.getNodePath(node);
                    const normalizedSkipped = diff.skipped_tests.map((p: string) => 
                        p.replace(/test_([^\\\/]+)\.py/gi, (match, p1) => p1)
                            .replace(/\\/g, '/')
                            .toLowerCase()
                    );
                    if (normalizedSkipped.includes(nodePath.toLowerCase())) {
                        node.iconPath = new vscode.ThemeIcon('debug-step-over', new vscode.ThemeColor('testing.iconQueued'));
                    }
                    break;
            }

            if (node.children && node.children.length > 0) {
                node.children.forEach(processNode);
            }
        };

        allNodes.forEach(processNode);
        this.requirementDataProvider.refresh();
    }


    public show(diff: any) {
        if (!this.panel) {
            this.panel = vscode.window.createWebviewPanel(
                'coverageDiff',
                'Coverage Differences',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            this.panel.onDidDispose(() => { this.panel = undefined; });

            this.panel.onDidChangeViewState(e => {
            if (e.webviewPanel.visible) {
                this.generateCoverageReport(true);
            }
        });
        }
        this.panel.webview.html = this.getHtml(diff);
        this.panel.webview.onDidReceiveMessage(async message => {
            if (message.command === 'resolveConflict') {
                let node = this.requirementDataProvider.getNodeById(message.id);
                if (node && node instanceof TestCase) {
                    if (message.chosen){
                        if (message.chosen.name){
                            node.label = message.chosen.name;
                            node.name = message.chosen.name;
                        }
                        if (message.chosen.scenario){
                            node.scenario = message.chosen.scenario;
                            node.description = message.chosen.scenario;
                        }
                        if (message.chosen.parameters){
                            const newParams = message.chosen.parameters;
                            if (newParams[0]){
                                var newParamNames : string[] = [];
                                for (let key in newParams) {
                                    newParamNames.push(newParams[key]);
                                }

                                node.parameters = node.parameters.filter(param => newParamNames.includes(param.name));

                                newParamNames.forEach(name => {
                                    if (!node.parameters.some(param => param.name === name)){
                                        node.parameters.push(new Parameter(name));
                                    }
                                });
                            }else{
                                node.parameters.forEach(parameter => {
                                    console.log(newParams);
                                    var newParameterValue = newParams[parameter.name];
                                    if (newParameterValue){
                                        parameter.value = newParameterValue;
                                        if (newParameterValue.length > 0){
                                            if (typeof newParameterValue[0] === "number") {
                                                parameter.type = Number.isInteger(newParameterValue[0]) ? "int" : "float";
                                            }
                                            else if (typeof newParameterValue[0] === "object"){
                                                if (Array.isArray(newParameterValue[0])) {
                                                    parameter.type = 'array';
                                                } 
                                                parameter.value = [];
                                                newParameterValue.forEach((singleValue: any[]) => {
                                                    parameter.value.push(JSON.stringify(singleValue));
                                                });
                                            }
                                            else {
                                                parameter.type = typeof newParameterValue[0];
                                            }
                                        }
                                    }
                                });
                            }
                        }
                        if (message.chosen.steps){
                            node.steps = message.chosen.steps;
                        }
                        if (message.chosen.prerequisites){
                            node.prerequisites = message.chosen.prerequisites;
                        }
                    }
                    this.requirementDataProvider.updateNode(node);
                }  
                vscode.window.showInformationMessage(`Conflict resolved!`);
                this.generateCoverageReport(true);              
            }
            if(message.command === 'deleteRequirement'){
                var requirementPath = message.value;
                requirementPath = requirementPath.replace(/\\/g, '/').toLowerCase();
                const requirements = requirementPath.split('/');
                const compleated = await this.requirementDataProvider.deleteMissingRequirement(requirements);
                if (compleated){
                    this.generateCoverageReport(true);
                }
                // vscode.window.showInformationMessage(`Conflict resolved!`);
            }
            if(message.command === 'deleteTest'){
                var testPath = message.value;
                testPath = testPath.replace(/\\/g, '/').toLowerCase();
                const requirements = testPath.split('/');
                var testName = requirements[requirements.length-1];
                if (testName.startsWith("test_")){
                    testName = testName.slice(5);
                }
                if (testName.endsWith(".py")){
                    testName = testName.slice(0,-3);
                }
                requirements[requirements.length-1] = testName;
                const compleated = await this.requirementDataProvider.deleteMissingRequirement(requirements);
                if (compleated){
                    this.generateCoverageReport(true);
                }
            }
            if(message.command === 'deleteTestCase'){
                const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: `Are you sure you want to delete test case "${message.value}"?`,
                });
                if (confirm === 'No') {
                    return;
                }
                const testName = message.value;
                const missingTests = this.diff['missing_tests'];
                let id = null;
                Object.entries(missingTests).forEach(
                    ([key, value] : [any, any]) => {
                        if (value[testName]){
                            if (value[testName]['id']){
                                id = value[testName]['id'];
                                this.requirementDataProvider.deleteById(id);
                                return;
                            }
                        }
                    }
                );
                vscode.window.showInformationMessage(`Conflict resolved!`);
                this.generateCoverageReport(true);
            }
            if(message.command === 'addRequirement'){                                               //make it clean
                const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: `Are you sure you want to add requirement "${message.value}"?`,
                });
                if (confirm === 'No') {
                    return;
                }
                var requirementPath = message.value;
                requirementPath = requirementPath.replace(/\\/g, '/').toLowerCase();
                const requirements = requirementPath.split('/');
                this.requirementDataProvider.addExtraRequirement(requirements, 'requirement');
                vscode.window.showInformationMessage(`Conflict resolved!`);
                this.generateCoverageReport(true);
            }
            if(message.command === 'addTest'){
                const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: `Are you sure you want to add test "${message.value}"?`,
                });
                if (confirm === 'No') {
                    return;
                }
                var testPath = message.value;
                testPath = testPath.replace(/\\/g, '/').toLowerCase();
                const nodeNames = testPath.split('/');
                this.requirementDataProvider.addExtraRequirement(nodeNames, 'test');
                vscode.window.showInformationMessage(`Conflict resolved!`);
                this.generateCoverageReport(true);
            }
            if(message.command === 'addTestCase'){
                const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: `Are you sure you want to add test case "${message.value}"?`,
                });
                if (confirm === 'No') {
                    return;
                }
                const testName = message.value;
                const extraTests = this.diff['extra_tests'];
                let id = null;
                Object.entries(extraTests).forEach(
                    async ([key, value] : [any, any]) => {
                        if (value[testName]){
                            if (value[testName]['id']){
                                id = value[testName]['id'];
                                const node = this.requirementDataProvider.getNodeById(id);
                                if (node){
                                    vscode.window.showErrorMessage("Test case with this id already exists");
                                    const choice = await vscode.window.showWarningMessage(
                                        "The test case with this id already exists. Do you want to delete it and add the new one?",
                                        { modal: true },
                                        "Yes", "No"
                                    );
                                    if (choice === "Yes") {
                                        this.requirementDataProvider.deleteById(id);
                                    } else {
                                        return;
                                    }
                                }
                            }
                            key = key.replace(/\\/g, '/').toLowerCase();
                            const requirements = key.split('/');
                            const testCaseData = value[testName];
                            let parameters: Parameter[] = [];
                            Object.entries(testCaseData['parameters']).forEach(
                                ([key, value] : [string, any]) => {
                                    const parameterName = key;
                                    let parameterType : string = '';
                                    let parameterValue = value;
                                    if(value.length > 0){
                                        if (typeof value[0] === "number") {
                                            parameterType = Number.isInteger(value[0]) ? "int" : "float";
                                        }
                                        else if (typeof value[0] === "object"){
                                            if (Array.isArray(value[0])) {
                                                parameterType = 'array';
                                            } 
                                            parameterValue = [];
                                            value.forEach((singleValue: any[]) => {
                                                parameterValue.push(JSON.stringify(singleValue));
                                            });
                                        }
                                        else {
                                            parameterType = typeof value[0];
                                        }
                                    }
                                    parameters.push(new Parameter(parameterName, parameterType, parameterValue));
                                }
                            );   
                            this.requirementDataProvider.addExtraTestCase(requirements, testCaseData, testName, parameters);     
                            vscode.window.showInformationMessage(`Conflict resolved!`);
                            this.generateCoverageReport(true);                               
                        }
                       
                    }
                );
                
            }
            if (message.command === "updateExistingTests"){
                const reqifContent = ReqifFileManager.exportToReqIF(this.requirementDataProvider.getAllNodes());
                const tempDir = os.tmpdir();
                const fileName = `temp_${Date.now()}.reqif`;
                const tempPath = path.join(tempDir, fileName);
                fs.writeFileSync(tempPath, reqifContent, 'utf-8');

                const process = spawn('typhoon_test_update', [tempPath, this.outputDir]);
                let result = '';
                let error = '';

                process.stdout.on('data', (data) => { result += data.toString(); });
                process.stderr.on('data', (data) => {
                    error += data.toString();
                });
                process.on('close', (code) => {
                    if (code === 0) {
                        this.generateCoverageReport(true); 
                        vscode.window.showInformationMessage(`Updated test project successfully!`);
                    } else {
                        vscode.window.showErrorMessage(`Updating existing tests failed. ${error}`);
                    }
                });
            }
        });
    }

    public getHtml(diff: any): string {

        function renderSideBySide(
            title: string,
            missing: string[] = [],
            extra: string[] = [],
            colorMissing = "#e06c75",
            colorExtra = "#98c379"
        ) {
            const typeMap: Record<string, { missing: string; extra: string }> = {
                'Requirements': { missing: 'missing', extra: 'extra' },
                'Tests': { missing: 'missing-test', extra: 'extra-test' },
            };
            const types = typeMap[title] || { missing: 'missing', extra: 'extra' };

            const maxLen = Math.max(missing.length, extra.length, 1);
            return `
                <div class="side-by-side-section">
                    <h3>${title}</h3>
                    <div class="side-by-side-table">
                        <div class="side-by-side-header" style="color:${colorMissing};">Missing</div>
                        <div class="side-by-side-header" style="color:${colorExtra};">Extra</div>
                        ${Array.from({ length: maxLen }).map((_, i) => `
                            <div class="side-by-side-cell">
                                ${missing[i]
                                    ? `<code>${missing[i]}</code>
                                    <button class="vscode-button delete-btn" data-type="${types.missing}" data-value="${encodeURIComponent(missing[i])}" style="background:#e06c75; color:#fff; border:none; border-radius:3px; margin-left:8px; cursor:pointer;">Delete</button>`
                                    : '<span class="muted">None</span>'}
                            </div>
                            <div class="side-by-side-cell">
                                ${extra[i]
                                    ? `<code>${extra[i]}</code>
                                    <button class="vscode-button add-btn" data-type="${types.extra}" data-value="${encodeURIComponent(extra[i])}" style="background:#98c379; color:#fff; border:none; border-radius:3px; margin-left:8px; cursor:pointer;">Add</button>`
                                    : '<span class="muted">None</span>'}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function renderTestSideBySide(
            title: string,
            missingObj: Record<string, any>,
            extraObj: Record<string, any>,
            colorMissing = "#e06c75",
            colorExtra = "#98c379"
        ) {
            const missingFiles = Object.keys(missingObj || {}).filter(
                file => missingObj[file] && Object.keys(missingObj[file]).length > 0
            );
            const extraFiles = Object.keys(extraObj || {}).filter(
                file => extraObj[file] && Object.keys(extraObj[file]).length > 0
            );
            const maxLen = Math.max(missingFiles.length, extraFiles.length, 1);
            return `
                <div class="side-by-side-section">
                    <h3>${title}</h3>
                    <div class="side-by-side-table">
                        <div class="side-by-side-header" style="color:${colorMissing};">Missing</div>
                        <div class="side-by-side-header" style="color:${colorExtra};">Extra</div>
                        ${Array.from({ length: maxLen }).map((_, i) => `
                            <div class="side-by-side-cell">
                                ${missingFiles[i]
                                    ? `<code>${missingFiles[i]}</code>
                                    ${renderTestNamesWithButtons(missingObj[missingFiles[i]], 'missing-test-case', missingFiles[i])}`
                                    : '<span class="muted">None</span>'}
                            </div>
                            <div class="side-by-side-cell">
                                ${extraFiles[i]
                                    ? `<code>${extraFiles[i]}</code>
                                    ${renderTestNamesWithButtons(extraObj[extraFiles[i]], 'extra-test-case', extraFiles[i])}`
                                    : '<span class="muted">None</span>'}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function renderTestNamesWithButtons(tests: any, btnType: string, parent: string) {
            if (!tests || Object.keys(tests).length === 0) { return ''; }
            return `<ul>
                ${Object.keys(tests).map(name =>
                    `<li>
                        ${name}
                        <button class="vscode-button add-btn" data-type="${btnType}" data-parent="${encodeURIComponent(parent)}" data-value="${encodeURIComponent(name)}"
                            style="background:${btnType.includes('missing') ? '#e06c75' : '#98c379'}; color:#fff; border:none; border-radius:3px; margin-left:8px; cursor:pointer;">
                            ${btnType.includes('missing') ? 'Delete' : 'Add'}
                        </button>
                    </li>`
                ).join('')}
            </ul>`;
        }

        function renderParameterSets(paramSets: any[]) {
            if (!paramSets || !paramSets.length) { return ''; }
            if (Array.isArray(paramSets[0])) {
                const maxLen = Math.max(...paramSets.map(arr => arr.length));
                const headers = Array.from({ length: maxLen }, (_, i) => `Param${i + 1}`);
                return `
                    <table class="vscode-table">
                        <thead>
                            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${paramSets.map(set => `
                                <tr>${headers.map((_, i) => `<td>${set[i] !== undefined ? set[i] : ''}</td>`).join('')}</tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            const allKeys = Array.from(new Set(paramSets.flatMap(p => Object.keys(p))));
            return `
                <table class="vscode-table">
                    <thead>
                        <tr>${allKeys.map(key => `<th>${key}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${paramSets.map(set => `
                            <tr>${allKeys.map(key => `<td>${Array.isArray(set[key]) ? set[key].join(', ') : (set[key] ?? '')}</td>`).join('')}</tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        function formatValue(val: any): string {
            if (Array.isArray(val)) {
                return `<code>${JSON.stringify(val)}</code>`;
            }
            if (typeof val === 'object' && val !== null) {
                return `<code>${JSON.stringify(val, null, 2)}</code>`;
            }
            return `<code>${String(val)}</code>`;
        }
        

        function renderChangePair(newVal : any, oldVal : any) {
            return `
                <div style="margin-bottom:4px;">
                    <span style="color:#56b6c2;font-weight:500;">incoming:</span>
                    <span>${formatValue(newVal)}</span>
                </div>
                <div>
                    <span style="color:#888;font-weight:500;">current:</span>
                    <span>${formatValue(oldVal)}</span>
                </div>
            `;
        }

        function renderModifiedTests(modified: Record<string, any>, requirementDataProvider: RequirementTreeProvider) {
            if (!modified || Object.keys(modified).length === 0) { return ''; }
            return `
                <div class="section">
                    <h3 style="color:#d19a66;">Modified Tests</h3>
                    <ul>
                        ${Object.entries(modified).map(([file, tests]) => `
                            <li>
                                <code>${file}</code>
                                <ul>
                                    ${Object.entries(tests).map(([id, changes]) => `
                                        <li>
                                            <b>${requirementDataProvider.getNodeById(id)?.label}</b>
                                            <ul>
                                                ${Object.entries(changes as Record<string, any>).map(([param, values]) => `
                                                    <li>
                                                        <span class="label">${param}:</span>
                                                        ${param === 'parameters' && Array.isArray(values)
                                                            ? renderParameterSets(values)
                                                            : (Array.isArray(values) && values.length === 2
                                                                ? renderChangePair(values[0], values[1])
                                                                : `<pre>${JSON.stringify(values, null, 2)}</pre>`)}
                                                    </li>
                                                `).join('')}
                                            </ul>
                                            <button class="vscode-button"  onclick="openResolveModal('${file}', '${id}', '${encodeURIComponent(JSON.stringify(changes))}')" style="background:var(--vscode-button-background); color:var(--vscode-button-foreground); border:none; border-radius:3px; padding:6px 16px; font-weight:500; cursor:pointer;">Resolve This Conflict</button>
                                        </li>
                                    `).join('')}
                                </ul>
                            </li>
                        `).join('')}
                    </ul>
                    <div id="resolve-modal" style="display:none; position:fixed; top:20%; left:30%; background:var(--vscode-editorWidget-background,#1e1e1e); border:1px solid var(--vscode-editorWidget-border,#454545); box-shadow: 0 4px 24px #0008; padding:24px; z-index:1000; min-width:400px; border-radius:6px; color:var(--vscode-editor-foreground);">
                        <h3 style="margin-top:0; color:var(--vscode-editor-foreground); font-weight:600;">Resolve Conflict</h3>
                        <div id="modal-content"></div>
                        <div style="margin-top:20px; display:flex; gap:10px;">
                            <button class="vscode-button" onclick="submitResolution()" style="background:var(--vscode-button-background); color:var(--vscode-button-foreground); border:none; border-radius:3px; padding:6px 16px; font-weight:500; cursor:pointer;">
                                Resolve
                            </button>
                            <button class="vscode-button" onclick="closeResolveModal()" style="background:var(--vscode-button-secondaryBackground); color:var(--vscode-button-secondaryForeground); border:none; border-radius:3px; padding:6px 16px; font-weight:500; cursor:pointer;">
                                Cancel
                            </button>
                        </div>
                    </div>
                    <div id="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.25); z-index:999;" onclick="closeResolveModal()"></div>
                    <script>
                        let currentResolve = {};

                        function openResolveModal(file, id, changesStr) {
                            currentResolve = { file, id, changesStr };
                            const changes = JSON.parse(decodeURIComponent(changesStr));
                            const currentTest = (window.currentTests && window.currentTests[file] && window.currentTests[file][id]) || {};
                            let html = '';
                            for (const param in changes) {
                                if (param === 'parameters' && typeof changes[param][0] === 'object' && changes[param][0] !== null) {
                                    const newParams = changes[param][0];
                                    const oldParams = changes[param][1];
                                    // Get all unique parameter names
                                    const allParamNames = Array.from(new Set([
                                        ...Object.keys(newParams || {}),
                                        ...Object.keys(oldParams || {})
                                    ]));
                                    allParamNames.forEach(pname => {
                                        html += \`
                                            <div style="margin-bottom:16px;">
                                                <div style="font-weight:500; margin-bottom:4px;">\${pname}</div>
                                                <label style="display:flex; align-items:center; gap:6px; margin-bottom:2px; cursor:pointer;">
                                                    <input type="radio" name="choice_param_\${pname}" value="new" checked style="accent-color:var(--vscode-button-background);">
                                                    <span style="color:var(--vscode-editor-foreground);">New: <code>\${JSON.stringify({ [pname]: newParams[pname] })}</code></span>
                                                </label>
                                                <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                                    <input type="radio" name="choice_param_\${pname}" value="old" style="accent-color:var(--vscode-button-secondaryBackground);">
                                                    <span style="color:var(--vscode-editor-foreground);">Current: <code>\${JSON.stringify({ [pname]: oldParams[pname] })}</code></span>
                                                </label>
                                            </div>
                                        \`;
                                    });
                                } else {
                                    // For other fields, keep the old logic
                                    const newValue = changes[param][0];
                                    const oldValue = changes[param][1];
                                    html += \`
                                        <div style="margin-bottom:16px;">
                                            <div style="font-weight:500; margin-bottom:4px;">\${param}</div>
                                            <label style="display:flex; align-items:center; gap:6px; margin-bottom:2px; cursor:pointer;">
                                                <input type="radio" name="choice_\${param}" value="new" checked style="accent-color:var(--vscode-button-background);">
                                                <span style="color:var(--vscode-editor-foreground);">New: \${formatValue(newValue)}</span>
                                            </label>
                                            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                                <input type="radio" name="choice_\${param}" value="old" style="accent-color:var(--vscode-button-secondaryBackground);">
                                                <span style="color:var(--vscode-editor-foreground);">Current: \${formatValue(oldValue)}</span>
                                            </label>
                                        </div>
                                    \`;
                                }
                            }
                            document.getElementById('modal-content').innerHTML = html;
                            document.getElementById('resolve-modal').style.display = 'block';
                            document.getElementById('modal-overlay').style.display = 'block';
                        }

                        function closeResolveModal() {
                            document.getElementById('resolve-modal').style.display = 'none';
                            document.getElementById('modal-overlay').style.display = 'none';
                        }

                        function formatValue(val) {
                            if (Array.isArray(val)) {
                                return JSON.stringify(val);
                            }
                            if (typeof val === 'object' && val !== null) {
                                return JSON.stringify(val, null, 2);
                            }
                            return String(val);
                        }

                        function submitResolution() {
                            const chosen = {};
                            const modal = document.getElementById('modal-content');
                            const changes = JSON.parse(decodeURIComponent(currentResolve.changesStr));
                            // Handle parameters specially
                            if (changes.parameters && typeof changes.parameters[0] === 'object') {
                                const newParams = changes.parameters[0];
                                const oldParams = changes.parameters[1];
                                const allParamNames = Array.from(new Set([
                                    ...Object.keys(newParams || {}),
                                    ...Object.keys(oldParams || {})
                                ]));
                                chosen.parameters = {};
                                allParamNames.forEach(pname => {
                                    const selected = modal.querySelector(\`input[name="choice_param_\${pname}"]:checked\`);
                                    if (selected) {
                                        chosen.parameters[pname] = selected.value === 'new' ? newParams[pname] : oldParams[pname];
                                    }
                                });
                            }
                            // Handle other fields as before
                            Object.keys(changes).forEach(param => {
                                if (param === 'parameters') return;
                                const selected = modal.querySelector(\`input[name="choice_\${param}"]:checked\`);
                                if (selected) {
                                    chosen[param] = selected.value === 'new' ? changes[param][0] : changes[param][1];
                                }
                            });
                            chosen.id = currentResolve.id;
                            vscode.postMessage({
                                command: 'resolveConflict',
                                file: currentResolve.file,
                                id: currentResolve.id,
                                chosen
                            });
                            closeResolveModal();
                        }
                            
                        function formatValue(val) {
                            if (Array.isArray(val)) {
                                return '<code>' + JSON.stringify(val) + '</code>';
                            }
                            if (typeof val === 'object' && val !== null) {
                                return '<code>' + JSON.stringify(val, null, 2) + '</code>';
                            }
                            return '<code>' + String(val) + '</code>';
                        }

                    </script>
                </div>
            `;
        }

        function renderSkippedTests(skipped: string[] = [], requirementDataProvider: RequirementTreeProvider) {
            if (!skipped.length) {return '';}
            return `
                <div class="section">
                    <h3 style="color:#56b6c2;">Not Implemented Tests</h3>
                    <ul>
                        ${skipped.map(test => `<li><code>${test}</code></li>`).join('')}
                    </ul>
                </div>
            `;
        }

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <style>
                    body {
                        font-family: var(--vscode-font-family, sans-serif);
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 16px;
                    }
                    h2 { color: var(--vscode-editor-foreground); }
                    .side-by-side-section { margin-bottom: 24px; }
                    .side-by-side-table {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 0;
                        border: 1px solid var(--vscode-editorWidget-border, #ccc);
                        border-radius: 4px;
                        overflow: hidden;
                    }
                    .side-by-side-header {
                        background: var(--vscode-editorWidget-background, #222);
                        font-weight: bold;
                        padding: 8px;
                        border-bottom: 1px solid var(--vscode-editorWidget-border, #ccc);
                    }
                    .side-by-side-cell {
                        padding: 8px;
                        border-bottom: 1px solid var(--vscode-editorWidget-border, #ccc);
                        border-right: 1px solid var(--vscode-editorWidget-border, #ccc);
                    }
                    .side-by-side-cell:nth-child(2n) {
                        border-right: none;
                    }
                    .side-by-side-table > :last-child,
                    .side-by-side-table > :nth-last-child(2) {
                        border-bottom: none;
                    }
                    .muted { color: #888; }
                    code {
                        background-color: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.2));
                        padding: 2px 4px;
                        border-radius: 3px;
                        font-family: var(--vscode-editor-font-family, monospace);
                    }
                    ul { margin: 0; padding-left: 20px; }
                    li { margin-bottom: 2px; }
                    hr {
                        border: none;
                        border-top: 1px solid var(--vscode-editorWidget-border);
                        margin: 20px 0;
                    }
                    table {
                        border-collapse: collapse;
                        margin: 8px 0;
                    }

                    th, td {
                        border: 1px solid var(--vscode-editorWidget-border, #ccc);
                        padding: 4px 8px;
                    }

                    th {
                        background-color: var(--vscode-editorWidget-background);
                        color: var(--vscode-editor-foreground);
                    }
                </style>
            </head>
            <body>
                <h2>Coverage Differences</h2>
                ${renderSideBySide('Requirements', diff.missing_folders, diff.extra_folders)}
                ${renderSideBySide('Tests', diff.missing_files, diff.extra_files)}
                ${renderTestSideBySide('Test Cases', diff.missing_tests, diff.extra_tests)}
                ${renderModifiedTests(diff.modified_tests, this.requirementDataProvider)}
                ${renderSkippedTests(diff.skipped_tests, this.requirementDataProvider)}
                
                <hr>
                <button class="vscode-button" onclick="updateExistingTests()" style="background:var(--vscode-button-background); color:var(--vscode-button-foreground); border:none; border-radius:3px; padding:6px 16px; font-weight:500; cursor:pointer;">
                    Update Your Existing Test Project
                </button>
                <hr>
                <div id="confirm-modal" style="display:none; position:fixed; top:30%; left:50%; transform:translate(-50%,-30%); background:var(--vscode-editorWidget-background,#1e1e1e); border:2px solid #e06c75; box-shadow:0 4px 24px #000a; padding:32px; z-index:10000; min-width:350px; border-radius:8px; color:var(--vscode-editor-foreground);">
                    <h3 style="margin-top:0; color:#e06c75;">Are you sure?</h3>
                    <div id="confirm-modal-message" style="margin-bottom:24px;"></div>
                    <div style="display:flex; gap:16px; justify-content:flex-end;">
                        <button id="confirm-modal-yes" class="vscode-button" style="background:#e06c75; color:#fff;">Yes</button>
                        <button id="confirm-modal-no" class="vscode-button" style="background:var(--vscode-button-secondaryBackground); color:var(--vscode-button-secondaryForeground);">No</button>
                    </div>
                </div>
                <div id="confirm-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.35); z-index:9999;"></div>
                <script>
                    const vscode = acquireVsCodeApi();

                    document.addEventListener('click', function(e) {
                        if (e.target.classList.contains('delete-btn') || e.target.classList.contains('add-btn')) {
                            const type = e.target.getAttribute('data-type');
                            const value = decodeURIComponent(e.target.getAttribute('data-value'));
                            const parent = e.target.getAttribute('data-parent') ? decodeURIComponent(e.target.getAttribute('data-parent')) : null;
                            vscode.postMessage({
                                command: type === 'missing' ? 'deleteRequirement'
                                        : type === 'extra' ? 'addRequirement'
                                        : type === 'missing-test' ? 'deleteTest'
                                        : type === 'extra-test' ? 'addTest'
                                        : type === 'missing-test-case' ? 'deleteTestCase'
                                        : type === 'extra-test-case' ? 'addTestCase'
                                        : '',
                                value,
                                parent
                            });
                        }
                    });

                    function updateExistingTests() {
                        showConfirmModal(
                            "This action will update your existing test project and may overwrite changes. Are you sure you want to continue?",
                            () => vscode.postMessage({ command: 'updateExistingTests' }),
                            () => {} // Do nothing on No
                        );
                    }

                    function showConfirmModal(message, onYes, onNo) {
                        document.getElementById('confirm-modal-message').innerText = message;
                        document.getElementById('confirm-modal').style.display = 'block';
                        document.getElementById('confirm-modal-overlay').style.display = 'block';

                        const yesBtn = document.getElementById('confirm-modal-yes');
                        const noBtn = document.getElementById('confirm-modal-no');

                        function cleanup() {
                            document.getElementById('confirm-modal').style.display = 'none';
                            document.getElementById('confirm-modal-overlay').style.display = 'none';
                            yesBtn.removeEventListener('click', yesHandler);
                            noBtn.removeEventListener('click', noHandler);
                        }

                        function yesHandler() {
                            cleanup();
                            if (onYes) onYes();
                        }
                        function noHandler() {
                            cleanup();
                            if (onNo) onNo();
                        }

                        yesBtn.addEventListener('click', yesHandler);
                        noBtn.addEventListener('click', noHandler);
                    }


                </script>
            </body>
            </html>
        `;
    }
}