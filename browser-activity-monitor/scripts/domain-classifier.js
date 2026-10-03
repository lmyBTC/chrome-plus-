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
  'gitlab.com': CATEGORY_TYPES.PRODUCTIVITY,
  'bitbucket.org': CATEGORY_TYPES.PRODUCTIVITY,
  'jira.atlassian.com': CATEGORY_TYPES.PRODUCTIVITY,
  'atlassian.net': CATEGORY_TYPES.PRODUCTIVITY,
  'atlassian.com': CATEGORY_TYPES.PRODUCTIVITY,
  'confluence.atlassian.net': CATEGORY_TYPES.PRODUCTIVITY,
  'linear.app': CATEGORY_TYPES.PRODUCTIVITY,
  'notion.so': CATEGORY_TYPES.PRODUCTIVITY,
  'notion.site': CATEGORY_TYPES.PRODUCTIVITY,
  'trello.com': CATEGORY_TYPES.PRODUCTIVITY,
  'asana.com': CATEGORY_TYPES.PRODUCTIVITY,
  'monday.com': CATEGORY_TYPES.PRODUCTIVITY,
  'clickup.com': CATEGORY_TYPES.PRODUCTIVITY,
  'basecamp.com': CATEGORY_TYPES.PRODUCTIVITY,
  'figma.com': CATEGORY_TYPES.PRODUCTIVITY,
  'canva.com': CATEGORY_TYPES.PRODUCTIVITY,
  'miro.com': CATEGORY_TYPES.PRODUCTIVITY,
  'whimsical.com': CATEGORY_TYPES.PRODUCTIVITY,
  'lucidchart.com': CATEGORY_TYPES.PRODUCTIVITY,
  'excalidraw.com': CATEGORY_TYPES.PRODUCTIVITY,
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
  'v0.dev': CATEGORY_TYPES.PRODUCTIVITY,
  'cursor.sh': CATEGORY_TYPES.PRODUCTIVITY,
  'docs.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'drive.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'sheets.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'slides.google.com': CATEGORY_TYPES.PRODUCTIVITY,
  'calendar.google.com': CATEGORY_TYPES.PRODUCTIVITY,

  // === 辦公通訊 / 即時對話 (Communication) ===
  'slack.com': CATEGORY_TYPES.COMMUNICATION,
  'app.slack.com': CATEGORY_TYPES.COMMUNICATION,
  'discord.com': CATEGORY_TYPES.COMMUNICATION,
  'teams.microsoft.com': CATEGORY_TYPES.COMMUNICATION,
  'zoom.us': CATEGORY_TYPES.COMMUNICATION,
  'meet.google.com': CATEGORY_TYPES.COMMUNICATION,
  'mail.google.com': CATEGORY_TYPES.COMMUNICATION,
  'outlook.live.com': CATEGORY_TYPES.COMMUNICATION,
  'outlook.office.com': CATEGORY_TYPES.COMMUNICATION,
  'outlook.com': CATEGORY_TYPES.COMMUNICATION,
  'web.telegram.org': CATEGORY_TYPES.COMMUNICATION,
  'web.whatsapp.com': CATEGORY_TYPES.COMMUNICATION,
  'line.me': CATEGORY_TYPES.COMMUNICATION,
  'larksuite.com': CATEGORY_TYPES.COMMUNICATION,
  'feishu.cn': CATEGORY_TYPES.COMMUNICATION,
  'dingtalk.com': CATEGORY_TYPES.COMMUNICATION,

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
  'instagram.com': CATEGORY_TYPES.LEISURE,
  'threads.net': CATEGORY_TYPES.LEISURE,
  'reddit.com': CATEGORY_TYPES.LEISURE,
  'tiktok.com': CATEGORY_TYPES.LEISURE,
  'bilibili.com': CATEGORY_TYPES.LEISURE,
  'dcard.tw': CATEGORY_TYPES.LEISURE,
  'ptt.cc': CATEGORY_TYPES.LEISURE,
  'gamer.com.tw': CATEGORY_TYPES.LEISURE,
  'disneyplus.com': CATEGORY_TYPES.LEISURE,
  'hulu.com': CATEGORY_TYPES.LEISURE,
  'store.steampowered.com': CATEGORY_TYPES.LEISURE,
  'steamcommunity.com': CATEGORY_TYPES.LEISURE,
  'epicgames.com': CATEGORY_TYPES.LEISURE,
  'primevideo.com': CATEGORY_TYPES.LEISURE,

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
    // 去除 port
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
