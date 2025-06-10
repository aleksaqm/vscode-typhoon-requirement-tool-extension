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
        const description = node?.description ?? '';
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>${node ? 'Edit Test' : 'Add Test'}</title>
                <script type="module" src="https://unpkg.com/@vscode/webview-ui-toolkit@1.0.0/dist/toolkit.min.js"></script>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    vscode-text-field, vscode-text-area {
                        margin-bottom: 20px;
                        width: 100%;
                    }
                    vscode-button {
                        margin-top: 10px;
                    }
                    h2 {
                        color: var(--vscode-editor-foreground);
                    }
                </style>
            </head>
            <body>
                <h2>${node ? 'Edit Test' : 'Add Test'}</h2>
                <form id="testForm">
                    <vscode-text-field id="name" value="${name}" required>Test Name</vscode-text-field>
                    <vscode-text-area id="description" value="${description}" rows="4" required>Test Description</vscode-text-area>
                    <vscode-button id="submitButton" appearance="primary">${node ? 'Save Changes' : 'Submit'}</vscode-button>
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