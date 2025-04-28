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
                const { name, scenario, steps, prerequisites, testData, expectedResults, parameters } = message.data;
                if (name && scenario && steps && prerequisites && expectedResults && parameters) {
                    if (node) {
                        const id = node.id!;
                        onSubmit(new TestCase(id, name, scenario, steps, prerequisites, testData, expectedResults, parameters));
                        panel.dispose();
                    }
                    const newTestCase = new TestCase(getUniqueId(), name, scenario, steps, prerequisites, testData, expectedResults, parameters);
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
        const testData = node ? node.testData : [];
        const expectedResults = node ? node.expectedResults : [];
        const parameters = node ? node.parameters : [];
    
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${node ? 'Edit Test Case' : 'Add Test Case'}</title>
                <style>
                    body {
                        font-family: Arial;
                        padding: 20px;
                    }
                    label {
                        display: block;
                        margin-top: 10px;
                    }
                    input, textarea, select {
                        width: 50%;
                        padding: 8px;
                        margin-top: 5px;
                        margin-bottom: 15px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                    }
                    button {
                        background-color: rgb(151, 70, 29);
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    button:hover {
                        background-color: rgb(153, 77, 0);
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
                        background-color: red;
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    .remove-button:hover {
                        background-color: darkred;
                    }
                    #submitButton {
                        background-color: rgb(153, 74, 0);
                    }
                </style>
            </head>
            <body>
                <h2>${node ? 'Edit Test Case' : 'Add Test Case'}</h2>
                <form id="testCaseForm">
                    <label for="name">Test Case Name:</label>
                    <input type="text" id="name" name="name" value="${name}" placeholder="Enter test case name" required />
    
                    <label for="scenario">Scenario:</label>
                    <textarea id="scenario" name="scenario" placeholder="Enter test case scenario" rows="3" required>${scenario}</textarea>
    
                    ${this.getDynamicListHtml('steps', 'Steps', steps)}
                    ${this.getDynamicListHtml('prerequisites', 'Prerequisites', prerequisites)}
                    ${this.getDynamicListHtml('testData', 'Test Data', testData)}
                    ${this.getDynamicListHtml('expectedResults', 'Expected Results', expectedResults)}
                    <br>
                    <label for="parameters">Parameters:</label>
                    <div id="parametersSection">
                        <input type="text" id="parameterName" placeholder="Parameter Name" />
                        <select id="parameterType">
                            <option value="string">String</option>
                            <option value="int">Integer</option>
                            <option value="float">Float</option>
                            <option value="bool">Boolean</option>
                            <option value="array">Array</option>
                        </select>
                        <input type="text" id="parameterValue" placeholder="Parameter Value" />
                        <button type="button" id="addParameterButton">Add Parameter</button>
                        <ul id="parametersList">
                            ${parameters
                                .map(
                                    (param, index) => `
                                    <li>
                                        ${param.name} -> ${param.value} : ${param.type}
                                        <button type="button" class="remove-button" onclick="removeParameter(${index})">Remove</button>
                                    </li>
                                `
                                )
                                .join('')}
                        </ul>
                    </div>
                    <button type="button" id="submitButton">${node ? 'Save Changes' : 'Submit'}</button>
                </form>
    
                <script>
                    const vscode = acquireVsCodeApi();
                    const lists = {
                        steps: ${JSON.stringify(steps)},
                        prerequisites: ${JSON.stringify(prerequisites)},
                        testData: ${JSON.stringify(testData)},
                        expectedResults: ${JSON.stringify(expectedResults)}
                    };
    
                    function addItem(listName) {
                        const input = document.getElementById(\`\${listName}Input\`);
                        const value = input.value.trim();
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

                    const parameters = ${JSON.stringify(parameters)};

                    document.getElementById('addParameterButton').addEventListener('click', () => {
                        const name = document.getElementById('parameterName').value.trim();
                        const type = document.getElementById('parameterType').value;
                        var value = document.getElementById('parameterValue').value.trim();

                        if (name && type && value) {
                            if (!isValidType(type, value)) {
                                vscode.postMessage({
                                    command: 'error',
                                    message: 'Invalid value for the selected type.'
                                });
                                return;
                            }
                            if (type === 'bool'){
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
                        parameters.splice(index, 1);
                        updateParametersList();
                    }

                    function updateParametersList() {
                        const parametersList = document.getElementById('parametersList');
                        parametersList.innerHTML = '';
                        parameters.forEach((param, index) => {
                            const li = document.createElement('li');
                            li.textContent = \`\${param.name} : \${param.type} --> \${param.value}\`;
                            const removeButton = document.createElement('button');
                            removeButton.textContent = 'Remove';
                            removeButton.className = 'remove-button';
                            removeButton.addEventListener('click', () => removeParameter(index));
                            li.appendChild(removeButton);
                            parametersList.appendChild(li);
                        });
                    }

                    
    
                    document.getElementById('submitButton').addEventListener('click', () => {
                        const name = document.getElementById('name').value;
                        const scenario = document.getElementById('scenario').value;
    
                        vscode.postMessage({
                            command: 'submit',
                            data: {
                                name,
                                scenario,
                                steps: lists.steps,
                                prerequisites: lists.prerequisites,
                                testData: lists.testData,
                                expectedResults: lists.expectedResults,
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

    private static getDynamicListHtml(listName: string, label: string, items: string[]): string {
        const listItems = items
            .map(
                (item, index) => `
                <li>
                    ${item}
                    <button type="button" class="remove-button" onclick="removeItem('${listName}', ${index})">Remove</button>
                </li>
            `
            )
            .join('');
    
        return `
            <label for="${listName}">${label}:</label>
            <input type="text" id="${listName}Input" placeholder="Enter ${label.toLowerCase()}" />
            <button type="button" onclick="addItem('${listName}')">Add ${label}</button>
            <ul id="${listName}List">${listItems}</ul>
        `;
    }


    
}