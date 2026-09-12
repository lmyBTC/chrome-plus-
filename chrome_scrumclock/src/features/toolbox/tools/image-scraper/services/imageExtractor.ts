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
    if (cleanUrl.endsWith('.mp4')) return 'mp4';
    if (cleanUrl.endsWith('.webm')) return 'webm';
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
    // 嚴格排除 Instagram 以及所有具有 HMAC 簽名驗證的 Meta CDN 網址
    // 凡是帶有 oh=, oe=, _nc_ht=, _nc_cat= 或 cdninstagram 的網址，
    // 只要修改了 stp 參數，伺服器就會直接以 403 Forbidden 拒絕存取，導致下載成壞檔！
    if (
      url.includes('cdninstagram.com') ||
      url.includes('instagram.com') ||
      (url.includes('fbcdn.net') && (url.includes('oh=') || url.includes('_nc_') || url.includes('oe=')))
    ) {
      return { url, upgraded: false };
    }
    if (!url.includes('fbcdn.net')) {
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

  const addMedia = (
    rawUrl: string,
    alt?: string,
    title?: string,
    width?: number,
    height?: number,
    posterUrl?: string,
    mediaType?: 'image' | 'video'
  ) => {
    const absUrl = toAbsoluteUrl(rawUrl, baseUrl);
    if (!absUrl) return;

    // 進行高畫質升級檢查 (支援 Flickr 與 Facebook)
    const { url: finalUrl, upgraded } = upgradeImageUrl(absUrl);

    let format = detectImageFormat(finalUrl);
    const isVideo = mediaType === 'video' || format === 'mp4' || format === 'webm';
    if (isVideo && format === 'unknown') {
      format = 'mp4';
    }

    if (imageMap.has(finalUrl)) {
      // 若已存在且有更好的 alt/title/尺寸則更新
      const existing = imageMap.get(finalUrl)!;
      if (!existing.alt && alt) existing.alt = alt;
      if (!existing.width && width) existing.width = width;
      if (!existing.height && height) existing.height = height;
      if (!existing.posterUrl && posterUrl) existing.posterUrl = toAbsoluteUrl(posterUrl, baseUrl) || posterUrl;
      return;
    }

    imageMap.set(finalUrl, {
      id: `${isVideo ? 'vid' : 'img'}_${imageMap.size + 1}_${Math.random().toString(36).slice(2, 7)}`,
      url: finalUrl,
      rawUrl: absUrl,
      posterUrl: posterUrl ? (toAbsoluteUrl(posterUrl, baseUrl) || posterUrl) : undefined,
      mediaType: isVideo ? 'video' : 'image',
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
    addMedia(flickrUrl, `Flickr Photo ${id}`);
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
          if (content) addMedia(content, 'Social OpenGraph Image');
        });
      });

      // 2.1.1 影片 Meta 標籤 (og:video, twitter:player)
      const videoMetaSelectors = [
        'meta[property="og:video"]',
        'meta[property="og:video:url"]',
        'meta[property="og:video:secure_url"]',
        'meta[name="twitter:player:stream"]'
      ];
      videoMetaSelectors.forEach(sel => {
        doc.querySelectorAll(sel).forEach(el => {
          const content = el.getAttribute('content') || el.getAttribute('href');
          if (content) addMedia(content, 'Social Video', undefined, undefined, undefined, undefined, 'video');
        });
      });

      // 2.2 <img> 標籤 (包含懶加載常見屬性，優先取最高解析度版本)
      doc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        const dataSrc = img.getAttribute('data-src') || 
                        img.getAttribute('data-original') || 
                        img.getAttribute('data-lazy-src') ||
                        img.getAttribute('data-high-res-src');
        const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
        const alt = img.getAttribute('alt') || '';
        const title = img.getAttribute('title') || '';
        let width = parseInt(img.getAttribute('width') || '0', 10) || undefined;
        let height = parseInt(img.getAttribute('height') || '0', 10) || undefined;

        let bestUrl = dataSrc || src || '';

        // 解析 srcset 挑選最高解析度 candidate (寬度最大或最後一個)
        if (srcset) {
          const parts = srcset.split(',').map(s => {
            const [u, desc] = s.trim().split(/\s+/);
            const w = desc && desc.endsWith('w') ? parseInt(desc, 10) : 0;
            return { url: u, width: w };
          }).filter(x => Boolean(x.url));

          if (parts.length > 0) {
            parts.sort((a, b) => b.width - a.width);
            bestUrl = parts[0].url;
            if (parts[0].width > 0 && (!width || parts[0].width > width)) {
              width = parts[0].width;
            }
          }
        }

        if (bestUrl) {
          addMedia(bestUrl, alt, title, width, height);
        }
      });

      // 2.3 <video> 標籤與 <source>
      doc.querySelectorAll('video').forEach(video => {
        let src = video.getAttribute('src') || video.getAttribute('data-src');
        const poster = video.getAttribute('poster') || undefined;
        const width = parseInt(video.getAttribute('width') || '0', 10) || undefined;
        const height = parseInt(video.getAttribute('height') || '0', 10) || undefined;

        if (src && !src.startsWith('blob:')) {
          addMedia(src, 'HTML5 Video', undefined, width, height, poster, 'video');
        }

        // 解析 video source
        video.querySelectorAll('source').forEach(source => {
          const sSrc = source.getAttribute('src');
          if (sSrc && !sSrc.startsWith('blob:')) {
            addMedia(sSrc, 'HTML5 Video Source', undefined, width, height, poster, 'video');
          }
        });
      });

      // 2.4 <picture> 中的 <source>
      doc.querySelectorAll('picture source').forEach(source => {
        const srcset = source.getAttribute('srcset');
        if (srcset) {
          const candidates = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
          candidates.forEach(c => addMedia(c));
        }
      });

      // 2.5 Inline style 中的 background-image
      const bgElements = doc.querySelectorAll('[style*="background"]');
      bgElements.forEach(el => {
        const style = el.getAttribute('style') || '';
        const bgMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/i);
        if (bgMatch && bgMatch[1]) {
          addMedia(bgMatch[1]);
        }
      });
    } catch (err) {
      console.warn('DOMParser 解析警告，退回正則掃描:', err);
    }
  }

  // 3. 通用 Regex 掃描所有符合靜態圖片或常見影片副檔名的 URL
  const genericMediaRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif|svg|mp4|webm)(?:\?[^\s"'<>]*)?/gi;
  let generalMatch: RegExpExecArray | null;
  while ((generalMatch = genericMediaRegex.exec(html)) !== null) {
    addMedia(generalMatch[0]);
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
  targetTabId?: number;
}

/**
 * 專屬 Instagram 貼文/Reels 全方位媒體解析器
 * 整合 5 重提取策略：
 * 1. 深度掃描頁面內嵌 <script> 的 Relay/GraphQL JSON 快取
 * 2. 深度探測 DOM 上的 <video> 與 React Fiber / Props (破解 blob: 網址)
 * 3. 探測 Performance Resource Timing 取得真實請求的 .mp4
 * 4. 同源帶憑證發送 GraphQL 與 Web Info API 查詢
 * 5. 全頁 HTML / Script 正則匹配 CDN .mp4 直鏈保底
 */
async function extractInstagramPostDirectly(
  tabId: number,
  tabUrl: string,
  tabTitle: string,
  options?: ActiveTabScrapeOptions
): Promise<{ tabTitle: string; tabUrl: string; images: ScrapedImage[] } | null> {
  const maxLimit = options?.maxTraverseCount || 80;

  options?.onCarouselProgress?.({
    currentCount: 0,
    maxLimit,
    statusText: '偵測到 Instagram 貼文，正在解析影片與高畫質圖片...',
    isTraversing: true
  });

  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId },
    func: async () => {
      const results: {
        url: string;
        posterUrl?: string;
        mediaType: 'video' | 'image';
        alt?: string;
        width?: number;
        height?: number;
      }[] = [];
      const seenUrls = new Set<string>();

      // 輔助函式：從 Instagram / Facebook CDN 提取唯一檔案特徵碼
      const getMediaKey = (url: string): string => {
        try {
          const pathname = new URL(url).pathname;
          const match = pathname.match(/([a-zA-Z0-9_\-\.]+\.(?:jpg|jpeg|webp|png|mp4))/i);
          if (match) return match[1];
          return pathname;
        } catch {
          const m = url.match(/([a-zA-Z0-9_\-\.]+\.(?:jpg|jpeg|webp|png|mp4))/i);
          return m ? m[1] : url.split('?')[0];
        }
      };

      // 輔助函式：估計 URL 中的解析度寬度
      const estimateWidth = (url: string, explicitWidth?: number): number => {
        if (explicitWidth && explicitWidth > 0) return explicitWidth;
        const m = url.match(/[ps](\d+)x(\d+)/i) || url.match(/(\d+)w/i);
        if (m && m[1]) return parseInt(m[1], 10);
        return 0;
      };

      const mediaKeyMap = new Map<string, number>();

      const addMedia = (item: {
        url: string;
        posterUrl?: string;
        mediaType: 'video' | 'image';
        alt?: string;
        width?: number;
        height?: number;
      }) => {
        if (!item.url) return;
        // 清理 URL 跳脫字元與前後殘留引號
        const cleanUrl = item.url
          .replace(/^["']+|["']+$/g, '')
          .replace(/\\u0026/g, '&')
          .replace(/&amp;/g, '&')
          .replace(/\\/g, '');

        // 嚴格排除系統靜態資源與表情圖示
        if (cleanUrl.includes('rsrc.php') || cleanUrl.includes('static.cdninstagram.com')) return;

        // 普通圖片嚴禁設定 posterUrl，徹底防止首圖覆蓋所有縮圖
        const cleanPoster = item.mediaType === 'video' ? item.posterUrl : undefined;
        const itemWidth = estimateWidth(cleanUrl, item.width);

        const key = getMediaKey(cleanUrl);
        if (mediaKeyMap.has(key)) {
          const existingIdx = mediaKeyMap.get(key)!;
          const existingItem = results[existingIdx];
          const existingWidth = estimateWidth(existingItem.url, existingItem.width);
          // 若新傳入的版本寬度更大（例如 684x1024 取代 240x300），則覆蓋升級！
          if (itemWidth > existingWidth) {
            results[existingIdx] = {
              ...item,
              url: cleanUrl,
              posterUrl: cleanPoster,
              width: itemWidth || undefined
            };
          }
          return;
        }

        if (seenUrls.has(cleanUrl)) return;
        seenUrls.add(cleanUrl);
        mediaKeyMap.set(key, results.length);
        results.push({
          ...item,
          url: cleanUrl,
          posterUrl: cleanPoster,
          width: itemWidth || undefined
        });
      };

      // 嚴格限定當前貼文的作用域容器 (article 或 dialog)
      const postArticle = document.querySelector('article') || document.querySelector('div[role="dialog"]') || document.body;

      // 提取 shortcode (支援當前 URL 與貼文容器內的 a 標籤)
      let shortcode: string | null = null;
      const pathMatch = window.location.pathname.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
      if (pathMatch) {
        shortcode = pathMatch[2];
      } else {
        const anchor = postArticle.querySelector('a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"]') as HTMLAnchorElement | null;
        if (anchor) {
          const aMatch = anchor.pathname.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
          if (aMatch) shortcode = aMatch[2];
        }
      }

      // Base64 將 shortcode 轉換為官方數字型 media_id (相容 BigInt)
      const shortcodeToMediaId = (code: string): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        let clean = code;
        if (clean.length > 28) clean = clean.slice(0, 28);
        let id = BigInt(0);
        for (let i = 0; i < clean.length; i++) {
          const idx = BigInt(chars.indexOf(clean[i]));
          if (idx < BigInt(0)) continue;
          id = id * BigInt(64) + idx;
        }
        return id.toString();
      };

      // -------------------------------------------------------------
      // 維度 0：官方 Web API 同源直通查詢 (最優先！100% 取得帶完整音訊的 Progressive MP4)
      // -------------------------------------------------------------
      if (shortcode) {
        try {
          const mediaId = shortcodeToMediaId(shortcode);
          const apiEndpoints = [
            `https://www.instagram.com/api/v1/media/${mediaId}/info/`,
            `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`,
            `https://www.instagram.com/reel/${shortcode}/?__a=1&__d=dis`,
            `https://www.instagram.com/api/v1/media/web_info/?shortcode=${shortcode}`,
            `https://www.instagram.com/graphql/query/?doc_id=8845758582119845&variables=${encodeURIComponent(JSON.stringify({ shortcode }))}`,
            `https://www.instagram.com/graphql/query/?doc_id=27130156389949648&variables=${encodeURIComponent(JSON.stringify({ media_id: mediaId }))}`
          ];

          for (const endpoint of apiEndpoints) {
            try {
              const resp = await fetch(endpoint, {
                headers: {
                  'x-ig-app-id': '936619743392459',
                  'x-asbd-id': '129477',
                  'Accept': 'application/json, text/plain, */*'
                },
                credentials: 'include'
              });

              if (resp.ok) {
                const contentType = resp.headers.get('content-type') || '';
                if (contentType.includes('json')) {
                  const data = await resp.json();
                  const item =
                    data?.items?.[0] ||
                    data?.data?.xdt_api__v1__media__web_info?.items?.[0] ||
                    data?.graphql?.shortcode_media ||
                    data?.data?.shortcode_media ||
                    data?.data?.xig_polaris_media?.if_not_gated_logged_out;

                  if (item) {
                    const poster = item.image_versions2?.candidates?.[0]?.url;

                    // 1. 單一影片
                    if (Array.isArray(item.video_versions) && item.video_versions.length > 0) {
                      const sorted = [...item.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
                      if (sorted[0]?.url) {
                        addMedia({
                          url: sorted[0].url,
                          posterUrl: poster,
                          mediaType: 'video',
                          alt: item.caption?.text || 'Instagram 高畫質有聲影片',
                          width: sorted[0].width,
                          height: sorted[0].height
                        });
                      }
                    } else if (item.video_url) {
                      addMedia({
                        url: item.video_url,
                        posterUrl: poster,
                        mediaType: 'video',
                        alt: item.caption?.text || 'Instagram 影片'
                      });
                    }

                    // 2. 多圖/多影片輪播 (Carousel API 格式)
                    if (Array.isArray(item.carousel_media) && item.carousel_media.length > 0) {
                      item.carousel_media.forEach((m: any) => {
                        const mPoster = m.image_versions2?.candidates?.[0]?.url;
                        if (Array.isArray(m.video_versions) && m.video_versions.length > 0) {
                          const sorted = [...m.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
                          if (sorted[0]?.url) {
                            addMedia({
                              url: sorted[0].url,
                              posterUrl: mPoster,
                              mediaType: 'video',
                              alt: 'Instagram 輪播影片 (有聲原片)',
                              width: sorted[0].width,
                              height: sorted[0].height
                            });
                          }
                        } else if (m.image_versions2?.candidates?.[0]?.url) {
                          // 嚴格保證只抓取 candidates[0] 最高畫質 1080p 原圖，絕不設定 posterUrl
                          addMedia({
                            url: m.image_versions2.candidates[0].url,
                            mediaType: 'image',
                            alt: 'Instagram 貼文圖片',
                            width: m.image_versions2.candidates[0].width,
                            height: m.image_versions2.candidates[0].height
                          });
                        }
                      });
                    }

                    // 3. 多圖/多影片輪播 (GraphQL edge_sidecar_to_children 格式)
                    const sidecarEdges = item.edge_sidecar_to_children?.edges;
                    if (Array.isArray(sidecarEdges) && sidecarEdges.length > 0) {
                      sidecarEdges.forEach((edge: any) => {
                        const node = edge.node;
                        if (node) {
                          if (node.is_video && (node.video_url || node.video_resources?.length)) {
                            const vUrl = node.video_url || node.video_resources?.slice(-1)[0]?.src;
                            if (vUrl) {
                              addMedia({
                                url: vUrl,
                                posterUrl: node.display_url,
                                mediaType: 'video',
                                alt: 'Instagram 輪播影片',
                                width: node.dimensions?.width,
                                height: node.dimensions?.height
                              });
                            }
                          } else {
                            const bestImg = node.display_resources?.slice(-1)[0]?.src || node.display_url;
                            if (bestImg) {
                              addMedia({
                                url: bestImg,
                                mediaType: 'image',
                                alt: 'Instagram 輪播圖片',
                                width: node.dimensions?.width,
                                height: node.dimensions?.height
                              });
                            }
                          }
                        }
                      });
                    }

                    // 4. 單一張高解析度圖片貼文 (重要保證！)
                    if (
                      (!item.video_versions || item.video_versions.length === 0) &&
                      !item.video_url &&
                      !item.is_video &&
                      (!Array.isArray(item.carousel_media) || item.carousel_media.length === 0) &&
                      (!Array.isArray(sidecarEdges) || sidecarEdges.length === 0)
                    ) {
                      const bestCandidate = item.image_versions2?.candidates?.[0];
                      const bestResource = item.display_resources?.slice(-1)[0];
                      const singleImgUrl = bestCandidate?.url || bestResource?.src || item.display_url;
                      if (singleImgUrl) {
                        addMedia({
                          url: singleImgUrl,
                          mediaType: 'image',
                          alt: item.caption?.text || 'Instagram 高畫質貼文圖片',
                          width: bestCandidate?.width || bestResource?.config_width,
                          height: bestCandidate?.height || bestResource?.config_height
                        });
                      }
                    }

                    if (results.length > 0) {
                      break; // 已成功提取官方高畫質媒體，直接結束循環
                    }
                  }
                }
              }
            } catch (endpointErr) {
              // 嘗試下一個官方端點
            }
          }
        } catch (apiErr) {
          console.warn('[ImageScraper] 官方 Web API 同源查詢警告:', apiErr);
        }
      }

      // -------------------------------------------------------------
      // 維度 1：深度挖掘頁面 <script> 中的官方完整原片 (browser_native_hd_url / video_versions / video_url)
      // 支援普通 JSON 與轉義引號 (\\") 字串，並自動清洗 bytestart/byteend 分段參數恢復原片
      // -------------------------------------------------------------
      if (results.length === 0) {
        try {
          const scripts = Array.from(document.querySelectorAll('script'));
          for (const s of scripts) {
            const text = s.textContent || '';
            if (!text) continue;

            // 1.1 優先提取最高清晰度 browser_native_hd_url
            const hdMatches = text.matchAll(/(?:\\?"|")browser_native_hd_url(?:\\?"|")\s*:\s*(?:\\?"|")([^"\\]+(?:\\.[^"\\]*)*)(?:\\?"|")/gi);
            for (const m of hdMatches) {
              if (m && m[1]) {
                let rawUrl = m[1].replace(/\\([/"'\\])/g, '$1').replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
                rawUrl = rawUrl.replace(/[?&]bytestart=\d+/gi, '').replace(/[?&]byteend=\d+/gi, '').replace('?&', '?');
                if (rawUrl.startsWith('https:')) {
                  addMedia({
                    url: rawUrl,
                    mediaType: 'video',
                    alt: 'Instagram 官方高清有聲影片'
                  });
                  break;
                }
              }
            }

            // 1.2 次選提取 browser_native_sd_url
            const sdMatches = text.matchAll(/(?:\\?"|")browser_native_sd_url(?:\\?"|")\s*:\s*(?:\\?"|")([^"\\]+(?:\\.[^"\\]*)*)(?:\\?"|")/gi);
            for (const m of sdMatches) {
              if (m && m[1]) {
                let rawUrl = m[1].replace(/\\([/"'\\])/g, '$1').replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
                rawUrl = rawUrl.replace(/[?&]bytestart=\d+/gi, '').replace(/[?&]byteend=\d+/gi, '').replace('?&', '?');
                if (rawUrl.startsWith('https:')) {
                  addMedia({
                    url: rawUrl,
                    mediaType: 'video',
                    alt: 'Instagram 影片'
                  });
                  break;
                }
              }
            }

            // 1.3 提取 video_versions 中的 MP4 直鏈
            const vvMatches = text.matchAll(/(?:\\?"|")video_versions(?:\\?"|")\s*:\s*\[\s*\{[^[\]]*?(?:\\?"|")url(?:\\?"|")\s*:\s*(?:\\?"|")([^"\\]+(?:\\.[^"\\]*)*)(?:\\?"|")/gi);
            for (const m of vvMatches) {
              if (m && m[1]) {
                let rawUrl = m[1].replace(/\\([/"'\\])/g, '$1').replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
                rawUrl = rawUrl.replace(/[?&]bytestart=\d+/gi, '').replace(/[?&]byteend=\d+/gi, '').replace('?&', '?');
                if (rawUrl.startsWith('https:')) {
                  addMedia({
                    url: rawUrl,
                    mediaType: 'video',
                    alt: 'Instagram 貼文影片'
                  });
                  break;
                }
              }
            }

            // 1.4 提取 video_url 直鏈
            const vuMatches = text.matchAll(/(?:\\?"|")video_url(?:\\?"|")\s*:\s*(?:\\?"|")([^"\\]+(?:\\.[^"\\]*)*)(?:\\?"|")/gi);
            for (const m of vuMatches) {
              if (m && m[1]) {
                let rawUrl = m[1].replace(/\\([/"'\\])/g, '$1').replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
                rawUrl = rawUrl.replace(/[?&]bytestart=\d+/gi, '').replace(/[?&]byteend=\d+/gi, '').replace('?&', '?');
                if (rawUrl.startsWith('https:') && rawUrl.includes('.mp4')) {
                  addMedia({
                    url: rawUrl,
                    mediaType: 'video',
                    alt: 'Instagram 貼文影片'
                  });
                  break;
                }
              }
            }

            // 1.5 提取圖片 display_resources (GraphQL / Relay JSON 高解析度候選)
            const drMatches = text.matchAll(/(?:\\?"|")display_resources(?:\\?"|")\s*:\s*\[([\s\S]*?)\]/gi);
            for (const m of drMatches) {
              if (m && m[1]) {
                const resText = m[1];
                const srcMatches = Array.from(resText.matchAll(/(?:\\?"|")src(?:\\?"|")\s*:\s*(?:\\?"|")([^"\\]+(?:\\.[^"\\]*)*)(?:\\?"|")(?:\s*,\s*(?:\\?"|")config_width(?:\\?"|")\s*:\s*(\d+))?/gi));
                if (srcMatches.length > 0) {
                  const sortedRes = srcMatches.map(sm => ({
                    url: sm[1].replace(/\\([/"'\\])/g, '$1').replace(/\\u0026/g, '&').replace(/&amp;/g, '&'),
                    width: sm[2] ? parseInt(sm[2], 10) : 0
                  })).sort((a, b) => b.width - a.width);

                  if (sortedRes[0]?.url.startsWith('https:')) {
                    addMedia({
                      url: sortedRes[0].url,
                      mediaType: 'image',
                      alt: 'Instagram 貼文圖片',
                      width: sortedRes[0].width || undefined
                    });
                  }
                }
              }
            }

            // 1.6 提取 display_url (原圖 1080p)
            const duMatches = text.matchAll(/(?:\\?"|")display_url(?:\\?"|")\s*:\s*(?:\\?"|")([^"\\]+(?:\\.[^"\\]*)*)(?:\\?"|")/gi);
            for (const m of duMatches) {
              if (m && m[1]) {
                let rawUrl = m[1].replace(/\\([/"'\\])/g, '$1').replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
                if (rawUrl.startsWith('https:') && !rawUrl.includes('s150x150')) {
                  addMedia({
                    url: rawUrl,
                    mediaType: 'image',
                    alt: 'Instagram 貼文圖片'
                  });
                }
              }
            }

            // 1.7 提取 image_versions2 candidates 第一項原圖
            const ivMatches = text.matchAll(/(?:\\?"|")image_versions2(?:\\?"|")\s*:\s*\{\s*(?:\\?"|")candidates(?:\\?"|")\s*:\s*\[\s*\{\s*(?:\\?"|")url(?:\\?"|")\s*:\s*(?:\\?"|")([^"\\]+(?:\\.[^"\\]*)*)(?:\\?"|")(?:[^\}]*?(?:\\?"|")width(?:\\?"|")\s*:\s*(\d+))?/gi);
            for (const m of ivMatches) {
              if (m && m[1]) {
                let rawUrl = m[1].replace(/\\([/"'\\])/g, '$1').replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
                const width = m[2] ? parseInt(m[2], 10) : undefined;
                if (rawUrl.startsWith('https:') && (!width || width >= 640)) {
                  addMedia({
                    url: rawUrl,
                    mediaType: 'image',
                    alt: 'Instagram 貼文圖片',
                    width
                  });
                }
              }
            }
          }
        } catch (err) {
          console.warn('Script 完整直鏈掃描出錯:', err);
        }
      }

      // -------------------------------------------------------------
      // 維度 2：從頁面 Meta 標籤與 JSON-LD (官方規範)
      // -------------------------------------------------------------
      if (results.length === 0) {
        try {
          // 2.1 檢查 og:video
          const ogVideo = document.querySelector('meta[property="og:video"], meta[property="og:video:url"], meta[property="og:video:secure_url"]');
          const ogVideoUrl = ogVideo?.getAttribute('content');
          const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
          if (ogVideoUrl && ogVideoUrl.includes('.mp4')) {
            addMedia({
              url: ogVideoUrl,
              posterUrl: ogImage || undefined,
              mediaType: 'video',
              alt: 'Instagram 貼文影片'
            });
          }

          // 2.2 檢查 JSON-LD 中的 contentUrl
          const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
          for (const s of jsonLdScripts) {
            try {
              const data = JSON.parse(s.textContent || '');
              if (data.contentUrl && typeof data.contentUrl === 'string' && data.contentUrl.includes('.mp4')) {
                addMedia({
                  url: data.contentUrl,
                  posterUrl: data.thumbnailUrl || ogImage || undefined,
                  mediaType: 'video',
                  alt: data.name || data.description || 'Instagram 貼文影片'
                });
              }
            } catch {}
          }
        } catch {}
      }

      // -------------------------------------------------------------
      // 維度 3：深度探測當前 postArticle 內的 React Fiber / Props / State
      // -------------------------------------------------------------
      if (results.length === 0) {
        try {
          const candidateNodes = [
            postArticle,
            ...Array.from(postArticle.querySelectorAll('div[aria-label="Video player"], [data-instancekey], video'))
          ];

          for (const el of candidateNodes) {
            const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
            if (!fiberKey) continue;

            let node: any = (el as any)[fiberKey];
            let depth = 0;
            while (node && depth < 35) {
              const props = node.memoizedProps || node.memoizedState || node;
              if (props) {
                const targetMedia = props.media || props.item || props.post || props.videoData || props.clip;
                if (targetMedia) {
                  if (targetMedia.browser_native_hd_url) {
                    addMedia({
                      url: targetMedia.browser_native_hd_url,
                      mediaType: 'video',
                      alt: 'Instagram 官方高清影片'
                    });
                    break;
                  }
                  if (Array.isArray(targetMedia.video_versions) && targetMedia.video_versions.length > 0) {
                    const sorted = [...targetMedia.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
                    if (sorted[0]?.url) {
                      addMedia({
                        url: sorted[0].url,
                        mediaType: 'video',
                        alt: 'Instagram 有聲影片',
                        width: sorted[0].width,
                        height: sorted[0].height
                      });
                      break;
                    }
                  }
                  // 輪播項目 (包含影片與高解析原圖)
                  if (Array.isArray(targetMedia.carousel_media) && targetMedia.carousel_media.length > 0) {
                    targetMedia.carousel_media.forEach((m: any) => {
                      if (Array.isArray(m.video_versions) && m.video_versions[0]) {
                        const sortedV = [...m.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
                        addMedia({
                          url: sortedV[0].url,
                          posterUrl: m.image_versions2?.candidates?.[0]?.url,
                          mediaType: 'video',
                          alt: 'Instagram 輪播影片',
                          width: sortedV[0].width,
                          height: sortedV[0].height
                        });
                      } else {
                        const cand = m.image_versions2?.candidates?.[0];
                        const imgUrl = cand?.url || m.display_url;
                        if (imgUrl) {
                          addMedia({
                            url: imgUrl,
                            mediaType: 'image',
                            alt: 'Instagram 輪播圖片',
                            width: cand?.width,
                            height: cand?.height
                          });
                        }
                      }
                    });
                    if (results.length > 0) break;
                  }

                  // 單圖或單片
                  if (targetMedia.image_versions2?.candidates?.[0]?.url || targetMedia.display_url) {
                    const cand = targetMedia.image_versions2?.candidates?.[0];
                    const imgUrl = cand?.url || targetMedia.display_url;
                    if (imgUrl) {
                      addMedia({
                        url: imgUrl,
                        mediaType: 'image',
                        alt: 'Instagram 貼文圖片',
                        width: cand?.width,
                        height: cand?.height
                      });
                    }
                  }

                  if (targetMedia.url && typeof targetMedia.url === 'string' && targetMedia.url.includes('.mp4')) {
                    addMedia({
                      url: targetMedia.url,
                      mediaType: 'video',
                      alt: 'Instagram 貼文影片'
                    });
                    break;
                  }
                }
                if (props.browser_native_hd_url) {
                  addMedia({
                    url: props.browser_native_hd_url,
                    mediaType: 'video',
                    alt: 'Instagram 官方高清影片'
                  });
                  break;
                }
                if (Array.isArray(props.video_versions) && props.video_versions.length > 0) {
                  const sorted = [...props.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
                  if (sorted[0]?.url) {
                    addMedia({
                      url: sorted[0].url,
                      mediaType: 'video',
                      alt: 'Instagram 有聲影片',
                      width: sorted[0].width,
                      height: sorted[0].height
                    });
                    break;
                  }
                }
              }
              node = node.return || node.child || node.sibling;
              depth++;
            }
            if (results.length > 0) break;
          }
        } catch (err) {
          console.warn('React Fiber 探測錯誤:', err);
        }
      }

      // -------------------------------------------------------------
      // 維度 5：探測 DOM 上的 <video> 元素與 Performance Resource Timing
      // -------------------------------------------------------------
      if (results.length === 0) {
        try {
          const videos = Array.from(postArticle.querySelectorAll('video')) as HTMLVideoElement[];
          for (const vid of videos) {
            let chosenUrl = vid.currentSrc || vid.src || '';
            if (!chosenUrl || chosenUrl.startsWith('blob:')) {
              const srcEl = vid.querySelector('source[src^="http"]');
              if (srcEl) chosenUrl = srcEl.getAttribute('src') || '';
            }
            if (!chosenUrl || chosenUrl.startsWith('blob:')) {
              // 探測 Performance Resource Timing
              try {
                const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
                const candidate = resources.slice().reverse().find(r => r.name.includes('.mp4') && !r.name.startsWith('blob:'));
                if (candidate) {
                  chosenUrl = candidate.name
                    .replace(/[?&]bytestart=\d+/gi, '')
                    .replace(/[?&]byteend=\d+/gi, '')
                    .replace('?&', '?');
                }
              } catch {}
            }
            if (chosenUrl && !chosenUrl.startsWith('blob:')) {
              addMedia({
                url: chosenUrl,
                posterUrl: vid.getAttribute('poster') || undefined,
                mediaType: 'video',
                alt: vid.getAttribute('aria-label') || 'Instagram 影片',
                width: vid.videoWidth || vid.clientWidth || undefined,
                height: vid.videoHeight || vid.clientHeight || undefined
              });
            }
          }
        } catch {}
      }

      // -------------------------------------------------------------
      // 維度 6：全頁 HTML / Script 中的 .mp4 直鏈兜底掃描
      // -------------------------------------------------------------
      if (results.length === 0) {
        try {
          const fullHtml = document.documentElement.outerHTML;
          const mp4Regex = /https?:\/\/[^\s"'<>]*(?:fbcdn\.net|cdninstagram\.com)[^\s"'<>]*\.mp4(?:\?[^\s"'<>]*)?/gi;
          let m: RegExpExecArray | null;
          while ((m = mp4Regex.exec(fullHtml)) !== null) {
            let mp4Url = m[0]
              .replace(/\\u0026/g, '&')
              .replace(/&amp;/g, '&')
              .replace(/\\/g, '')
              .replace(/[?&]bytestart=\d+/gi, '')
              .replace(/[?&]byteend=\d+/gi, '')
              .replace('?&', '?');
            if (mp4Url.startsWith('https:')) {
              addMedia({
                url: mp4Url,
                mediaType: 'video',
                alt: 'Instagram 影片'
              });
              break;
            }
          }
        } catch {}
      }

      // 只有在以上所有高級策略皆未取得任何媒體時，才降級由 DOM 提取當前貼文圖片
      if (results.length === 0) {
        try {
          const imgs = (Array.from(postArticle.querySelectorAll('img')) as HTMLImageElement[]).filter(img => {
            const w = img.naturalWidth || img.clientWidth || 0;
            const h = img.naturalHeight || img.clientHeight || 0;
            const alt = (img.alt || '').toLowerCase();
            // 嚴格排除個人大頭貼與靜態 UI 資源
            const isAvatar = alt.includes('profile') || alt.includes('個人檔案') || img.src.includes('s150x150') || img.src.includes('p150x150');
            return w >= 200 && h >= 200 && !isAvatar && !img.src.includes('rsrc.php');
          });

          imgs.forEach(img => {
            let chosen = img.currentSrc || img.src || '';
            const srcset = img.getAttribute('srcset');
            if (srcset) {
              const parts = srcset.split(',').map((p: string) => {
                const [candUrl, descriptor] = p.trim().split(/\s+/);
                const w = descriptor && descriptor.endsWith('w') ? parseInt(descriptor, 10) : 0;
                return { url: candUrl, width: w };
              }).filter(x => Boolean(x.url));

              if (parts.length > 0) {
                // 優先挑選解析度最大之版本 (如 1080w 或最後一個)
                parts.sort((a, b) => b.width - a.width);
                chosen = parts[0].url;
              }
            }

            if (chosen && !chosen.startsWith('data:')) {
              addMedia({
                url: chosen,
                mediaType: 'image',
                alt: img.alt || undefined,
                width: img.naturalWidth || img.clientWidth || undefined,
                height: img.naturalHeight || img.clientHeight || undefined
              });
            }
          });
        } catch {}
      }

      // 補上封面縮圖 (僅限影片！嚴格禁止覆蓋普通圖片，且排除小於 250px 之大頭貼)
      const validPoster = (() => {
        const vidPoster = (postArticle.querySelector('video') as HTMLVideoElement | null)?.poster;
        if (vidPoster && !vidPoster.includes('s150x150') && !vidPoster.includes('p150x150')) return vidPoster;
        const mainImgs = Array.from(postArticle.querySelectorAll('img')) as HTMLImageElement[];
        const validImg = mainImgs.find(img => {
          const w = img.naturalWidth || img.clientWidth || 0;
          const alt = (img.alt || '').toLowerCase();
          return w >= 250 && !alt.includes('profile') && !alt.includes('個人檔案') && !img.src.includes('s150x150') && !img.src.includes('p150x150');
        });
        return validImg ? (validImg.currentSrc || validImg.src) : undefined;
      })();

      results.forEach(item => {
        if (item.mediaType === 'video' && !item.posterUrl && validPoster) {
          item.posterUrl = validPoster;
        }
      });

      return results;
    }
  });

  const rawMedia = injectionResults?.[0]?.result;
  if (!rawMedia || !Array.isArray(rawMedia) || rawMedia.length === 0) {
    return null;
  }

  const imageMap = new Map<string, ScrapedImage>();
  const fileKeyMap = new Map<string, string>(); // fileKey -> existingUrl in imageMap

  const getMediaFileKey = (u: string) => {
    try {
      const p = new URL(u).pathname;
      const m = p.match(/([a-zA-Z0-9_\-\.]+\.(?:jpg|jpeg|webp|png|mp4))/i);
      return m ? m[1] : p;
    } catch {
      const m = u.match(/([a-zA-Z0-9_\-\.]+\.(?:jpg|jpeg|webp|png|mp4))/i);
      return m ? m[1] : u.split('?')[0];
    }
  };

  const getUrlWidth = (u: string, explicitWidth?: number): number => {
    if (explicitWidth && explicitWidth > 0) return explicitWidth;
    const m = u.match(/[ps](\d+)x(\d+)/i) || u.match(/(\d+)w/i);
    if (m && m[1]) return parseInt(m[1], 10);
    return 0;
  };

  rawMedia.forEach((item, idx) => {
    const abs = toAbsoluteUrl(item.url, tabUrl);
    if (!abs) return;

    let format = detectImageFormat(abs);
    const isVideo = item.mediaType === 'video' || format === 'mp4' || format === 'webm';
    if (isVideo && format === 'unknown') {
      format = 'mp4';
    }

    const fileKey = getMediaFileKey(abs);
    const itemWidth = getUrlWidth(abs, item.width);

    if (fileKeyMap.has(fileKey)) {
      const existingUrl = fileKeyMap.get(fileKey)!;
      const existingImg = imageMap.get(existingUrl);
      if (existingImg) {
        const existingWidth = getUrlWidth(existingImg.url, existingImg.width);
        // 若新項目的解析度更高（例如 684x1024 取代 240x300），汰換掉原本的低清版本！
        if (itemWidth > existingWidth) {
          imageMap.delete(existingUrl);
          fileKeyMap.set(fileKey, abs);
          imageMap.set(abs, {
            ...existingImg,
            id: `${isVideo ? 'vid' : 'img'}_ig_${idx + 1}_${Math.random().toString(36).slice(2, 7)}`,
            url: abs,
            rawUrl: abs,
            posterUrl: isVideo ? (item.posterUrl ? (toAbsoluteUrl(item.posterUrl, tabUrl) || item.posterUrl) : existingImg.posterUrl) : undefined,
            width: itemWidth || undefined,
            height: item.height || existingImg.height
          });
        }
      }
      return;
    }

    if (!imageMap.has(abs)) {
      fileKeyMap.set(fileKey, abs);
      imageMap.set(abs, {
        id: `${isVideo ? 'vid' : 'img'}_ig_${idx + 1}_${Math.random().toString(36).slice(2, 7)}`,
        url: abs,
        rawUrl: abs,
        posterUrl: isVideo ? (item.posterUrl ? (toAbsoluteUrl(item.posterUrl, tabUrl) || item.posterUrl) : undefined) : undefined,
        mediaType: isVideo ? 'video' : 'image',
        alt: item.alt,
        width: itemWidth || item.width,
        height: item.height,
        format,
        selected: true,
        status: 'idle',
        isHighResUpgrade: true
      });
    }
  });

  const videoCount = Array.from(imageMap.values()).filter(x => x.mediaType === 'video').length;
  const mediaDesc = videoCount > 0
    ? `${imageMap.size} 個檔案（含 ${videoCount} 部影片）`
    : `${imageMap.size} 張大圖`;

  options?.onCarouselProgress?.({
    currentCount: imageMap.size,
    maxLimit,
    statusText: `成功從 Instagram 解析！共獲取 ${mediaDesc}`,
    isTraversing: false
  });

  return {
    tabTitle,
    tabUrl,
    images: Array.from(imageMap.values())
  };
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
  const fileKeyMap = new Map<string, string>(); // fileKey -> existingUrl in imageMap
  const seenUrls = new Set<string>();
  let consecutiveDuplicates = 0;

  options?.onCarouselProgress?.({
    currentCount: 0,
    maxLimit,
    statusText: '開始偵測相簿劇院與貼文輪播...',
    isTraversing: true
  });

  // 1. [Instagram 專屬全方位解析器] 融合 5 重策略 (Script JSON / React Fiber / Performance Timing / 同源 API / 全頁正則)
  const isInstagramPost = /instagram\.com\/(p|reel|reels)\/([A-Za-z0-9_-]+)/i.test(tabUrl);
  if (isInstagramPost) {
    try {
      const igResult = await extractInstagramPostDirectly(tabId, tabUrl, tabTitle, options);
      if (igResult && igResult.images.length > 0) {
        return igResult;
      }
    } catch (igErr) {
      console.warn('[ImageScraper] Instagram 專屬解析器執行異常，降級至 DOM 輪巡:', igErr);
    }
  }

  // 提取貼文初始 shortcode (如 DcyDFj9HzNp) 用於防偏離校驗
  const igShortcodeMatch = tabUrl.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
  const initialShortcode = igShortcodeMatch ? igShortcodeMatch[2] : null;

  // 2. [相簿劇院與多圖貼文智慧輪播輪巡]
  for (let step = 0; step < maxLimit; step++) {
    // 檢查是否由使用者主動中斷
    if (options?.shouldAbort && options.shouldAbort()) {
      break;
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (expectedShortcode: string | null) => {
          // 0. 安全防護：檢查當前 URL 是否偏離原貼文 (防止誤點跳到下一篇貼文)
          const currentPath = window.location.pathname;
          if (expectedShortcode) {
            const currentMatch = currentPath.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
            if (currentMatch && currentMatch[2] !== expectedShortcode) {
              return {
                diverged: true,
                images: [] as { url: string; posterUrl?: string; mediaType?: 'image' | 'video'; alt?: string; title?: string; width?: number; height?: number }[],
                hasNext: false,
                currentIndex: undefined
              };
            }
          }

          const collected: { url: string; posterUrl?: string; mediaType?: 'image' | 'video'; alt?: string; title?: string; width?: number; height?: number }[] = [];

          // a. 優先定位貼文主容器 (如 Instagram <article> 或 Facebook Theater)
          // 針對 Instagram 必須嚴格限定在當前貼文 article 內部，嚴禁跨越至外層導覽按鈕！
          const isInstagram = window.location.hostname.includes('instagram.com');
          const article = document.querySelector('article');
          const postContainer = isInstagram
            ? (article || document.querySelector('div[role="dialog"] article') || document.body)
            : (article || document.querySelector('div[role="dialog"]') || document.body);

          // b.1 收集容器內所有可見圖片 (嚴格排除大頭貼與小圖，寬高 >= 200px)
          const allImgs = Array.from(postContainer.querySelectorAll('img')).filter(img => {
            const rect = img.getBoundingClientRect();
            const alt = (img.alt || '').toLowerCase();
            const isAvatar = alt.includes('profile') || alt.includes('個人檔案') || img.src.includes('s150x150') || img.src.includes('p150x150');
            return (
              rect.width >= 200 &&
              rect.height >= 200 &&
              !isAvatar &&
              rect.bottom > 0 &&
              rect.top < window.innerHeight &&
              window.getComputedStyle(img).display !== 'none' &&
              window.getComputedStyle(img).visibility !== 'hidden' &&
              !img.src.includes('rsrc.php')
            );
          });

          allImgs.forEach(img => {
            let chosenUrl = img.currentSrc || img.src || img.getAttribute('data-src') || '';
            let chosenWidth = img.naturalWidth || img.clientWidth || undefined;
            const srcset = img.getAttribute('srcset');
            if (srcset) {
              const parts = srcset.split(',').map((p: string) => {
                const [candUrl, descriptor] = p.trim().split(/\s+/);
                const w = descriptor && descriptor.endsWith('w') ? parseInt(descriptor, 10) : 0;
                return { url: candUrl, width: w };
              }).filter(x => Boolean(x.url));

              if (parts.length > 0) {
                // 優先選擇寬度最大之候選
                parts.sort((a, b) => b.width - a.width);
                chosenUrl = parts[0].url;
                if (parts[0].width > 0) chosenWidth = parts[0].width;
              }
            }
            if (chosenUrl && !chosenUrl.startsWith('data:') && !chosenUrl.includes('static.cdninstagram.com/rsrc.php')) {
              collected.push({
                url: chosenUrl,
                mediaType: 'image',
                alt: img.alt || undefined,
                title: img.title || undefined,
                width: chosenWidth,
                height: img.naturalHeight || img.clientHeight || undefined
              });
            }
          });

          // b.2 收集容器內所有可見影片 (寬高大於 120px)
          const allVideos = Array.from(postContainer.querySelectorAll('video')).filter(vid => {
            const rect = vid.getBoundingClientRect();
            return (
              rect.width > 120 &&
              rect.height > 120 &&
              rect.bottom > 0 &&
              rect.top < window.innerHeight &&
              window.getComputedStyle(vid).display !== 'none' &&
              window.getComputedStyle(vid).visibility !== 'hidden'
            );
          });

          allVideos.forEach(vid => {
            let chosenUrl = vid.currentSrc || vid.src || '';
            if (!chosenUrl || chosenUrl.startsWith('blob:')) {
              const srcEl = vid.querySelector('source[src^="http"]');
              if (srcEl) {
                chosenUrl = srcEl.getAttribute('src') || '';
              }
            }

            // 強化：若仍為 blob:，探測 video 與所屬貼文容器的 React Fiber / Props
            if (!chosenUrl || chosenUrl.startsWith('blob:')) {
              try {
                // 先查 video 節點
                const nodesToCheck = [vid, postContainer];
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
                          if (best?.url) { chosenUrl = best.url; break; }
                        }
                        if (Array.isArray(m.carousel_media)) {
                          for (const cm of m.carousel_media) {
                            if (Array.isArray(cm.video_versions) && cm.video_versions.length > 0) {
                              const best = [...cm.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0];
                              if (best?.url) { chosenUrl = best.url; break; }
                            }
                          }
                          if (chosenUrl && !chosenUrl.startsWith('blob:')) break;
                        }
                      }
                      if (Array.isArray(props.video_versions) && props.video_versions.length > 0) {
                        const best = [...props.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0];
                        if (best?.url) { chosenUrl = best.url; break; }
                      }
                    }
                    node = node.return || node.child || node.sibling;
                    depth++;
                  }
                  if (chosenUrl && !chosenUrl.startsWith('blob:')) break;
                }
              } catch {}
            }

            // 強化：若仍為 blob:，探測 performance resource (過濾分段特徵)
            if (!chosenUrl || chosenUrl.startsWith('blob:')) {
              try {
                const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
                const candidate = resources.slice().reverse().find(r => 
                  r.name.includes('.mp4') && 
                  !r.name.startsWith('blob:')
                );
                if (candidate) {
                  chosenUrl = candidate.name
                    .replace(/[?&]bytestart=\d+/gi, '')
                    .replace(/[?&]byteend=\d+/gi, '')
                    .replace('?&', '?');
                }
              } catch {}
            }

            const poster = vid.getAttribute('poster') || undefined;
            if (chosenUrl && !chosenUrl.startsWith('blob:')) {
              collected.push({
                url: chosenUrl,
                posterUrl: poster,
                mediaType: 'video',
                alt: vid.getAttribute('aria-label') || 'Video',
                width: vid.videoWidth || vid.clientWidth || undefined,
                height: vid.videoHeight || vid.clientHeight || undefined
              });
            }
          });

          // c. 精準尋找「下一張/下一頁」切換按鈕
          let nextBtn: HTMLElement | null = null;

          if (isInstagram && postContainer) {
            // Instagram 專屬精準定位：
            // 1. 最優先使用官方貼文輪播專屬按鈕 class `_afxw`（必在 article 內部）
            const afxwBtn = postContainer.querySelector('button._afxw') as HTMLElement | null;
            if (afxwBtn && !afxwBtn.hasAttribute('disabled')) {
              const style = window.getComputedStyle(afxwBtn);
              if (style.display !== 'none' && style.visibility !== 'hidden') {
                nextBtn = afxwBtn;
              }
            }

            // 2. 備援：在 postContainer 內部尋找包含 Next / 下一頁 / 向右鍵 的 button 或 svg，嚴格隔離在 article 內
            if (!nextBtn) {
              const scopedSelectors = [
                'button[aria-label="Next"]',
                'button[aria-label="下一頁"]',
                'button[aria-label="下一張"]',
                'button[aria-label="向右鍵"]',
                'button[aria-label="下一步"]',
                'svg[aria-label="Next"]',
                'svg[aria-label="下一頁"]',
                'svg[aria-label="向右鍵"]',
                'svg[aria-label="下一步"]'
              ];
              for (const sel of scopedSelectors) {
                const el = postContainer.querySelector(sel) as HTMLElement | null;
                if (el) {
                  const btn = el.tagName.toLowerCase() === 'button' ? el : (el.closest('button') as HTMLElement | null);
                  // 絕對排除帶有 _abl- (下一篇貼文按鈕)、帶有 href 連結至其他貼文的元素，且必須被 postContainer 包含
                  if (
                    btn &&
                    postContainer.contains(btn) &&
                    !btn.className.includes('_abl-') &&
                    !btn.closest('a[href*="/p/"]') &&
                    !btn.hasAttribute('disabled')
                  ) {
                    const style = window.getComputedStyle(btn);
                    if (style.display !== 'none' && style.visibility !== 'hidden') {
                      nextBtn = btn;
                      break;
                    }
                  }
                }
              }
            }
          } else {
            // 通用相簿/劇院模式 (Facebook / Twitter 等)
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

          // 注意：切勿派發全局 ArrowRight 鍵盤事件！在 Instagram 等平台全局 ArrowRight 會直接跳轉到下一篇貼文！

          // 讀取當前 URL 的 img_index
          const urlParams = new URLSearchParams(window.location.search);
          const currentIndex = urlParams.get('img_index') || undefined;

          return {
            diverged: false,
            images: collected,
            hasNext,
            currentIndex
          };
        },
        args: [initialShortcode]
      });

      const extracted = results?.[0]?.result;
      if (extracted?.diverged) {
        options?.onCarouselProgress?.({
          currentCount: imageMap.size,
          maxLimit,
          statusText: `偵測到頁面導航至其他貼文，自動停止輪巡以保護當前貼文相片。`,
          isTraversing: false
        });
        break;
      }

      let newAddedThisStep = 0;

      if (extracted && extracted.images && extracted.images.length > 0) {
        const getMediaFileKey = (u: string) => {
          try {
            const p = new URL(u).pathname;
            const m = p.match(/([a-zA-Z0-9_\-\.]+\.(?:jpg|jpeg|webp|png|mp4))/i);
            return m ? m[1] : p;
          } catch {
            const m = u.match(/([a-zA-Z0-9_\-\.]+\.(?:jpg|jpeg|webp|png|mp4))/i);
            return m ? m[1] : u.split('?')[0];
          }
        };

        const getUrlWidth = (u: string, explicitWidth?: number): number => {
          if (explicitWidth && explicitWidth > 0) return explicitWidth;
          const m = u.match(/[ps](\d+)x(\d+)/i) || u.match(/(\d+)w/i);
          if (m && m[1]) return parseInt(m[1], 10);
          return 0;
        };

        for (const item of extracted.images) {
          const abs = toAbsoluteUrl(item.url, tabUrl);
          if (!abs) continue;
          const { url: finalUrl, upgraded } = upgradeImageUrl(abs);

          let format = detectImageFormat(finalUrl);
          const isVideo = item.mediaType === 'video' || format === 'mp4' || format === 'webm';
          if (isVideo && format === 'unknown') {
            format = 'mp4';
          }

          const fileKey = getMediaFileKey(finalUrl);
          const itemWidth = getUrlWidth(finalUrl, item.width);

          if (fileKeyMap.has(fileKey)) {
            const existingUrl = fileKeyMap.get(fileKey)!;
            const existingImg = imageMap.get(existingUrl);
            if (existingImg) {
              const existingWidth = getUrlWidth(existingImg.url, existingImg.width);
              if (itemWidth > existingWidth) {
                imageMap.delete(existingUrl);
                fileKeyMap.set(fileKey, finalUrl);
                imageMap.set(finalUrl, {
                  ...existingImg,
                  id: `${isVideo ? 'vid' : 'img'}_carousel_${imageMap.size + 1}_${Math.random().toString(36).slice(2, 7)}`,
                  url: finalUrl,
                  rawUrl: abs,
                  posterUrl: isVideo ? (item.posterUrl ? (toAbsoluteUrl(item.posterUrl, tabUrl) || item.posterUrl) : existingImg.posterUrl) : undefined,
                  width: itemWidth || undefined,
                  height: item.height || existingImg.height,
                  isHighResUpgrade: upgraded
                });
              }
            }
            continue;
          }

          if (!seenUrls.has(finalUrl)) {
            seenUrls.add(finalUrl);
            fileKeyMap.set(fileKey, finalUrl);
            newAddedThisStep++;

            imageMap.set(finalUrl, {
              id: `${isVideo ? 'vid' : 'img'}_carousel_${imageMap.size + 1}_${Math.random().toString(36).slice(2, 7)}`,
              url: finalUrl,
              rawUrl: abs,
              posterUrl: isVideo ? (item.posterUrl ? (toAbsoluteUrl(item.posterUrl, tabUrl) || item.posterUrl) : undefined) : undefined,
              mediaType: isVideo ? 'video' : 'image',
              alt: item.alt,
              title: item.title,
              width: itemWidth || item.width,
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

      const videoCount = Array.from(imageMap.values()).filter(x => x.mediaType === 'video').length;
      const mediaDesc = videoCount > 0 ? `${imageMap.size} 個檔案（含 ${videoCount} 部影片）` : `${imageMap.size} 張相片`;
      const progressIdx = extracted?.currentIndex ? `貼文第 ${extracted.currentIndex} 張` : `第 ${step + 1} 步`;
      options?.onCarouselProgress?.({
        currentCount: imageMap.size,
        maxLimit,
        statusText: `已輪巡採集 ${mediaDesc}（${progressIdx}）...`,
        isTraversing: true
      });

      // 終止判定：若已無「下一頁」按鈕（最後一張相片），完成當前收集後即可優雅退出
      if (!extracted?.hasNext) {
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
        // 平滑向下滾動多次以觸發延遲載入 (Lazy loading)
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

        // 強化：若仍為 blob:，探測 video 與所屬貼文容器的 React Fiber / Props
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

        // 強化：若仍為 blob:，探測 performance resource (過濾分段特徵)
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
  // 先解析 outerHTML (包含 Flickr JSON 和 meta 標籤；若為 Instagram 則嚴格排除通用正則掃描，避免幾百個過期快取垃圾影片污染)
  const extractedFromHtml = isIg ? [] : extractImagesFromHtml(pageData.html, tabUrl);
  const imageMap = new Map<string, ScrapedImage>();

  // 放入 HTML 提取的圖片與影片
  extractedFromHtml.forEach(img => imageMap.set(img.url, img));

  // 補充 DOM 實際渲染獲取到的尺寸與真實 loaded 媒體
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

