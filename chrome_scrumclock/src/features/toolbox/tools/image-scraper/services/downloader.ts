import { ScrapedImage, DownloadTaskOptions, DownloadProgress } from '../types';

/**
 * 清理檔名與資料夾名稱中的非法字元
 */
export function sanitizePathSegment(segment: string): string {
  // 過濾 Windows / POSIX 非法字元以及目錄遍歷字元
  return segment
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\.{2,}/g, '_')
    .trim() || 'unnamed';
}

/**
 * 取得建議的副檔名
 */
export function getExtensionFromUrl(url: string, fallbackFormat: string = 'jpg'): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.includes('.mp4')) return 'mp4';
    if (pathname.includes('.webm')) return 'webm';
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  } catch {
    // 略過錯誤
  }
  const cleanFallback = fallbackFormat.toLowerCase();
  return cleanFallback === 'unknown' ? 'jpg' : cleanFallback;
}

/**
 * 檢查當前瀏覽器環境是否支援 File System Access API
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * 彈出系統原生目錄選擇器（僅需選取一次資料夾）
 */
export async function pickDownloadDirectory(): Promise<any | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('當前環境不支援直接選取本機目錄');
  }
  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'downloads'
    });
    return handle;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

/**
 * 將二進制資料寫入 FileSystemDirectoryHandle
 */
export async function saveBlobToDirectory(
  dirHandle: any,
  fileName: string,
  blob: Blob
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * 安全取得當前使用者正在瀏覽的分頁 (相容 SidePanel / Popup / DevTools)
 */
async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  if (typeof chrome === 'undefined' || !chrome.tabs) return null;
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs[0]) return tabs[0];
    const allActive = await chrome.tabs.query({ active: true });
    return (allActive && allActive[0]) || null;
  } catch {
    return null;
  }
}

/**
 * 快速檢驗 MP4 二進制資料是否包含音訊軌道 (Audio Track)
 * 透過解析 MP4 moov/trak 容器中的 hdlr box，搜尋 'soun' handler type
 */
export async function checkMp4HasAudio(blob: Blob): Promise<boolean> {
  try {
    // 讀取前 256KB 進行特徵探測 (moov/trak 通常在檔案頭部)
    const slice = blob.slice(0, Math.min(blob.size, 256 * 1024));
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    for (let i = 0; i < bytes.length - 8; i++) {
      // 搜尋 'hdlr' (0x68, 0x64, 0x6c, 0x72)
      if (bytes[i] === 0x68 && bytes[i + 1] === 0x64 && bytes[i + 2] === 0x6c && bytes[i + 3] === 0x72) {
        const limit = Math.min(i + 36, bytes.length);
        for (let j = i + 4; j <= limit - 4; j++) {
          // 搜尋 'soun' (0x73, 0x6f, 0x75, 0x6e)
          if (bytes[j] === 0x73 && bytes[j + 1] === 0x6f && bytes[j + 2] === 0x75 && bytes[j + 3] === 0x6e) {
            return true;
          }
        }
      }
    }
    return false;
  } catch {
    // 發生解析例外時預設放行
    return true;
  }
}

/**
 * 安全取得媒體檔案的二進制 Blob
 * 具備四重防護機制：
 * 1. 優先在 Extension 環境直接 fetch，並對 MP4 進行音軌存在性檢驗與自動升級
 * 2. 次選：透過當前分頁 Context 代理抓取（帶有 Instagram 完整 Referer、Cookies 與瀏覽器快取）
 * 3. 終極保底：直接從分頁 DOM 找到 <img> 節點繪製到 Canvas 導出高清 JPEG Data URL
 */
