import * as vscode from 'vscode';
import { Requirement } from '../models/requirement';
import { getUniqueId } from '../utils/idGenerator';

export class RequirementWebviewProvider {
    static show(node: Requirement | undefined, onSubmit: (requirement: Requirement) => void): void {
        const panel = vscode.window.createWebviewPanel(
            'addRequirement',
            'Add Requirement',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        panel.webview.html = RequirementWebviewProvider.getHtml(node);

        panel.webview.onDidReceiveMessage((message) => {
            if (message.command === 'submit') {
                const { name, description, priority, status } = message.data;
                if (name && description && priority && status) {
                    if (node){
                        const id = node.id!;
                        onSubmit(new Requirement(id, name, description, priority, status));
                        panel.dispose();
                    }else{
                        const newRequirement = new Requirement(getUniqueId(), name, description, priority, status);
                        onSubmit(newRequirement);
                        panel.dispose();
                    }
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

                    <vscode-button id="submitButton" type="button" appearance="primary">
                        ${node ? 'Save Changes' : 'Submit'}
                    </vscode-button>
                </form>

                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('submitButton').addEventListener('click', () => {
                        const name = document.getElementById('name').value.trim();
                        const description = document.getElementById('description').value.trim();
                        const priority = document.getElementById('priority').value;
                        const status = document.getElementById('status').value;

                        vscode.postMessage({
                            command: 'submit',
                            data: { name, description, priority, status }
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }
}