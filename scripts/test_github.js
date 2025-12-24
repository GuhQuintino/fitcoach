async function testGithubUrl() {
    // Attempting a common repo found in search results or heuristics
    // yuhonas/free-exercise-db is a known one, usually has 'exercises' or 'gifs' folder.
    // Let's try a few standard paths.

    const paths = [
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises/0001.gif",
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/0001.gif",
        "https://github.com/yuhonas/free-exercise-db/raw/main/exercises/0001.gif" // redirect check
    ];

    for (const url of paths) {
        console.log(`Testing ${url}...`);
        try {
            const response = await fetch(url, { method: 'HEAD' });
            console.log(`Status: ${response.status}`);
            if (response.ok) {
                console.log(`✅ FOUND! ${url}`);
                return;
            }
        } catch (e) {
            console.error("Error:", e.message);
        }
    }
    console.log("❌ No working GitHub URL found yet.");
}

testGithubUrl();
