import { XMLParser } from 'fast-xml-parser';

export interface ParsedNode {
  tagName: string;
  attributes: Record<string, string>;
  line: number;
}

export function parseDSL(source: string): ParsedNode[] {
  const safeSource = source.replace(/=(\{[^}]+\})/g, '="$1"');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    preserveOrder: true,
  });

  let parsed: any[];
  try {
    parsed = parser.parse(safeSource);
  } catch (error) {
    return [];
  }

  const nodes: ParsedNode[] = [];
  const lines = source.split('\n');
  
  const lineOccurrences = new Map<string, number[]>();
  lines.forEach((line, i) => {
    const tagRegex = /<([a-zA-Z][a-zA-Z0-9-]*)/g;
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
      const tag = match[1];
      if (!lineOccurrences.has(tag)) lineOccurrences.set(tag, []);
      lineOccurrences.get(tag)!.push(i + 1);
    }
  });

  function getNextLine(tagName: string): number {
    const tagLines = lineOccurrences.get(tagName);
    return tagLines && tagLines.length > 0 ? tagLines.shift()! : 1;
  }

  function walk(items: any[]) {
    if (!Array.isArray(items)) return;

    for (const item of items) {
      const keys = Object.keys(item);
      
      for (const key of keys) {
        if (key === ':@' || key === '#text' || key.startsWith('?')) continue;

        const tagName = key;
        const rawAttributes = item[':@'] || {};
        
        const attributes: Record<string, string> = {};
        for (const [attrName, attrValue] of Object.entries(rawAttributes)) {
          attributes[attrName] = String(attrValue);
        }

        nodes.push({
          tagName,
          attributes,
          line: getNextLine(tagName)
        });

        if (Array.isArray(item[tagName])) {
          walk(item[tagName]);
        }
      }
    }
  }

  walk(parsed);
  return nodes;
}