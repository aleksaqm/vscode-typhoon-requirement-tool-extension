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
                const { name, scenario, steps, prerequisites, testData, expectedResults } = message.data;
                if (name && scenario && steps && prerequisites && expectedResults) {
                    if (node) {
                        const id = node.id!;
                        onSubmit(new TestCase(id, name, scenario, steps, prerequisites, testData, expectedResults));
                        panel.dispose();
                    }
                    const newTestCase = new TestCase(getUniqueId(), name, scenario, steps, prerequisites, testData, expectedResults);
                    onSubmit(newTestCase);
                    panel.dispose();
                } else {
                    vscode.window.showErrorMessage('Please fill in all fields.');
                }
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
                    input, textarea {
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
                                expectedResults: lists.expectedResults
                            }
                        });
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