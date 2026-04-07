import { ParsedNode } from './parser';
import { Diagnostic, ComponentSchema } from './types';

// Known DSL control flow primitives — not in schema but valid to use
const DSL_PRIMITIVES = new Set(['if', 'loop', 'let', 'block', 'print', 'include']);

/**
 * Finds the column range of an attribute name within a source line.
 * Returns 1-based colStart and colEnd (exclusive).
 */
function getAttrCol(
  lines: string[],
  lineNum: number,
  attrName: string
): { colStart: number; colEnd: number } {
  const lineText = lines[lineNum - 1] ?? '';
  const idx = lineText.indexOf(attrName);
  if (idx === -1) return { colStart: 1, colEnd: 1 + attrName.length };
  return { colStart: idx + 1, colEnd: idx + 1 + attrName.length };
}

export function analyze(
  nodes: ParsedNode[],
  schemaMap: Map<string, ComponentSchema>,
  source: string
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = source.split('\n');

  for (const node of nodes) {
    // Skip native HTML tags — custom components always have a hyphen
    if (!node.tagName.includes('-') && !DSL_PRIMITIVES.has(node.tagName)) continue;

    const compSchema = schemaMap.get(node.tagName);

    if (!compSchema) {
      // Valid DSL primitive but not in schema — that's fine, skip silently
      if (DSL_PRIMITIVES.has(node.tagName)) continue;

      diagnostics.push({
        severity: 'error',
        message: `Unknown component '${node.tagName}'`,
        line: node.line,
        colStart: node.colStart,
        colEnd: node.colEnd,
      });
      continue;
    }

    const providedAttributes = Object.keys(node.attributes);

    // Check for missing required inputs
    for (const input of compSchema.inputs || []) {
      const isProvided = providedAttributes.some(attr => {
        const clean = attr.replace(/^\[|\]$|^\(|\)$/g, '');
        return clean === input.name;
      });

      if (input.required && !isProvided) {
        diagnostics.push({
          severity: 'warning',
          message: `Required input '${input.name}' is missing on '${node.tagName}'`,
          line: node.line,
          colStart: node.colStart,
          colEnd: node.colEnd,
        });
      }
    }

    // Validate each provided attribute
    for (const rawAttrName of providedAttributes) {
      const isOutputBinding = rawAttrName.startsWith('(') && rawAttrName.endsWith(')');
      const isInputBinding = rawAttrName.startsWith('[') && rawAttrName.endsWith(']');
      const cleanAttrName = rawAttrName.replace(/^\[|\]$|^\(|\)$/g, '');
      const attrCol = getAttrCol(lines, node.line, rawAttrName);

      if (isOutputBinding) {
        const outputSchema = (compSchema.outputs || []).find(o => o.name === cleanAttrName);
        if (!outputSchema) {
          diagnostics.push({
            severity: 'error',
            message: `Unknown output '${cleanAttrName}' on component '${node.tagName}'`,
            line: node.line,
            colStart: attrCol.colStart,
            colEnd: attrCol.colEnd,
          });
        }
        continue;
      }

      const inputSchema = (compSchema.inputs || []).find(i => i.name === cleanAttrName);

      if (!inputSchema) {
        diagnostics.push({
          severity: 'error',
          message: `Unknown input '${cleanAttrName}' on component '${node.tagName}'`,
          line: node.line,
          colStart: attrCol.colStart,
          colEnd: attrCol.colEnd,
        });
        continue;
      }

      // Bracket-bound inputs like [title]="someVar" are runtime expressions — skip type checking
      if (isInputBinding) continue;

      const rawValue = node.attributes[rawAttrName];
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
        // Real schema has literal unions like "\"lazy\" | \"eager\""
        // Strip quotes and split to support both base types and string literals
        const allowedTypes = inputSchema.type.replace(/['"]/g, '').split('|').map(s => s.trim());

        const isValidType =
          allowedTypes.includes('any') ||
          allowedTypes.includes(inferredType) ||
          allowedTypes.includes(rawValue); // catches literal matches like loading="lazy"

        if (!isValidType) {
          const valueCol = getAttrCol(lines, node.line, rawValue);
          diagnostics.push({
            severity: 'error',
            message: `Type mismatch on '${node.tagName}' input '${cleanAttrName}': expected ${inputSchema.type}, got ${inferredType}`,
            line: node.line,
            colStart: valueCol.colStart,
            colEnd: valueCol.colEnd,
          });
        }
      }
    }
  }

  return diagnostics;
}