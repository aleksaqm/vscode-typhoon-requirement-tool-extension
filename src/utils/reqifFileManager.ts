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

            const otherDataDefs: Record<string, {type: string, example: any}> = {};
            for (const node of this.flattenTree(nodes.filter(n => !n.parent))) {
                if (node instanceof Requirement && node.otherData) {
                    let otherDataObj = node.otherData instanceof Map ? Object.fromEntries(node.otherData.entries()) : node.otherData;
                    for (const [key, value] of Object.entries(otherDataObj)) {
                        if (!otherDataDefs[key]) {
                            let type = typeof value;
                            let customType: string;
                            if (type === 'number') {
                                customType = Number.isInteger(value) ? 'integer' : 'real';
                            } else if (type === 'boolean') {
                                customType = 'boolean';
                            } else {
                                customType = 'string';
                            }
                            otherDataDefs[key] = {type: customType, example: value};
                        }
                    }
                }
            }
        
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

            // --- ADDED FOR OTHERDATA: Add integer, real, boolean datatypes if needed ---
            if (Object.values(otherDataDefs).some(def => def.type === 'integer')) {
                datatypes.ele('DATATYPE-DEFINITION-INTEGER', {
                    IDENTIFIER: '_IntegerType',
                    'LAST-CHANGE': now,
                    'LONG-NAME': 'Integer',
                    'MIN': '-2147483648',
                    'MAX': '2147483647'
                });
            }
            if (Object.values(otherDataDefs).some(def => def.type === 'real')) {
                datatypes.ele('DATATYPE-DEFINITION-REAL', {
                    IDENTIFIER: '_RealType',
                    'LAST-CHANGE': now,
                    'LONG-NAME': 'Real',
                    'ACCURACY': '7'
                });
            }
            if (Object.values(otherDataDefs).some(def => def.type === 'boolean')) {
                datatypes.ele('DATATYPE-DEFINITION-BOOLEAN', {
                    IDENTIFIER: '_BooleanType',
                    'LAST-CHANGE': now,
                    'LONG-NAME': 'Boolean'
                });
            }
        
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

            // --- ADDED FOR OTHERDATA: Add attribute definitions for otherData ---
            for (const [key, def] of Object.entries(otherDataDefs)) {
                let attrType = 'STRING';
                let typeRef = '_StringType';
                if (def.type === 'integer') {
                    attrType = 'INTEGER';
                    typeRef = '_IntegerType';
                } else if (def.type === 'real') {
                    attrType = 'REAL';
                    typeRef = '_RealType';
                } else if (def.type === 'boolean') {
                    attrType = 'BOOLEAN';
                    typeRef = '_BooleanType';
                }
                specReqtributes.ele(`ATTRIBUTE-DEFINITION-${attrType}`, {
                    IDENTIFIER: `_Requirement_OtherData_${key}`,
                    'LAST-CHANGE': now,
                    'LONG-NAME': key,
                }).ele('TYPE').ele(`DATATYPE-DEFINITION-${attrType}-REF`, typeRef);
            }
        
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

                    let otherDataObj = node.otherData instanceof Map ? Object.fromEntries(node.otherData.entries()) : node.otherData;
                    if (otherDataObj) {
                        for (const [key, value] of Object.entries(otherDataObj)) {
                            const def = otherDataDefs[key];
                            if (!def) {continue;}
                            let valueTypeTag = '';
                            let defTag = '';
                            let theValue = value;
                            if (def.type === 'integer') {
                                valueTypeTag = 'ATTRIBUTE-VALUE-INTEGER';
                                defTag = 'ATTRIBUTE-DEFINITION-INTEGER-REF';
                            } else if (def.type === 'real') {
                                valueTypeTag = 'ATTRIBUTE-VALUE-REAL';
                                defTag = 'ATTRIBUTE-DEFINITION-REAL-REF';
                            } else if (def.type === 'boolean') {
                                valueTypeTag = 'ATTRIBUTE-VALUE-BOOLEAN';
                                defTag = 'ATTRIBUTE-DEFINITION-BOOLEAN-REF';
                                theValue = value ? 'true' : 'false';
                            } else {
                                valueTypeTag = 'ATTRIBUTE-VALUE-STRING';
                                defTag = 'ATTRIBUTE-DEFINITION-STRING-REF';
                            }
                            values.ele(valueTypeTag, { 'THE-VALUE': theValue })
                                .ele('DEFINITION')
                                .ele(defTag, `_Requirement_OtherData_${key}`);
                        }
                    }

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
            let specTypeNameMap = new Map<string, string>();
            let specObjectTypes;
            try{
                specObjectTypes = parsedReqIF['REQ-IF']['CORE-CONTENT']['REQ-IF-CONTENT']['SPEC-TYPES']['SPEC-OBJECT-TYPE'];
            }
            catch (error) {
            }
            if (specObjectTypes){
                for (const specObjectType of Array.isArray(specObjectTypes) ? specObjectTypes : [specObjectTypes]) {
                    const identifier = specObjectType['$']['IDENTIFIER'];
                    const longName = specObjectType['$']['LONG-NAME'];
                    if (identifier && longName) {
                        console.log("DODAJEM U MAPU ", identifier, longName);
                        specTypeNameMap.set(identifier, longName);
                        console.log("specTypeNameMap.get(identifier): ", specTypeNameMap.get(identifier));
                    }
                    const specAttributes = specObjectType['SPEC-ATTRIBUTES'];
                    if (specAttributes) {
                        const attrs = Array.isArray(specAttributes) ? specAttributes : [specAttributes];
                        for (const attrGroup of attrs) {
                            for (const key of Object.keys(attrGroup)) {
                                const attrDefs = Array.isArray(attrGroup[key]) ? attrGroup[key] : [attrGroup[key]];
                                for (const attrDef of attrDefs) {
                                    const attrId = attrDef['$']?.['IDENTIFIER'];
                                    const attrLongName = attrDef['$']?.['LONG-NAME'];
                                    if (attrId && attrLongName) {
                                        specTypeNameMap.set(attrId, attrLongName);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        
            const specObjects = parsedReqIF['REQ-IF']['CORE-CONTENT']['REQ-IF-CONTENT']['SPEC-OBJECTS']['SPEC-OBJECT'];
            for (const specObject of Array.isArray(specObjects) ? specObjects : [specObjects]) {
                let id = specObject['$']['IDENTIFIER'];
                const type = specTypeNameMap.get(specObject['TYPE']['SPEC-OBJECT-TYPE-REF']);
                const valuesObj = specObject['VALUES'];


                let label = '';
                let description = '';
                let priority = '';
                let status = '';
                let steps: string[] = [];
                let prerequisites: string[] = [];
                let parameters: any[] = [];

                let additionalData = new Map<string, any>();

                if (valuesObj) {
                    for (const valueTypeKey of Object.keys(valuesObj)) {
                        const valueEntries = Array.isArray(valuesObj[valueTypeKey]) ? valuesObj[valueTypeKey] : [valuesObj[valueTypeKey]];
                        for (const value of valueEntries) {
                            const defKey = value['DEFINITION'] && Object.keys(value['DEFINITION']).find(k => k.startsWith('ATTRIBUTE-DEFINITION-'));
                            const definitionRef = defKey ? value['DEFINITION'][defKey] : undefined;

                            let theValue = value['$']?.['THE-VALUE'];
                            if (valueTypeKey === 'ATTRIBUTE-VALUE-XHTML' && value['THE-VALUE']) {
                                theValue = value['THE-VALUE']['xhtml:div'] || '';
                            }
                            let parsedValue = theValue;
                            switch (valueTypeKey) {
                                case 'ATTRIBUTE-VALUE-STRING':
                                case 'ATTRIBUTE-VALUE-XHTML':
                                    // Already string
                                    break;
                                case 'ATTRIBUTE-VALUE-INTEGER':
                                    parsedValue = theValue !== undefined ? parseInt(theValue, 10) : undefined;
                                    break;
                                case 'ATTRIBUTE-VALUE-REAL':
                                    parsedValue = theValue !== undefined ? parseFloat(theValue) : undefined;
                                    break;
                                case 'ATTRIBUTE-VALUE-BOOLEAN':
                                    parsedValue = theValue === 'true' || theValue === true;
                                    break;
                                case 'ATTRIBUTE-VALUE-DATE':
                                    // Optionally parse as Date
                                    parsedValue = new Date(theValue);
                                    break;
                            }

                            switch (specTypeNameMap.get(definitionRef) || definitionRef) {
                                case 'ReqIF.Title':
                                    label = parsedValue;
                                    break;
                                case 'ReqIF.Description':
                                    description = parsedValue;
                                    break;
                                case 'ReqIF.Priority':
                                    priority = parsedValue;
                                    break;
                                case 'ReqIF.Status':
                                    status = parsedValue;
                                    break;
                                case 'ReqIF.Steps':
                                    steps = typeof parsedValue === 'string' ? parsedValue.split(',') : [];
                                    break;
                                case 'ReqIF.Prerequisites':
                                    prerequisites = typeof parsedValue === 'string' ? parsedValue.split(',') : [];
                                    break;
                                case 'ReqIF.Parameters':
                                    parameters = typeof parsedValue === 'string' ? JSON.parse(parsedValue || '[]') : [];
                                    break;
                                case 'ReqIF.Type':
                                    break;
                                default:
                                    additionalData.set(specTypeNameMap.get(definitionRef) || definitionRef, parsedValue);
                            }
                        }
                    }
                }
        
                let node: TreeNode;
                if (!id){
                    id = getUniqueId();
                }
                if (type === 'Requirement Type') {
                    node = new Requirement(id, label, description, priority as 'High' | 'Medium' | 'Low' , status as 'Draft' | 'Ready' | 'Reviewed' | 'Approved' | 'Released');
                } else if (type === 'Test Case Type') {
                    node = new TestCase(id, label, description, steps, prerequisites, parameters);
                } else if (type === 'Test Type') {
                    node = new TestNode(id, label, description);
                } else {
                    node = new Requirement(id, "Requirement_" + String(id), "no description", "Medium", "Draft");
                    // node = new TreeNode(id, "Requirement_" + String(id), 0, type || "Unknown");
                }

                if (additionalData.size > 0) {
                    node.otherData = additionalData;
                }
                console.log("Node created: ", node);
                if (!node.label) {
                    node.label =  specObject['$']['LONG-NAME'] ||  "Requirement_" + String(id);
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