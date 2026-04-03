import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

// Load our dummy schema directly from the file system for testing
const schemaPath = path.join(__dirname, '../fixtures/schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

describe('DSL Compiler MVP', () => {
  it('passes a valid template with no diagnostics', () => {
    const source = `
      <card-component title="Hello World" count={42} visible={true} />
      <back-button-1 fallbackUrl="/home" />
    `;
    const diagnostics = compile(source, schema);
    expect(diagnostics.length).toBe(0);
  });

  it('catches unknown components (Check 1)', () => {
    const source = `<unknown-component />`;
    const diagnostics = compile(source, schema);
    
    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].message).toContain("Unknown component 'unknown-component'");
  });

  it('catches unknown inputs (Check 2)', () => {
    const source = `<back-button-1 badInput="test" />`;
    const diagnostics = compile(source, schema);
    
    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].message).toContain("Unknown input 'badInput'");
  });

  it('catches wrong types (Check 3)', () => {
    // 'title' expects a string, but we pass a number {42}
    const source = `<card-component title={42} />`;
    const diagnostics = compile(source, schema);
    
    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].message).toContain("expected string, got number");
  });

  it('catches missing required inputs (Check 4)', () => {
    // 'card-component' requires 'title'
    const source = `<card-component count={10} />`;
    const diagnostics = compile(source, schema);
    
    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].severity).toBe('warning');
    expect(diagnostics[0].message).toContain("Required input 'title' is missing");
  });

  it('ignores type checking for expression variables', () => {
    // 'title' expects a string, but we pass a variable reference {myVar}
    const source = `<card-component title={myVar} />`;
    const diagnostics = compile(source, schema);
    
    expect(diagnostics.length).toBe(0); // Should pass cleanly
  });
});