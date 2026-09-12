import { ScrapedImage, ImageFormat, ActiveTabScrapeMode, CarouselProgress } from '../types';

/**
 * 輔助函式：從副檔名或 MIME 推估圖片格式
 */
export function detectImageFormat(url: string): ImageFormat {
  try {
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'jpg';
    if (cleanUrl.endsWith('.png')) return 'png';
    if (cleanUrl.endsWith('.webp')) return 'webp';
    if (cleanUrl.endsWith('.gif')) return 'gif';
    if (cleanUrl.endsWith('.svg')) return 'svg';
  } catch {
    // 略過錯誤
  }
  return 'unknown';
}

/**
 * 輔助函式：安全解析絕對路徑
 */
export function toAbsoluteUrl(relativeUrl: string, baseUrl: string): string | null {
  try {
    const trimmed = relativeUrl.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) {
      return null;
    }
    return new URL(trimmed, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * 針對 Flickr 圖片 URL 進行高畫質升級 (HD Upgrade)
 * 例如將 _m (小圖), _n, _z, _s 等轉為 _b (1024px 高清大圖)
 */
export function upgradeFlickrImageUrl(url: string): { url: string; upgraded: boolean } {
  // 匹配 live.staticflickr.com/{server}/{id}_{secret}_{size}.jpg
  const flickrPattern = /^(https?:\/\/[a-z0-9]+\.staticflickr\.com\/\d+\/\d+_[a-z0-9]+)(?:_[a-z0-9]+)?(\.(?:jpg|jpeg|png))(?:\?.*)?$/i;
  const match = url.match(flickrPattern);
  if (match) {
    const base = match[1];
    const ext = match[2];
    // 升級至 _b (1024px)
    return {
      url: `${base}_b${ext}`,
      upgraded: !url.includes('_b.')
    };
  }
  return { url, upgraded: false };
}

/**
 * 針對 Facebook / Instagram 圖片 URL 進行高畫質升級 (HD Upgrade)
 * 清除縮圖限制標籤 (如 p206x206, p526x296, s320x320 及裁切指令)
 */
export function upgradeFacebookImageUrl(url: string): { url: string; upgraded: boolean } {
  try {
    if (!url.includes('fbcdn.net') && !url.includes('cdninstagram.com')) {
      return { url, upgraded: false };
    }
    const u = new URL(url);
    const stp = u.searchParams.get('stp');
    if (stp) {
      const cleanStp = stp
        .replace(/c\d+\.\d+\.\d+\.\d+a_/gi, '')
        .replace(/_?[ps]\d+x\d+/gi, '')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      if (cleanStp !== stp) {
        if (cleanStp) {
          u.searchParams.set('stp', cleanStp);
        } else {
          u.searchParams.delete('stp');
        }
        return { url: u.toString(), upgraded: true };
      }
    }
  } catch {
    // 忽略解析錯誤
  }
  return { url, upgraded: false };
}

/**
 * 統一通用高畫質圖片升級器 (Flickr + Facebook)
 */
export function upgradeImageUrl(url: string): { url: string; upgraded: boolean } {
  const flickr = upgradeFlickrImageUrl(url);
  if (flickr.upgraded) return flickr;
  const fb = upgradeFacebookImageUrl(url);
  if (fb.upgraded) return fb;
  return { url, upgraded: false };
}

/**
 * 從 HTML 字串解析所有可能的圖片
 */
export function extractImagesFromHtml(html: string, baseUrl: string): ScrapedImage[] {
  const imageMap = new Map<string, ScrapedImage>();

  const addImage = (rawUrl: string, alt?: string, title?: string, width?: number, height?: number) => {
    const absUrl = toAbsoluteUrl(rawUrl, baseUrl);
    if (!absUrl) return;

    // 進行高畫質升級檢查 (支援 Flickr 與 Facebook)
    const { url: finalUrl, upgraded } = upgradeImageUrl(absUrl);

    if (imageMap.has(finalUrl)) {
      // 若已存在且有更好的 alt/title/尺寸則更新
      const existing = imageMap.get(finalUrl)!;
      if (!existing.alt && alt) existing.alt = alt;
      if (!existing.width && width) existing.width = width;
      if (!existing.height && height) existing.height = height;
      return;
    }

    const format = detectImageFormat(finalUrl);

    imageMap.set(finalUrl, {
      id: `img_${imageMap.size + 1}_${Math.random().toString(36).slice(2, 7)}`,
      url: finalUrl,
      rawUrl: absUrl,
      alt: alt?.trim() || undefined,
      title: title?.trim() || undefined,
      width: width && width > 0 ? width : undefined,
      height: height && height > 0 ? height : undefined,
      format,
      selected: true,
      status: 'idle',
      isHighResUpgrade: upgraded
    });
  };

  // 1. 特殊針對 Flickr：掃描 HTML 內嵌的 photo 模型 JSON
  // Flickr 常用格式: "id":"54268203091","secret":"68125ffcb0","server":"65535"
  const flickrJsonRegex = /"id"\s*:\s*"(\d+)"\s*,\s*"secret"\s*:\s*"([a-z0-9]+)"\s*,\s*"server"\s*:\s*"(\d+)"/gi;
  let flickrMatch: RegExpExecArray | null;
  while ((flickrMatch = flickrJsonRegex.exec(html)) !== null) {
    const [, id, secret, server] = flickrMatch;
    // 預設拼出高清 _b.jpg
    const flickrUrl = `https://live.staticflickr.com/${server}/${id}_${secret}_b.jpg`;
    addImage(flickrUrl, `Flickr Photo ${id}`);
  }

  // 2. 使用 DOMParser 進行正規 HTML 節點提取 (若當前為瀏覽器環境)
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

    // 2.1 Meta 標籤 (og:image, twitter:image, image_src)
    const metaSelectors = [
      'meta[property="og:image"]',
      'meta[property="og:image:url"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'link[rel="image_src"]'
    ];
    metaSelectors.forEach(sel => {
      doc.querySelectorAll(sel).forEach(el => {
        const content = el.getAttribute('content') || el.getAttribute('href');
        if (content) addImage(content, 'Social OpenGraph Image');
      });
    });

    // 2.2 <img> 標籤 (包含懶加載常見屬性)
    doc.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      const dataSrc = img.getAttribute('data-src') || 
                      img.getAttribute('data-original') || 
                      img.getAttribute('data-lazy-src') ||
                      img.getAttribute('data-high-res-src');
      const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
      const alt = img.getAttribute('alt') || '';
      const title = img.getAttribute('title') || '';
      const width = parseInt(img.getAttribute('width') || '0', 10) || undefined;
      const height = parseInt(img.getAttribute('height') || '0', 10) || undefined;

      if (src) addImage(src, alt, title, width, height);
      if (dataSrc) addImage(dataSrc, alt, title, width, height);

      // 解析 srcset
      if (srcset) {
        const candidates = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
        candidates.forEach(c => addImage(c, alt, title, width, height));
      }
    });

    // 2.3 <picture> 中的 <source>
    doc.querySelectorAll('picture source').forEach(source => {
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        const candidates = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
        candidates.forEach(c => addImage(c));
      }
    });

    // 2.4 Inline style 中的 background-image
    const bgElements = doc.querySelectorAll('[style*="background"]');
    bgElements.forEach(el => {
      const style = el.getAttribute('style') || '';
      const bgMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/i);
      if (bgMatch && bgMatch[1]) {
        addImage(bgMatch[1]);
      }
    });
    } catch (err) {
      console.warn('DOMParser 解析警告，退回正則掃描:', err);
    }
  }

  // 3. 通用 Regex 掃描所有符合靜態圖片副檔名或 Flickr live.staticflickr 的 URL
  const genericImgRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?[^\s"'<>]*)?/gi;
  let generalMatch: RegExpExecArray | null;
  while ((generalMatch = genericImgRegex.exec(html)) !== null) {
    addImage(generalMatch[0]);
  }

  return Array.from(imageMap.values());
}

