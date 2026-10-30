import { ScriptItem } from './types';

export const PRESET_SCRIPTS: ScriptItem[] = [
  {
    id: 'pikpak-dfs-crawler',
    title: 'PikPak 分享目錄遞迴檢索爬蟲 (DFS)',
    description: '深入遍歷 PikPak 分享連結內的所有子資料夾與分頁，匯整完整檔案樹與大小清單。',
    category: 'pikpak',
    targetUrlPattern: '*://mypikpak.com/s/*',
    isPreset: true,
    version: '1.1.0',
    changelog: ['1.0.0: 初始版本，DFS 遞迴遍歷', '1.1.0: 支援分頁翻頁與 Token 刷新'],
    createdAt: 1730160000000,
    updatedAt: 1730160000000,
    code: `(async () => {
  const url = window.location.href;
  console.log('[ScriptRunner] 開始執行 PikPak 分享目錄遞迴檢索...');

  // 1. 驗證是否在 PikPak 分享頁面
  const shareMatch = url.match(/\\/s\\/([a-zA-Z0-9_\\-]+)/);
  if (!shareMatch) {
    return {
      error: '請在 PikPak 分享頁面 (如 https://mypikpak.com/s/xxxx) 執行此腳本',
      currentUrl: url
    };
  }

  const shareId = shareMatch[1];
  const urlParams = new URLSearchParams(window.location.search);
  const passCode = urlParams.get('pwd') || urlParams.get('pass_code') || '';

  // 2. 獲取本地驗證 Token (若有登入)
  let token = '';
  try {
    const rawAuth = localStorage.getItem('credentials') || localStorage.getItem('token') || localStorage.getItem('access_token');
    if (rawAuth) {
      if (rawAuth.startsWith('{')) {
        const parsed = JSON.parse(rawAuth);
        token = parsed.access_token || parsed.token || '';
      } else {
        token = rawAuth;
      }
    }
  } catch (e) {
    console.warn('讀取本地 Token 失敗:', e);
  }

  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = \`Bearer \${token}\`;
  }

  const allFiles = [];
  const folders = [];
  let totalBytes = 0;

  // 3. DFS 遞迴走訪目錄
  async function traverseFolder(folderId = '', folderPath = '/') {
    let pageToken = '';
    let page = 1;

    do {
      let apiUrl = \`https://api-drive.mypikpak.com/drive/v1/share?share_id=\${encodeURIComponent(shareId)}&limit=100\`;
      if (folderId) {
        apiUrl += \`&parent_id=\${encodeURIComponent(folderId)}\`;
      }
      if (pageToken) {
        apiUrl += \`&page_token=\${encodeURIComponent(pageToken)}\`;
      }
      if (passCode) {
        apiUrl += \`&pass_code=\${encodeURIComponent(passCode)}\`;
      }

      console.log(\`[PikPak Crawler] 正在檢索目錄: \${folderPath} (第 \${page} 頁)...\`);
      const resp = await fetch(apiUrl, { headers });
      if (!resp.ok) {
        throw new Error(\`API 請求失敗: HTTP \${resp.status} - \${resp.statusText}\`);
      }

      const data = await resp.json();
      const items = data.files || data.file_list || [];

      for (const item of items) {
        const isFolder = item.kind === 'drive#folder' || item.mime_type === 'application/vnd.google-apps.folder' || !item.size;
        const currentItemPath = \`\${folderPath}\${item.name}\${isFolder ? '/' : ''}\`;

        if (isFolder) {
          folders.push({
            id: item.id,
            name: item.name,
            path: currentItemPath,
            parentId: folderId
          });
          // 深入子資料夾
          await traverseFolder(item.id, currentItemPath);
        } else {
          const size = parseInt(item.size || '0', 10);
          totalBytes += size;
          allFiles.push({
            id: item.id,
            name: item.name,
            size,
            sizeFormatted: (size / (1024 * 1024)).toFixed(2) + ' MB',
            mimeType: item.mime_type || '',
            path: currentItemPath,
            parentId: folderId,
            webContentLink: item.web_content_link || '',
            thumbnailLink: item.thumbnail_link || '',
            createdTime: item.created_time || item.created_at
          });
        }
      }

      pageToken = data.next_page_token || '';
      page++;
    } while (pageToken);
  }

  try {
    await traverseFolder('', '/');
    return {
      success: true,
      shareId,
      summary: {
        totalFolders: folders.length,
        totalFiles: allFiles.length,
        totalSizeFormatted: (totalBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
        totalBytes
      },
      files: allFiles,
      folders
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      partialFilesCount: allFiles.length
    };
  }
})()`
  },
  {
    id: 'page-links-headings-extractor',
    title: '網頁標題階層與超連結結構化抽取器',
    description: '抓取當前頁面所有 H1~H6 大綱結構與所有外連/內連網址，便於整理文章脈絡。',
    category: 'scraper',
    isPreset: true,
    version: '1.0.0',
    changelog: ['1.0.0: 初始版本'],
    createdAt: 1730160000000,
    updatedAt: 1730160000000,
    code: `(() => {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
    tag: h.tagName.toLowerCase(),
    text: h.textContent.trim(),
    id: h.id || ''
  })).filter(h => h.text.length > 0);

  const links = Array.from(document.querySelectorAll('a[href]')).map(a => {
    const href = a.getAttribute('href');
    return {
      text: a.textContent.trim() || a.getAttribute('title') || '',
      url: a.href,
      rawHref: href,
      isExternal: a.hostname !== window.location.hostname
    };
  }).filter(l => l.url.startsWith('http'));

  return {
    pageTitle: document.title,
    url: window.location.href,
    summary: {
      totalHeadings: headings.length,
      totalLinks: links.length,
      externalLinks: links.filter(l => l.isExternal).length
    },
    headings,
    links: links.slice(0, 300) // 限制前 300 筆避免過大
  };
})()`
  },
  {
    id: 'page-media-inspector',
    title: '頁面媒體 (圖片/影片) 規格掃描器',
    description: '掃描目前頁面載入的所有 <img>、<video> 資源與真實渲染尺寸與來源。',
    category: 'scraper',
    isPreset: true,
    version: '1.0.0',
    changelog: ['1.0.0: 初始版本'],
    createdAt: 1730160000000,
    updatedAt: 1730160000000,
    code: `(() => {
  const images = Array.from(document.querySelectorAll('img')).map(img => ({
    src: img.currentSrc || img.src,
    alt: img.alt || '',
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    displayWidth: img.clientWidth,
    displayHeight: img.clientHeight
  })).filter(img => img.src && !img.src.startsWith('data:'));

  const videos = Array.from(document.querySelectorAll('video')).map(v => ({
    src: v.currentSrc || v.src || Array.from(v.querySelectorAll('source')).map(s => s.src).join(', '),
    poster: v.poster || '',
    duration: v.duration || 0,
    videoWidth: v.videoWidth,
    videoHeight: v.videoHeight
  }));

  return {
    pageUrl: window.location.href,
    summary: {
      imageCount: images.length,
      videoCount: videos.length
    },
    images: images.slice(0, 100),
    videos
  };
})()`
  },
  {
    id: 'page-performance-metrics',
    title: '頁面載入效能與資源載入耗時分析',
    description: '讀取 PerformanceNavigationTiming 分析 DNS、TCP、TTFB 及頁面加載關鍵耗時。',
    category: 'utility',
    isPreset: true,
    version: '1.0.0',
    changelog: ['1.0.0: 初始版本'],
    createdAt: 1730160000000,
    updatedAt: 1730160000000,
    code: `(() => {
  const perf = window.performance;
  if (!perf) return { error: 'Performance API 不被支援' };

  const [nav] = perf.getEntriesByType('navigation');
  if (!nav) return { error: '未獲取到 Navigation Timing 資訊' };

  return {
    url: window.location.href,
    timingMs: {
      dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
      tcp: Math.round(nav.connectEnd - nav.connectStart),
      ssl: nav.secureConnectionStart ? Math.round(nav.connectEnd - nav.secureConnectionStart) : 0,
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      download: Math.round(nav.responseEnd - nav.responseStart),
      domInteractive: Math.round(nav.domInteractive),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      completeLoad: Math.round(nav.loadEventEnd - nav.startTime)
    },
    resourceCount: perf.getEntriesByType('resource').length
  };
})()`
  }
];

