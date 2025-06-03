import xmlbuilder from "xmlbuilder";
import { Requirement } from "../models/requirement";
import { TestCase } from "../models/testCase";
import { TreeNode } from "../models/treeNode";
import * as xml2js from "xml2js";
import { TestNode } from "../models/test";
import { getUniqueId } from "./idGenerator";

export class ReqifFileManager{
    public static exportToReqIF(nodes: TreeNode[], projectId: string): string {
            const now = new Date().toISOString();
        
            const root = xmlbuilder.create('REQ-IF', { version: '1.0', encoding: 'UTF-8' })
                .att('xmlns', 'http://www.omg.org/spec/ReqIF/20110401/reqif.xsd')
                .att('xmlns:configuration', 'http://eclipse.org/rmf/pror/toolextensions/1.0')
                .att('xmlns:id', 'http://pror.org/presentation/id')
                .att('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
        
            const header = root.ele('THE-HEADER').ele('REQ-IF-HEADER', { IDENTIFIER: '_HEADER_ID' });
            header.ele('COMMENT', 'Created by: Typhoon Requirement Tool');
            header.ele('CREATION-TIME', now);
            header.ele('REQ-IF-TOOL-ID', 'Typhoon Requirement Tool');
            header.ele('REQ-IF-VERSION', '1.0');
            header.ele('SOURCE-TOOL-ID', 'Typhoon Requirement Tool');
            header.ele('TITLE', 'Exported Requirements');   
            if (projectId === ""){
                header.ele('PROJECT-ID', getUniqueId());                                    //maybe we need to have this saved somewhere but for now we won't
            }else{
                header.ele('PROJECT-ID', projectId);                                    //maybe we need to have this saved somewhere but for now we won't
            }
        
            const coreContent = root.ele('CORE-CONTENT').ele('REQ-IF-CONTENT');
        
            const datatypes = coreContent.ele('DATATYPES');
            datatypes.ele('DATATYPE-DEFINITION-STRING', {
                IDENTIFIER: '_StringType',
                'LAST-CHANGE': now,
                'LONG-NAME': 'String',
                'MAX-LENGTH': '32000',
            });
            datatypes.ele('DATATYPE-DEFINITION-XHTML', {
                IDENTIFIER: '_XhtmlType',
                'LAST-CHANGE': now,
                'LONG-NAME': 'XHTML',
            });
        
            const specTypes = coreContent.ele('SPEC-TYPES');
            const specObjectRequirementType = specTypes.ele('SPEC-OBJECT-TYPE', {
                IDENTIFIER: '_RequirementType',
                'LAST-CHANGE': now,
                'LONG-NAME': 'Requirement Type',
            });
            const specObjectTestType = specTypes.ele('SPEC-OBJECT-TYPE', {
                IDENTIFIER: '_TestType',
                'LAST-CHANGE': now,
                'LONG-NAME': 'Test Type',
            });
            const specObjectTestCaseType = specTypes.ele('SPEC-OBJECT-TYPE', {
                IDENTIFIER: '_TestCaseType',
                'LAST-CHANGE': now,
                'LONG-NAME': 'Test Case Type',
            });
            const specReqtributes = specObjectRequirementType.ele('SPEC-ATTRIBUTES');
            const specTestAttributes = specObjectTestType.ele('SPEC-ATTRIBUTES');
            const specTestCaseAttributes = specObjectTestCaseType.ele('SPEC-ATTRIBUTES');

            specReqtributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Requirement_Title',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Title',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            specTestAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Test_Title',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Title',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            specTestCaseAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_TestCase_Title',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Title',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            
            specReqtributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Requirement_Description',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Description',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            specTestAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Test_Description',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Description',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            specTestCaseAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_TestCase_Description',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Description',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
    
            specReqtributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Requirement_Type',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Type',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            specTestAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Test_Type',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Type',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            specTestCaseAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_TestCase_Type',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Type',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
    
            specReqtributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Priority',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Priority',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
    
            specReqtributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Status',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Status',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
    
            specTestCaseAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Steps',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Steps',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            
            specTestCaseAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Prerequisites',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Prerequisites',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            
            specTestCaseAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Parameters',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Parameters',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
        
            const specType = specTypes.ele('SPECIFICATION-TYPE', {
                IDENTIFIER: '_SpecificationType',
                'LAST-CHANGE': now,
                'LONG-NAME': 'Specification Type',
            });
    
            specType.ele('SPEC-ATTRIBUTES').ele('ATTRIBUTE-DEFINITION-XHTML', {
                IDENTIFIER: '_SpecDescription',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Description',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-XHTML-REF', '_XhtmlType');
        
            const specObjects = coreContent.ele('SPEC-OBJECTS');
            const rootNodes = nodes.filter(node => !node.parent);
            for (const node of this.flattenTree(rootNodes)) {
                const specObject = specObjects.ele('SPEC-OBJECT', {
                    IDENTIFIER: node.id,
                    'LAST-CHANGE': now,
                });
                const values = specObject.ele('VALUES');
                
                if (node instanceof Requirement) {
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.label || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Requirement_Title');
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.description || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Requirement_Description');
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.contextValue || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Requirement_Type');
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node instanceof Requirement ? node.priority || '' : '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Priority');
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node instanceof Requirement ? node.status || '' : '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Status');

                    specObject.ele('TYPE').ele('SPEC-OBJECT-TYPE-REF', '_RequirementType');
                    
                }
                else if (node instanceof TestCase) {
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.label || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_TestCase_Title');
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.description || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_TestCase_Description');
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.contextValue || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_TestCase_Type');
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.steps.join(',') || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Steps');
    
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.prerequisites.join(',') || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Prerequisites');
    
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': JSON.stringify(node.parameters, null, 2) || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Parameters');

                    specObject.ele('TYPE').ele('SPEC-OBJECT-TYPE-REF', '_TestCaseType');
                }else if (node instanceof TestNode) {
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.label || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Test_Title');
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.description || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Test_Description');
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.contextValue || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Test_Type');
                    specObject.ele('TYPE').ele('SPEC-OBJECT-TYPE-REF', '_TestType');
                }
                    
            }
        
