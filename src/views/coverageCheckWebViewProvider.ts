import * as vscode from 'vscode';
import { RequirementTreeProvider } from './requirementTreeViewProvider';

export class CoverageCheckWebviewProvider {
    private static requirementDataProvider: RequirementTreeProvider;
    static show(diff: any, requirementDataProvider: any) {
        const panel = vscode.window.createWebviewPanel(
            'coverageDiff',
            'Coverage Differences',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        CoverageCheckWebviewProvider.requirementDataProvider = requirementDataProvider;
        panel.webview.html = CoverageCheckWebviewProvider.getHtml(diff);
    }

    static getHtml(diff: any): string {
        function renderSideBySide(title: string, missing: string[] = [], extra: string[] = [], colorMissing = "#e06c75", colorExtra = "#e5c07b") {
            const maxLen = Math.max(missing.length, extra.length, 1);
            return `
                <div class="side-by-side-section">
                    <h3>${title}</h3>
                    <div class="side-by-side-table">
                        <div class="side-by-side-header" style="color:${colorMissing};">Missing</div>
                        <div class="side-by-side-header" style="color:${colorExtra};">Extra</div>
                        ${Array.from({ length: maxLen }).map((_, i) => `
                            <div class="side-by-side-cell">${missing[i] ? `<code>${missing[i]}</code>` : '<span class="muted">None</span>'}</div>
                            <div class="side-by-side-cell">${extra[i] ? `<code>${extra[i]}</code>` : '<span class="muted">None</span>'}</div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function renderTestSideBySide(title: string, missingObj: Record<string, any>, extraObj: Record<string, any>, colorMissing = "#e06c75", colorExtra = "#e5c07b") {
            const missingFiles = Object.keys(missingObj || {}).filter(
                file => missingObj[file] && Object.keys(missingObj[file]).length > 0
            );
            const extraFiles = Object.keys(extraObj || {}).filter(
                file => extraObj[file] && Object.keys(extraObj[file]).length > 0
            );
            const maxLen = Math.max(missingFiles.length, extraFiles.length, 1);
            return `
                <div class="side-by-side-section">
                    <h3>${title}</h3>
                    <div class="side-by-side-table">
                        <div class="side-by-side-header" style="color:${colorMissing};">Missing</div>
                        <div class="side-by-side-header" style="color:${colorExtra};">Extra</div>
                        ${Array.from({ length: maxLen }).map((_, i) => `
                            <div class="side-by-side-cell">
                                ${missingFiles[i] ? `<code>${missingFiles[i]}</code>${renderTestNames(missingObj[missingFiles[i]])}` : '<span class="muted">None</span>'}
                            </div>
                            <div class="side-by-side-cell">
                                ${extraFiles[i] ? `<code>${extraFiles[i]}</code>${renderTestNames(extraObj[extraFiles[i]])}` : '<span class="muted">None</span>'}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function renderTestNames(tests: any) {
            if (!tests || Object.keys(tests).length === 0) {return '';};
            return `<ul>${Object.keys(tests).map(name => `<li>${name}</li>`).join('')}</ul>`;
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
                                    ${Object.entries(tests).map(([id, changes]) => `
                                        <li>
                                            <b>${CoverageCheckWebviewProvider.requirementDataProvider.getNodeById(id)?.label}</b>
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

        function renderSkippedTests(skipped: string[] = []) {
            if (!skipped.length) {return '';}
            return `
                <div class="section">
                    <h3 style="color:#56b6c2;">Not Implemented Tests</h3>
                    <ul>
                        ${skipped.map(test => `<li><code>${CoverageCheckWebviewProvider.requirementDataProvider.getNodeById(test)?.label}</code></li>`).join('')}
                    </ul>
                </div>
            `;
        }


        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <style>
                    body {
                        font-family: var(--vscode-font-family, sans-serif);
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 16px;
                    }
                    h2 { color: var(--vscode-editor-foreground); }
                    .side-by-side-section { margin-bottom: 24px; }
                    .side-by-side-table {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 0;
                        border: 1px solid var(--vscode-editorWidget-border, #ccc);
                        border-radius: 4px;
                        overflow: hidden;
                    }
                    .side-by-side-header {
                        background: var(--vscode-editorWidget-background, #222);
                        font-weight: bold;
                        padding: 8px;
                        border-bottom: 1px solid var(--vscode-editorWidget-border, #ccc);
                    }
                    .side-by-side-cell {
                        padding: 8px;
                        border-bottom: 1px solid var(--vscode-editorWidget-border, #ccc);
                        border-right: 1px solid var(--vscode-editorWidget-border, #ccc);
                    }
                    .side-by-side-cell:nth-child(2n) {
                        border-right: none;
                    }
                    .side-by-side-table > :last-child,
                    .side-by-side-table > :nth-last-child(2) {
                        border-bottom: none;
                    }
                    .muted { color: #888; }
                    code {
                        background-color: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.2));
                        padding: 2px 4px;
                        border-radius: 3px;
                        font-family: var(--vscode-editor-font-family, monospace);
                    }
                    ul { margin: 0; padding-left: 20px; }
                    li { margin-bottom: 2px; }
                    hr {
                        border: none;
                        border-top: 1px solid var(--vscode-editorWidget-border);
                        margin: 20px 0;
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
                </style>
            </head>
            <body>
                <h2>Coverage Differences</h2>
                ${renderSideBySide('Requirements', diff.missing_folders, diff.extra_folders)}
                ${renderSideBySide('Tests', diff.missing_files, diff.extra_files)}
                ${renderTestSideBySide('Test Cases', diff.missing_tests, diff.extra_tests)}
                ${renderModifiedTests(diff.modified_tests)}
                ${renderSkippedTests(diff.skipped_tests)}
                <hr>
            </body>
            </html>
        `;
    }
}