export async function fetchMediaBlob(url: string): Promise<Blob> {
  // 1. 若已經是 blob: 或 data: 網址，直接轉換
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    const res = await fetch(url);
    return await res.blob();
  }

  // 2. 針對影片檔案，優先在 Extension Context 進行串流 fetch
  // 具有 <all_urls> 權限的擴充功能可直接下載 CDN MP4 串流，避免透過 executeScript 序列化數十 MB 的 Base64 Data URL 造成記憶體溢出
  const isVideo = url.includes('.mp4') || url.includes('.webm');
  if (isVideo) {
    let videoBlob: Blob | null = null;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text') && !contentType.includes('html')) {
          videoBlob = await res.blob();
        }
      }
    } catch (err) {
      console.warn('[Downloader] 影片在 Extension Context 直接 fetch 失敗，嘗試分頁代理:', err);
    }

    if (videoBlob) {
      // 針對 Instagram / Facebook 影片執行音軌完整性檢驗
      if (url.includes('.mp4') && (url.includes('cdninstagram.com') || url.includes('fbcdn.net'))) {
        const hasAudio = await checkMp4HasAudio(videoBlob);
        if (!hasAudio) {
          console.warn('[Downloader] 檢測到影片缺少音訊軌道 (DASH 純視訊分軌)，嘗試自動升級為完整有聲原片...');
          const tab = await getActiveTab();
          if (tab && tab.id && typeof chrome !== 'undefined' && chrome.scripting) {
            try {
              const upgradeResults = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: async () => {
                  try {
                    const match = window.location.pathname.match(/\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
                    const shortcode = match ? match[2] : null;
                    if (!shortcode) return null;

                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
                    let clean = shortcode;
                    if (clean.length > 28) clean = clean.slice(0, 28);
                    let id = BigInt(0);
                    for (let i = 0; i < clean.length; i++) {
                      const idx = BigInt(chars.indexOf(clean[i]));
                      if (idx >= BigInt(0)) id = id * BigInt(64) + idx;
                    }

                    const resp = await fetch(`https://www.instagram.com/api/v1/media/${id.toString()}/info/`, {
                      headers: { 'x-ig-app-id': '936619743392459', 'x-asbd-id': '129477' },
                      credentials: 'include'
                    });
                    if (resp.ok) {
                      const data = await resp.json();
                      const item = data?.items?.[0];
                      if (Array.isArray(item?.video_versions) && item.video_versions.length > 0) {
                        const sorted = [...item.video_versions].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
                        return sorted[0]?.url || null;
                      }
                    }
                  } catch {}
                  return null;
                }
              });

              const upgradedUrl = upgradeResults?.[0]?.result;
              if (upgradedUrl && typeof upgradedUrl === 'string' && upgradedUrl !== url) {
                console.log('[Downloader] 成功透過分頁 API 取得官方有聲原片 URL，重新下載...');
                const upgradedRes = await fetch(upgradedUrl);
                if (upgradedRes.ok) {
                  return await upgradedRes.blob();
                }
              }
            } catch (upgradeErr) {
              console.warn('[Downloader] 自動升級有聲原片出錯，保留原始檔案:', upgradeErr);
            }
          }
        }
      }
      return videoBlob;
    }
  }

  // 3. 次選：嘗試在目前分頁 (Instagram / Facebook 頁面) 的同源 Context 內提取（抗防盜鏈）
  const tab = await getActiveTab();
  if (tab && tab.id && typeof chrome !== 'undefined' && chrome.scripting) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [url],
        func: async (mediaUrl: string) => {
          // 策略 A: 在分頁同源 Context 內直接 fetch（自帶 Referer 與分頁 Session）
          try {
            const r = await fetch(mediaUrl, { credentials: 'include' });
            if (r.ok) {
              const contentType = r.headers.get('content-type') || '';
              if (!contentType.includes('text') && !contentType.includes('html')) {
                const b = await r.blob();
                // 若檔案過大 (> 25MB)，避免轉 DataURL 造成 IPC 序列化溢出
                if (b.size > 25 * 1024 * 1024) {
                  return null;
                }
                return new Promise<string | null>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = () => resolve(null);
                  reader.readAsDataURL(b);
                });
              }
            }
          } catch {}

          // 策略 B: 若 fetch 被擋，直接從 DOM 的 <img> 節點繪製到 Canvas 導出 Data URL
          try {
            const imgs = Array.from(document.querySelectorAll('img'));
            const targetImg = imgs.find(img => img.src === mediaUrl || img.currentSrc === mediaUrl) as HTMLImageElement | undefined;
            if (targetImg && targetImg.naturalWidth > 0 && targetImg.naturalHeight > 0) {
              const canvas = document.createElement('canvas');
              canvas.width = targetImg.naturalWidth;
              canvas.height = targetImg.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(targetImg, 0, 0);
                return canvas.toDataURL('image/jpeg', 0.98);
              }
            }
          } catch {}

          return null;
        }
      });

      const dataUrl = results?.[0]?.result;
      if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
        const res = await fetch(dataUrl);
        return await res.blob();
      }
    } catch (tabErr) {
      console.warn('[Downloader] 分頁代理抓取失敗:', tabErr);
    }
  }

  // 4. 終極保底：在當前 Extension Context 進行普通 fetch
  try {
    const res = await fetch(url);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text') && !contentType.includes('html')) {
        return await res.blob();
      }
    }
  } catch (err) {
    console.warn('[Downloader] Extension Context fetch 失敗:', err);
  }

  throw new Error('無法取得媒體二進制資料（伺服器拒絕存取或防盜鏈阻擋）');
}

