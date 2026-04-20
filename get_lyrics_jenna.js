const https = require('https');
const url = "https://lrclib.net/api/search?track_name=The+Craving+(Jenna's+version)&artist_name=Twenty+One+Pilots";
https.get(url, { headers: {'User-Agent': 'Antigravity'} }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.length > 0 && json[0].syncedLyrics) {
                console.log(json[0].syncedLyrics);
            } else {
                console.log("No synced lyrics found");
            }
        } catch(e) {
            console.error(e);
        }
    });
});
