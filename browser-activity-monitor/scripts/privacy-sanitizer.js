/**
 * privacy-sanitizer.js - 前端日誌隱私脫敏模組 (AM-03)
 * 專為 PM 工作流與安全審計打造，提供日誌匯出與複製時的敏感資訊（Token、密鑰、私有 IP、機密參數）純化脫敏能力。
 * 零伺服器傳輸、零污染 IndexedDB 原始資料庫，符合最小權限與安全底線。
 */

// 預設敏感 Query 參數識別正則 (不分大小寫)
export const DEFAULT_SENSITIVE_PARAM_REGEX = /^(.*_)?(token|auth|key|secret|password|pwd|pass|code|session|sid|sig|signature|credential|bearer|jwt|access_token|refresh_token|id_token|api_key|apikey|client_secret|client_id)(_.*)?$/i;

// 私有 IPv4 與保留位址正則 (用於全文字串替換)
export const PRIVATE_IP_REGEX = /\b(10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|127(?:\.\d{1,3}){3}|169\.254(?:\.\d{1,3}){2}|0\.0\.0\.0|localhost)\b/gi;

// 脫敏替換預設標記
export const SANITIZER_DEFAULTS = {
  maskQuery: true,               // 遮蔽敏感 Query 參數
  stripQuery: false,             // 完全清除所有 Query String
  maskPrivateIps: true,          // 脫敏私有 IP / 本機主機名
  redactedPlaceholder: '[REDACTED]',
  privateIpPlaceholder: '[PRIVATE_IP]',
  localhostPlaceholder: '[LOCALHOST]'
};

/**
 * 判斷主機名稱或 IP 是否為私有/本機保留範圍
 * @param {string} host - 主機名稱 (例如 '192.168.1.1', 'localhost', 'github.com')
 * @returns {boolean}
 */
export function isPrivateHost(host) {
  if (!host || typeof host !== 'string') return false;
  const cleanHost = host.trim().toLowerCase().replace(/^\[|\]$/g, '');

  if (cleanHost === 'localhost' || cleanHost === '::1' || cleanHost.endsWith('.local') || cleanHost.endsWith('.internal') || cleanHost.endsWith('.lan')) {
    return true;
  }

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = cleanHost.match(ipv4Regex);
  if (match) {
    const o1 = Number(match[1]);
    const o2 = Number(match[2]);
    const o3 = Number(match[3]);
    const o4 = Number(match[4]);
    if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) return false;

    // 127.0.0.0/8 (Loopback)
    if (o1 === 127) return true;
    // 10.0.0.0/8 (Private Class A)
    if (o1 === 10) return true;
    // 192.168.0.0/16 (Private Class C)
    if (o1 === 192 && o2 === 168) return true;
    // 172.16.0.0/12 (Private Class B: 172.16.0.0 - 172.31.255.255)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    // 169.254.0.0/16 (Link-local)
    if (o1 === 169 && o2 === 254) return true;
    // 0.0.0.0
    if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) return true;
  }
  return false;
}

/**
 * 判斷 Query 參數名稱是否屬於機密敏感清單
 * @param {string} paramKey
 * @param {RegExp|null} customRegex
 * @returns {boolean}
 */
export function isSensitiveParam(paramKey, customRegex = null) {
  if (!paramKey || typeof paramKey !== 'string') return false;
  const regex = customRegex || DEFAULT_SENSITIVE_PARAM_REGEX;
  return regex.test(paramKey);
}

/**
 * 脫敏單一 URL 字串 (處理 Query 參數、私有 IP、Hash 片段)
 * @param {string} urlStr - 原始 URL 字串
 * @param {object} options - 脫敏設定選項
 * @returns {string} - 脫敏後的 URL
 */
