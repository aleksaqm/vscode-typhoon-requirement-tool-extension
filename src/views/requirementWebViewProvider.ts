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
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }
                    label {
                        display: block;
                        margin-top: 10px;
                    }
                    input, textarea, select {
                        width: 50%;
                        padding: 8px;
                        margin-top: 5px;
                        margin-bottom: 15px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                    }
                    button {
                        background-color: rgb(204, 78, 0);
                        display: block;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    button:hover {
                        background-color: rgb(153, 74, 0);
                    }
                </style>
            </head>
            <body>
                <h2>${node ? 'Edit Requirement' : 'Add Requirement'}</h2>
                <form id="requirementForm">
                    <label for="name">Requirement Name:</label>
                    <input type="text" id="name" name="name" value="${name}" required />
    
                    <label for="description">Requirement Description:</label>
                    <textarea id="description" name="description" rows="4" required>${description}</textarea>
    
                    <label for="priority">Priority:</label>
                    <select id="priority" name="priority" required>
                        <option value="High" ${priority === 'High' ? 'selected' : ''}>High</option>
                        <option value="Medium" ${priority === 'Medium' ? 'selected' : ''}>Medium</option>
                        <option value="Low" ${priority === 'Low' ? 'selected' : ''}>Low</option>
                    </select>
    
                    <label for="status">Status:</label>
                    <select id="status" name="status" required>
                        <option value="Draft" ${status === 'Draft' ? 'selected' : ''}>Draft</option>
                        <option value="Ready" ${status === 'Ready' ? 'selected' : ''}>Ready</option>
                        <option value="Reviewed" ${status === 'Reviewed' ? 'selected' : ''}>Reviewed</option>
                        <option value="Approved" ${status === 'Approved' ? 'selected' : ''}>Approved</option>
                        <option value="Released" ${status === 'Released' ? 'selected' : ''}>Released</option>
                    </select>
    
                    <button type="button" id="submitButton">${node ? 'Save Changes' : 'Submit'}</button>
                </form>
    
                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('submitButton').addEventListener('click', () => {
                        const name = document.getElementById('name').value;
                        const description = document.getElementById('description').value;
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