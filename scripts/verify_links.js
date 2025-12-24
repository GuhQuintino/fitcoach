import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function checkYouTube(url) {
    return new Promise((resolve) => {
        const videoId = getYouTubeId(url);
        if (!videoId) {
            resolve({ url, status: 'Invalid ID', valid: false });
            return;
        }

        // oEmbed is a reliable way to check existence without downloading page
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

        https.get(oembedUrl, (res) => {
            if (res.statusCode === 200) {
                resolve({ url, status: '200 OK', valid: true });
            } else {
                resolve({ url, status: res.statusCode + ' (Unavailable)', valid: false });
            }
        }).on('error', (e) => {
            resolve({ url, status: 'Error: ' + e.message, valid: false });
        });
    });
}

async function run() {
    // We will pass URLs via process args or just duplicate the list logic
    const jsonPath = path.resolve(__dirname, 'youtube_links.json');
    if (!fs.existsSync(jsonPath)) {
        console.log("No youtube_links.json found.");
        return;
    }
    const urlsToCheck = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log(`Checking ${urlsToCheck.length} YouTube Videos...`);

    const results = [];
    const CHUNK_SIZE = 5; // Smaller chunk for YouTube api

    for (let i = 0; i < urlsToCheck.length; i += CHUNK_SIZE) {
        const chunk = urlsToCheck.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(item => checkYouTube(item.video_url).then(res => ({ ...res, id: item.id })));
        const chunkResults = await Promise.all(promises);
        results.push(...chunkResults);

        // Brief pause to be nice
        await new Promise(r => setTimeout(r, 500));
    }

    const failed = results.filter(r => !r.valid);
    console.log(`\nSummary: ${results.length - failed.length} Valid, ${failed.length} Invalid`);

    if (failed.length > 0) {
        console.log("Failed IDs:");
        failed.forEach(f => console.log(`${f.id} | ${f.url} | ${f.status}`));

        // Write generated SQL to fix
        const sql = failed.map(f => `UPDATE exercises SET video_url = '' WHERE id = '${f.id}';`).join('\n');
        fs.writeFileSync(path.resolve(__dirname, 'fix_youtube.sql'), sql);
        console.log("\nGenerated fix_youtube.sql");
    }
}

run();