export function sanitizeUrl(urlStr, options = {}) {
  if (!urlStr || typeof urlStr !== 'string') return urlStr || '';

  const opts = { ...SANITIZER_DEFAULTS, ...options };
  const customParamRegex = opts.customSensitiveRegex || DEFAULT_SENSITIVE_PARAM_REGEX;

  let parsed = null;
  let hasValidScheme = false;

  try {
    parsed = new URL(urlStr);
    hasValidScheme = true;
  } catch {
    // 若不是標準絕對 URL (可能帶埠號或特殊協定)，嘗試以虛擬協定補齊解析
    try {
      if (urlStr.startsWith('/') || urlStr.includes(':') || urlStr.includes('?')) {
        parsed = new URL(urlStr, 'http://dummy-base.local');
      }
    } catch {
      parsed = null;
    }
  }

  // 1. 若無法透過 URL 物件結構化解析，使用正則降級處理
  if (!parsed || !hasValidScheme) {
    let result = urlStr;
    if (opts.maskPrivateIps) {
      result = result.replace(PRIVATE_IP_REGEX, (match) => {
        return match.toLowerCase() === 'localhost' ? opts.localhostPlaceholder : opts.privateIpPlaceholder;
      });
    }
    if (opts.stripQuery) {
      result = result.replace(/\?[^#\s]*/g, '');
    } else if (opts.maskQuery) {
      // 替換 URL 查詢參數中符合敏感正則的鍵值
      result = result.replace(/([?&])([^=&#\s]+)=([^&#\s]*)/gi, (match, prefix, key, val) => {
        if (isSensitiveParam(key, customParamRegex)) {
          return `${prefix}${key}=${opts.redactedPlaceholder}`;
        }
        return match;
      });
    }
    return result;
  }

  // 2. 結構化 URL 脫敏處理
  let newHostname = parsed.hostname;
  if (opts.maskPrivateIps && isPrivateHost(parsed.hostname)) {
    newHostname = parsed.hostname.toLowerCase() === 'localhost' 
      ? opts.localhostPlaceholder 
      : opts.privateIpPlaceholder;
  }

  // 處理 Query String
  if (opts.stripQuery) {
    parsed.search = '';
  } else if (opts.maskQuery && parsed.search) {
    const searchParams = new URLSearchParams(parsed.search);
    let modified = false;
    for (const key of Array.from(searchParams.keys())) {
      if (isSensitiveParam(key, customParamRegex)) {
        searchParams.set(key, opts.redactedPlaceholder);
        modified = true;
      }
    }
    if (modified) {
      parsed.search = searchParams.toString();
    }
  }

  // 處理 Hash 錨點 (部分 OAuth 協議將 token 置於 Hash 中，如 #access_token=xyz)
  if (parsed.hash && parsed.hash.length > 1) {
    const rawHash = parsed.hash.slice(1);
    if (rawHash.includes('=') && (rawHash.includes('&') || isSensitiveParam(rawHash.split('=')[0], customParamRegex))) {
      const hashParams = new URLSearchParams(rawHash);
      let hashModified = false;
      for (const key of Array.from(hashParams.keys())) {
        if (opts.stripQuery) {
          hashParams.delete(key);
          hashModified = true;
        } else if (opts.maskQuery && isSensitiveParam(key, customParamRegex)) {
          hashParams.set(key, opts.redactedPlaceholder);
          hashModified = true;
        }
      }
      if (hashModified) {
        parsed.hash = hashParams.toString() ? `#${hashParams.toString()}` : '';
      }
    }
  }

  // 組合回傳結果 (若更換了 hostname，需要手動拼接以避開瀏覽器限制合法 host)
  let finalUrl = '';
  if (newHostname !== parsed.hostname) {
    const portPart = parsed.port ? `:${parsed.port}` : '';
    const pathnamePart = parsed.pathname || '';
    const searchPart = parsed.search || '';
    const hashPart = parsed.hash || '';
    finalUrl = `${parsed.protocol}//${newHostname}${portPart}${pathnamePart}${searchPart}${hashPart}`;
  } else {
    finalUrl = parsed.toString();
  }

  // 避免 URLSearchParams 將 [REDACTED] 轉為 %5BREDACTED%5D 降低可讀性
  if (opts.redactedPlaceholder && finalUrl.includes('%5B') && finalUrl.includes('%5D')) {
    finalUrl = finalUrl.replace(/%5BREDACTED%5D/g, opts.redactedPlaceholder);
  }
  return finalUrl;
}

/**
 * 脫敏任意純文字或錯誤資訊中的敏感 IP 與 Token 資訊
 * @param {string} text
 * @param {object} options
 * @returns {string}
 */
export function sanitizeText(text, options = {}) {
  if (!text || typeof text !== 'string') return text || '';
  const opts = { ...SANITIZER_DEFAULTS, ...options };
  const customParamRegex = opts.customSensitiveRegex || DEFAULT_SENSITIVE_PARAM_REGEX;

  let sanitized = text;

  // 1. 私有 IP 遮蔽
  if (opts.maskPrivateIps) {
    sanitized = sanitized.replace(PRIVATE_IP_REGEX, (match) => {
      return match.toLowerCase() === 'localhost' ? opts.localhostPlaceholder : opts.privateIpPlaceholder;
    });
  }

  // 2. 遮蔽字串中出現的 Query 參數或 Authorization Header
  if (opts.maskQuery) {
    sanitized = sanitized.replace(/([?&])([^=&#\s]+)=([^&#\s]*)/gi, (match, prefix, key, val) => {
      if (isSensitiveParam(key, customParamRegex)) {
        return `${prefix}${key}=${opts.redactedPlaceholder}`;
      }
      return match;
    });

    sanitized = sanitized.replace(/(Bearer\s+)[a-zA-Z0-9_\-\.]{10,}/gi, `$1${opts.redactedPlaceholder}`);
  }

  return sanitized;
}

/**
 * 遞迴脫敏物件或陣列資料中的字串屬性
 * @param {any} data
 * @param {object} options
 * @returns {any} 深拷貝並脫敏後的物件
 */
export function sanitizeData(data, options = {}) {
  if (data == null) return data;

  if (typeof data === 'string') {
    // 若看起來像 URL，調用 sanitizeUrl，否則調用 sanitizeText
    if (data.startsWith('http://') || data.startsWith('https://') || data.startsWith('ws://') || data.startsWith('wss://')) {
      return sanitizeUrl(data, options);
    }
    return sanitizeText(data, options);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, options));
  }

  if (typeof data === 'object') {
    const result = {};
    const opts = { ...SANITIZER_DEFAULTS, ...options };
    const customParamRegex = opts.customSensitiveRegex || DEFAULT_SENSITIVE_PARAM_REGEX;

    for (const [key, value] of Object.entries(data)) {
      // 若欄位名稱直接為敏感鍵（例如 token: "xyz"），直接遮蔽值
      if (isSensitiveParam(key, customParamRegex) && typeof value === 'string') {
        result[key] = opts.redactedPlaceholder;
      } else if (key === 'headers' && typeof value === 'object' && value !== null) {
        // 專門處理 HTTP Headers
        const sanitizedHeaders = {};
        for (const [hKey, hVal] of Object.entries(value)) {
          if (/^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token)$/i.test(hKey)) {
            sanitizedHeaders[hKey] = opts.redactedPlaceholder;
          } else {
            sanitizedHeaders[hKey] = sanitizeData(hVal, options);
          }
        }
        result[key] = sanitizedHeaders;
      } else {
        result[key] = sanitizeData(value, options);
      }
    }
    return result;
  }

  return data;
}

/**
 * 脫敏單筆活動日誌項目 (深拷貝，不修改原始 IndexedDB 紀錄)
 * @param {object} item - 原始活動日誌
 * @param {object} options - 脫敏設定
 * @returns {object} - 純化後的日誌
 */
export function sanitizeLogItem(item, options = {}) {
  if (!item || typeof item !== 'object') return item;
  const clone = JSON.parse(JSON.stringify(item));

  if (clone.url) {
    clone.url = sanitizeUrl(clone.url, options);
  }

  if (clone.origin) {
    clone.origin = sanitizeUrl(clone.origin, options);
  }

  if (clone.detail) {
    clone.detail = sanitizeData(clone.detail, options);
  }

  if (clone.headers) {
    clone.headers = sanitizeData(clone.headers, options);
  }

  return clone;
}

/**
 * 批次脫敏活動日誌清單
 * @param {Array<object>} logs
 * @param {object} options
 * @returns {Array<object>}
 */
export function sanitizeLogs(logs, options = {}) {
  if (!Array.isArray(logs)) return [];
  return logs.map(item => sanitizeLogItem(item, options));
}

/**
 * 脫敏停留時長統計資料結構 (AM-01/AM-02 匯出純化)
 * @param {object} stats
 * @param {object} options
 * @returns {object}
 */
export function sanitizeTimeStats(stats, options = {}) {
  if (!stats || typeof stats !== 'object') return stats;
  const clone = JSON.parse(JSON.stringify(stats));

  if (Array.isArray(clone.topDomains)) {
    clone.topDomains = clone.topDomains.map(d => {
      let safeDomain = d.domain;
      if (options.maskPrivateIps !== false && isPrivateHost(d.domain)) {
        safeDomain = d.domain.toLowerCase() === 'localhost' ? '[LOCALHOST]' : '[PRIVATE_IP]';
      }
      return {
        ...d,
        domain: safeDomain
      };
    });
  }

  if (clone.activeSnapshot) {
    if (clone.activeSnapshot.url) {
      clone.activeSnapshot.url = sanitizeUrl(clone.activeSnapshot.url, options);
    }
    if (clone.activeSnapshot.origin) {
      clone.activeSnapshot.origin = sanitizeUrl(clone.activeSnapshot.origin, options);
    }
  }

  return clone;
}
