import { describe, it } from 'vitest';
import { compile } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(__dirname, '../fixtures/component-schema.json');
const realSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

describe('External HTML File Validation', () => {

  it('reads and validates an external HTML file', () => {
    const htmlFilePath = path.join(__dirname, '../fixtures/home.html');
    const htmlSource = fs.readFileSync(htmlFilePath, 'utf-8');

    const result = compile(htmlSource, realSchema);

    console.log('\n--- COMPILER RESULTS FOR HTML FILE ---');

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log('No errors or warnings found.');
    }

    if (result.errors.length > 0) {
      console.log('\nERRORS:');
      result.errors.forEach(d => {
        console.log(`  [Line ${d.line}, Col ${d.colStart}-${d.colEnd}] ${d.message}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\nWARNINGS:');
      result.warnings.forEach(d => {
        console.log(`  [Line ${d.line}, Col ${d.colStart}-${d.colEnd}] ${d.message}`);
      });
    }

    console.log('--------------------------------------\n');
  });

});