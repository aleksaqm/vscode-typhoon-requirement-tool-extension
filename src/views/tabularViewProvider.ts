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
                    .selected {
                        background-color:rgb(142, 143, 144);
                    }
                    .button-container {
                        margin-bottom: 10px;
                    }
                    .button-container button {
                        margin-right: 5px;
                        padding: 5px 10px;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <h1>Requirements Tabular View</h1>
                <div class="button-container">
                    <button id="addRequirement">Add Requirement</button>
                    <button id="addTest">Add Test</button>
                    <button id="deleteRow">Delete Row</button>
                    <button id="editRow">Edit Row</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Type</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Steps</th>
                            <th>Prerequisites</th>
                            <th>Test Data</th>
                            <th>Expected Results</th>
                            <th>Parameters</th>
                        </tr>
                    </thead>
                    <tbody id="requirementsTable">
                        <!-- Root rows will be dynamically generated -->
                    </tbody>
                </table>
                <script>
                    const tree = ${treeJson};
                    let selectedRow = null;
    
                    function renderRow(node, parentId = null) {
                        const hasChildren = node.children && node.children.length > 0;
                        return \`
                            <tr data-id="\${node.id}" data-parent-id="\${parentId}" class="\${parentId ? 'hidden' : ''}">
                                <td>\${hasChildren ? '<span class="expandable" data-loaded="false">[+]</span>' : ''} \${node.label}</td>
                                <td>\${node.description || ''}</td>
                                <td>\${node.contextValue || ''}</td>
                                <td>\${node.priority || ''}</td>
                                <td>\${node.status || ''}</td>
                                <td>\${node.steps || ''}</td>
                                <td>\${node.prerequisites || ''}</td>
                                <td>\${node.testData || ''}</td>
                                <td>\${node.expectedResults || ''}</td>
                                <td>\${node.parameters ? JSON.stringify(node.parameters) : ''}</td>
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
                        } else if (event.target.closest('tr')) {
                            // Handle row selection
                            const row = event.target.closest('tr');
                            if (row.parentElement.tagName === 'THEAD') {
                                return;
                            }
                            if (selectedRow === row) {
                                // If the clicked row is already selected, unselect it
                                selectedRow.classList.remove('selected');
                                selectedRow = null;
                            } else {
                                // Select the clicked row
                                if (selectedRow) {
                                    selectedRow.classList.remove('selected');
                                }
                                selectedRow = row;
                                selectedRow.classList.add('selected');
                            }
                        }
                    });
    
                    document.getElementById('addRequirement').addEventListener('click', () => {
                        if (selectedRow) {
                            const parentId = selectedRow.getAttribute('data-id');
                            alert('Add Requirement under parent ID: ' + parentId);
                            // Add logic to add a requirement
                        } else {
                            alert('No row selected!');
                        }
                    });
    
                    document.getElementById('addTest').addEventListener('click', () => {
                        if (selectedRow) {
                            const parentId = selectedRow.getAttribute('data-id');
                            alert('Add Test under parent ID: ' + parentId);
                            // Add logic to add a test
                        } else {
                            alert('No row selected!');
                        }
                    });
    
                    document.getElementById('deleteRow').addEventListener('click', () => {
                        if (selectedRow) {
                            const rowId = selectedRow.getAttribute('data-id');
                            alert('Delete row with ID: ' + rowId);
                            // Add logic to delete the row
                        } else {
                            alert('No row selected!');
                        }
                    });
    
                    document.getElementById('editRow').addEventListener('click', () => {
                        if (selectedRow) {
                            const rowId = selectedRow.getAttribute('data-id');
                            alert('Edit row with ID: ' + rowId);
                            // Add logic to edit the row
                        } else {
                            alert('No row selected!');
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