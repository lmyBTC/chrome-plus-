const https = require('https');
const shortcode = 'DbPu-KzvdnG';
const url = 'https://www.instagram.com/p/' + shortcode + '/embed/captioned/';

https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  }
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('Embed Status:', res.statusCode, 'Length:', data.length);
    console.log('Contains video_url:', data.includes('video_url'));
    console.log('Contains shortcode:', data.includes(shortcode));
    
    // 尋找 video_url
    const vMatch = data.match(/"video_url":"([^"]+)"/);
    if (vMatch) {
      const vUrl = JSON.parse('"' + vMatch[1] + '"');
      console.log('FOUND VIDEO URL in embed:', vUrl.slice(0, 120));
    } else {
      console.log('No video_url pattern found');
    }

    const mp4Matches = data.match(/https:\/\/[^"'\s\\<>]+\.mp4(?:\?[^"'\s\\<>]*)?/gi) || [];
    console.log('mp4 count:', mp4Matches.length);
    mp4Matches.slice(0, 3).forEach(m => console.log('mp4:', m.replace(/\\u0026/g, '&').slice(0, 120)));
  });
});
