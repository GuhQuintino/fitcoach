async function testUrl() {
    const url = "https://d205bpvrqc9yn1.cloudfront.net/0001.gif";
    console.log(`Testing ${url}...`);
    try {
        const response = await fetch(url, { method: 'HEAD' });
        console.log(`Status: ${response.status}`);
        if (response.ok) {
            console.log("✅ CloudFront URL is valid!");
        } else {
            console.log("❌ URL not found.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testUrl();