/**
 * 單一檔案下載 (支援 Chrome Extension API 與 Web fallback)
 * 核心保證：
 * 1. 遠端圖片一律先轉為本機 Blob Object URL 再送入下載器
 * 2. 嚴禁在出錯時降級為傳入遠端 URL，杜絕 Chrome 自動覆蓋為 .txt 壞檔！
 */
export async function downloadImage(url: string, fullPath: string): Promise<number> {
  const isExtension = typeof chrome !== 'undefined' && chrome.downloads && typeof chrome.downloads.download === 'function';

  if (isExtension) {
    const blob = await fetchMediaBlob(url);
    if (blob.type.includes('text') || blob.type.includes('html')) {
      throw new Error('伺服器回傳文字錯誤頁面，非有效圖片檔案');
    }
    const downloadTargetUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          url: downloadTargetUrl,
          filename: fullPath,
          conflictAction: 'uniquify',
          saveAs: false
        },
        downloadId => {
          setTimeout(() => {
            URL.revokeObjectURL(downloadTargetUrl);
          }, 30000);

          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (downloadId === undefined) {
            reject(new Error('下載初始化失敗'));
          } else {
            resolve(downloadId);
          }
        }
      );
    });
  }

  // Fallback for non-extension / web environment
  const a = document.createElement('a');
  a.href = url;
  a.download = fullPath.split('/').pop() || 'image.jpg';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return Date.now();
}

/**
 * 批量下載隊列管理器（具備併發控制）
 */
export class BatchDownloader {
  private isCancelled: boolean = false;

  public cancel() {
    this.isCancelled = true;
  }

