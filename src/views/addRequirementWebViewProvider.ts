import * as vscode from 'vscode';
import { Requirement } from '../models/requirement';
import { getUniqueId } from '../utils/idGenerator';

export class AddRequirementWebviewProvider {
    static show(parent: any, onSubmit: (requirement: Requirement) => void): void {
        const panel = vscode.window.createWebviewPanel(
            'addRequirement',
            'Add Requirement',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = AddRequirementWebviewProvider.getHtml();

        panel.webview.onDidReceiveMessage((message) => {
            if (message.command === 'submit') {
                const { name, description } = message.data;
                if (name && description) {
                    const newRequirement = new Requirement(getUniqueId(), name, description);
                    onSubmit(newRequirement);
                    panel.dispose();
                } else {
                    vscode.window.showErrorMessage('Please fill in all fields.');
                }
            }
        });
    }

    private static getHtml(): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Add Requirement</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }
                    label {
                        display: block;
                        margin-top: 10px;
                    }
                    input, textarea {
                        width: 50%;
                        padding: 8px;
                        margin-top: 5px;
                        margin-bottom: 15px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                    }
                    button {
                        background-color:rgb(204, 78, 0);
                        display: block;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    button:hover {
                        background-color:rgb(153, 74, 0);
                    }
                </style>
            </head>
            <body>
                <h2>Add Requirement</h2>
                <form id="requirementForm">
                    <label for="name">Requirement Name:</label>
                    <input type="text" id="name" name="name" required />
    
                    <label for="description">Requirement Description:</label>
                    <textarea id="description" name="description" rows="4" required></textarea>
    
                    <button type="button" id="submitButton">Submit</button>
                </form>
    
                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('submitButton').addEventListener('click', () => {
                        const name = document.getElementById('name').value;
                        const description = document.getElementById('description').value;
                        vscode.postMessage({
                            command: 'submit',
                            data: { name, description }
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }
}