            const specifications = coreContent.ele('SPECIFICATIONS');
            const specification = specifications.ele('SPECIFICATION', {
                IDENTIFIER: '_Specification',
                'LAST-CHANGE': now,
                'LONG-NAME': 'Requirements Document',
            });
            specification.ele('VALUES').ele('ATTRIBUTE-VALUE-XHTML')
                .ele('DEFINITION')
                .ele('ATTRIBUTE-DEFINITION-XHTML-REF', '_SpecDescription')
                .up()
                .up()
                .ele('THE-VALUE')
                .ele('xhtml:div', 'Requirements Document')
                .up()
                .up()
                .ele('THE-ORIGINAL-VALUE')
                .ele('xhtml:div', 'Requirements Document');
            specification.ele('TYPE').ele('SPECIFICATION-TYPE-REF', '_SpecificationType');
        
            const children = specification.ele('CHILDREN');
            this.serializeSpecificationHierarchy(nodes.filter(node => !node.parent), children);
        
            const toolExtensions = root.ele('TOOL-EXTENSIONS');
            toolExtensions.ele('REQ-IF-TOOL-EXTENSION')
                .ele('configuration:ProrToolExtension')
                .ele('configuration:generalConfiguration')
                .ele('configuration:ProrGeneralConfiguration')
                .ele('configuration:labelConfiguration')
                .ele('configuration:LabelConfiguration')
                .ele('defaultLabel', 'ReqIF.Description');
        
