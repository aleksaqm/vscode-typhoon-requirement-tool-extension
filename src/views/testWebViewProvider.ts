import * as vscode from 'vscode';
import { TestNode } from '../models/test';
import { getUniqueId } from '../utils/idGenerator';

export class TestWebviewProvider{
    static show(node: TestNode | undefined, onSubmit: (test: any) => void): void {
        const panel = vscode.window.createWebviewPanel(
            'addTest',
            'Add Test',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = TestWebviewProvider.getHtml(node);

        panel.webview.onDidReceiveMessage((message) => {
            if (message.command === 'submit') {
                const { name, description } = message.data;
                if (name && description) {
                    if (node){
                        const id = node.id!;
                        onSubmit(new TestNode(id, name, description));
                        panel.dispose();
                    }else{
                        const newTest = new TestNode (getUniqueId(), name, description);
                        onSubmit(newTest);
                        panel.dispose();
                    }
                    
                } else {
                    vscode.window.showErrorMessage('Please fill in all fields.');
                }
            }
        });
    }

    private static getHtml(node: TestNode | undefined): string {
        const name = node ? node.label : '';
        const description = node && node.description ? node.description : '';
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${node ? 'Edit Test' : 'Add Test'}</title>
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
                <h2>${node ? 'Edit Test' : 'Add Test'}</h2>
                <form id="testForm">
                    <label for="name">Test Name:</label>
                    <input type="text" id="name" name="name" value="${name}" required />
    
                    <label for="description">Test Description:</label>
                    <textarea id="description" name="description" rows="4" required>${description}</textarea>
    
                    <button type="button" id="submitButton">${node ? 'Save Changes' : 'Submit'}</button>
                
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