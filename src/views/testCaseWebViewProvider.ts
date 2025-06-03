import * as vscode from 'vscode';
import { TestCase } from '../models/testCase';
import {getUniqueId} from '../utils/idGenerator';

export class TestCaseWebviewProvider {
    static show(node: TestCase | undefined, onSubmit: (testCase: any) => void): void {
        const panel = vscode.window.createWebviewPanel(
            'addTestCase',
            'Add Test Case',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = TestCaseWebviewProvider.getHtml(node);

        panel.webview.onDidReceiveMessage((message) => {
            if (message.command === 'submit') {
                const { name, scenario, steps, prerequisites, parameters } = message.data;
                console.log(message.data);
                if (name && scenario && steps && prerequisites && parameters) {
                    if (node) {
                        console.log("kumaraa");
                        const id = node.id!;
                        onSubmit(new TestCase(id, name, scenario, steps, prerequisites, parameters));
                        panel.dispose();
                        return;
                    }
                    const newTestCase = new TestCase(getUniqueId(), name, scenario, steps, prerequisites, parameters);
                    onSubmit(newTestCase);
                    panel.dispose();
                } else {
                    vscode.window.showErrorMessage('Please fill in all fields.');
                }
            }else if (message.command === 'error') {
                vscode.window.showErrorMessage(message.message);
            }
        });
    }

    private static getHtml(node: TestCase | undefined): string {
        const name = node ? node.name : '';
        const scenario = node ? node.scenario : '';
        const steps = node ? node.steps : [];
        const prerequisites = node ? node.prerequisites : [];
        const parameters = node ? node.parameters : [];
    
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${node ? 'Edit Test Case' : 'Add Test Case'}</title>
                <script type="module" src="https://unpkg.com/@vscode/webview-ui-toolkit@latest/dist/toolkit.js"></script>
                <style>
                    body {
                        font-family: Arial;
                        padding: 20px;
                    }
                    label {
                        display: block;
                        margin-top: 10px;
                    }
                    vscode-text-field, vscode-text-area, vscode-dropdown {
                        width: 50%;
                        padding: 8px;
                        margin-top: 5px;
                        margin-bottom: 15px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                    }
                    ul {
                        list-style-type: none;
                        padding: 0;
                    }
                    li {
                        width: 50%;
                        margin-bottom: 5px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .remove-button {
                        --button-background: #d32f2f; /* VS Code error red */
                        --button-background-hover: #b71c1c;
                        --button-foreground: var(--vscode-button-foreground, #fff);
                        background-color: var(--button-background) !important;
                        color: var(--button-foreground) !important;
                        border: none;
                        cursor: pointer;
                    }
                    .remove-button:hover {
                        background-color: var(--button-background-hover) !important;
                    }
                </style>
            </head>
            <body>
                <h2>${node ? 'Edit Test Case' : 'Add Test Case'}</h2>
                <form id="testCaseForm">
                    <label for="name">Test Case Name:</label>
                    <vscode-text-field id="name" name="name" value="${name}" placeholder="Enter test case name" required></vscode-text-field>
    
                    <label for="scenario">Scenario:</label>
                    <vscode-text-area id="scenario" name="scenario" value="${scenario}" placeholder="Enter test case scenario" rows="3" required></vscode-text-area>
    
                    ${this.getDynamicListHtml('steps', 'Steps', steps)}
                    ${this.getDynamicListHtml('prerequisites', 'Prerequisites', prerequisites)}
                    <br>
                    <label for="parameters">Parameters:</label>
                    <div id="parametersSection">
                        <vscode-text-field id="parameterName" placeholder="Parameter Name"></vscode-text-field>
                        <vscode-dropdown id="parameterType">
                            <vscode-option value="string">String</vscode-option>
                            <vscode-option value="int">Integer</vscode-option>
                            <vscode-option value="float">Float</vscode-option>
                            <vscode-option value="boolean">Boolean</vscode-option>
                            <vscode-option value="array">Array</vscode-option>
                        </vscode-dropdown>
                        <vscode-text-field id="parameterValue" placeholder="Parameter Value"></vscode-text-field>
                        <vscode-button id="addParameterButton">Add Parameter</vscode-button>
                        <ul id="parametersList">
                            ${parameters
                                .map(
                                    (param, index) => `
                                    <li>
                                        ${param.name} -> ${param.value} : ${param.type}
                                        <button id="removeParamButton" class="remove-button">Remove</button>
                                    </li>
                                `
                                )
                                .join('')}
                        </ul>
                    </div>
                    <vscode-button id="submitButton" type="button" appearance="primary">
                        ${node ? 'Save Changes' : 'Submit'}
                    </vscode-button>
                </form>
    
                <script>
                    const vscode = acquireVsCodeApi();
                    const lists = {
                        steps: ${JSON.stringify(steps)},
                        prerequisites: ${JSON.stringify(prerequisites)},
                    };
    
                    function addItem(listName) {
                        const input = document.getElementById(\`\${listName}Input\`);
                        const value = input.value.trim();
                        console.log(value);
                        if (value) {
                            lists[listName].push(value);
                            updateList(listName);
                            input.value = '';
                        }
                    }
    
                    function removeItem(listName, index) {
                        lists[listName].splice(index, 1);
                        updateList(listName);
                    }
    
                    function updateList(listName) {
                        const listElement = document.getElementById(\`\${listName}List\`);
                        listElement.innerHTML = '';
                        lists[listName].forEach((item, index) => {
                            const li = document.createElement('li');
                            li.textContent = item;
                            const removeButton = document.createElement('button');
                            removeButton.textContent = 'Remove';
                            removeButton.className = 'remove-button';
                            removeButton.addEventListener('click', () => removeItem(listName, index));
                            li.appendChild(removeButton);
                            listElement.appendChild(li);
                        });
                    }
    
                    // Initialize lists with existing values
                    Object.keys(lists).forEach(updateList);

                    const parameters = ${node ? JSON.stringify(parameters) : '[]'};

                    ['steps', 'prerequisites'].forEach(listName => {
                        document.getElementById(\`add\${listName}Button\`)
                            .addEventListener('click', () => addItem(listName));
                    });

                    document.getElementById('testCaseForm').addEventListener('submit', (e) => {
                        e.preventDefault();
                    });

                    document.getElementById('addParameterButton').addEventListener('click', () => {
                        const name = document.getElementById('parameterName').value.trim();
                        const type = document.getElementById('parameterType').value;
                        var value = document.getElementById('parameterValue').value.trim();

                        if (name && type && value) {
                            const isValidName = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
                            if (!isValidName) {
                                vscode.postMessage({
                                    command: 'error',
                                    message: 'Invalid parameter name. A parameter name must start with a letter or underscore and can only contain letters, numbers, and underscores.'
                                });
                                return;
                            }
                            if (!isValidType(type, value)) {
                                vscode.postMessage({
                                    command: 'error',
                                    message: 'Invalid value for the selected type.'
                                });
                                return;
                            }
                            if (type === 'boolean'){
                                value = value.toLowerCase();
                                console.log(value);
                            }
                            const existingParam = parameters.find(param => param.name === name);
                            if (existingParam) {
                                if (type !== existingParam.type) {
                                    vscode.postMessage({
                                        command: 'error',
                                        message: 'Type mismatch for the parameter. Please ensure the type is consistent.'
                                    });
                                    return;
                                }
                                if (!Array.isArray(existingParam.value)) {
                                    existingParam.value = [existingParam.value]; // Convert the value to an array if it's not already
                                }
                                existingParam.value.push(value);
                            }else{
                                parameters.push({ name, type, value: [value] });
                            }
                            
                            updateParametersList();
                            document.getElementById('parameterName').value = '';
                            document.getElementById('parameterValue').value = '';
                        }else{
                            vscode.postMessage({
                                command: 'error',
                                message: 'Please fill in all parameter fields.'
                            });
                        }
                    });

                    function removeParameter(index) {
                        console.log("AAAAAAAAAAAAAAAAAAAAAA");
                        parameters.splice(index, 1);
                        updateParametersList();
                    }

                    function updateParametersList() {
                        const parametersList = document.getElementById('parametersList');
                        parametersList.innerHTML = '';
                        parameters.forEach((param, index) => {
                            const li = document.createElement('li');
                            li.innerHTML = \`\${param.name} : \${param.type} --> \${param.value} <button class="remove-button" data-index="\${index}">Remove</button>\`;
                            parametersList.appendChild(li);
                        });
                        parametersList.querySelectorAll('.remove-button').forEach(btn => {
                            btn.addEventListener('click', (e) => {
                                const idx = parseInt(btn.getAttribute('data-index'));
                                removeParameter(idx);
                            });
                        });
                    }

    
                    document.getElementById('submitButton').addEventListener('click', () => {
                        console.log("AAAAAAAAAAAAAAAAAAAA");
                        const name = document.getElementById('name').value;
                        const scenario = document.getElementById('scenario').value;
                        console.log(name);
                        console.log(scenario);
                        console.log(lists.steps);
                        console.log(lists.prerequisites);
                        console.log(parameters);

                        vscode.postMessage({
                            command: 'submit',
                            data: {
                                name,
                                scenario,
                                steps: lists.steps,
                                prerequisites: lists.prerequisites,
                                parameters,
                            }
                        });
                    });

                    function isValidType(type, value) {
                        switch (type) {
                            case 'int':
                                return Number.isInteger(Number(value)); // Checks if the value is an integer
                            case 'float':
                                return !isNaN(value) && Number(value) === parseFloat(value); // Checks if the value is a float
                            case 'boolean':
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

                    document.addEventListener('DOMContentLoaded', () => {
                        updateParametersList();
                    });

                    window.addEventListener('DOMContentLoaded', () => {
                        const submitButton = document.getElementById('submitButton');
                        console.log(submitButton);
                        if (submitButton) {
                            submitButton.addEventListener('click', () => {
                            console.log("AAAAAAAAAAAAAAAAAAAA");
                            });
                        } else {
                            console.error("Submit button not found in DOM");
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }

    private static getDynamicListHtml(listName: string, label: string, items: string[]): string {
        const listItems = items
            .map(
                (item, index) => `
                <li>
                    ${item}
                    <button class="remove-button" data-index="${index}" data-list="${listName}">Remove</button>
                </li>
            `
            )
            .join('');

        return `
            <label for="${listName}">${label}:</label>
            <vscode-text-field id="${listName}Input" placeholder="Enter ${label.toLowerCase()}" ></vscode-text-field>
            <vscode-button id="add${listName}Button">Add ${label}</vscode-button>
            <ul id="${listName}List">${listItems}</ul>
        `;
    }


    
}