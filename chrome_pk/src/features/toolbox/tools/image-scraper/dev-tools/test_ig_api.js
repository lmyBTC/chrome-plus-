const https = require('https');

const shortcode = 'DZb6ozfmDqg';
const testUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;

const req = https.get(testUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'x-ig-app-id': '936619743392459',
    'Accept': 'application/json'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Length:', data.length);
    try {
      const json = JSON.parse(data);
      console.log('JSON keys:', Object.keys(json));
      if (json.items && json.items[0]) {
        const item = json.items[0];
        console.log('carousel_media_count:', item.carousel_media_count);
        if (item.carousel_media) {
          console.log('carousel_media length:', item.carousel_media.length);
          item.carousel_media.forEach((m, idx) => {
            const bestImg = m.image_versions2?.candidates?.[0];
            console.log(`Image ${idx + 1}: ${bestImg?.width}x${bestImg?.height} -> ${bestImg?.url?.slice(0, 80)}`);
          });
        }
      }
    } catch (e) {
      console.log('Not valid JSON or error:', e.message);
      console.log('First 200 chars:', data.slice(0, 200));
    }
  });
});
