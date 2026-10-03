/**
 * domain-classifier.js - 工作 vs 休閒與靜態資源智慧分類字典模組 (AM-V01)
 * 專為 PM 敏捷工作流打造，提供高頻網域秒級標籤化 (生產力 / 辦公通訊 / 休閒娛樂 / 靜態資源)。
 */

export const CATEGORY_TYPES = {
  PRODUCTIVITY: 'productivity',
  COMMUNICATION: 'communication',
  LEISURE: 'leisure',
  STATIC: 'static',
  OTHER: 'other'
};

export const CATEGORY_META = {
  [CATEGORY_TYPES.PRODUCTIVITY]: {
    name: '生產力',
    color: '#10b981',
    badgeClass: 'badge-prod',
    icon: '💼'
  },
  [CATEGORY_TYPES.COMMUNICATION]: {
    name: '辦公通訊',
    color: '#3b82f6',
    badgeClass: 'badge-comm',
    icon: '💬'
  },
  [CATEGORY_TYPES.LEISURE]: {
    name: '休閒娛樂',
    color: '#f59e0b',
    badgeClass: 'badge-leisure',
    icon: '☕'
  },
  [CATEGORY_TYPES.STATIC]: {
    name: '靜態CDN',
    color: '#6b7280',
    badgeClass: 'badge-static',
    icon: '📦'
  },
  [CATEGORY_TYPES.OTHER]: {
    name: '其他',
    color: '#9ca3af',
    badgeClass: 'badge-other',
    icon: '🌐'
  }
};

/**
 * 內建 100+ 常見網域映射字典
 */
