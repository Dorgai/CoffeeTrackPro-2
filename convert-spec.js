import markdownpdf from 'markdown-pdf';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mdContent = fs.readFileSync('Coffee_Supply_Chain_System_Specification.md', 'utf8');

markdownpdf()
  .from.string(mdContent)
  .to('Coffee_Supply_Chain_System_Specification.pdf', function () {
    console.log('Specification PDF has been generated successfully!');
  });