import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


async function checkUrl(url) {
    if (!url) return false;
    // Local files (start with /)
    if (url.startsWith('/')) {
        const publicPath = path.resolve(__dirname, '../public', url.substring(1)); // Remove leading slash
        return fs.existsSync(publicPath);
    }
    // External
    return new Promise((resolve) => {
        const req = https.request(url, { method: 'HEAD', timeout: 3000 }, (res) => {
            if (res.statusCode === 200) {
                const type = res.headers['content-type'];
                // Accept images or video content types
                if (type && (type.startsWith('image') || type.startsWith('video'))) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.abort(); resolve(false); });
        req.end();
    });
}

function getEmbeddedImage(description) {
    if (!description) return null;
    const match = description.match(/!\[Demonstration\]\(([^)]+)\)/);
    return match ? match[1] : null;
}


async function audit() {
    console.log("Reading exercises from final_exercises.json...");
    const jsonPath = path.resolve(__dirname, 'final_exercises.json');
    if (!fs.existsSync(jsonPath)) {
        console.error("Dump file not found!");
        return;
    }
    const exercises = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log(`Auditing ${exercises.length} exercises...`);
    const toDelete = [];
    const valid = [];
    const missingLocal = [];

    // Parallel processing with concurrency limit
    const BATCH_SIZE = 20;
    for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
        const batch = exercises.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (ex) => {
            let reason = null;

            // Media Check only
            const vidUrl = ex.video_url;
            let hasValidMedia = false;

            if (vidUrl) {
                if (await checkUrl(vidUrl)) {
                    hasValidMedia = true;
                } else {
                    console.log(`Failed URL: ${vidUrl} (${ex.name})`);
                    if (vidUrl.startsWith('/')) missingLocal.push(ex.name);
                }
            } else {
                // Check if image embedded? (In this list we only have video_url)
                // But we saw in previous step that exercises with empty video had no image either, except if we fetched it.
                // We will assume empty video = invalid unless verified otherwise.
                reason = "No Video URL";
            }

            if (!hasValidMedia && !reason) {
                reason = "Invalid Media";
            }

            if (reason) {
                toDelete.push({ id: ex.id, name: ex.name, reason });
            } else {
                valid.push(ex.name);
            }
            process.stdout.write(".");
        }));
    }

    console.log(`\nAudit Complete.`);
    console.log(`Valid: ${valid.length}`);
    console.log(`To Delete: ${toDelete.length}`);

    fs.writeFileSync(path.resolve(__dirname, 'audit_results.json'), JSON.stringify(toDelete, null, 2));

    if (toDelete.length > 0) {
        console.log("\nExercises to Delete/Fix:");
        toDelete.forEach(d => console.log(`- ${d.name} (${d.reason})`));
    }
}


audit();
