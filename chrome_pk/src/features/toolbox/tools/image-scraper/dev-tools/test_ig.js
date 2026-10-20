const https = require('https');
const fs = require('fs');

const url = 'https://www.instagram.com/p/DZb6ozfmDqg/?img_index=1';

const req = https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers.location || '');
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Length:', data.length);
    fs.writeFileSync('scratch_ig.html', data);
    
    // 檢查是否有 cdninstagram 或 fbcdn
    const cdnMatches = data.match(/https:\/\/[^"'\s]+(?:cdninstagram|fbcdn)[^"'\s]+/g) || [];
    console.log('CDN matches:', cdnMatches.length);
    
    const unique = Array.from(new Set(cdnMatches.map(m => m.replace(/\\u0026/g, '&').replace(/&amp;/g, '&'))));
    console.log('Unique CDN URLs:', unique.length);
    
    // 檢查是否有 JSON 結構
    const jsonScripts = data.match(/<script[^>]*type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
    console.log('JSON Scripts:', jsonScripts.length);
    
    // 檢查是否有 shortcode 或 sidecar
    console.log('Contains sidecar:', data.includes('edge_sidecar_to_children'));
    console.log('Contains carousel_media:', data.includes('carousel_media'));
    console.log('Contains xdt_api:', data.includes('xdt_api'));
  });
});
