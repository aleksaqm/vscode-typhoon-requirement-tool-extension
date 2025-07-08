import * as vscode from 'vscode';
import { Requirement } from '../models/requirement';
import { getUniqueId } from '../utils/idGenerator';

export class RequirementWebviewProvider {
    static show(node: Requirement | undefined, onSubmit: (requirement: Requirement) => void): void {
        const panel = vscode.window.createWebviewPanel(
            'addRequirement',
            node ? 'Edit Requirement' : 'Add Requirement',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        panel.webview.html = RequirementWebviewProvider.getHtml(node);

        panel.webview.onDidReceiveMessage((message) => {
            if (message.command === 'submit') {
                const { name, description, priority, status, otherData } = message.data;
                if (name && description && priority && status) {
                    let req: Requirement;
                    if (node) {
                        req = new Requirement(node.id!, name, description, priority, status);
                        req.otherData = new Map(Object.entries(otherData)); // <-- Convert to Map
                    } else {
                        req = new Requirement(getUniqueId(), name, description, priority, status);
                        req.otherData = new Map(Object.entries(otherData)); // <-- Convert to Map
                    }
                    onSubmit(req);
                    panel.dispose();
                } else {
                    vscode.window.showErrorMessage('Please fill in all fields.');
                }
            }
        });
    }

    private static getHtml(node: Requirement | undefined): string {
        const name = node ? node.label : '';
        const description = node && node.description ? node.description : '';
        const priority = node ? node.priority : 'Medium';
        const status = node ? node.status : 'Draft';
        const otherData = node && node.otherData ? (node.otherData instanceof Map ? Array.from(node.otherData.entries()) : Object.entries(node.otherData)) : [];

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${node ? 'Edit Requirement' : 'Add Requirement'}</title>
                <script type="module" src="https://unpkg.com/@vscode/webview-ui-toolkit/dist/toolkit.min.js"></script>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                    }
                    form {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        width: 60%;
                    }
                    vscode-button {
                        align-self: flex-start;
                    }
                    .other-section {
                        margin-top: 18px;
                        padding-top: 8px;
                        border-top: 1px solid var(--vscode-panel-border, #333);
                    }
                    ul {
                        list-style-type: none;
                        padding: 0;
                    }
                    li {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 4px;
                    }
                    .remove-button {
                        background: #d32f2f;
                        color: #fff;
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        padding: 2px 8px;
                    }
                    .remove-button:hover {
                        background: #b71c1c;
                    }
                </style>
            </head>
            <body>
                <h2>${node ? 'Edit Requirement' : 'Add Requirement'}</h2>
                <form id="requirementForm">
                    <vscode-text-field id="name" value="${name}" required>Requirement Name</vscode-text-field>
                    <vscode-text-area id="description" value="${description}" rows="4" resize="vertical" required>
                        Requirement Description
                    </vscode-text-area>
                    <vscode-dropdown id="priority">
                        <vscode-option value="High" ${priority === 'High' ? 'selected' : ''}>High</vscode-option>
                        <vscode-option value="Medium" ${priority === 'Medium' ? 'selected' : ''}>Medium</vscode-option>
                        <vscode-option value="Low" ${priority === 'Low' ? 'selected' : ''}>Low</vscode-option>
                    </vscode-dropdown>
                    <vscode-dropdown id="status">
                        <vscode-option value="Draft" ${status === 'Draft' ? 'selected' : ''}>Draft</vscode-option>
                        <vscode-option value="Ready" ${status === 'Ready' ? 'selected' : ''}>Ready</vscode-option>
                        <vscode-option value="Reviewed" ${status === 'Reviewed' ? 'selected' : ''}>Reviewed</vscode-option>
                        <vscode-option value="Approved" ${status === 'Approved' ? 'selected' : ''}>Approved</vscode-option>
                        <vscode-option value="Released" ${status === 'Released' ? 'selected' : ''}>Released</vscode-option>
                    </vscode-dropdown>
                    <div class="other-section">
                        <h4>Other Data</h4>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <vscode-text-field id="otherKey" placeholder="Key"></vscode-text-field>
                            <vscode-text-field id="otherValue" placeholder="Value"></vscode-text-field>
                            <vscode-button id="addOtherButton" type="button">Add</vscode-button>
                        </div>
                        <ul id="otherDataList">
                            ${otherData.map(([key, value]) => `
                                <li>
                                    <span><b>${key}</b>: ${value}</span>
                                    <button class="remove-button" data-key="${key}">Remove</button>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <vscode-button id="submitButton" type="button" appearance="primary">
                        ${node ? 'Save Changes' : 'Submit'}
                    </vscode-button>
                </form>
                <script>
                    const vscode = acquireVsCodeApi();
                    let otherData = ${JSON.stringify(Object.fromEntries(otherData))};
                    let otherDataTypes = {};
                    Object.entries(otherData).forEach(([key, value]) => {
                        otherDataTypes[key] = typeof value;
                    });

                    function updateOtherDataList() {
                        const list = document.getElementById('otherDataList');
                        list.innerHTML = '';
                        Object.entries(otherData).forEach(([key, value]) => {
                            const li = document.createElement('li');
                            li.innerHTML = '<span><b>' + key + '</b>: ' + value + '</span> <button class="remove-button" data-key="' + key + '">Remove</button>';
                            li.querySelector('.remove-button').addEventListener('click', () => {
                                delete otherData[key];
                                updateOtherDataList();
                            });
                            list.appendChild(li);
                        });
                    }

                    document.getElementById('addOtherButton').addEventListener('click', () => {
                        const key = document.getElementById('otherKey').value.trim();
                        let value = document.getElementById('otherValue').value.trim();

                        if (!key) return;

                        // If key already exists, check type
                        if (otherData.hasOwnProperty(key)) {
                            const expectedType = otherDataTypes[key];
                            let newType = typeof value;

                            // Try to parse as number or boolean if original was such
                            if (expectedType === 'number' && !isNaN(Number(value))) {
                                value = Number(value);
                                newType = 'number';
                            } else if (expectedType === 'boolean' && (value === 'true' || value === 'false')) {
                                value = value === 'true';
                                newType = 'boolean';
                            }

                            if (newType !== expectedType) {
                                alert('Type mismatch! Value for "' + key + '" must be of type ' + expectedType + '.');
                                return;
                            }
                        } else {
                            // If new key, record its type
                            if (!isNaN(Number(value))) {
                                value = Number(value);
                                otherDataTypes[key] = 'number';
                            } else if (value === 'true' || value === 'false') {
                                value = value === 'true';
                                otherDataTypes[key] = 'boolean';
                            } else {
                                otherDataTypes[key] = 'string';
                            }
                        }

                        otherData[key] = value;
                        document.getElementById('otherKey').value = '';
                        document.getElementById('otherValue').value = '';
                        updateOtherDataList();
                    });

                    document.getElementById('submitButton').addEventListener('click', () => {
                        const name = document.getElementById('name').value.trim();
                        const description = document.getElementById('description').value.trim();
                        const priority = document.getElementById('priority').value;
                        const status = document.getElementById('status').value;
                        vscode.postMessage({
                            command: 'submit',
                            data: { name, description, priority, status, otherData }
                        });
                    });

                    // Initialize list if editing
                    updateOtherDataList();
                </script>
            </body>
            </html>
        `;
    }
}