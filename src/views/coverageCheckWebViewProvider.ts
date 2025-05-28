import * as vscode from 'vscode';
import { RequirementTreeProvider } from './requirementTreeViewProvider';
import { Parameter, TestCase } from '../models/testCase';

export class CoverageCheckWebviewProvider {
    private static requirementDataProvider: RequirementTreeProvider;

    
    static show(diff: any, requirementDataProvider: any) {
        const panel = vscode.window.createWebviewPanel(
            'coverageDiff',
            'Coverage Differences',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        CoverageCheckWebviewProvider.requirementDataProvider = requirementDataProvider;
        panel.webview.html = CoverageCheckWebviewProvider.getHtml(diff);
        panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'resolveConflict') {
                let node = CoverageCheckWebviewProvider.requirementDataProvider.getNodeById(message.id);
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
                            console.log(message.chosen.parameters);

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
                                console.log("menjaj vrednosti");
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
                                
                                console.log(node.parameters);
                            }
                        }
                        if (message.chosen.steps){
                            node.steps = message.chosen.steps;
                        }
                    }
                    CoverageCheckWebviewProvider.requirementDataProvider.updateNode(node);
                }                
            }
        });
    }

    static getHtml(diff: any): string {
        function renderSideBySide(title: string, missing: string[] = [], extra: string[] = [], colorMissing = "#e06c75", colorExtra = "#e5c07b") {
            const maxLen = Math.max(missing.length, extra.length, 1);
            return `
                <div class="side-by-side-section">
                    <h3>${title}</h3>
                    <div class="side-by-side-table">
                        <div class="side-by-side-header" style="color:${colorMissing};">Missing</div>
                        <div class="side-by-side-header" style="color:${colorExtra};">Extra</div>
                        ${Array.from({ length: maxLen }).map((_, i) => `
                            <div class="side-by-side-cell">${missing[i] ? `<code>${missing[i]}</code>` : '<span class="muted">None</span>'}</div>
                            <div class="side-by-side-cell">${extra[i] ? `<code>${extra[i]}</code>` : '<span class="muted">None</span>'}</div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function renderTestSideBySide(title: string, missingObj: Record<string, any>, extraObj: Record<string, any>, colorMissing = "#e06c75", colorExtra = "#e5c07b") {
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
                                ${missingFiles[i] ? `<code>${missingFiles[i]}</code>${renderTestNames(missingObj[missingFiles[i]])}` : '<span class="muted">None</span>'}
                            </div>
                            <div class="side-by-side-cell">
                                ${extraFiles[i] ? `<code>${extraFiles[i]}</code>${renderTestNames(extraObj[extraFiles[i]])}` : '<span class="muted">None</span>'}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function renderTestNames(tests: any) {
            if (!tests || Object.keys(tests).length === 0) {return '';};
            return `<ul>${Object.keys(tests).map(name => `<li>${name}</li>`).join('')}</ul>`;
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

        function renderModifiedTests(modified: Record<string, any>) {
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
                                            <b>${CoverageCheckWebviewProvider.requirementDataProvider.getNodeById(id)?.label}</b>
                                            <button onclick="openResolveModal('${file}', '${id}', '${encodeURIComponent(JSON.stringify(changes))}')">Resolve</button>
                                            <ul>
                                                ${Object.entries(changes as Record<string, any>).map(([param, values]) => `
                                                    <li>
                                                        <span class="label">${param}:</span>
                                                        ${param === 'parameters' && Array.isArray(values)
                                                            ? renderParameterSets(values)
                                                            : `<pre>${JSON.stringify(values, null, 2)}</pre>`}
                                                    </li>
                                                `).join('')}
                                            </ul>
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
                        const vscode = acquireVsCodeApi();
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

        function renderSkippedTests(skipped: string[] = []) {
            if (!skipped.length) {return '';}
            return `
                <div class="section">
                    <h3 style="color:#56b6c2;">Not Implemented Tests</h3>
                    <ul>
                        ${skipped.map(test => `<li><code>${CoverageCheckWebviewProvider.requirementDataProvider.getNodeById(test)?.label}</code></li>`).join('')}
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
                ${renderModifiedTests(diff.modified_tests)}
                ${renderSkippedTests(diff.skipped_tests)}
                <hr>
            </body>
            </html>
        `;
    }
}