const DOMAIN_MAP = {
  // === 生產力 / 程式碼 / 專案協作 (Productivity) ===
  'github.com': CATEGORY_TYPES.PRODUCTIVITY,
  'raw.githubusercontent.com': CATEGORY_TYPES.PRODUCTIVITY,
  'api.github.com': CATEGORY_TYPES.PRODUCTIVITY,
  'gist.github.com': CATEGORY_TYPES.PRODUCTIVITY,
  'gitlab.com': CATEGORY_TYPES.PRODUCTIVITY,
  'bitbucket.org': CATEGORY_TYPES.PRODUCTIVITY,
  'jira.atlassian.com': CATEGORY_TYPES.PRODUCTIVITY,
  'atlassian.net': CATEGORY_TYPES.PRODUCTIVITY,
  'atlassian.com': CATEGORY_TYPES.PRODUCTIVITY,
  'confluence.atlassian.net': CATEGORY_TYPES.PRODUCTIVITY,
  'statuspage.io': CATEGORY_TYPES.PRODUCTIVITY,
  'linear.app': CATEGORY_TYPES.PRODUCTIVITY,
  'linear.new': CATEGORY_TYPES.PRODUCTIVITY,
  'notion.so': CATEGORY_TYPES.PRODUCTIVITY,
  'notion.site': CATEGORY_TYPES.PRODUCTIVITY,
  'notion.new': CATEGORY_TYPES.PRODUCTIVITY,
  'trello.com': CATEGORY_TYPES.PRODUCTIVITY,
  'asana.com': CATEGORY_TYPES.PRODUCTIVITY,
  'app.asana.com': CATEGORY_TYPES.PRODUCTIVITY,
  'monday.com': CATEGORY_TYPES.PRODUCTIVITY,
  'dapulse.com': CATEGORY_TYPES.PRODUCTIVITY,
  'clickup.com': CATEGORY_TYPES.PRODUCTIVITY,
  'app.clickup.com': CATEGORY_TYPES.PRODUCTIVITY,
  'basecamp.com': CATEGORY_TYPES.PRODUCTIVITY,
  '3.basecamp.com': CATEGORY_TYPES.PRODUCTIVITY,
  'airtable.com': CATEGORY_TYPES.PRODUCTIVITY,
  'coda.io': CATEGORY_TYPES.PRODUCTIVITY,
  'loom.com': CATEGORY_TYPES.PRODUCTIVITY,
  'figma.com': CATEGORY_TYPES.PRODUCTIVITY,
  'canva.com': CATEGORY_TYPES.PRODUCTIVITY,
  'miro.com': CATEGORY_TYPES.PRODUCTIVITY,
  'whimsical.com': CATEGORY_TYPES.PRODUCTIVITY,
  'lucidchart.com': CATEGORY_TYPES.PRODUCTIVITY,
  'lucid.app': CATEGORY_TYPES.PRODUCTIVITY,
  'excalidraw.com': CATEGORY_TYPES.PRODUCTIVITY,
  'mural.co': CATEGORY_TYPES.PRODUCTIVITY,
  'stackoverflow.com': CATEGORY_TYPES.PRODUCTIVITY,
  'stackexchange.com': CATEGORY_TYPES.PRODUCTIVITY,
  'developer.mozilla.org': CATEGORY_TYPES.PRODUCTIVITY,
  'npmjs.com': CATEGORY_TYPES.PRODUCTIVITY,
  'yarnpkg.com': CATEGORY_TYPES.PRODUCTIVITY,
  'pypi.org': CATEGORY_TYPES.PRODUCTIVITY,
  'crates.io': CATEGORY_TYPES.PRODUCTIVITY,
  'rubygems.org': CATEGORY_TYPES.PRODUCTIVITY,
  'golang.org': CATEGORY_TYPES.PRODUCTIVITY,
  'pkg.go.dev': CATEGORY_TYPES.PRODUCTIVITY,
  'docker.com': CATEGORY_TYPES.PRODUCTIVITY,
  'hub.docker.com': CATEGORY_TYPES.PRODUCTIVITY,
  'kubernetes.io': CATEGORY_TYPES.PRODUCTIVITY,
  'aws.amazon.com': CATEGORY_TYPES.PRODUCTIVITY,
  'console.aws.amazon.com': CATEGORY_TYPES.PRODUCTIVITY,
  'cloud.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'console.cloud.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'azure.microsoft.com': CATEGORY_TYPES.PRODUCTIVITY,
  'portal.azure.com': CATEGORY_TYPES.PRODUCTIVITY,
  'vercel.com': CATEGORY_TYPES.PRODUCTIVITY,
  'netlify.com': CATEGORY_TYPES.PRODUCTIVITY,
  'cloudflare.com': CATEGORY_TYPES.PRODUCTIVITY,
  'dash.cloudflare.com': CATEGORY_TYPES.PRODUCTIVITY,
  'sentry.io': CATEGORY_TYPES.PRODUCTIVITY,
  'datadoghq.com': CATEGORY_TYPES.PRODUCTIVITY,
  'newrelic.com': CATEGORY_TYPES.PRODUCTIVITY,
  'postman.com': CATEGORY_TYPES.PRODUCTIVITY,
  'insomnia.rest': CATEGORY_TYPES.PRODUCTIVITY,
  'chatgpt.com': CATEGORY_TYPES.PRODUCTIVITY,
  'openai.com': CATEGORY_TYPES.PRODUCTIVITY,
  'claude.ai': CATEGORY_TYPES.PRODUCTIVITY,
  'anthropic.com': CATEGORY_TYPES.PRODUCTIVITY,
  'gemini.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'ai.google.dev': CATEGORY_TYPES.PRODUCTIVITY,
  'deepseek.com': CATEGORY_TYPES.PRODUCTIVITY,
  'huggingface.co': CATEGORY_TYPES.PRODUCTIVITY,
  'v0.dev': CATEGORY_TYPES.PRODUCTIVITY,
  'cursor.sh': CATEGORY_TYPES.PRODUCTIVITY,
  'docs.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'drive.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'sheets.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'slides.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'calendar.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'keep.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'workspace.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'office.com': CATEGORY_TYPES.PRODUCTIVITY,
  'onedrive.live.com': CATEGORY_TYPES.PRODUCTIVITY,
  'sharepoint.com': CATEGORY_TYPES.PRODUCTIVITY,
  'loop.microsoft.com': CATEGORY_TYPES.PRODUCTIVITY,
  'localhost': CATEGORY_TYPES.PRODUCTIVITY,
  '127.0.0.1': CATEGORY_TYPES.PRODUCTIVITY,

  // === 辦公通訊 / 即時對話 (Communication) ===
  'slack.com': CATEGORY_TYPES.COMMUNICATION,
  'app.slack.com': CATEGORY_TYPES.COMMUNICATION,
  'discord.com': CATEGORY_TYPES.COMMUNICATION,
  'discord.gg': CATEGORY_TYPES.COMMUNICATION,
  'teams.microsoft.com': CATEGORY_TYPES.COMMUNICATION,
  'teams.live.com': CATEGORY_TYPES.COMMUNICATION,
  'zoom.us': CATEGORY_TYPES.COMMUNICATION,
  'meet.google.com': CATEGORY_TYPES.COMMUNICATION,
  'hangouts.google.com': CATEGORY_TYPES.COMMUNICATION,
  'mail.google.com': CATEGORY_TYPES.COMMUNICATION,
  'outlook.live.com': CATEGORY_TYPES.COMMUNICATION,
  'outlook.office.com': CATEGORY_TYPES.COMMUNICATION,
  'outlook.office365.com': CATEGORY_TYPES.COMMUNICATION,
  'outlook.com': CATEGORY_TYPES.COMMUNICATION,
  'web.telegram.org': CATEGORY_TYPES.COMMUNICATION,
  't.me': CATEGORY_TYPES.COMMUNICATION,
  'web.whatsapp.com': CATEGORY_TYPES.COMMUNICATION,
  'whatsapp.com': CATEGORY_TYPES.COMMUNICATION,
  'line.me': CATEGORY_TYPES.COMMUNICATION,
  'larksuite.com': CATEGORY_TYPES.COMMUNICATION,
  'open.larksuite.com': CATEGORY_TYPES.COMMUNICATION,
  'feishu.cn': CATEGORY_TYPES.COMMUNICATION,
  'open.feishu.cn': CATEGORY_TYPES.COMMUNICATION,
  'dingtalk.com': CATEGORY_TYPES.COMMUNICATION,
  'work.weixin.qq.com': CATEGORY_TYPES.COMMUNICATION,
  'skype.com': CATEGORY_TYPES.COMMUNICATION,
  'web.skype.com': CATEGORY_TYPES.COMMUNICATION,

  // === 休閒娛樂 / 社群媒體 (Leisure & Social) ===
  'youtube.com': CATEGORY_TYPES.LEISURE,
  'm.youtube.com': CATEGORY_TYPES.LEISURE,
  'youtu.be': CATEGORY_TYPES.LEISURE,
  'netflix.com': CATEGORY_TYPES.LEISURE,
  'spotify.com': CATEGORY_TYPES.LEISURE,
  'open.spotify.com': CATEGORY_TYPES.LEISURE,
  'twitch.tv': CATEGORY_TYPES.LEISURE,
  'twitter.com': CATEGORY_TYPES.LEISURE,
  'x.com': CATEGORY_TYPES.LEISURE,
  'facebook.com': CATEGORY_TYPES.LEISURE,
  'm.facebook.com': CATEGORY_TYPES.LEISURE,
  'fb.com': CATEGORY_TYPES.LEISURE,
  'instagram.com': CATEGORY_TYPES.LEISURE,
  'threads.net': CATEGORY_TYPES.LEISURE,
  'reddit.com': CATEGORY_TYPES.LEISURE,
  'old.reddit.com': CATEGORY_TYPES.LEISURE,
  'tiktok.com': CATEGORY_TYPES.LEISURE,
  'bilibili.com': CATEGORY_TYPES.LEISURE,
  'live.bilibili.com': CATEGORY_TYPES.LEISURE,
  'dcard.tw': CATEGORY_TYPES.LEISURE,
  'ptt.cc': CATEGORY_TYPES.LEISURE,
  'term.ptt.cc': CATEGORY_TYPES.LEISURE,
  'gamer.com.tw': CATEGORY_TYPES.LEISURE,
  'forum.gamer.com.tw': CATEGORY_TYPES.LEISURE,
  'ani.gamer.com.tw': CATEGORY_TYPES.LEISURE,
  'disneyplus.com': CATEGORY_TYPES.LEISURE,
  'hulu.com': CATEGORY_TYPES.LEISURE,
  'store.steampowered.com': CATEGORY_TYPES.LEISURE,
  'steamcommunity.com': CATEGORY_TYPES.LEISURE,
  'epicgames.com': CATEGORY_TYPES.LEISURE,
  'primevideo.com': CATEGORY_TYPES.LEISURE,
  'douyin.com': CATEGORY_TYPES.LEISURE,
  'weibo.com': CATEGORY_TYPES.LEISURE,
  'm.weibo.cn': CATEGORY_TYPES.LEISURE,
  'xiaohongshu.com': CATEGORY_TYPES.LEISURE,
  'zhihu.com': CATEGORY_TYPES.LEISURE,
  'kktv.me': CATEGORY_TYPES.LEISURE,
  'bahamut.com.tw': CATEGORY_TYPES.LEISURE,

  // === 靜態資源 / CDN / 遙測分析 (Static CDN & Analytics) ===
  'fonts.googleapis.com': CATEGORY_TYPES.STATIC,
  'fonts.gstatic.com': CATEGORY_TYPES.STATIC,
  'cdnjs.cloudflare.com': CATEGORY_TYPES.STATIC,
  'cdn.jsdelivr.net': CATEGORY_TYPES.STATIC,
  'unpkg.com': CATEGORY_TYPES.STATIC,
  'ajax.googleapis.com': CATEGORY_TYPES.STATIC,
  'google-analytics.com': CATEGORY_TYPES.STATIC,
  'googletagmanager.com': CATEGORY_TYPES.STATIC,
  'doubleclick.net': CATEGORY_TYPES.STATIC,
  'googlesyndication.com': CATEGORY_TYPES.STATIC,
  'adnxs.com': CATEGORY_TYPES.STATIC,
  'clarity.ms': CATEGORY_TYPES.STATIC,
  'hotjar.com': CATEGORY_TYPES.STATIC,
  'segment.io': CATEGORY_TYPES.STATIC,
  'mixpanel.com': CATEGORY_TYPES.STATIC
};

