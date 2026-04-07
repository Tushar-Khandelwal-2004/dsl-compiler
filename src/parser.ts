import { XMLParser } from 'fast-xml-parser';

export interface ParsedNode {
  tagName: string;
  attributes: Record<string, string>;
  line: number;
  colStart: number;
  colEnd: number;
}

export function parseDSL(source: string): ParsedNode[] {
  const safeSource = source.replace(/=(\{[^}]+\})/g, '="$1"');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
  });

  let parsed: any[];
  try {
    parsed = parser.parse(safeSource);
  } catch {
    return [];
  }

  const nodes: ParsedNode[] = [];
  const lines = source.split('\n');

  // Pre-scan: for each tag name, record every position it appears at in order
  const occurrences = new Map<string, Array<{ line: number; colStart: number; colEnd: number }>>();

  lines.forEach((lineText, i) => {
    const tagRegex = /<([a-zA-Z][a-zA-Z0-9-]*)/g;
    let match;
    while ((match = tagRegex.exec(lineText)) !== null) {
      const tag = match[1];
      // match.index is the position of '<', so tag name starts one after that
      // +1 converts to 1-based column, another +1 skips the '<' character
      const colStart = match.index + 2;
      const colEnd = colStart + tag.length;
      if (!occurrences.has(tag)) occurrences.set(tag, []);
      occurrences.get(tag)!.push({ line: i + 1, colStart, colEnd });
    }
  });

  function getNextOccurrence(tagName: string) {
    const list = occurrences.get(tagName);
    return list && list.length > 0
      ? list.shift()!
      : { line: 1, colStart: 1, colEnd: 1 + tagName.length };
  }

  function walk(items: any[]) {
    if (!Array.isArray(items)) return;

    for (const item of items) {
      for (const key of Object.keys(item)) {
        if (key === ':@' || key === '#text' || key.startsWith('?')) continue;

        const tagName = key;
        const rawAttributes = item[':@'] || {};

        const attributes: Record<string, string> = {};
        for (const [attrName, attrValue] of Object.entries(rawAttributes)) {
          attributes[attrName] = String(attrValue);
        }

        const { line, colStart, colEnd } = getNextOccurrence(tagName);
        nodes.push({ tagName, attributes, line, colStart, colEnd });

        if (Array.isArray(item[tagName])) {
          walk(item[tagName]);
        }
      }
    }
  }

  walk(parsed);
  return nodes;
}