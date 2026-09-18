import { ScrapedImage } from '../types';
import { ActiveTabScrapeOptions } from './types';
import { detectImageFormat, toAbsoluteUrl, upgradeImageUrl } from './extractorUtils';
import { extractInstagramPostDirectly } from './instagramExtractor';

/**
 * 針對相簿劇院（如 Facebook Photo Theater、Instagram、Twitter 檢視器）進行自動輪巡抓取
 */
export async function extractCarouselFromActiveTab(
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
