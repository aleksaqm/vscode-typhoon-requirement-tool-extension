import { Requirement } from "../models/requirement";
import { TestNode } from "../models/test";
import { TestCase } from "../models/testCase";

export function parseRequirement(spec: any) : Requirement{
    return new Requirement(
        spec['IDENTIFIER'],
        spec['NAME'],
        spec['DESCRIPTION'] || '',
        spec['PRIORITY'] || 'Medium',
    );
}

export function parseTest(spec: any) : TestNode{
    return new TestNode(
        spec['IDENTIFIER'],
        spec['NAME'],
        spec['DESCRIPTION'] || '',
    );
}

export function parseTestCase(spec: any) : TestCase{
    return new TestCase(
        spec['IDENTIFIER'],
        spec['NAME'],
        spec['SCENARIO'] || '',
        spec['STEPS'] ? spec['STEPS'].split('|') : [],
        spec['PREREQUISITES'] ? spec['PREREQUISITES'].split('|') : [],
        spec['TEST-DATA'] ? spec['TEST-DATA'].split('|') : [],
        spec['EXPECTED-RESULTS'] ? spec['EXPECTED-RESULTS'].split('|') : [],
        spec['PARAMETERS'] && spec['PARAMETERS']['PARAMETER']
            ? Array.isArray(spec['PARAMETERS']['PARAMETER'])
                ? spec['PARAMETERS']['PARAMETER'].map((param: any) => ({
                        name: param['NAME'],
                        type: param['TYPE'],
                        value: param['VALUE']
                    }))
                : [
                        {
                            name: spec['PARAMETERS']['PARAMETER']['NAME'],
                            type: spec['PARAMETERS']['PARAMETER']['TYPE'],
                            value: spec['PARAMETERS']['PARAMETER']['VALUE']
                        }
                    ]
            : []
    );
}