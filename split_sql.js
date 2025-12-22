
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.join(process.cwd(), 'reimport_priority.sql');
const content = fs.readFileSync(sqlPath, 'utf8');

const statements = content.split('\n\n').filter(s => s.trim().length > 0);

const CHUNK_SIZE = 10;
let chunkIndex = 1;

for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
    const chunk = statements.slice(i, i + CHUNK_SIZE).join('\n\n');
    const outName = `batch_${chunkIndex}.sql`;
    fs.writeFileSync(outName, chunk);
    console.log(`Created ${outName} with ${Math.min(CHUNK_SIZE, statements.length - i)} statements.`);
    chunkIndex++;
}