/**
 * 遠端抓取指定 URL 並提取圖片
 */
export async function fetchAndExtractFromUrl(targetUrl: string): Promise<{
  title: string;
  images: ScrapedImage[];
}> {
  let normalizedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const response = await fetch(normalizedUrl, {
    method: 'GET',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error(`請求失敗：伺服器回應狀態碼 ${response.status} (${response.statusText})`);
  }

  const html = await response.text();

  // 提取網頁標題
  let title = '';
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  const images = extractImagesFromHtml(html, normalizedUrl);
  return { title, images };
}

export interface ActiveTabScrapeOptions {
  mode?: ActiveTabScrapeMode;
  scrollSteps?: number;
  maxTraverseCount?: number;
  traverseDelayMs?: number;
  onCarouselProgress?: (progress: CarouselProgress) => void;
  shouldAbort?: () => boolean;
}

/**
 * 針對相簿劇院（如 Facebook Photo Theater、Instagram、Twitter 檢視器）進行自動輪巡抓取
 */
async function extractCarouselFromActiveTab(
  tabId: number,
  tabUrl: string,
  tabTitle: string,
  options?: ActiveTabScrapeOptions
): Promise<{ tabTitle: string; tabUrl: string; images: ScrapedImage[] }> {
  const maxLimit = options?.maxTraverseCount || 80;
  const stepDelay = options?.traverseDelayMs || 850;
  const imageMap = new Map<string, ScrapedImage>();
  const seenUrls = new Set<string>();
  let consecutiveDuplicates = 0;

  options?.onCarouselProgress?.({
    currentCount: 0,
    maxLimit,
    statusText: '開始偵測相簿劇院與貼文輪播...',
    isTraversing: true
  });

  // 1. [Instagram 專屬快速通道] 嘗試在已登入分頁 Context 直接提取貼文完整資料
  const isInstagramPost = /instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/i.test(tabUrl);
  if (isInstagramPost) {
    try {
      options?.onCarouselProgress?.({
        currentCount: 0,
        maxLimit,
        statusText: '偵測到 Instagram 貼文，正在嘗試快速讀取完整輪播資料...',
        isTraversing: true
      });

      const directResults = await chrome.scripting.executeScript({
        target: { tabId },
        func: async () => {
          const match = window.location.pathname.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
          if (!match) return null;
          const shortcode = match[2];

          // 嘗試使用分頁內的 Session/Cookie 向 Instagram Web 端點查詢
          try {
            const resp = await fetch(`/p/${shortcode}/?__a=1&__d=dis`, {
              headers: {
                'x-ig-app-id': '936619743392459',
                'x-requested-with': 'XMLHttpRequest'
              }
            });
            if (resp.ok) {
              const data = await resp.json();
              const item = data?.items?.[0];
              if (item && item.carousel_media && Array.isArray(item.carousel_media)) {
                return item.carousel_media.map((m: any) => {
                  const best = m.image_versions2?.candidates?.[0];
                  return {
                    url: best?.url,
                    width: best?.width,
                    height: best?.height,
                    alt: m.accessibility_caption || item.caption?.text || undefined
                  };
                }).filter((x: any) => Boolean(x && x.url));
              }
            }
          } catch {
            // 忽略同源請求錯誤，平滑降級至 DOM 輪巡
          }
          return null;
        }
      });

      const fastImages = directResults?.[0]?.result;
      if (fastImages && Array.isArray(fastImages) && fastImages.length > 0) {
        fastImages.forEach((img: any, idx: number) => {
          const abs = toAbsoluteUrl(img.url, tabUrl);
          if (!abs) return;
          const { url: finalUrl, upgraded } = upgradeImageUrl(abs);
          if (!imageMap.has(finalUrl)) {
            const format = detectImageFormat(finalUrl);
            imageMap.set(finalUrl, {
              id: `img_ig_direct_${idx + 1}_${Math.random().toString(36).slice(2, 7)}`,
              url: finalUrl,
              rawUrl: abs,
              alt: img.alt,
              width: img.width,
              height: img.height,
              format,
              selected: true,
              status: 'idle',
              isHighResUpgrade: upgraded
            });
          }
        });

        options?.onCarouselProgress?.({
          currentCount: imageMap.size,
          maxLimit,
          statusText: `成功從 Instagram 原生貼文解析！全量獲取 ${imageMap.size} 張大圖`,
          isTraversing: false
        });

        return {
          tabTitle,
          tabUrl,
          images: Array.from(imageMap.values())
        };
      }
    } catch (directErr) {
      console.warn('Instagram 快速通道略過，切換至自動輪巡:', directErr);
    }
  }

  // 2. [相簿劇院與多圖貼文智慧輪播輪巡]
  for (let step = 0; step < maxLimit; step++) {
    // 檢查是否由使用者主動中斷
    if (options?.shouldAbort && options.shouldAbort()) {
      break;
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const collected: { url: string; alt?: string; title?: string; width?: number; height?: number }[] = [];

          // a. 優先定位貼文主容器 (如 Instagram <article> 或 Facebook Theater)
          const postContainer = document.querySelector('article') ||
                                document.querySelector('div[role="dialog"]') ||
                                document.body;

          // b. 收集容器內所有可見圖片 (寬高大於 120px 且排除靜態圖示)
          const allImgs = Array.from(postContainer.querySelectorAll('img')).filter(img => {
            const rect = img.getBoundingClientRect();
            return (
              rect.width > 120 &&
              rect.height > 120 &&
              rect.bottom > 0 &&
              rect.top < window.innerHeight &&
              window.getComputedStyle(img).display !== 'none' &&
              window.getComputedStyle(img).visibility !== 'hidden'
            );
          });

          allImgs.forEach(img => {
            let chosenUrl = img.currentSrc || img.src || img.getAttribute('data-src') || '';
            const srcset = img.getAttribute('srcset');
            if (srcset) {
              const candidates = srcset.split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean);
              if (candidates.length > 0) {
                chosenUrl = candidates[candidates.length - 1];
              }
            }
            if (chosenUrl && !chosenUrl.startsWith('data:') && !chosenUrl.includes('static.cdninstagram.com/rsrc.php')) {
              collected.push({
                url: chosenUrl,
                alt: img.alt || undefined,
                title: img.title || undefined,
                width: img.naturalWidth || img.clientWidth || undefined,
                height: img.naturalHeight || img.clientHeight || undefined
              });
            }
          });

          // c. 精準尋找「下一張/下一頁」切換按鈕 (多語言與 SVG 標籤穿透)
          const nextSelectors = [
            'article button[aria-label="下一頁"]',
            'article button[aria-label="下一張"]',
            'article button[aria-label="下一張相片"]',
            'article button[aria-label="下一張照片"]',
            'article button[aria-label="下一步"]',
            'article button[aria-label="Next"]',
            'article button[aria-label="Next photo"]',
            'article svg[aria-label="下一頁"]',
            'article svg[aria-label="下一張"]',
            'article svg[aria-label="下一步"]',
            'article svg[aria-label="Next"]',
            'article svg[aria-label="向右鍵"]',
            'article svg[aria-label="向右移動"]',
            'button[aria-label="下一頁"]',
            'button[aria-label="下一張"]',
            'button[aria-label="Next"]',
            'button[aria-label*="Next" i]',
            'button[aria-label*="下一" i]',
            'button[aria-label*="下一步" i]',
            'button[aria-label*="向右" i]',
            'button._afxw',
            'button[data-testid="next_button"]'
          ];

          let nextBtn: HTMLElement | null = null;
          for (const sel of nextSelectors) {
            const el = document.querySelector(sel) as HTMLElement | null;
            if (el) {
              const btn = el.tagName.toLowerCase() === 'button' ? el : (el.closest('button') || el);
              const style = window.getComputedStyle(btn);
              if (style.display !== 'none' && style.visibility !== 'hidden' && !btn.hasAttribute('disabled')) {
                nextBtn = btn;
                break;
              }
            }
          }

          let hasNext = false;
          if (nextBtn) {
            hasNext = true;
            try {
              nextBtn.focus();
              nextBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
              nextBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
              nextBtn.click();
            } catch {
              nextBtn.click();
            }
          }

          // d. 派發 ArrowRight 鍵盤事件作為備援
          const keyOpts = { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39, bubbles: true, cancelable: true };
          try {
            (postContainer || document).dispatchEvent(new KeyboardEvent('keydown', keyOpts));
            (postContainer || document).dispatchEvent(new KeyboardEvent('keyup', keyOpts));
          } catch {}

          // e. 讀取當前 URL 的 img_index
          const urlParams = new URLSearchParams(window.location.search);
          const currentIndex = urlParams.get('img_index') || undefined;

          return {
            images: collected,
            hasNext,
            currentIndex
          };
        }
      });

      const extracted = results?.[0]?.result;
      let newAddedThisStep = 0;

      if (extracted && extracted.images && extracted.images.length > 0) {
        for (const item of extracted.images) {
          const abs = toAbsoluteUrl(item.url, tabUrl);
          if (!abs) continue;
          const { url: finalUrl, upgraded } = upgradeImageUrl(abs);
          if (!seenUrls.has(finalUrl)) {
            seenUrls.add(finalUrl);
            newAddedThisStep++;
            const format = detectImageFormat(finalUrl);
            imageMap.set(finalUrl, {
              id: `img_carousel_${imageMap.size + 1}_${Math.random().toString(36).slice(2, 7)}`,
              url: finalUrl,
              rawUrl: abs,
              alt: item.alt,
              title: item.title,
              width: item.width,
              height: item.height,
              format,
              selected: true,
              status: 'idle',
              isHighResUpgrade: upgraded
            });
          }
        }
      }

      if (newAddedThisStep > 0) {
        consecutiveDuplicates = 0;
      } else {
        consecutiveDuplicates++;
      }

      const progressIdx = extracted?.currentIndex ? `貼文第 ${extracted.currentIndex} 張` : `第 ${step + 1} 步`;
      options?.onCarouselProgress?.({
        currentCount: imageMap.size,
        maxLimit,
        statusText: `已輪巡採集 ${imageMap.size} 張相片（${progressIdx}）...`,
        isTraversing: true
      });

      // 終止判定：若已無「下一頁」按鈕，且連續 2 次無新圖片，代表已到貼文最後一張
      if (!extracted?.hasNext && consecutiveDuplicates >= 2) {
        break;
      }

      // 即使有按鈕，但連續 4 次無新圖片，防止死循環
      if (consecutiveDuplicates >= 4) {
        break;
      }

      if (options?.shouldAbort && options.shouldAbort()) {
        break;
      }

      // 等待分頁切換動畫與加載下一張照片
      await new Promise(res => setTimeout(res, stepDelay));
    } catch (stepErr) {
      console.warn('相簿輪巡執行警告:', stepErr);
      break;
    }
  }

  options?.onCarouselProgress?.({
    currentCount: imageMap.size,
    maxLimit,
    statusText: `輪巡採集完成！共收集 ${imageMap.size} 張大圖`,
    isTraversing: false
  });

  return {
    tabTitle,
    tabUrl,
    images: Array.from(imageMap.values())
  };
}

