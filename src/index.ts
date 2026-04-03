import { RawSchema, Diagnostic } from './types';
import { loadSchema } from './loader';
import { parseDSL } from './parser';
import { analyze } from './analyzer';

export { RawSchema, Diagnostic, ComponentSchema, ComponentInput } from './types';

export function compile(source: string, schema: RawSchema): Diagnostic[] {
  const schemaMap = loadSchema(schema);
  const nodes = parseDSL(source);
  return analyze(nodes, schemaMap);
}