/**
 * 從 URL 或主機名提取純網域名稱 (小寫)
 * @param {string} input 完整 URL 或 hostname
 * @returns {string} hostname
 */
export function extractHostname(input) {
  if (!input || typeof input !== 'string') return '';
  try {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      const url = new URL(input);
      return url.hostname.toLowerCase();
    }
    // 去除 port 與路徑
    const clean = input.split('/')[0].split(':')[0].trim().toLowerCase();
    return clean;
  } catch {
    return String(input).toLowerCase();
  }
}

/**
 * 網域分類查詢
 * @param {string} urlOrDomain 網址或網域名稱
 * @returns {{ category: string, label: string, color: string, badgeClass: string, icon: string, hostname: string }}
 */
export function classifyDomain(urlOrDomain) {
  const hostname = extractHostname(urlOrDomain);
  if (!hostname) {
    return {
      category: CATEGORY_TYPES.OTHER,
      hostname: '',
      ...CATEGORY_META[CATEGORY_TYPES.OTHER]
    };
  }

  // 1. 完全精確比對
  if (DOMAIN_MAP[hostname]) {
    const cat = DOMAIN_MAP[hostname];
    return {
      category: cat,
      hostname,
      ...CATEGORY_META[cat]
    };
  }

  // 2. 子網域遞迴比對 (例如 raw.githubusercontent.com -> github.com)
  const parts = hostname.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parentDomain = parts.slice(i).join('.');
    if (DOMAIN_MAP[parentDomain]) {
      const cat = DOMAIN_MAP[parentDomain];
      return {
        category: cat,
        hostname,
        ...CATEGORY_META[cat]
      };
    }
  }

  // 3. 啟發式特徵匹配
  if (
    hostname.includes('cdn') ||
    hostname.includes('static') ||
    hostname.includes('assets') ||
    hostname.endsWith('.cloudfront.net') ||
    hostname.endsWith('.akamaized.net') ||
    hostname.endsWith('.fastly.net')
  ) {
    return {
      category: CATEGORY_TYPES.STATIC,
      hostname,
      ...CATEGORY_META[CATEGORY_TYPES.STATIC]
    };
  }

  if (
    hostname.includes('analytics') ||
    hostname.includes('telemetry') ||
    hostname.includes('tracker')
  ) {
    return {
      category: CATEGORY_TYPES.STATIC,
      hostname,
      ...CATEGORY_META[CATEGORY_TYPES.STATIC]
    };
  }

  // 4. 預設歸類為其他
  return {
    category: CATEGORY_TYPES.OTHER,
    hostname,
    ...CATEGORY_META[CATEGORY_TYPES.OTHER]
  };
}

