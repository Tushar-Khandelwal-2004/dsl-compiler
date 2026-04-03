import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

// 1. Load the REAL schema you provided
const schemaPath = path.join(__dirname, '../fixtures/component-schema.json');
const realSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

describe('Real Schema Validation', () => {
  it('validates a correct template using real components', () => {
    // A template using actual components from your component-schema.json
    const source = `
      <if condition={true}>
        <free-tier-banner />
      </if>
      
      <editable-text 
        elementId="hero-title" 
        placeholder="Welcome to the shop" 
      />
      
      <responsive-img 
        src="/images/hero.jpg" 
        quality={90} 
      />
    `;

    const diagnostics = compile(source, realSchema);
    
    // We expect 0 errors because all tags, inputs, and types match your real schema!
    expect(diagnostics.length).toBe(0);
  });

  it('catches errors when using real components incorrectly', () => {
    const source = `
      <editable-text 
        wrongAttribute="test" 
        elementId={42} 
      />
    `;

    const diagnostics = compile(source, realSchema);
    
    // We expect 2 errors:
    // 1. 'wrongAttribute' does not exist on editable-text
    // 2. 'elementId' expects a string, but we gave it a number {42}
    expect(diagnostics.length).toBe(2);
    
    const messages = diagnostics.map(d => d.message);
    expect(messages.some(m => m.includes("Unknown input 'wrongAttribute'"))).toBe(true);
    expect(messages.some(m => m.includes("expected string, got number"))).toBe(true);
  });
});