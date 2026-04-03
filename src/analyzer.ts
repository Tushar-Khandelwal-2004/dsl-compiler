import { ParsedNode } from './parser';
import { Diagnostic, ComponentSchema } from './types';

// Known DSL control flow primitives — not in schema but valid to use
const DSL_PRIMITIVES = new Set(['if', 'loop', 'let', 'block', 'print', 'include']);

export function analyze(nodes: ParsedNode[], schemaMap: Map<string, ComponentSchema>): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const node of nodes) {
    if (!node.tagName.includes('-') && !DSL_PRIMITIVES.has(node.tagName)) continue;

    const compSchema = schemaMap.get(node.tagName);

    if (!compSchema) {
      if (DSL_PRIMITIVES.has(node.tagName)) continue;

      diagnostics.push({
        severity: 'error',
        message: `Unknown component '${node.tagName}'`,
        line: node.line
      });
      continue;
    }

    const providedAttributes = Object.keys(node.attributes);

    for (const input of compSchema.inputs || []) {
      const isProvided = providedAttributes.some(attr => {
        const clean = attr.replace(/^\[|\]$|^\(|\)$/g, '');
        return clean === input.name;
      });

      if (input.required && !isProvided) {
        diagnostics.push({
          severity: 'warning',
          message: `Required input '${input.name}' is missing on '${node.tagName}'`,
          line: node.line
        });
      }
    }

    // Validate each attribute
    for (const rawAttrName of providedAttributes) {
      const isOutputBinding = rawAttrName.startsWith('(') && rawAttrName.endsWith(')');
      const isInputBinding = rawAttrName.startsWith('[') && rawAttrName.endsWith(']');
      const cleanAttrName = rawAttrName.replace(/^\[|\]$|^\(|\)$/g, '');

      if (isOutputBinding) {
        const outputSchema = (compSchema.outputs || []).find(o => o.name === cleanAttrName);
        if (!outputSchema) {
          diagnostics.push({
            severity: 'error',
            message: `Unknown output '${cleanAttrName}' on component '${node.tagName}'`,
            line: node.line
          });
        }
        continue;
      }

      const inputSchema = (compSchema.inputs || []).find(i => i.name === cleanAttrName);

      if (!inputSchema) {
        diagnostics.push({
          severity: 'error',
          message: `Unknown input '${cleanAttrName}' on component '${node.tagName}'`,
          line: node.line
        });
        continue;
      }

      if (isInputBinding) continue;

      let rawValue = node.attributes[rawAttrName];
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

        const isValidType =
          allowedTypes.includes('any') ||
          allowedTypes.includes(inferredType) ||
          allowedTypes.includes(rawValue); // catches literal matches like loading="lazy"

        if (!isValidType) {
          diagnostics.push({
            severity: 'error',
            message: `Type mismatch on '${node.tagName}' input '${cleanAttrName}': expected ${inputSchema.type}, got ${inferredType}`,
            line: node.line
          });
        }
      }
    }
  }

  return diagnostics;
}