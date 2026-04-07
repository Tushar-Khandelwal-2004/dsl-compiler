import { RawSchema, CompilationResult } from './types';
import { loadSchema } from './loader';
import { parseDSL } from './parser';
import { analyze } from './analyzer';

export { RawSchema, CompilationResult, Diagnostic, ComponentSchema, ComponentInput } from './types';

export function compile(source: string, schema: RawSchema): CompilationResult {
  const schemaMap = loadSchema(schema);
  const nodes = parseDSL(source);
  const diagnostics = analyze(nodes, schemaMap, source);

  return {
    errors:   diagnostics.filter(d => d.severity === 'error'),
    warnings: diagnostics.filter(d => d.severity === 'warning'),
  };
}