import { ScrapedImage } from '../types';
import { ActiveTabScrapeOptions } from './types';
import { detectImageFormat, toAbsoluteUrl } from './extractorUtils';

/**
 * 專屬 Instagram 貼文/Reels 全方位媒體解析器
 * 整合 5 重提取策略：
 * 1. 深度掃描頁面內嵌 <script> 的 Relay/GraphQL JSON 快取
 * 2. 深度探測 DOM 上的 <video> 與 React Fiber / Props (破解 blob: 網址)
 * 3. 探測 Performance Resource Timing 取得真實請求的 .mp4
 * 4. 同源帶憑證發送 GraphQL 與 Web Info API 查詢
 * 5. 全頁 HTML / Script 正則匹配 CDN .mp4 直鏈保底
 */
export async function extractInstagramPostDirectly(
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
      // 支援普通 JSON 與轉義引號 (\") 字串，並自動清洗 bytestart/byteend 分段參數恢復原片
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
