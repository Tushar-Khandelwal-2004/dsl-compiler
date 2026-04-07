export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  message: string;
  line: number;
  colStart: number;
  colEnd: number;
}

export interface CompilationResult {
  errors: Diagnostic[];
  warnings: Diagnostic[];
}

export interface ComponentInput {
  name: string;
  type: string;
  required?: boolean;
}

export interface ComponentOutput {
  name: string;
  type: string;
}

export interface ComponentSchema {
  component: string;
  inputs: ComponentInput[];
  outputs?: ComponentOutput[];
}

export interface RawSchema {
  components: ComponentSchema[];
}