/**
 * 判斷是否為工作相關網域 (生產力 或 辦公通訊)
 * @param {string} category 類別鍵值
 * @returns {boolean}
 */
export function isWorkDomain(category) {
  return category === CATEGORY_TYPES.PRODUCTIVITY || category === CATEGORY_TYPES.COMMUNICATION;
}

/**
 * 判斷是否為靜態/雜訊網域
 * @param {string} category 類別鍵值
 * @returns {boolean}
 */
export function isStaticDomain(category) {
  return category === CATEGORY_TYPES.STATIC;
}

/**
 * 格式化秒數為人眼易讀字串 (如 2h 15m, 45m 12s, 30s)
 * @param {number} seconds 秒數
 * @returns {string} 格式化字串
 */
export function formatDuration(seconds) {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  if (sec < 60) {
    return `${sec}s`;
  }
  const minutes = Math.floor(sec / 60);
  const remainingSec = sec % 60;
  if (minutes < 60) {
    return remainingSec > 0 ? `${minutes}m ${remainingSec}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * 匯總指定類別時長之佔比與專注度指標 (AM-02 核心)
 * @param {Object} categories 各類別累計秒數
 * @param {number} totalDurationSec 總秒數
 * @returns {{
 *   workDurationSec: number,
 *   productivitySec: number,
 *   communicationSec: number,
 *   leisureSec: number,
 *   staticSec: number,
 *   otherSec: number,
 *   ratios: { productivity: number, communication: number, leisure: number, static: number, other: number },
 *   focusScore: number
 * }}
 */
export function aggregateCategoryMetrics(categories = {}, totalDurationSec = 0) {
  const prodSec = Number(categories[CATEGORY_TYPES.PRODUCTIVITY]) || 0;
  const commSec = Number(categories[CATEGORY_TYPES.COMMUNICATION]) || 0;
  const leisureSec = Number(categories[CATEGORY_TYPES.LEISURE]) || 0;
  const staticSec = Number(categories[CATEGORY_TYPES.STATIC]) || 0;
  const otherSec = Number(categories[CATEGORY_TYPES.OTHER]) || 0;

  const workDurationSec = prodSec + commSec;
  const safeTotal = totalDurationSec > 0 ? totalDurationSec : (workDurationSec + leisureSec + staticSec + otherSec);
  const divisor = safeTotal > 0 ? safeTotal : 1;

  const ratios = {
    [CATEGORY_TYPES.PRODUCTIVITY]: Math.round((prodSec / divisor) * 100),
    [CATEGORY_TYPES.COMMUNICATION]: Math.round((commSec / divisor) * 100),
    [CATEGORY_TYPES.LEISURE]: Math.round((leisureSec / divisor) * 100),
    [CATEGORY_TYPES.STATIC]: Math.round((staticSec / divisor) * 100),
    [CATEGORY_TYPES.OTHER]: Math.round((otherSec / divisor) * 100)
  };

  // 專注度指標 (Focus Score 0 ~ 100)
  // 權重：生產力 1.0，辦公通訊 0.7，排除純靜態干擾
  let focusScore = 0;
  const meaningfulTotal = prodSec + commSec + leisureSec + otherSec;
  if (meaningfulTotal > 0) {
    const weightedWork = (prodSec * 1.0) + (commSec * 0.7);
    focusScore = Math.min(100, Math.max(0, Math.round((weightedWork / meaningfulTotal) * 100)));
  }

  return {
    workDurationSec,
    productivitySec: prodSec,
    communicationSec: commSec,
    leisureSec,
    staticSec,
    otherSec,
    ratios,
    focusScore
  };
}

/**
 * 匯總停留記錄陣列之完整統計資料
 * @param {Array<Object>} logs 停留記錄陣列
 * @returns {Object} 包含總時長、分類指標與網域排行的完整物件
 */
export function summarizeTimeLogs(logs = []) {
  if (!Array.isArray(logs) || logs.length === 0) {
    return {
      totalDurationSec: 0,
      totalCount: 0,
      categories: {
        [CATEGORY_TYPES.PRODUCTIVITY]: 0,
        [CATEGORY_TYPES.COMMUNICATION]: 0,
        [CATEGORY_TYPES.LEISURE]: 0,
        [CATEGORY_TYPES.STATIC]: 0,
        [CATEGORY_TYPES.OTHER]: 0
      },
      metrics: aggregateCategoryMetrics({}, 0),
      topDomains: []
    };
  }

  let totalDurationSec = 0;
  const categories = {
    [CATEGORY_TYPES.PRODUCTIVITY]: 0,
    [CATEGORY_TYPES.COMMUNICATION]: 0,
    [CATEGORY_TYPES.LEISURE]: 0,
    [CATEGORY_TYPES.STATIC]: 0,
    [CATEGORY_TYPES.OTHER]: 0
  };
  const domainMap = new Map();

  for (const item of logs) {
    const dur = Number(item.durationSec) || 0;
    totalDurationSec += dur;

    const cat = item.category || CATEGORY_TYPES.OTHER;
    if (categories[cat] !== undefined) {
      categories[cat] += dur;
    } else {
      categories[CATEGORY_TYPES.OTHER] += dur;
    }

    const dom = item.domain || 'unknown';
    let domRecord = domainMap.get(dom);
    if (!domRecord) {
      domRecord = {
        domain: dom,
        durationSec: 0,
        visitCount: 0,
        category: cat,
        title: item.title || dom,
        favIconUrl: item.favIconUrl || ''
      };
      domainMap.set(dom, domRecord);
    }
    domRecord.durationSec += dur;
    domRecord.visitCount += 1;
    if (item.title) domRecord.title = item.title;
    if (item.favIconUrl) domRecord.favIconUrl = item.favIconUrl;
  }

  const topDomains = Array.from(domainMap.values())
    .map(d => ({
      ...d,
      formattedDuration: formatDuration(d.durationSec)
    }))
    .sort((a, b) => b.durationSec - a.durationSec);

  const metrics = aggregateCategoryMetrics(categories, totalDurationSec);

  return {
    totalDurationSec,
    totalCount: logs.length,
    categories,
    metrics,
    topDomains
  };
}
