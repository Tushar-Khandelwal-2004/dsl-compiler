import { ParsedNode } from './parser';
import { Diagnostic, ComponentSchema } from './types';

export function analyze(nodes: ParsedNode[], schemaMap: Map<string, ComponentSchema>): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const node of nodes) {
    const compSchema = schemaMap.get(node.tagName);

    if (!compSchema) {
      diagnostics.push({
        severity: 'error',
        message: `Unknown component '${node.tagName}'`,
        line: node.line
      });
      continue; 
    }

    const providedInputs = Object.keys(node.attributes);

    for (const input of compSchema.inputs) {
      if (input.required && !providedInputs.includes(input.name)) {
        diagnostics.push({
          severity: 'warning',
          message: `Required input '${input.name}' is missing on '${node.tagName}'`,
          line: node.line
        });
      }
    }

    for (const attrName of providedInputs) {
      const inputSchema = compSchema.inputs.find(i => i.name === attrName);

      if (!inputSchema) {
        diagnostics.push({
          severity: 'error',
          message: `Unknown input '${attrName}' on component '${node.tagName}'`,
          line: node.line
        });
        continue;
      }

      let rawValue = node.attributes[attrName];
      let inferredType = 'string';
      let isExpression = false;

      if (rawValue.startsWith('{') && rawValue.endsWith('}')) {
        const innerValue = rawValue.slice(1, -1).trim();
        
        if (innerValue === 'true' || innerValue === 'false') {
          inferredType = 'boolean';
        } else if (!isNaN(Number(innerValue)) && innerValue !== '') {
          inferredType = 'number';
        } else {
          isExpression = true; 
        }
      }

      if (!isExpression && inputSchema.type) {
        const allowedTypes = inputSchema.type.replace(/['"]/g, '').split('|').map(s => s.trim());

        const isValidType = allowedTypes.includes('any') || 
                            allowedTypes.includes(inferredType) || 
                            allowedTypes.includes(rawValue);

        if (!isValidType) {
          diagnostics.push({
            severity: 'error',
            message: `Type mismatch on '${node.tagName}' input '${attrName}': expected ${inputSchema.type}, got ${inferredType}`,
            line: node.line
          });
        }
      }
    }
  }

  return diagnostics;
}