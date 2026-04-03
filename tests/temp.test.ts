import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

// Load your real schema
const schemaPath = path.join(__dirname, '../fixtures/component-schema.json');
const realSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

describe('Real HTML Templates Validation', () => {

  it('passes a completely valid HTML-like storefront page', () => {
    const validSource = `
      <header-context />
      
      <let name="isReady" value={true} />
      
      <if condition={isReady}>
        <free-tier-banner />
      </if>

      <block key="hero-section" name="Hero" description="Main hero area" publish={false} display={true}>
        <editable-text 
          elementId="main-hero-title" 
          placeholder="Welcome to our awesome store!" 
        />
        
        <responsive-img 
          src="/assets/hero-banner.jpg" 
          quality={90} 
          sizes="100vw"
        />
      </block>
    `;

    const diagnostics = compile(validSource, realSchema);
    
    // Log the diagnostics to the console so you can see if anything failed unexpectedly!
    if (diagnostics.length > 0) {
      console.log("Unexpected errors in valid template:", diagnostics);
    }
    
    expect(diagnostics.length).toBe(0);
  });

  it('catches multiple mistakes in a broken storefront page', () => {
    const invalidSource = `
      <made-up-component />

      <block key="broken-section" name="Broken" description="Broken area" publish={false} display={true}>
        
        <responsive-img 
          src={42} 
          foo="bar" 
          quality={80} 
        />
        
        <if condition="yes">
          <free-tier-banner />
        </if>

      </block>
    `;

    const diagnostics = compile(invalidSource, realSchema);
    
    // Let's print the errors to the terminal so you can see the compiler working
    console.log('\n--- COMPILER DIAGNOSTICS FOR BROKEN TEMPLATE ---');
    diagnostics.forEach(d => {
      console.log(`[Line ${d.line}] ${d.severity.toUpperCase()}: ${d.message}`);
    });
    console.log('------------------------------------------------\n');
    
    expect(diagnostics.length).toBeGreaterThan(0);
    
    // Extract just the messages to verify our checks fired
    const messages = diagnostics.map(d => d.message);
    
    // Verify Check 1: Unknown component
    expect(messages.some(m => m.includes("Unknown component 'made-up-component'"))).toBe(true);
    
    // Verify Check 2: Unknown input
    expect(messages.some(m => m.includes("Unknown input 'foo'"))).toBe(true);
    
    // Verify Check 3: Wrong type (src)
    expect(messages.some(m => m.includes("expected string, got number"))).toBe(true);
  });
});