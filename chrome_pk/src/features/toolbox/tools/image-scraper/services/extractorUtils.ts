import { ScrapedImage, ImageFormat } from '../types';

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
