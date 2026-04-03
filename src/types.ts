export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  message: string;
  line: number;
}

export interface ComponentInput {
  name: string;
  type: string;
  required?: boolean;
}

export interface ComponentSchema {
  component: string;
  inputs: ComponentInput[];
}

export interface RawSchema {
  components: ComponentSchema[];
}