
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const updatedFile = path.join(__dirname, 'import_v3_mapping.sql');
const content = fs.readFileSync(updatedFile, 'utf8');

// Split by double newline (our separator in the import script)
const statements = content.split('\n\n').filter(s => s.trim().length > 0);

const CHUNK_SIZE = 10;
let chunkIndex = 1;

for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
    const chunk = statements.slice(i, i + CHUNK_SIZE).join('\n\n');
    const outName = `batch_v3_${chunkIndex}.sql`;
    fs.writeFileSync(outName, chunk);
    console.log(`Created ${outName} with ${Math.min(CHUNK_SIZE, statements.length - i)} statements.`);
    chunkIndex++;
}
