import * as vscode from 'vscode';
import { TreeNode } from '../models/treeNode';

export class TabularViewProvider {
    private static panel: vscode.WebviewPanel | null = null;

    static show(requirementDataProvider: any): void {
        if (TabularViewProvider.panel) {
            TabularViewProvider.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        TabularViewProvider.panel = vscode.window.createWebviewPanel(
            'tabularView',
            'Requirements Tabular View',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        const updateTabularView = () => {
            const rootRequirements = requirementDataProvider.getRootNodes();
            const serializedRequirements = TabularViewProvider.serializeTree(rootRequirements);
            TabularViewProvider.panel!.webview.html = TabularViewProvider.getHtml(serializedRequirements);
        };

        updateTabularView();

        const treeUpdateListener = requirementDataProvider.onDidChangeTreeData(() => {
            if (TabularViewProvider.panel) {
                updateTabularView();
            }
        });

        TabularViewProvider.panel.onDidDispose(() => {
            TabularViewProvider.panel = null;
            treeUpdateListener.dispose();
        });
    }

    private static serializeTree(nodes: TreeNode[]): any[] {
        return nodes.map(node => {
            const { parent, ...rest } = node;
            return {
                ...rest,
                children: node.children ? TabularViewProvider.serializeTree(node.children) : [],
            };
        });
    }

    private static getHtml(requirements: TreeNode[]): string {
        const treeJson = JSON.stringify(requirements);

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Requirements Tabular View</title>
                <style>
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        border: 1px solid #ccc;
                        padding: 8px;
                        text-align: left;
                    }
                    .expandable {
                        cursor: pointer;
                    }
                    .hidden {
                        display: none;
                    }
                </style>
            </head>
            <body>
                <h1>Requirements Tabular View</h1>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Priority</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="requirementsTable">
                        <!-- Root rows will be dynamically generated -->
                    </tbody>
                </table>
                <script>
                    const tree = ${treeJson};

                    function renderRow(node, parentId = null) {
                        const hasChildren = node.children && node.children.length > 0;
                        return \`
                            <tr data-id="\${node.id}" data-parent-id="\${parentId}" class="\${parentId ? 'hidden' : ''}">
                                <td>\${hasChildren ? '<span class="expandable" data-loaded="false">[+]</span>' : ''} \${node.id}</td>
                                <td>\${node.label}</td>
                                <td>\${node.description || ''}</td>
                                <td>\${node.priority || ''}</td>
                                <td>\${node.status || ''}</td>
                            </tr>
                        \`;
                    }

                    function renderRows(nodes, parentId = null) {
                        return nodes.map(node => renderRow(node, parentId)).join('');
                    }

                    function loadChildren(nodeId, children) {
                        const parentRow = document.querySelector(\`tr[data-id="\${nodeId}"]\`);
                        const childRowsHtml = renderRows(children, nodeId);
                        parentRow.insertAdjacentHTML('afterend', childRowsHtml);
                    }

                    document.getElementById('requirementsTable').innerHTML = renderRows(tree);

                    document.addEventListener('click', (event) => {
                        if (event.target.classList.contains('expandable')) {
                            const expander = event.target;
                            const row = expander.closest('tr');
                            const id = row.getAttribute('data-id');
                            const isExpanded = expander.textContent === '[-]';
                            const alreadyLoaded = expander.getAttribute('data-loaded') === 'true';

                            if (isExpanded) {
                                expander.textContent = '[+]';
                                collapseDescendants(id);
                            } else {
                                if (!alreadyLoaded) {
                                    const node = findNodeById(tree, id);
                                    if (node && node.children.length > 0) {
                                        loadChildren(id, node.children);
                                        expander.setAttribute('data-loaded', 'true');
                                    }
                                }
                                document.querySelectorAll(\`tr[data-parent-id="\${id}"]\`).forEach(childRow => {
                                    childRow.classList.remove('hidden');
                                });
                                expander.textContent = '[-]';
                            }
                        }
                    });

                    function collapseDescendants(parentId) {
                        document.querySelectorAll(\`tr[data-parent-id="\${parentId}"]\`).forEach(childRow => {
                            const childId = childRow.getAttribute('data-id');
                            const expander = childRow.querySelector('.expandable');
                            if (expander) {
                                expander.textContent = '[+]';
                                expander.setAttribute('data-loaded', 'false');
                            }
                            childRow.classList.add('hidden');
                            collapseDescendants(childId);
                        });
                    }

                    function findNodeById(nodes, id) {
                        for (const node of nodes) {
                            if (node.id === id) {
                                return node;
                            }
                            if (node.children) {
                                const found = findNodeById(node.children, id);
                                if (found) {
                                    return found;
                                }
                            }
                        }
                        return null;
                    }
                </script>
            </body>
            </html>
        `;
    }
}