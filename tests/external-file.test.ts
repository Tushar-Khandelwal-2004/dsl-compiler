import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

// 1. Load your schema
const schemaPath = path.join(__dirname, '../fixtures/component-schema.json');
const realSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

describe('External HTML File Validation', () => {

  it('reads and validates an external HTML file', () => {
    // 2. Point this to your actual HTML file
    const htmlFilePath = path.join(__dirname, '../fixtures/home.html');
    
    // 3. Read the file contents into a string
    const htmlSource = fs.readFileSync(htmlFilePath, 'utf-8');

    // 4. Run the compiler
    const diagnostics = compile(htmlSource, realSchema);
    
    // 5. Print the results so you can see them!
    console.log('\n--- COMPILER RESULTS FOR HTML FILE ---');
    if (diagnostics.length === 0) {
      console.log('✅ Success! No errors found in your HTML file.');
    } else {
      diagnostics.forEach(d => {
        console.log(`[Line ${d.line}] ${d.severity.toUpperCase()}: ${d.message}`);
      });
    }
    console.log('--------------------------------------\n');
    
    // If you want the test to formally pass only when there are 0 errors, keep this:
    // expect(diagnostics.length).toBe(0); 
  });

});