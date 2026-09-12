const fs = require('fs');
const html = fs.readFileSync('scratch_ig.html', 'utf8');

// 檢查所有 image 相關 url
const urls = [];
const regex = /https:\/\/[^"'\s\\]+(?:cdninstagram|fbcdn)[^"'\s\\]+/g;
let match;
while ((match = regex.exec(html)) !== null) {
  let u = match[0].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
  // 去除轉義符號
  u = u.replace(/\\/g, '');
  if (!urls.includes(u)) {
    urls.push(u);
  }
}

console.log('Total URLs found:', urls.length);
urls.forEach((u, idx) => {
  console.log(`[${idx + 1}] ${u.slice(0, 120)}...`);
});
