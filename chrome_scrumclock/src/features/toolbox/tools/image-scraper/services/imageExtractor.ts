import { ScrapedImage, ActiveTabScrapeMode, CarouselProgress } from '../types';
import { ActiveTabScrapeOptions } from './types';
import {
  detectImageFormat,
  toAbsoluteUrl,
  upgradeImageUrl,
  extractImagesFromHtml
} from './extractorUtils';
import { extractInstagramPostDirectly } from './instagramExtractor';
import { extractCarouselFromActiveTab } from './carouselExtractor';

// 導出所有子模組功能以保持 100% 外部向後相容
export * from './types';
export * from './extractorUtils';
export * from './instagramExtractor';
export * from './carouselExtractor';

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

  let activeTab: chrome.tabs.Tab | undefined;
  if (options?.targetTabId) {
    activeTab = await chrome.tabs.get(options.targetTabId);
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab;
  }

  if (!activeTab || !activeTab.id || !activeTab.url) {
    throw new Error('未找到活躍的分頁，請先切換至欲爬取的網頁分頁');
  }

  const tabTitle = activeTab.title || '網頁圖片';
  const tabUrl = activeTab.url;
  const mode = options?.mode || 'fast';

  // 0. 若為 Instagram 貼文，無論任何模式優先調用專屬 5 重提取器 (包含真實 MP4 直鏈與高畫質圖片)
  const isInstagramPost = /instagram\.com\/(p|reel|reels)\/([A-Za-z0-9_-]+)/i.test(tabUrl);
  if (isInstagramPost) {
    try {
      const igResult = await extractInstagramPostDirectly(activeTab.id, tabUrl, tabTitle, options);
      if (igResult && igResult.images.length > 0) {
        return igResult;
      }
    } catch (igErr) {
      console.warn('[ImageScraper] extractFromActiveTab 呼叫 IG 專屬解析器失敗，降級至常規模式:', igErr);
    }
  }

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
        for (let i = 0; i < steps; i++) {
          window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
          await sleep(350);
        }
        await sleep(400);
      }

      const foundUrls: {
        url: string;
        posterUrl?: string;
        mediaType?: 'image' | 'video';
        alt?: string;
        title?: string;
        width?: number;
        height?: number;
      }[] = [];

      // 抓取所有 <img> 標籤 (包含 srcset 大圖，優先選取寬度最大版本)
      document.querySelectorAll('img').forEach(img => {
        let src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
        let width = img.naturalWidth || img.width || undefined;
        const srcset = img.getAttribute('srcset');
        if (srcset) {
          const parts = srcset.split(',').map((p: string) => {
            const [candUrl, descriptor] = p.trim().split(/\s+/);
            const w = descriptor && descriptor.endsWith('w') ? parseInt(descriptor, 10) : 0;
            return { url: candUrl, width: w };
          }).filter(x => Boolean(x.url));

          if (parts.length > 0) {
            parts.sort((a, b) => b.width - a.width);
            src = parts[0].url;
            if (parts[0].width > 0) width = parts[0].width;
          }
        }

        if (src && !src.startsWith('data:')) {
          foundUrls.push({
            url: src,
            mediaType: 'image',
            alt: img.alt || undefined,
            title: img.title || undefined,
            width,
            height: img.naturalHeight || img.height || undefined
          });
        }
      });

      // 抓取所有 <video> 標籤 (包含 blob 探測與 React Fiber / Performance Timing 提取)
      document.querySelectorAll('video').forEach(video => {
        let vSrc = video.currentSrc || video.src || '';
        if (!vSrc || vSrc.startsWith('blob:')) {
          const s = video.querySelector('source[src^="http"]');
          if (s) {
            vSrc = s.getAttribute('src') || '';
          }
        }

        if (!vSrc || vSrc.startsWith('blob:')) {
          try {
            const parentPost = video.closest('article, div[role="dialog"], [data-instancekey]');
            const nodesToCheck = [video, parentPost];
            for (const targetEl of nodesToCheck) {
              if (!targetEl) continue;
              const fiberKey = Object.keys(targetEl).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
              if (!fiberKey) continue;
              let node: any = (targetEl as any)[fiberKey];
              let depth = 0;
              while (node && depth < 30) {
                const props = node.memoizedProps || node.memoizedState || node;
                if (props) {
                  const m = props.media || props.item || props.post || props.videoData || props.clip;
                  if (m) {
                    if (Array.isArray(m.video_versions) && m.video_versions.length > 0) {
                      const best = [...m.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0];
                      if (best?.url) { vSrc = best.url; break; }
                    }
                    if (Array.isArray(m.carousel_media)) {
                      for (const cm of m.carousel_media) {
                        if (Array.isArray(cm.video_versions) && cm.video_versions.length > 0) {
                          const best = [...cm.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0];
                          if (best?.url) { vSrc = best.url; break; }
                        }
                      }
                      if (vSrc && !vSrc.startsWith('blob:')) break;
                    }
                  }
                  if (Array.isArray(props.video_versions) && props.video_versions.length > 0) {
                    const best = [...props.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0];
                    if (best?.url) { vSrc = best.url; break; }
                  }
                }
                node = node.return || node.child || node.sibling;
                depth++;
              }
              if (vSrc && !vSrc.startsWith('blob:')) break;
            }
          } catch {}
        }

        if (!vSrc || vSrc.startsWith('blob:')) {
          try {
            const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            const candidate = resources.slice().reverse().find(r => 
              r.name.includes('.mp4') && 
              !r.name.startsWith('blob:')
            );
            if (candidate) {
              vSrc = candidate.name
                .replace(/[?&]bytestart=\d+/gi, '')
                .replace(/[?&]byteend=\d+/gi, '')
                .replace('?&', '?');
            }
          } catch {}
        }

        const poster = video.getAttribute('poster') || undefined;
        if (vSrc && !vSrc.startsWith('blob:')) {
          foundUrls.push({
            url: vSrc,
            posterUrl: poster,
            mediaType: 'video',
            alt: video.getAttribute('aria-label') || 'Video',
            width: video.videoWidth || video.clientWidth || undefined,
            height: video.videoHeight || video.clientHeight || undefined
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
              mediaType: 'image',
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

  const isIg = tabUrl.includes('instagram.com');
  const extractedFromHtml = isIg ? [] : extractImagesFromHtml(pageData.html, tabUrl);
  const imageMap = new Map<string, ScrapedImage>();

  extractedFromHtml.forEach(img => imageMap.set(img.url, img));

  pageData.domImages.forEach(domImg => {
    const abs = toAbsoluteUrl(domImg.url, tabUrl);
    if (!abs) return;
    const { url: finalUrl, upgraded } = upgradeImageUrl(abs);

    let format = detectImageFormat(finalUrl);
    const isVideo = domImg.mediaType === 'video' || format === 'mp4' || format === 'webm';
    if (isVideo && format === 'unknown') {
      format = 'mp4';
    }

    if (imageMap.has(finalUrl)) {
      const existing = imageMap.get(finalUrl)!;
      if (domImg.width && (!existing.width || existing.width < domImg.width)) {
        existing.width = domImg.width;
      }
      if (domImg.height && (!existing.height || existing.height < domImg.height)) {
        existing.height = domImg.height;
      }
      if (isVideo && !existing.posterUrl && domImg.posterUrl) {
        existing.posterUrl = toAbsoluteUrl(domImg.posterUrl, tabUrl) || domImg.posterUrl;
      }
    } else {
      imageMap.set(finalUrl, {
        id: `${isVideo ? 'vid' : 'img'}_${imageMap.size + 1}_${Math.random().toString(36).slice(2, 7)}`,
        url: finalUrl,
        rawUrl: abs,
        posterUrl: isVideo ? (domImg.posterUrl ? (toAbsoluteUrl(domImg.posterUrl, tabUrl) || domImg.posterUrl) : undefined) : undefined,
        mediaType: isVideo ? 'video' : 'image',
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

export interface ScrapeWorkflowParams {
  crawlMode: 'url' | 'active-tab';
  targetUrl: string;
  activeTabMode: ActiveTabScrapeMode;
  onCarouselProgress?: (progress: CarouselProgress) => void;
  shouldAbort?: () => boolean;
}

/**
 * 整合爬取工作流程（URL 遠端爬取 / Instagram 貼文偵測 / Chrome 分頁原生提取）
 */
export async function executeScrapeWorkflow(params: ScrapeWorkflowParams): Promise<{
  images: ScrapedImage[];
  title: string;
}> {
  if (params.crawlMode === 'url') {
    if (!params.targetUrl.trim()) {
      throw new Error('請輸入欲爬取的網頁網址');
    }
    const isInstagram = /instagram\.com\/(p|reel|reels)\/([A-Za-z0-9_-]+)/i.test(params.targetUrl);

    if (isInstagram && typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const cleanTarget = params.targetUrl.split('?')[0].replace(/\/+$/, '');
      const tabs = await chrome.tabs.query({});
      const matchedTab = tabs.find(t => t.url && t.url.split('?')[0].replace(/\/+$/, '') === cleanTarget);

      if (matchedTab?.id) {
        const res = await extractFromActiveTab({
          targetTabId: matchedTab.id,
          mode: 'fast',
          onCarouselProgress: params.onCarouselProgress
        });
        return { images: res.images, title: res.tabTitle };
      }

      try {
        const res = await fetchAndExtractFromUrl(params.targetUrl);
        if (res.images.length > 0) return res;
      } catch (fetchErr) {
        console.warn('URL fetch 失敗:', fetchErr);
      }
      throw new Error('Instagram 影片與貼文受防盜鏈保護。請在瀏覽器分頁中開啟該貼文，並使用「採集當前分頁」即可一鍵抓取！');
    }

    return await fetchAndExtractFromUrl(params.targetUrl);
  }

  const res = await extractFromActiveTab({
    mode: params.activeTabMode,
    maxTraverseCount: 80,
    traverseDelayMs: 850,
    onCarouselProgress: params.onCarouselProgress,
    shouldAbort: params.shouldAbort
  });
  return { images: res.images, title: res.tabTitle || '當前分頁' };
}
