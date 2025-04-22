import * as vscode from 'vscode';
import { Requirement } from './models/requirement';
import { RequirementTreeProvider } from './views/requirementTreeViewProvider';
import { TreeNode } from './models/treeNode';
import { TestNode } from './models/test';
import { TestCase } from './models/testCase';
import { DetailsViewProvider } from './views/detailsViewProvider';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "typhoon-requirement-tool" is now active!');

	const detailsViewProvider = new DetailsViewProvider(context);

	const requirementDataProvider = new RequirementTreeProvider(detailsViewProvider);

	const treeView = vscode.window.createTreeView('typhoon-requirement-tool.tree', {
        treeDataProvider: requirementDataProvider,
    });

	vscode.window.registerWebviewViewProvider(DetailsViewProvider.viewType, detailsViewProvider);

	treeView.onDidChangeSelection((event) => {
        const selectedNode = event.selection[0];
        if (selectedNode) {
            requirementDataProvider.onNodeSelected(selectedNode);
        }
    });

    context.subscriptions.push(treeView);


	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.helloQm', () => {
		vscode.window.showInformationMessage('Hello Qm from Typhoon Requirement Tool!');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.addRequirement', (node: Requirement) => {
		requirementDataProvider.addRequirement(node);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.addTest', (node: TreeNode) => {
		if (!node) {
			vscode.window.showErrorMessage('No requirement selected. You cant add test without requirement.');
			return;
		}
		requirementDataProvider.addTest(node);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.addTestCase', (node: TreeNode) => {
		if (!node) {
			vscode.window.showErrorMessage('No test selected. You cant add test case without test.');
			return;
		}
		requirementDataProvider.addTestCase(node);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.editRequirement', (node: Requirement) => {
		requirementDataProvider.editRequirement(node);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.editTest', (node: TestNode) => {
		requirementDataProvider.editTest(node);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.editTestCase', (node: TestCase) => {
		requirementDataProvider.editTestCase(node);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.deleteNode', (node: TreeNode) => {
		requirementDataProvider.deleteNode(node);
	}));

	context.subscriptions.push(
        vscode.commands.registerCommand('typhoon-requirement-tool.selectNode', (node: TreeNode) => {
            requirementDataProvider.onNodeSelected(node);
        })
    );

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.exportToReqIF', async () => {
		const saveUri = await vscode.window.showSaveDialog({
			filters: { 'ReqIF Files': ['reqif'] },
			defaultUri: vscode.Uri.file('requirements'),
		});

		if (!saveUri) {
			vscode.window.showErrorMessage('Export cancelled. No file selected.');
			return;
		}

		try{
			const reqifContent = requirementDataProvider.exportToReqIF();
			await vscode.workspace.fs.writeFile(saveUri, Buffer.from(reqifContent, 'utf-8'));
			vscode.window.showInformationMessage('Requirements exported to ReqIF file successfully!');
		}catch (error : any) {
			vscode.window.showErrorMessage('Error exporting requirements to ReqIF: ' + error.message);
		}

	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.importFromReqIF', async () => {
		const openUri = await vscode.window.showOpenDialog({
			filters: { 'ReqIF Files': ['reqif'] },
			canSelectMany: false,
		});

		if (!openUri || openUri.length === 0) {
			vscode.window.showErrorMessage('Import cancelled. No file selected.');
			return;
		}

		try{
			const fileContent = await vscode.workspace.fs.readFile(openUri[0]);
			const reqifContent = fileContent.toString();
			requirementDataProvider.importFromReqIF(reqifContent);
			vscode.window.showInformationMessage(`Requirements imported from ${openUri[0].fsPath}`);
		}catch (error : any) {
			vscode.window.showErrorMessage('Error importing requirements from ReqIF: ' + error.message);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.exportToCSV', async () => {
		const saveUri = await vscode.window.showSaveDialog({
			filters: { 'CSV Files': ['csv'] },
			defaultUri: vscode.Uri.file('requirements.csv'),
		});
	
		if (!saveUri) {
			vscode.window.showErrorMessage('Export canceled.');
			return;
		}
	
		try {
			const csvContent = requirementDataProvider.exportToReqViewCSV();
			await vscode.workspace.fs.writeFile(saveUri, Buffer.from(csvContent, 'utf-8'));
			vscode.window.showInformationMessage(`Requirements exported to ${saveUri.fsPath}`);
		} catch (error : any) {
			vscode.window.showErrorMessage(`Failed to export requirements: ${error.message}`);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.importFromCSV', async () => {
		const openUri = await vscode.window.showOpenDialog({
			filters: { 'CSV Files': ['csv'] },
			canSelectMany: false,
		});
	
		if (!openUri || openUri.length === 0) {
			vscode.window.showErrorMessage('No file selected.');
			return;
		}
	
		try {
			const fileContent = await vscode.workspace.fs.readFile(openUri[0]);
			const csvContent = fileContent.toString();
			requirementDataProvider.importFromReqViewCSV(csvContent);
			vscode.window.showInformationMessage(`Requirements imported from ${openUri[0].fsPath}`);
		} catch (error : any) {
			vscode.window.showErrorMessage(`Failed to import requirements: ${error.message}`);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('typhoon-requirement-tool.openTabularView', () => {
		const panel = vscode.window.createWebviewPanel(
			'tabularView',
			'Requirements Tabular View',
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);
	
		const rootRequirements = requirementDataProvider.getRootNodes();
		console.log('Root Requirements:', rootRequirements);

		const serializedRequirements = serializeTree(rootRequirements);
		console.log('Serialized Requirements:', serializedRequirements);
    	panel.webview.html = getTabularViewHtml(serializedRequirements);
	}));

}

export function deactivate() {}

function serializeTree(nodes: TreeNode[]): any[] {
    return nodes.map(node => {
        const { parent, ...rest } = node;
        return {
            ...rest,
            children: node.children ? serializeTree(node.children) : [],
        };
    });
}

function getTabularViewHtml(requirements: TreeNode[]): string {
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
                    const tableBody = document.getElementById('requirementsTable');
                    const parentRow = document.querySelector(\`tr[data-id="\${nodeId}"]\`);

                    // Insert child rows after the parent row
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
							// Collapse: Hide all direct children
							expander.textContent = '[+]';
							document.querySelectorAll(\`tr[data-parent-id="\${id}"]\`).forEach(childRow => {
								childRow.classList.add('hidden');
							});
						} else {
							expander.textContent = '[-]';

							if (!alreadyLoaded) {
								// First time expanding: insert child rows
								const node = findNodeById(tree, id);
								if (node && node.children.length > 0) {
									const childRowsHtml = renderRows(node.children, id);
									row.insertAdjacentHTML('afterend', childRowsHtml);
									expander.setAttribute('data-loaded', 'true');
								}
							} else {
								// Show already-rendered child rows
								document.querySelectorAll(\`tr[data-parent-id="\${id}"]\`).forEach(childRow => {
									childRow.classList.remove('hidden');
								});
							}
						}
					}
				});

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


