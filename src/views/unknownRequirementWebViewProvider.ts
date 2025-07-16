import * as vscode from 'vscode';
import { TreeNode } from '../models/treeNode';
import { getUniqueId } from '../utils/idGenerator';

export class UnknownRequirementWebViewProvider {
    static show(node: TreeNode | undefined, onSubmit: (node: TreeNode) => void): void {
        console.log("UnknownRequirementWebViewProvider.show called with node:", node);
        const panel = vscode.window.createWebviewPanel(
            'addUnknownNode',
            node ? 'Edit Node' : 'Add Node',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        panel.webview.html = UnknownRequirementWebViewProvider.getHtml(node);

        panel.webview.onDidReceiveMessage((message) => {
            if (message.command === 'submit') {
                const otherData = message.data;
                let id = node?.id || getUniqueId();
                let label = otherData.label || '';
                delete otherData.label;
                const newNode = new TreeNode(id, label, vscode.TreeItemCollapsibleState.Collapsed, 'unknown');
                newNode.id = id;
                newNode.otherData = otherData;
                onSubmit(newNode);
                panel.dispose();
            }
        });
    }

    private static getHtml(node: TreeNode | undefined): string {
        const otherData = node?.otherData || {};
        let keys: string[] = ['label'];
        let getValue = (key: string) => '';

        if (otherData instanceof Map) {
            const mapKeys = Array.from(otherData.keys());
            keys = ['label', ...mapKeys.filter(k => k !== 'label')];
            getValue = (key: string) => otherData.get(key) ?? '';
        } else {
            const objKeys = Object.keys(otherData);
            keys = ['label', ...objKeys.filter(k => k !== 'label')];
            getValue = (key: string) => otherData[key] ?? '';
        }

        const fields = keys.map(key => `
            <vscode-text-field id="${key}" value="${getValue(key)}">${key}</vscode-text-field>
        `).join('');

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${node ? 'Edit Node' : 'Add Node'}</title>
                <script type="module" src="https://unpkg.com/@vscode/webview-ui-toolkit/dist/toolkit.min.js"></script>
                <style>
                    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background-color: var(--vscode-editor-background); padding: 20px; }
                    form { display: flex; flex-direction: column; gap: 16px; width: 60%; }
                    vscode-button { align-self: flex-start; }
                </style>
            </head>
            <body>
                <h2>${node ? 'Edit Node' : 'Add Node'}</h2>
                <form id="unknownNodeForm">
                    ${fields}
                    <vscode-button id="submitButton" type="button" appearance="primary">
                        ${node ? 'Save Changes' : 'Submit'}
                    </vscode-button>
                </form>
                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('submitButton').addEventListener('click', () => {
                        const data = {};
                        ${keys.map(key => `data['${key}'] = document.getElementById('${key}').value.trim();`).join('\n')}
                        vscode.postMessage({ command: 'submit', data });
                    });
                </script>
            </body>
            </html>
        `;
    }
}