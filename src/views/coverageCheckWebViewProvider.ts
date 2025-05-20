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
    }

    static getHtml(diff: any): string {
        function renderSideBySide(titleLeft: string, itemsLeft: string[], colorLeft: string, titleRight: string, itemsRight: string[], colorRight: string) {
            return `
                <div class="row">
                    <div class="column">
                        <h3 style="color:${colorLeft};">${titleLeft}</h3>
                        <ul>${(itemsLeft || []).map(item => `<li>${item}</li>`).join('') || '<li class="muted">None</li>'}</ul>
                    </div>
                    <div class="column">
                        <h3 style="color:${colorRight};">${titleRight}</h3>
                        <ul>${(itemsRight || []).map(item => `<li>${item}</li>`).join('') || '<li class="muted">None</li>'}</ul>
                    </div>
                </div>
            `;
        }

        function renderTestDetails(title: string, obj: Record<string, any>, color = "#e06c75") {
            if (!obj || Object.keys(obj).length === 0) {return '';};
            return `
                <div class="section">
                    <h3 style="color:${color};">${title}</h3>
                    <ul>
                        ${Object.entries(obj).map(([file, tests]) => `
                            <li>
                                <code>${file}</code>
                                <ul>
                                    ${tests && typeof tests === 'object' && Object.keys(tests).length > 0
                                        ? Object.entries(tests).map(([testName, testDetails]) => `
                                            <li>
                                                <b>${testName}</b>
                                                <ul>
                                                    ${Object.entries(testDetails as Record<string, any>).map(([key, value]) => `
                                                        <li>
                                                            <span style="color:#61afef;">${key}:</span>
                                                            ${
                                                                key === 'parameters'
                                                                    ? (
                                                                        Array.isArray(value)
                                                                            ? renderParameterSets(value)
                                                                            : (typeof value === 'object' && value !== null)
                                                                                ? renderParameterSets([value])
                                                                                : String(value)
                                                                    )
                                                                    : Array.isArray(value)
                                                                        ? value.join(', ')
                                                                        : typeof value === 'object' && value !== null
                                                                            ? `<pre>${JSON.stringify(value, null, 2)}</pre>`
                                                                            : String(value)
                                                            }
                                                        </li>
                                                    `).join('')}
                                                </ul>
                                            </li>
                                        `).join('')
                                        : '<li style="color:#888;">No tests</li>'
                                    }
                                </ul>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        function renderParameterSets(paramSets: any[]) {
            if (!paramSets || !paramSets.length) {return '';}
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
            if (!modified || Object.keys(modified).length === 0) {return '';}
            return `
                <div class="section">
                    <h3 style="color:#d19a66;">Modified Tests</h3>
                    <ul>
                        ${Object.entries(modified).map(([file, tests]) => `
                            <li>
                                <code>${file}</code>
                                <ul>
                                    ${Object.entries(tests).map(([testName, changes]) => `
                                        <li>
                                            <b>${testName}</b>
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
                </div>
            `;
        }

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <style>
                    :root {
                        color-scheme: light dark;
                    }

                    body {
                        font-family: var(--vscode-font-family, sans-serif);
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 16px;
                    }

                    h2 {
                        color: var(--vscode-editor-foreground);
                    }

                    strong {
                        font-weight: bold;
                    }

                    ul {
                        list-style: disc;
                        padding-left: 20px;
                    }

                    li {
                        margin-bottom: 4px;
                    }

                    code {
                        background-color: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.2));
                        padding: 2px 4px;
                        border-radius: 3px;
                        font-family: var(--vscode-editor-font-family, monospace);
                    }

                    pre {
                        background-color: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.2));
                        padding: 8px;
                        border-radius: 4px;
                        overflow-x: auto;
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

                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        padding: 8px 16px;
                        font-size: 1em;
                        cursor: pointer;
                    }

                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }

                    hr {
                        border: none;
                        border-top: 1px solid var(--vscode-editorWidget-border);
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <h2>Coverage Differences</h2>
                ${renderSideBySide('Missing Folders', diff.missing_folders, "#e06c75", 'Extra Folders', diff.extra_folders, "#e5c07b")}
                ${renderSideBySide('Missing Files', diff.missing_files, "#e06c75", 'Extra Files', diff.extra_files, "#e5c07b")}
                ${renderTestDetails('Missing Tests', diff.missing_tests, "#e06c75")}
                ${renderTestDetails('Extra Tests', diff.extra_tests, "#e5c07b")}
                ${renderModifiedTests(diff.modified_tests)}
                <hr>
                <script>
                </script>
            </body>
            </html>
        `;
    }
}