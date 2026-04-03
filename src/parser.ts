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
    let currentLineSearchStart = 0;

    function findLine(tagName: string): number {
        const searchStr = `<${tagName}`;
        for (let i = currentLineSearchStart; i < lines.length; i++) {
            if (lines[i].includes(searchStr)) {
                currentLineSearchStart = i;
                return i + 1;
            }
        }
        return 1;
    }

    function walk(items: any[]) {
        if (!Array.isArray(items)) return;

        for (const item of items) {
            const keys = Object.keys(item);

            for (const key of keys) {
                if (key === ':@' || key === '#text') continue;

                const tagName = key;
                const rawAttributes = item[':@'] || {};

                const attributes: Record<string, string> = {};
                for (const [attrName, attrValue] of Object.entries(rawAttributes)) {
                    attributes[attrName] = String(attrValue);
                }

                nodes.push({
                    tagName,
                    attributes,
                    line: findLine(tagName)
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