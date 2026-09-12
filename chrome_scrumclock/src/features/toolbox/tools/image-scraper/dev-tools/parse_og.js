const fs = require('fs');
const html = fs.readFileSync('scratch_ig.html', 'utf8');

const og = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
console.log('og:image:', og ? og[1] : 'null');

const metaImages = html.match(/content=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi);
console.log('meta images:', metaImages);

// 搜尋所有 jpg/png/webp
const allUrls = html.match(/https?:\/\/[^"'\s\\]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s\\]*)?/gi) || [];
console.log('All image-like URLs:', allUrls.length);
allUrls.forEach(u => console.log(u.slice(0, 100)));
