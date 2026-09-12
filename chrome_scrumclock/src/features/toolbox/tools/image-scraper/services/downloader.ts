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
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  } catch {
    // 略過錯誤
  }
  return fallbackFormat.toLowerCase();
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
 * 單一檔案下載 (支援 Chrome Extension API 與 Web fallback)
 */
export async function downloadImage(url: string, fullPath: string): Promise<number> {
  const isExtension = typeof chrome !== 'undefined' && chrome.downloads && typeof chrome.downloads.download === 'function';

  if (isExtension) {
    return new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          url,
          filename: fullPath,
          conflictAction: 'uniquify',
          saveAs: false
        },
        downloadId => {
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
  ): Promise<{ success: number; failed: number }> {
    this.isCancelled = false;

    const selectedImages = images.filter(img => img.selected);
    const total = selectedImages.length;
    if (total === 0) {
      return { success: 0, failed: 0 };
    }

    const folder = sanitizePathSegment(options.folderName || 'Toolbox-Images');
    const concurrency = Math.max(1, Math.min(options.concurrency || 3, 5));

    let current = 0;
    let successCount = 0;
    let failureCount = 0;

    const updateProgress = (activeItemName?: string) => {
      if (onProgress) {
        onProgress({
          total,
          current: successCount + failureCount,
          successCount,
          failureCount,
          isDownloading: !this.isCancelled && (successCount + failureCount) < total,
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

    // 併發任務執行池 (Queue Worker)
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < total && !this.isCancelled) {
        const index = nextIndex++;
        const item = selectedImages[index];

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
            if (!fileName.includes('.')) fileName += `.${ext}`;
          } catch {
            fileName = `img_${index + 1}.${ext}`;
          }
        }

        try {
          updateProgress(fileName);
          if (targetDirectory) {
            // 直接抓取 Blob 並儲存至選取之目錄（零彈窗模式）
            const res = await fetch(item.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            await saveBlobToDirectory(targetDirectory, fileName, blob);
          } else {
            // 完整儲存路徑：PowerKit-Toolbox/folder/filename (使用 chrome.downloads)
            const fullPath = `PowerKit-Toolbox/${folder}/${fileName}`;
            await downloadImage(item.url, fullPath);
          }
          successCount++;
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
    return { success: successCount, failed: failureCount };
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