            return root.end({ pretty: true });
        }
    
        private static serializeSpecificationHierarchy(nodes: TreeNode[], parentXml: xmlbuilder.XMLElement): void {
            for (const node of nodes) {
                const specHierarchy = parentXml.ele('SPEC-HIERARCHY', {
                    IDENTIFIER: `_SH-${node.id}`,
                    'LAST-CHANGE': new Date().toISOString(),
                });
                specHierarchy.ele('OBJECT').ele('SPEC-OBJECT-REF', node.id);
        
                if (node.children && node.children.length > 0) {
                    const children = specHierarchy.ele('CHILDREN');
                    this.serializeSpecificationHierarchy(node.children, children);
                }
            }
        }
    
        private static flattenTree(nodes: TreeNode[]): TreeNode[] {
            const result: TreeNode[] = [];
            for (const node of nodes) {
                result.push(node);
                if (node.children?.length) {
                    result.push(...this.flattenTree(node.children));
                }
            }
            return result;
        }

        public static async importFromReqIF(reqifContent: string): Promise<TreeNode[]> {
            const parser = new xml2js.Parser({ explicitArray: false });
            const parsedReqIF = await parser.parseStringPromise(reqifContent);
        
            const specObjectsMap = new Map<string, TreeNode>();
            const nodes: TreeNode[] = [];
        
            const specObjects = parsedReqIF['REQ-IF']['CORE-CONTENT']['REQ-IF-CONTENT']['SPEC-OBJECTS']['SPEC-OBJECT'];
            for (const specObject of Array.isArray(specObjects) ? specObjects : [specObjects]) {
                const id = specObject['$']['IDENTIFIER'];
                const type = specObject['TYPE']['SPEC-OBJECT-TYPE-REF'];
                const values = specObject['VALUES']['ATTRIBUTE-VALUE-STRING'];
        
                let label = '';
                let description = '';
                let priority = '';
                let status = '';
                let steps: string[] = [];
                let prerequisites: string[] = [];
                let parameters: any[] = [];
        
                for (const value of Array.isArray(values) ? values : [values]) {
                    const definitionRef = value['DEFINITION']['ATTRIBUTE-DEFINITION-STRING-REF'];
                    const theValue = value['$']['THE-VALUE'];
        
                    switch (definitionRef) {
                        case '_Requirement_Title':
                        case '_Test_Title':
                        case '_TestCase_Title':
                            label = theValue;
                            break;
                        case '_Requirement_Description':
                        case '_Test_Description':
                        case '_TestCase_Description':
                            description = theValue;
                            break;
                        case '_Priority':
                            priority = theValue;
                            break;
                        case '_Status':
                            status = theValue;
                            break;
                        case '_Steps':
                            steps = theValue.split(',');
                            break;
                        case '_Prerequisites':
                            prerequisites = theValue.split(',');
                            break;
                        case '_Parameters':
                            parameters = JSON.parse(theValue || '[]');
                            break;
                    }
                }
        
                let node: TreeNode;
                if (type === '_RequirementType') {
                    node = new Requirement(id, label, description, priority as 'High' | 'Medium' | 'Low', status as 'Draft' | 'Ready' | 'Reviewed' | 'Approved' | 'Released');
                } else if (type === '_TestCaseType') {
                    node = new TestCase(id, label, description, steps, prerequisites, parameters);
                } else if (type === '_TestType') {
                    node = new TestNode(id, label, description);
                } else {
                    continue;
                }
        
                specObjectsMap.set(id, node);
            }
        
            const specHierarchy = parsedReqIF['REQ-IF']['CORE-CONTENT']['REQ-IF-CONTENT']['SPECIFICATIONS']['SPECIFICATION']['CHILDREN']['SPEC-HIERARCHY'];
            const buildHierarchy = (hierarchy: any, parent: TreeNode | null) => {
                const objectRef = hierarchy['OBJECT']['SPEC-OBJECT-REF'];
                const node = specObjectsMap.get(objectRef);
        
                if (node) {
                    if (parent) {
                        parent.children.push(node);
                        node.parent = parent;
                    }
                    nodes.push(node);
                    
        
                    if (hierarchy['CHILDREN'] && hierarchy['CHILDREN']['SPEC-HIERARCHY']) {
                        const children = Array.isArray(hierarchy['CHILDREN']['SPEC-HIERARCHY'])
                            ? hierarchy['CHILDREN']['SPEC-HIERARCHY']
                            : [hierarchy['CHILDREN']['SPEC-HIERARCHY']];
                        for (const child of children) {
                            buildHierarchy(child, node);
                        }
                    }
                }
            };
        
            const rootHierarchy = Array.isArray(specHierarchy) ? specHierarchy : [specHierarchy];
            for (const hierarchy of rootHierarchy) {
                buildHierarchy(hierarchy, null);
            }
        
            return nodes;
        }

        

}