import * as vscode from 'vscode';
import { TreeNode } from '../models/treeNode';
import { Requirement } from '../models/requirement';
import { TestNode } from '../models/test';
import { TestCase } from '../models/testCase';

export class DetailsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'typhoon-requirement-tool.details';
    private _view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
        };

        webviewView.webview.html = this.getHtmlContent();
    }

    updateDetails(node: TreeNode): void {
        if (this._view) {
            this._view.webview.postMessage({ command: 'update', data: this.getNodeDetails(node) });
        }
    }

    private getNodeDetails(node: TreeNode): string {
        if (node instanceof Requirement) {
            return `
                <h2>Requirement Details</h2>
                <p><strong>Name:</strong> ${node.label}</p>
                <p><strong>Description:</strong> ${node.description}</p>
            `;
        } else if (node instanceof TestNode) {
            return `
                <h2>Test Details</h2>
                <p><strong>Name:</strong> ${node.label}</p>
                <p><strong>Description:</strong> ${node.description}</p>
            `;
        } else if (node instanceof TestCase) {
            return `
                <h2>Test Case Details</h2>
                <p><strong>Name:</strong> ${node.label}</p>
                <p><strong>Scenario:</strong> ${node.scenario}</p>
                <p><strong>Steps:</strong> ${node.steps.join(', ')}</p>
                <p><strong>Prerequisites:</strong> ${node.prerequisites.join(', ')}</p>
                <p><strong>Test Data:</strong> ${node.testData.join(', ')}</p>
                <p><strong>Expected Results:</strong> ${node.expectedResults.join(', ')}</p>
            `;
        }
        return '<p>No details available.</p>';
    }

    private getHtmlContent(): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Requirement Details</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 10px;
                    }
                    h2 {
                        color: #007acc;
                    }
                    p {
                        margin: 5px 0;
                    }
                </style>
            </head>
            <body>
                <h2>Details</h2>
                <p>Select a node to see details.</p>
            </body>
            <script>
                const vscode = acquireVsCodeApi();
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'update') {
                        document.body.innerHTML = message.data;
                    }
                });
            </script>
            </html>
        `;
    }
}