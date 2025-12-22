
import https from 'https';
import fs from 'fs';

const DATA_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

const fetchJson = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
};

fetchJson(DATA_URL).then(data => {
    const names = data.map(e => e.name).sort();
    fs.writeFileSync('all_exercises.txt', names.join('\n'));
    console.log('Saved all_exercises.txt');
});