  public async run(
    images: ScrapedImage[],
    options: DownloadTaskOptions,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<{ success: number; skipped: number; failed: number }> {
    this.isCancelled = false;

    const selectedImages = images.filter(img => img.selected);
    const total = selectedImages.length;
    if (total === 0) {
      return { success: 0, skipped: 0, failed: 0 };
    }

    const folder = sanitizePathSegment(options.folderName || 'Toolbox-Images');
    const concurrency = Math.max(1, Math.min(options.concurrency || 3, 5));
    const skipExisting = options.skipExisting !== false;

    let successCount = 0;
    let skippedCount = 0;
    let failureCount = 0;

    const updateProgress = (activeItemName?: string) => {
      if (onProgress) {
        onProgress({
          total,
          current: successCount + skippedCount + failureCount,
          successCount,
          skippedCount,
          failureCount,
          isDownloading: !this.isCancelled && (successCount + skippedCount + failureCount) < total,
          activeItemName
        });
      }
    };

    updateProgress();

    // 若指定了自訂本機目錄，嘗試於其下建立專屬相簿子資料夾
    let targetDirectory = options.directoryHandle || null;
    if (targetDirectory && options.folderName?.trim()) {
      try {
        const subFolderName = sanitizePathSegment(options.folderName);
        targetDirectory = await options.directoryHandle.getDirectoryHandle(subFolderName, { create: true });
      } catch (err) {
        console.warn('[Downloader] 建立子目錄失敗，直接使用選取目錄:', err);
        targetDirectory = options.directoryHandle;
      }
    }

    // 檢查 Chrome 下載歷史中是否已有該檔案完成下載
    const checkChromeDownloadExists = async (fullPath: string, url: string): Promise<boolean> => {
      if (typeof chrome === 'undefined' || !chrome.downloads || !chrome.downloads.search) {
        return false;
      }
      try {
        const items = await chrome.downloads.search({ state: 'complete', exists: true });
        const normalizedTarget = fullPath.replace(/\\/g, '/').toLowerCase();
        return items.some(item => {
          const itemFilename = (item.filename || '').replace(/\\/g, '/').toLowerCase();
          return itemFilename.endsWith(normalizedTarget) || (item.url === url && item.state === 'complete');
        });
      } catch {
        return false;
      }
    };

    // 檢查 FileSystemHandle 中是否已有同名且大小相符的檔案
    const checkFileHandleExists = async (dirHandle: any, fileName: string, blobSize: number): Promise<boolean> => {
      try {
        const existingHandle = await dirHandle.getFileHandle(fileName, { create: false });
        const existingFile = await existingHandle.getFile();
        return existingFile.size > 0 && Math.abs(existingFile.size - blobSize) === 0;
      } catch {
        return false;
      }
    };

    // 併發任務執行池 (Queue Worker)
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < total && !this.isCancelled) {
        const index = nextIndex++;
        const item = selectedImages[index];

        const validMediaExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif', 'mp4', 'webm']);
        const ext = getExtensionFromUrl(item.url, item.format);
        let fileName = '';

        if (options.namingPattern === 'sequence') {
          const paddedIndex = String(index + 1).padStart(3, '0');
          const prefix = options.prefix ? sanitizePathSegment(options.prefix) + '_' : 'img_';
          fileName = `${prefix}${paddedIndex}.${ext}`;
        } else {
          // 原檔名模式
          try {
            const parsedName = new URL(item.url).pathname.split('/').pop()?.split('?')[0] || `img_${index + 1}.${ext}`;
            fileName = sanitizePathSegment(parsedName);
            const currentExt = fileName.split('.').pop()?.toLowerCase() || '';
            if (!validMediaExts.has(currentExt)) {
              fileName = `${fileName}.${ext}`;
            }
          } catch {
            fileName = `img_${index + 1}.${ext}`;
          }
        }

        try {
          updateProgress(fileName);

          if (targetDirectory) {
            // 原生本機目錄模式：先抓取 Blob
            const blob = await fetchMediaBlob(item.url);

            // 智慧防重：比對既有檔案大小
            if (skipExisting && (await checkFileHandleExists(targetDirectory, fileName, blob.size))) {
              skippedCount++;
              item.isDownloaded = true;
              continue;
            }

            await saveBlobToDirectory(targetDirectory, fileName, blob);
            successCount++;
            item.isDownloaded = true;
          } else {
            // Chrome 預設下載匣模式
            const fullPath = `PowerKit-Toolbox/${folder}/${fileName}`;

            // 智慧防重：查詢是否已完成下載
            if (skipExisting && (await checkChromeDownloadExists(fullPath, item.url))) {
              skippedCount++;
              item.isDownloaded = true;
              continue;
            }

            await downloadImage(item.url, fullPath);
            successCount++;
            item.isDownloaded = true;
          }
        } catch (err) {
          console.warn(`[Downloader] 下載 ${fileName} 失敗:`, err);
          failureCount++;
        } finally {
          updateProgress();
        }

        // 稍微間隔 100ms 避免觸發風控
        await new Promise(r => setTimeout(r, 120));
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
    await Promise.all(workers);

    updateProgress();
    return { success: successCount, skipped: skippedCount, failed: failureCount };
  }
}

/**
 * 複製所有圖片 URL 到剪貼簿
 */
export async function copyUrlsToClipboard(images: ScrapedImage[]): Promise<boolean> {
  const selected = images.filter(img => img.selected);
  const text = selected.map(img => img.url).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('複製失敗:', err);
    return false;
  }
}

/**
 * 匯出所有圖片 URL 為 TXT 文字檔
 */
export function exportUrlsAsTxt(images: ScrapedImage[], filename = 'image-urls.txt'): void {
  const selected = images.filter(img => img.selected);
  const text = selected.map(img => img.url).join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
