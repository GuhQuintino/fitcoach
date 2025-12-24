
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAVE_DIR = path.resolve(__dirname, '../public/exercises/hevy');
if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
}

const META_FILE = path.resolve(__dirname, 'hevy_metadata.json');
let metadata = [];
if (fs.existsSync(META_FILE)) {
    try {
        metadata = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    } catch (e) {
        metadata = [];
    }
}

async function scrape() {
    console.log("Launching browser with Persistence...");
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: './hevy_user_data',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--maximize-window'],
        defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    try {
        console.log("Navigating to https://hevy.com/exercise ...");
        await page.goto('https://hevy.com/exercise', { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log("Waiting 10s for auth check/load...");
        await new Promise(r => setTimeout(r, 10000));

        // Find items (classes or images)
        const items = await page.evaluate(() => {
            // Priority: .flxnGm class
            const els = Array.from(document.querySelectorAll('.flxnGm'));
            if (els.length > 0) return els.map((e, i) => ({ type: 'class', index: i, sel: '.flxnGm' }));

            // Fallback: Cloudfront images (exercise thumbs)
            const imgs = Array.from(document.querySelectorAll('img[src*="cloudfront"]'));
            // Dedupe?
            return imgs.map((e, i) => ({ type: 'img', index: i, sel: 'img[src*="cloudfront"]' }));
        });

        console.log(`Found ${items.length} items to process.`);

        const limit = Math.min(items.length, 500);

        for (let i = 0; i < limit; i++) {
            console.log(`Processing item ${i}...`);

            // Click item
            const success = await page.evaluate((itemInfo) => {
                try {
                    const els = document.querySelectorAll(itemInfo.sel);
                    if (els[itemInfo.index]) {
                        els[itemInfo.index].click();
                        return true;
                    }
                } catch (e) { return false; }
                return false;
            }, items[i]);

            if (!success) continue;

            // Wait for Detail URL
            try {
                await page.waitForFunction(() => location.href.includes('/exercise/'), { timeout: 4000 });

                // Click "How to"
                const howToClicked = await page.evaluate(() => {
                    const ps = Array.from(document.querySelectorAll('p, div'));
                    const tab = ps.find(p => p.innerText.trim() === 'How to' || p.innerText.trim() === 'How To');
                    if (tab) { tab.click(); return true; }
                    return false;
                });
                if (howToClicked) await new Promise(r => setTimeout(r, 600));

                // Scrape Details
                const details = await page.evaluate(() => {
                    // Title: Look for H2 that is meaningful (longest usually is the name)
                    const h2s = Array.from(document.querySelectorAll('h2'));
                    // Sort by length desc, usually name is longest header on page, "Exercise" is short
                    h2s.sort((a, b) => b.innerText.length - a.innerText.length);

                    let title = 'Unknown';
                    const bestH2 = h2s.find(h => {
                        const t = h.innerText.trim();
                        return t !== 'Exercise' && t !== 'Exercises' && t !== 'Hevy' && !t.includes('Feed') && !t.includes('Profile');
                    });

                    if (bestH2) title = bestH2.innerText.trim();

                    const video = document.querySelector('video');
                    let videoSrc = video ? (video.src || video.querySelector('source')?.src) : null;

                    let steps = '';
                    const instructionsHeader = Array.from(document.querySelectorAll('*')).find(el => el.innerText === 'Instructions' || el.innerText === 'Execution');
                    if (instructionsHeader) {
                        let sibling = instructionsHeader.nextElementSibling;
                        if (sibling) steps = sibling.innerText;
                    }
                    // Fallback instructions
                    if (!steps) {
                        const blocks = Array.from(document.querySelectorAll('p')).filter(p => p.innerText.length > 50);
                        if (blocks.length) steps = blocks[0].innerText;
                    }

                    return { title, videoSrc, steps };
                });

                // Valid Check
                if (details.title === 'Unknown' || details.title === 'Exercise') {
                    console.log(`- Skipping: Invalid title '${details.title}'`);
                } else if (details.videoSrc && details.videoSrc.endsWith('.mp4')) {
                    console.log(`- Found: ${details.title}`);
                    const safeName = details.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                    const filename = `${safeName}.mp4`;
                    const filePath = path.join(SAVE_DIR, filename);

                    if (!fs.existsSync(filePath)) {
                        console.log(`  Downloading...`);
                        await downloadFile(details.videoSrc, filePath);
                    } else {
                        console.log(`  Exists.`);
                    }

                    const exists = metadata.find(m => m.name === details.title);
                    if (!exists) {
                        metadata.push({
                            id: 'hevy_spa_' + Date.now(),
                            name: details.title,
                            video_local_path: `/exercises/hevy/${filename}`,
                            instructions: details.steps,
                            origin_url: page.url()
                        });
                        fs.writeFileSync(META_FILE, JSON.stringify(metadata, null, 2));
                    }
                } else {
                    console.log(`- No MP4.`);
                }

            } catch (e) {
                console.log(`Error ${i}: ${e.message}`);
            }

            // Go Back
            await page.goBack();
            // Important: Wait for list to reappear
            try {
                await page.waitForFunction(() => document.querySelectorAll('.flxnGm').length > 0 || document.querySelectorAll('img').length > 10, { timeout: 6000 });
            } catch (e) { }
        }
    } catch (e) { console.error(e); }
    finally { await browser.close(); }
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', (err) => { fs.unlink(dest, () => { }); reject(err); });
    });
}

scrape();
