import * as vscode from 'vscode';
import { TreeNode } from '../models/treeNode';
import { RequirementTreeProvider } from './requirementTreeViewProvider';
import { getUniqueId } from '../utils/idGenerator';
import { Requirement } from '../models/requirement';
import { TestNode } from '../models/test';
import { TestCase } from '../models/testCase';

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
                this.deleteNode(message.data.id); //pazi
            }else if (message.command === 'addNode') {
                this.addNode(message.data);
            }else if (message.command === 'updateParameters'){
                console.log(message.data);
                this.updateParameters(message.data.id, message.data.parameters);
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

    private static async deleteNode(id: string): Promise<void> {
        const deleteRecursively = (nodes: TreeNode[], nodeId: string): TreeNode[] => {
            return nodes.filter((node) => {
                if (node.id === nodeId) {
                    return false;
                }
                if (node.children) {
                    node.children = deleteRecursively(node.children, nodeId); // Recurse for children
                }
                return true;
            });
        };
        if (this.requirementDataProvider) {
            const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: "Are you sure you want to delete this node?",
            });
            if (confirm === 'Yes') {
                const allNodes = this.requirementDataProvider.getAllNodes();
                const updatedNodes = deleteRecursively(allNodes, id);
                this.requirementDataProvider.updateTree(updatedNodes);
                this.requirementDataProvider.refresh();
            }
        }
    }

    private static addNode(newNode: any): void {
        var nodeToAdd : TreeNode;
        try{
            if (newNode.contextValue === 'requirement'){
                nodeToAdd = new Requirement(getUniqueId(), newNode.label, newNode.description, newNode.priority, newNode.status);
            }
            else if (newNode.contextValue === 'test'){
                nodeToAdd = new TestNode(getUniqueId(), newNode.label, newNode.description);
            }
            else if (newNode.contextValue === 'testcase'){
                nodeToAdd = new TestCase(getUniqueId(), newNode.label, newNode.description, newNode.steps, newNode.prerequisites, newNode.testData, newNode.expectedResults, newNode.parameters);
            }else{
                console.log("Invalid node type.");
                return;
            }
        }catch(e){
            vscode.window.showErrorMessage('Invalid data format for new node.');
            return;
        }
        const allNodes = this.requirementDataProvider?.getAllNodes() || [];
        if (newNode.parentId) {
            const parentNode = this.findNodeById(allNodes, newNode.parentId);
            if (parentNode) {
                parentNode.children = parentNode.children || [];
                parentNode.children.push(nodeToAdd);
            }
        } else {
            allNodes.push(nodeToAdd);
        }
    
        this.requirementDataProvider?.updateTree(allNodes);
        this.requirementDataProvider?.refresh();
    }

    private static updateParameters(id: string, parameters: string): void {
        const node = this.findNodeById(this.requirementDataProvider?.getAllNodes() || [], id);
        if (node instanceof TestCase) {
            node.parameters = JSON.parse(parameters);
            this.requirementDataProvider?.refresh();
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
                    #parametersModal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.5);
                        color: black;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                    }

                    .modal-content {
                        background-color: white;
                        padding: 20px;
                        border-radius: 5px;
                        text-align: center;
                        width: 90%; /* Adjust width to fit within the window */
                        max-width: 600px; /* Limit the maximum width */
                        overflow-x: auto; /* Add horizontal scrolling if needed */
                    }

                    #parametersTable {
                        width: 100%; /* Ensure the table takes up the full width of the modal */
                        border-collapse: collapse;
                    }

                    #parametersTable th, #parametersTable td {
                        border: 1px solid #ccc;
                        padding: 8px;
                        text-align: left;
                    }
                    .hidden {
                        display: none !important;
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
                <div id="parametersModal" class="hidden">
                    <div class="modal-content">
                        <h2>Manage Parameters</h2>
                        <table id="parametersTable">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Value</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Parameter rows will be dynamically added here -->
                            </tbody>
                        </table>
                        <button id="addParameter">Add Parameter</button>
                        <button id="saveParameters">Save</button>
                        <button id="cancelParameters">Cancel</button>
                    </div>
                </div>
                <script>
                    window.confirm = () => true
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
                                <td>
                                    \${node.contextValue === 'testCase' ? '<button class="manage-parameters">Manage</button>' : ''}
                                </td>
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
                        addNode('requirement');
                    });
    
                    document.getElementById('addTest').addEventListener('click', () => {
                        addNode('test');
                    });

                    document.getElementById('addTestCase').addEventListener('click', () => {
                        addNode('testcase');
                    });

                    document.getElementById('deleteRow').addEventListener('click', () => {
                        if (selectedRow) {
                            const rowId = selectedRow.getAttribute('data-id');
                            vscode.postMessage({
                                command: 'deleteRow',
                                data: { id: rowId },
                            });
                        } 
                    });

                    function addNode(type) {
                        const parentId = selectedRow ? selectedRow.getAttribute('data-id') : null;
                        const parentType = selectedRow ? selectedRow.children[2].textContent.trim().toLowerCase() : null;

                        if ((parentType === 'testcase' || ((type === 'requirement' || type==='test') && parentType !== 'requirement') || (type === 'testcase' && parentType !== 'test')) && parentType) {
                            alert('Invalid operation: Cannot add this type of node here.');
                            return;
                        }

                        // Create a new row with input fields
                        const newRow = document.createElement('tr');
                        newRow.innerHTML = \`
                                <td><input type="text" placeholder="Name" class="expandable-input"></td>
                                <td><input type="text" placeholder="Description" class="expandable-input"></td>
                                <td>\${type}</td>
                                <td>
                                    \${type === 'requirement' ? \`
                                        <select class="expandable-input">
                                            <option value="High">High</option>
                                            <option value="Medium">Medium</option>
                                            <option value="Low">Low</option>
                                        </select>\` : ''}
                                </td>
                                <td>
                                    \${type === 'requirement' ? \`
                                        <select class="expandable-input">
                                            <option value="Draft">Draft</option>
                                            <option value="Ready">Ready</option>
                                            <option value="Reviewed">Reviewed</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Released">Released</option>
                                        </select>\` : ''}
                                </td>
                                <td>\${type === 'testcase' ? '<input type="text" placeholder="Steps" class="expandable-input">' : ''}</td>
                                <td>\${type === 'testcase' ? '<input type="text" placeholder="Prerequisites" class="expandable-input">' : ''}</td>
                                <td>\${type === 'testcase' ? '<input type="text" placeholder="Test Data" class="expandable-input">' : ''}</td>
                                <td>\${type === 'testcase' ? '<input type="text" placeholder="Expected Results" class="expandable-input">' : ''}</td>
                                <td>\${type === 'testcase' ? '<input type="text" placeholder="Parameters" class="expandable-input">' : ''}</td>
                            \`;

                        const table = document.getElementById('requirementsTable');
                        if (selectedRow) {
                            selectedRow.insertAdjacentElement('afterend', newRow);
                        } else {
                            table.appendChild(newRow);
                        }

                        const saveButton = document.createElement('button');
                        saveButton.textContent = 'Save';
                        saveButton.addEventListener('click', () => saveNewNode(newRow, type, parentId));
                        newRow.appendChild(saveButton);
                    }

                    function saveNewNode(row, type, parentId) {
                        const inputs = row.querySelectorAll('input');
                        const selects = row.querySelectorAll('select');
                        const newNode = {
                            label: inputs[0].value.trim(),
                            description: inputs[1].value.trim(),
                            contextValue: type,
                            priority: type === 'requirement' ? selects[0]?.value : undefined, // Get value from the first dropdown
                            status: type === 'requirement' ? selects[1]?.value : undefined,
                            steps: type === 'testcase' ? inputs[2]?.value.trim().split(',').map(s => s.trim()) : [],
                            prerequisites: type === 'testcase' ? inputs[3]?.value.trim().split(',').map(s => s.trim()) : [],
                            testData: type === 'testcase' ? inputs[4]?.value.trim().split(',').map(s => s.trim()) : [],
                            expectedResults: type === 'testcase' ? inputs[5]?.value.trim().split(',').map(s => s.trim()) : [],
                            parameters: type === 'testcase' ? inputs[6]?.value.trim().split(',').map(s => s.trim()) : [],
                            children: [],
                            parentId: parentId,
                        };

                        if (!newNode.label) {
                            alert('Name is required.');
                            return;
                        }

                        // Send the new node to the backend
                        vscode.postMessage({
                            command: 'addNode',
                            data: newNode,
                        });

                        row.remove();
                    }
    
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

                        if (!selectedRow) {
                            addRequirementButton.disabled = false;
                            addTestButton.disabled = true;
                            addTestCaseButton.disabled = true;
                            deleteRowButton.disabled = true;
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
                        } else if (rowType === 'test') {
                            addRequirementButton.disabled = true;
                            addTestButton.disabled = true;
                            addTestCaseButton.disabled = false;
                            deleteRowButton.disabled = false;
                        } else if (rowType === 'testcase') {
                            addRequirementButton.disabled = true;
                            addTestButton.disabled = true;
                            addTestCaseButton.disabled = true;
                            deleteRowButton.disabled = false;
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
                            // 9: 'parameters', // Parameters column
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


                    document.addEventListener('click', (event) => {
                        if (event.target.classList.contains('manage-parameters')) {
                            const row = event.target.closest('tr');
                            const rowId = row.getAttribute('data-id');
                            const node = findNodeById(tree, rowId);

                            if (node && node.contextValue === 'testCase') {
                                openParametersModal(node.parameters || [], (updatedParameters) => {
                                    node.parameters = updatedParameters;

                                    // Send updated parameters to the backend
                                    vscode.postMessage({
                                        command: 'updateParameters',
                                        data: {
                                            id: rowId,
                                            parameters: JSON.stringify(updatedParameters),
                                        },
                                    });
                                });
                            }
                        }
                    });

                    function openParametersModal(parameters, onSave) {
                        const modal = document.getElementById('parametersModal');
                        const parametersTable = document.getElementById('parametersTable').querySelector('tbody');
                        parametersTable.innerHTML = '';

                        // Populate the table with existing parameters
                        parameters.forEach((param, index) => {
                            const row = document.createElement('tr');
                            row.innerHTML = \`
                                <td><input type="text" value="\${param.name}" class="parameter-name"></td>
                                <td>
                                    <select class="parameter-type">
                                        <option value="string" $\{param.type === 'string' ? 'selected' : ''}>String</option>
                                        <option value="int" $\{param.type === 'int' ? 'selected' : ''}>Integer</option>
                                        <option value="float" $\{param.type === 'float' ? 'selected' : ''}>Float</option>
                                        <option value="bool" \${param.type === 'bool' ? 'selected' : ''}>Boolean</option>
                                        <option value="array" \${param.type === 'array' ? 'selected' : ''}>Array</option>
                                    </select>
                                </td>
                                <td><input type="text" value="\${param.value}" class="parameter-value"></td>
                                <td><button class="delete-parameter" data-index="\${index}">Delete</button></td>
                            \`;
                            parametersTable.appendChild(row);
                        });

                        // Add event listener for adding a new parameter
                        document.getElementById('addParameter').onclick = () => {
                            const row = document.createElement('tr');
                            row.innerHTML = \`
                                <td><input type="text" class="parameter-name"></td>
                                <td>
                                    <select class="parameter-type">
                                        <option value="string">String</option>
                                        <option value="int">Integer</option>
                                        <option value="float">Float</option>
                                        <option value="bool">Boolean</option>
                                        <option value="array">Array</option>
                                    </select>
                                </td>
                                <td><input type="text" class="parameter-value"></td>
                                <td><button class="delete-parameter">Delete</button></td>
                            \`;
                            parametersTable.appendChild(row);
                        };

                        // Add event listener for deleting a parameter
                        parametersTable.addEventListener('click', (event) => {
                            if (event.target.classList.contains('delete-parameter')) {
                                const row = event.target.closest('tr');
                                row.remove();
                            }
                        });

                        // Add event listener for saving parameters
                        document.getElementById('saveParameters').onclick = () => {
                            const updatedParameters = Array.from(parametersTable.querySelectorAll('tr')).map((row) => ({
                                name: row.querySelector('.parameter-name').value.trim(),
                                type: row.querySelector('.parameter-type').value,
                                value: row.querySelector('.parameter-value').value.trim(),
                            }));
                            for (const param of updatedParameters) {
                                if (isValidType(param.type, param.value) === false) {
                                    return; //message
                                }
                            }
                            modal.classList.add('hidden'); // Hide the modal
                            onSave(updatedParameters);
                        };

                        // Add event listener for canceling
                        document.getElementById('cancelParameters').onclick = () => {
                            modal.classList.add('hidden'); // Hide the modal
                        };

                        modal.classList.remove('hidden'); // Show the modal
                    }

                    function isValidType(type, value) {
                        console.log(type, value);
                        switch (type) {
                            case 'int':
                                return Number.isInteger(Number(value)); // Checks if the value is an integer
                            case 'float':
                                return !isNaN(value) && Number(value) === parseFloat(value); // Checks if the value is a float
                            case 'bool':
                                return value.toLowerCase() === 'true' || value.toLowerCase() === 'false'; // Matches "true" or "false" (case-insensitive)
                            case 'string':
                                return typeof value === 'string'; // Always true for strings
                            case 'array':
                                try {
                                    const parsed = JSON.parse(value);
                                    return Array.isArray(parsed); // Checks if the value is a valid JSON array
                                } catch {
                                    return false;
                                }
                            default:
                                return false; // Invalid type
                        }
                    }
                </script>
            </body>
            </html>
        `;
    }
}