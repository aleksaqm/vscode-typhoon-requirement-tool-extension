import xmlbuilder from "xmlbuilder";
import { Requirement } from "../models/requirement";
import { TestCase } from "../models/testCase";
import { TreeNode } from "../models/treeNode";

export class ReqifFileManager{
    public static exportToReqIF(nodes: TreeNode[]): string {
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
            const specObjectType = specTypes.ele('SPEC-OBJECT-TYPE', {
                IDENTIFIER: '_RequirementType',
                'LAST-CHANGE': now,
                'LONG-NAME': 'Requirement Type',
            });
            const specAttributes = specObjectType.ele('SPEC-ATTRIBUTES');
            specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_ForeignID',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.ForeignID',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
    
            specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Title',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Title',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            
            specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Description',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Description',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
    
            specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Type',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Type',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
    
            specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Priority',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Priority',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
    
            specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Status',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Status',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
    
            specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Steps',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Steps',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            
            specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_Prerequisites',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.Prerequisites',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            
            specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_TestData',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.TestData',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            
            specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
                IDENTIFIER: '_ExpectedResults',
                'LAST-CHANGE': now,
                'LONG-NAME': 'ReqIF.ExpectedResults',
            }).ele('TYPE').ele('DATATYPE-DEFINITION-STRING-REF', '_StringType');
            
            specAttributes.ele('ATTRIBUTE-DEFINITION-STRING', {
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
                values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.id })
                    .ele('DEFINITION')
                    .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_ForeignID');
                values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.label || '' })
                    .ele('DEFINITION')
                    .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Title');
                values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.description || '' })
                    .ele('DEFINITION')
                    .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Description');
                values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.contextValue || '' })
                    .ele('DEFINITION')
                    .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Type');
                if (node instanceof Requirement) {
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node instanceof Requirement ? node.priority || '' : '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Priority');
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node instanceof Requirement ? node.status || '' : '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Status');
                }
                else if (node instanceof TestCase) {
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.steps.join(',') || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Steps');
    
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.prerequisites.join(',') || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Prerequisites');
    
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.testData.join(',') || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_TestData');
    
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': node.expectedResults.join(',') || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_ExpectedResults');
    
                    values.ele('ATTRIBUTE-VALUE-STRING', { 'THE-VALUE': JSON.stringify(node.parameters, null, 2) || '' })
                        .ele('DEFINITION')
                        .ele('ATTRIBUTE-DEFINITION-STRING-REF', '_Parameters');
                }
                    
                specObject.ele('TYPE').ele('SPEC-OBJECT-TYPE-REF', '_RequirementType');
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

}