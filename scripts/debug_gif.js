import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

async function debugGif() {
    const apiKey = env.EXERCISEDB_API_KEY;
    if (!apiKey) {
        console.error("No API Key");
        return;
    }

    const id = "0001";
    const url = `https://exercisedb.p.rapidapi.com/exercises/exercise/${id}`;

    console.log(`Fetching details for ${id}...`);
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            console.error(response.status, response.statusText);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log("Keys:", Object.keys(data));
        console.log("gifUrl:", data.gifUrl);

    } catch (e) {
        console.error(e);
    }
}

debugGif();
