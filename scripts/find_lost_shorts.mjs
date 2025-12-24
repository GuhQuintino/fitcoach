
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
    const rawPath = path.resolve(__dirname, '../raw_exercises_dump.json');
    if (!fs.existsSync(rawPath)) {
        console.log("No dump file found.");
        return;
    }
    const allExercises = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

    // Filter for Shorts or YouTube links that might have been deleted
    // The user specifically mentioned "You removed some that had valid YouTube shorts"
    const candidates = allExercises.filter(ex =>
        ex.video_url &&
        (ex.video_url.includes('/shorts/') || ex.video_url.includes('youtube.com'))
    );

    console.log(`Found ${candidates.length} exercises with YouTube/Shorts in the dump.`);

    // We need to check which ones are NOT in the DB.
    // I'll print them out. Since we can't easily check DB from here without auth (fetch failed before), 
    // I'll list them and we can check against the known "survivors" list or just generate Insert statements 
    // using ON CONFLICT DO NOTHING (if ID is preserved) to be safe.

    const sqlStatements = candidates.map(ex => {
        // Escape single quotes for SQL
        const name = ex.name.replace(/'/g, "''");
        const description = ex.description ? ex.description.replace(/'/g, "''") : '';
        const video_url = ex.video_url.replace(/'/g, "''");

        return `INSERT INTO exercises (id, name, description, video_url, is_public) 
VALUES ('${ex.id}', '${name}', '${description}', '${video_url}', true)
ON CONFLICT (id) DO UPDATE SET video_url = EXCLUDED.video_url;`;
    });

    console.log("Generating restore_shorts.sql with " + sqlStatements.length + " statements.");
    fs.writeFileSync(path.resolve(__dirname, 'restore_shorts.sql'), sqlStatements.join('\n'));

    // List names for log
    candidates.forEach(c => console.log(`- ${c.name}: ${c.video_url}`));
}

run();
