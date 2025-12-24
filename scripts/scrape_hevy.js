
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
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 800 }
    });
    const page = await browser.newPage();

    try {
        console.log("Navigating to Hevy Public Library (hevyapp.com)...");
        await page.goto('https://www.hevyapp.com/exercises/', { waitUntil: 'networkidle2' });

        // Scroll to load all/more
        console.log("Scrolling to load ALL items (Mass Scrape)...");
        let previousHeight = 0;
        let noChangeCount = 0;

        // Scroll until no more content loads or max 200 scrolls
        for (let i = 0; i < 200; i++) {
            const currentHeight = await page.evaluate(() => document.body.scrollHeight);
            if (currentHeight === previousHeight) {
                noChangeCount++;
                if (noChangeCount > 5) break;
            } else {
                noChangeCount = 0;
            }
            previousHeight = currentHeight;

            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await new Promise(r => setTimeout(r, 600));

            if (i % 20 === 0) console.log(`Scroll ${i}...`);
        }

        // Get all exercise links
        const exerciseLinks = await page.evaluate(() => {
            const articles = Array.from(document.querySelectorAll('article.elementor-post'));
            return articles.map(art => {
                const link = art.querySelector('a');
                return link ? link.href : null;
            }).filter(Boolean);
        });

        // Unique
        const uniqueLinks = [...new Set(exerciseLinks)];

        console.log(`Found ${uniqueLinks.length} exercises. Processing ALL...`);

        for (let i = 0; i < uniqueLinks.length; i++) {
            const url = uniqueLinks[i];

            if (metadata.find(m => m.origin_url === url)) {
                // Optionally log less frequently
                if (i % 10 === 0) console.log(`Skipping known (${i}/${uniqueLinks.length})`);
                continue;
            }

            console.log(`Processing ${i}/${uniqueLinks.length}: ${url}`);
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Extract details
                const details = await page.evaluate(() => {
                    const titleEl = document.querySelector('h1.elementor-heading-title');
                    let title = titleEl ? titleEl.innerText : 'Unknown Exercise';
                    title = title.split(':')[0].split(' - ')[0].replace(/ How-to.*$/i, '').trim();

                    const videoEl = document.querySelector('video');
                    let videoSrc = null;
                    if (videoEl) {
                        videoSrc = videoEl.src;
                        if (!videoSrc && videoEl.querySelector('source')) {
                            videoSrc = videoEl.querySelector('source').src;
                        }
                    }

                    let steps = '';
                    const ol = document.querySelector('ol');
                    if (ol && ol.innerText.length > 20) {
                        steps = ol.innerText;
                    }
                    if (!steps) {
                        const headers = Array.from(document.querySelectorAll('h2, h3, h4'));
                        const execHeader = headers.find(h => h.innerText.toLowerCase().includes('execution'));
                        if (execHeader) {
                            let sibling = execHeader.parentElement.nextElementSibling || execHeader.closest('.elementor-widget')?.nextElementSibling;
                            let count = 0;
                            while (sibling && count < 5) {
                                if (sibling.innerText.trim().length > 10) {
                                    steps += sibling.innerText + '\n';
                                }
                                sibling = sibling.nextElementSibling;
                                count++;
                            }
                        }
                    }
                    if (!steps) {
                        const textWidgets = Array.from(document.querySelectorAll('.elementor-widget-text-editor'));
                        const numberedWidget = textWidgets.find(w => w.innerText.match(/[12]\.\s/));
                        if (numberedWidget) steps = numberedWidget.innerText;
                    }

                    return { title, videoSrc, steps: steps ? steps.trim() : '' };
                });

                if (details.videoSrc) {
                    const ext = path.extname(details.videoSrc).split('?')[0] || '.mp4';
                    const safeName = details.title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '_')
                        .replace(/^_+|_+$/g, '');

                    const filename = `${safeName}${ext}`;
                    const filePath = path.join(SAVE_DIR, filename);

                    if (!fs.existsSync(filePath)) {
                        console.log(`- Downloading: ${filename}`);
                        await downloadFile(details.videoSrc, filePath);
                    } else {
                        console.log(`- Found local: ${filename}`);
                    }

                    metadata.push({
                        id: 'hevy_public_' + Date.now() + '_' + i,
                        name: details.title,
                        video_local_path: `/exercises/hevy/${filename}`,
                        instructions: details.steps,
                        origin_url: url
                    });

                    fs.writeFileSync(META_FILE, JSON.stringify(metadata, null, 2));
                } else {
                    console.log(`- No video.`);
                }
            } catch (err) {
                console.error(`Error ${url}:`, err.message);
            }

            // 1s delay
            await new Promise(r => setTimeout(r, 1000));
        }

    } catch (e) {
        console.error("Scrape Error:", e);
    } finally {
        await browser.close();
    }
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
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

scrape();