/**
 * 透過 Chrome Scripting API 注入並抓取當前分頁圖片
 * 支援三種模式：快速快照 (fast)、深層滾動 (deep-scroll)、相簿輪巡 (carousel-traverse)
 */
export async function extractFromActiveTab(options?: ActiveTabScrapeOptions): Promise<{
  tabTitle: string;
  tabUrl: string;
  images: ScrapedImage[];
}> {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
    throw new Error('當前環境未支援 Chrome Extension Tabs/Scripting API');
  }

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab || !activeTab.id || !activeTab.url) {
    throw new Error('未找到活躍的分頁，請先切換至欲爬取的網頁分頁');
  }

  const tabTitle = activeTab.title || '網頁圖片';
  const tabUrl = activeTab.url;
  const mode = options?.mode || 'fast';

  // 1. 若為相簿劇院輪巡模式
  if (mode === 'carousel-traverse') {
    return extractCarouselFromActiveTab(activeTab.id, tabUrl, tabTitle, options);
  }

  // 2. 快速快照或深層滾動模式
  const isDeep = mode === 'deep-scroll';
  const scrollSteps = options?.scrollSteps || 7;

  const results = await chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    args: [isDeep, scrollSteps],
    func: async (deepScroll: boolean, steps: number) => {
      if (deepScroll) {
        const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
        // 平滑向下滾動多次以觸發延遲載入 (Lazy loading)
        for (let i = 0; i < steps; i++) {
          window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
          await sleep(350);
        }
        await sleep(400);
      }

      const foundUrls: { url: string; alt?: string; title?: string; width?: number; height?: number }[] = [];

      // 抓取所有 <img> 標籤 (包含 srcset 大圖)
      document.querySelectorAll('img').forEach(img => {
        let src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
        const srcset = img.getAttribute('srcset');
        if (srcset) {
          const candidates = srcset.split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean);
          if (candidates.length > 0) {
            src = candidates[candidates.length - 1];
          }
        }

        if (src && !src.startsWith('data:')) {
          foundUrls.push({
            url: src,
            alt: img.alt || undefined,
            title: img.title || undefined,
            width: img.naturalWidth || img.width || undefined,
            height: img.naturalHeight || img.height || undefined
          });
        }
      });

      // 抓取 background-image
      document.querySelectorAll('*').forEach(node => {
        const el = node as HTMLElement;
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          const match = bg.match(/url\(['"]?([^'")]+)['"]?\)/i);
          if (match && match[1] && !match[1].startsWith('data:')) {
            foundUrls.push({
              url: match[1],
              width: el.clientWidth || undefined,
              height: el.clientHeight || undefined
            });
          }
        }
      });

      return {
        html: document.documentElement.outerHTML,
        domImages: foundUrls
      };
    }
  });

  const pageData = results?.[0]?.result;
  if (!pageData) {
    return { tabTitle, tabUrl, images: [] };
  }

  // 先解析 outerHTML (包含 Flickr JSON 和 meta 標籤)
  const extractedFromHtml = extractImagesFromHtml(pageData.html, tabUrl);
  const imageMap = new Map<string, ScrapedImage>();

  // 放入 HTML 提取的圖片
  extractedFromHtml.forEach(img => imageMap.set(img.url, img));

  // 補充 DOM 實際渲染獲取到的尺寸與真實 loaded 圖片
  pageData.domImages.forEach(domImg => {
    const abs = toAbsoluteUrl(domImg.url, tabUrl);
    if (!abs) return;
    const { url: finalUrl, upgraded } = upgradeImageUrl(abs);

    if (imageMap.has(finalUrl)) {
      const existing = imageMap.get(finalUrl)!;
      if (domImg.width && (!existing.width || existing.width < domImg.width)) {
        existing.width = domImg.width;
      }
      if (domImg.height && (!existing.height || existing.height < domImg.height)) {
        existing.height = domImg.height;
      }
    } else {
      const format = detectImageFormat(finalUrl);
      imageMap.set(finalUrl, {
        id: `img_${imageMap.size + 1}_${Math.random().toString(36).slice(2, 7)}`,
        url: finalUrl,
        rawUrl: abs,
        alt: domImg.alt,
        title: domImg.title,
        width: domImg.width,
        height: domImg.height,
        format,
        selected: true,
        status: 'idle',
        isHighResUpgrade: upgraded
      });
    }
  });

  return {
    tabTitle,
    tabUrl,
    images: Array.from(imageMap.values())
  };
}

