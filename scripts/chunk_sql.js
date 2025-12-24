import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sqlPath = path.resolve(__dirname, 'insert_exercises.sql');
const outputDir = path.resolve(__dirname, 'sql_chunks');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
const inserts = sqlContent.split('INSERT INTO exercises');

// First part is header/comments, skip or handle
// Re-add 'INSERT INTO exercises' to each part
const cleanInserts = inserts.slice(1).map(part => 'INSERT INTO exercises' + part);

console.log(`Found ${cleanInserts.length} inserts.`);

const BATCH_SIZE = 50;

for (let i = 0; i < cleanInserts.length; i += BATCH_SIZE) {
    const batch = cleanInserts.slice(i, i + BATCH_SIZE).join('\n');
    const chunkPath = path.resolve(outputDir, `chunk_${i / BATCH_SIZE}.sql`);
    fs.writeFileSync(chunkPath, batch);
    console.log(`Wrote ${chunkPath}`);
}
