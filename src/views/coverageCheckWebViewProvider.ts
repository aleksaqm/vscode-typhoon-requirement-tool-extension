import * as vscode from 'vscode';

export class CoverageCheckWebviewProvider {
    static show(diff: any, requirementDataProvider: any) {
        const panel = vscode.window.createWebviewPanel(
            'coverageDiff',
            'Coverage Differences',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = CoverageCheckWebviewProvider.getHtml(diff);

        panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.command === 'sync') {
                // Here, update your requirementDataProvider to match the diff
                // (You need to implement this logic based on your data structure)
                await requirementDataProvider.syncWithDiff(diff);
                vscode.window.showInformationMessage('Requirements synced with test structure!');
                panel.dispose();
            }
        });
    }

    static getHtml(diff: any): string {
        // Render the diff object as HTML (tables/lists)
        return `
            <html>
            <body>
                <h2>Coverage Differences</h2>
                <pre style="max-height:300px;overflow:auto;">${JSON.stringify(diff, null, 2)}</pre>
                <button onclick="vscode.postMessage({command: 'sync'})">Sync Requirements</button>
                <script>
                    const vscode = acquireVsCodeApi();
                </script>
            </body>
            </html>
        `;
    }
}