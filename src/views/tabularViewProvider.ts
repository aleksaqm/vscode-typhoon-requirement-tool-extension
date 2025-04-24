import * as vscode from 'vscode';
import { TreeNode } from '../models/treeNode';
import { RequirementTreeProvider } from './requirementTreeViewProvider';

export class TabularViewProvider {
    private static panel: vscode.WebviewPanel | null = null;
    private static requirementDataProvider: RequirementTreeProvider | null = null;
    private static expandedNodeIds: Set<string> = new Set();

    static show(requirementDataProvider: RequirementTreeProvider): void {
        this.requirementDataProvider = requirementDataProvider;
        if (TabularViewProvider.panel) {
            TabularViewProvider.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        TabularViewProvider.panel = vscode.window.createWebviewPanel(
            'tabularView',
            'Requirements Tabular View',
            vscode.ViewColumn.One,
            { 
                enableScripts: true,
                retainContextWhenHidden: true,
                enableCommandUris: true,     
                localResourceRoots: [],
            }
        );

        const updateTabularView = () => {
            const expandedNodeIds = Array.from(TabularViewProvider.expandedNodeIds);
            const rootRequirements = this.requirementDataProvider?.getRootNodes() || [];
            const serializedRequirements = TabularViewProvider.serializeTree(rootRequirements);

            TabularViewProvider.panel!.webview.html = TabularViewProvider.getHtml(serializedRequirements, expandedNodeIds);
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

        TabularViewProvider.panel.webview.onDidReceiveMessage((message) => {
            if (message.command === 'updateNode') {
                this.updateNode(message.data.id, message.data.field, message.data.value);
            }else if (message.command === 'deleteRow') {
                this.deleteNode(message.data.id);
            }
        });
    }

    private static updateNode(id: string, field: string, value: string): void {
        const node = this.requirementDataProvider 
            ? this.findNodeById(this.requirementDataProvider.getAllNodes(), id) 
            : null;
    
        if (node) {
            if (['steps', 'prerequisites', 'testData', 'expectedResults'].includes(field)) {
                (node as any)[field] = value ? value.split(',').map(item => item.trim()) : [];
            } else if (field === 'parameters') {
                try {
                    (node as any)[field] = value ? JSON.parse(value) : [];
                } catch (error) {
                    console.error(`Failed to parse parameters JSON: ${error}`);
                    vscode.window.showErrorMessage('Invalid JSON format for parameters.');
                    return;
                }
            } else {
                (node as any)[field] = value;
            }
    
            this.requirementDataProvider?.refresh();
        }
    }

    private static findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
        for (const node of nodes) {
            if (node.id === id) {
                return node;
            }
            if (node.children) {
                const found = this.findNodeById(node.children, id);
                if (found) {
                    return found;
                }
            }
        }
        return null;
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

    private static deleteNode(id: string): void {
        const deleteRecursively = (nodes: TreeNode[], nodeId: string): TreeNode[] => {
            return nodes.filter((node) => {
                if (node.id === nodeId) {
                    return false; // Remove the node
                }
                if (node.children) {
                    node.children = deleteRecursively(node.children, nodeId); // Recurse for children
                }
                return true;
            });
        };
    
        if (this.requirementDataProvider) {
            const allNodes = this.requirementDataProvider.getAllNodes();
            const updatedNodes = deleteRecursively(allNodes, id);
            this.requirementDataProvider.updateTree(updatedNodes);
            this.requirementDataProvider.refresh();
        }
    }

    private static getHtml(requirements: TreeNode[], expandedNodeIds: string[] = []): string {
        const treeJson = JSON.stringify(requirements);
        const expandedIdsJson = JSON.stringify(expandedNodeIds);
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
                    th {
                        padding: 10px;
                        blurr: 1px solid #ccc;
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
                    .expandable-input {
                        width: 100%; 
                        box-sizing: border-box;
                        padding: 5px;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <h1>Requirements Tabular View</h1>
                <div class="button-container">
                    <button id="addRequirement">Add Requirement</button>
                    <button id="addTest">Add Test</button>
                    <button id="addTestCase">Add Test Case</button>
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
                    const vscode = acquireVsCodeApi();

                    function renderRow(node, parentId = null) {
                        const hasChildren = node.children && node.children.length > 0;
                        return \`
                            <tr data-id="\${node.id}" data-parent-id="\${parentId}" class="\${parentId ? 'hidden' : ''}">
                                <td>
                                    \${hasChildren ? '<span class="expandable" data-loaded="false">[+]</span>' : ''}
                                    <span class="name-text">\${node.label}</span>
                                </td>
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
                    updateButtonStates();
    
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
                            updateButtonStates();
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

                    document.getElementById('deleteRow').addEventListener('click', () => {
                        if (selectedRow) {
                            const rowId = selectedRow.getAttribute('data-id');
                            const confirmation = confirm('Are you sure you want to delete this row and its descendants?');
                            if (confirmation) {
                                vscode.postMessage({
                                    command: 'deleteRow',
                                    data: { id: rowId },
                                });
                            }
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

                    function updateButtonStates() {
                        const addRequirementButton = document.getElementById('addRequirement');
                        const addTestButton = document.getElementById('addTest');
                        const addTestCaseButton = document.getElementById('addTestCase');
                        const deleteRowButton = document.getElementById('deleteRow');
                        const editRowButton = document.getElementById('editRow');

                        if (!selectedRow) {
                            addRequirementButton.disabled = true;
                            addTestButton.disabled = true;
                            addTestCaseButton.disabled = true;
                            deleteRowButton.disabled = true;
                            editRowButton.disabled = true;
                            return;
                        }

                        const rowType = selectedRow.children[2].textContent.trim().toLowerCase(); 
                        // Enable/disable buttons based on the selected row type
                        console.log(rowType);
                        if (rowType === 'requirement') {
                            addRequirementButton.disabled = false;
                            addTestButton.disabled = false;
                            addTestCaseButton.disabled = true;
                            deleteRowButton.disabled = false;
                            editRowButton.disabled = false;
                        } else if (rowType === 'test') {
                            addRequirementButton.disabled = true;
                            addTestButton.disabled = true;
                            addTestCaseButton.disabled = false;
                            deleteRowButton.disabled = false;
                            editRowButton.disabled = false;
                        } else if (rowType === 'testcase') {
                            addRequirementButton.disabled = true;
                            addTestButton.disabled = true;
                            addTestCaseButton.disabled = true;
                            deleteRowButton.disabled = false;
                            editRowButton.disabled = false;
                        }
                    }

                    function canUpdate(rowType, field) {
                        if (field === 'type') {
                            return false; // Prevent editing the type field
                        }
                        if (field === 'label' || field === 'description') {
                            return true; // Allow editing name and description for all row types
                        }
                        if (rowType === 'requirement') {
                            return field === 'priority' || field === 'status';
                        } else if (rowType === 'test') {
                            return false; // Tests are not editable
                        } else if (rowType === 'testcase') {
                            return field === 'steps' || field === 'prerequisites' || field === 'testData' || field === 'expectedResults' || field === 'parameters';
                        }
                        return false; // Default to not editable
                    }

                    document.addEventListener('dblclick', (event) => {
                        const cell = event.target.closest('td');
                        if (!cell) return;

                        const row = cell.closest('tr');
                        const rowId = row.getAttribute('data-id');
                        const columnIndex = Array.from(cell.parentNode.children).indexOf(cell);
                        const rowType = row.children[2].textContent.trim().toLowerCase();

                        // Define editable columns (e.g., Priority, Status, etc.)
                        const editableColumns = {
                            0: 'label', // Name column
                            1: 'description', // Description column
                            3: 'priority', // Priority column
                            4: 'status', // Status column
                            5: 'steps', // Steps column
                            6: 'prerequisites', // Prerequisites column
                            7: 'testData', // Test Data column
                            8: 'expectedResults', // Expected Results column
                            9: 'parameters', // Parameters column
                        };

                        if (!(columnIndex in editableColumns)) return;

                        const field = editableColumns[columnIndex];
                        const currentValue = cell.querySelector('.name-text')?.textContent.trim() || cell.textContent.trim();

                        if (!canUpdate(row.children[2].textContent.trim().toLowerCase(), field)) {
                            return;
                        }

                        if (field === 'priority' || field === 'status') {
                            // Replace cell content with a dropdown
                            const dropdown = document.createElement('select');
                            const options = field === 'priority'
                                ? ['High', 'Medium', 'Low']
                                : ['Draft', 'Ready', 'Reviewed', 'Approved', 'Released'];

                            options.forEach(option => {
                                const optionElement = document.createElement('option');
                                optionElement.value = option;
                                optionElement.textContent = option;
                                if (option === currentValue) {
                                    optionElement.selected = true;
                                }
                                dropdown.appendChild(optionElement);
                            });

                            cell.textContent = ''; // Clear the cell
                            cell.appendChild(dropdown);
                            dropdown.focus();

                            dropdown.addEventListener('blur', () => saveEdit(rowId, field, dropdown.value, cell));
                            dropdown.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter') {
                                    saveEdit(rowId, field, dropdown.value, cell);
                                }
                            });
                        } else {
                            // Replace cell content with an input field for text fields
                            const input = document.createElement('input');
                            input.type = 'text';
                            input.value = currentValue;
                            input.className = 'expandable-input';

                            cell.textContent = ''; // Clear the cell
                            cell.appendChild(input);
                            input.focus();

                            input.addEventListener('blur', () => saveEdit(rowId, field, input.value, cell));
                            input.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter') {
                                    saveEdit(rowId, field, input.value, cell);
                                }
                            });
                        }
                    });

                    function saveEdit(rowId, field, newValue, cell) {
                        if (field === 'priority' && !['High', 'Medium', 'Low'].includes(newValue)) {
                            alert('Invalid priority value!');
                            return;
                        }
                        if (field === 'status' && !['Draft', 'Ready', 'Reviewed', 'Approved', 'Released'].includes(newValue)) {
                            alert('Invalid status value!');
                            return;
                        }

                        const node = findNodeById(tree, rowId);
                        if (!node) {
                            return;
                        }

                        if (['steps', 'prerequisites', 'testData', 'expectedResults', 'parameters'].includes(field)) {
                            node[field] = newValue ? newValue.split(',').map(item => item.trim()) : [];
                        } else {
                            node[field] = newValue;
                        }

                        if (field === 'label') {
                            const nameText = cell.querySelector('.name-text');
                            if (nameText) {
                                nameText.textContent = newValue;
                            }
                        }
                        else if (['steps', 'prerequisites', 'testData', 'expectedResults', 'parameters'].includes(field)) {
                            // Update the cell content with the joined array
                            cell.textContent = Array.isArray(node[field]) ? node[field].join(', ') : '';
                        }
                        else {
                            cell.textContent = newValue;
                        }

                        vscode.postMessage({
                            command: 'updateNode',
                            data: {
                                id: rowId,
                                field: field,
                                value: newValue,
                            },
                        });
                    }
                    const expandedNodeIds = ${expandedIdsJson};
                    expandedNodeIds.forEach(id => {
                        const expander = document.querySelector(\`tr[data-id="\${id}"] .expandable\`);
                        if (expander && expander.textContent === '[+]') {
                            expander.click(); // Trigger expansion
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}