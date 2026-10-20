const fs = require('fs');
const html = fs.readFileSync('scratch_ig.html', 'utf8');

const regex = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = regex.exec(html)) !== null) {
  count++;
  const content = match[1];
  try {
    const data = JSON.parse(content);
    const str = JSON.stringify(data);
    // 檢查是否有包含 jpg/webp/display_url/image_versions
    if (str.includes('.jpg') || str.includes('.webp') || str.includes('cdninstagram') || str.includes('fbcdn')) {
      console.log(`Script #${count} contains image links! length: ${str.length}`);
      // 搜尋所有 cdn 連結
      const cdnLinks = str.match(/https:\/\/[^"'\s\\]+?(?:cdninstagram|fbcdn)[^"'\s\\]+?\.(?:jpg|jpeg|webp)/g) || [];
      console.log(`  Found ${cdnLinks.length} images in script #${count}`);
      if (cdnLinks.length > 0) {
        console.log('  Samples:', cdnLinks.slice(0, 3));
      }
    }
  } catch (e) {
    // ignore
  }
}
console.log('Done scanning', count, 'json scripts.');
