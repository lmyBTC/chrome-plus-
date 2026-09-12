export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif' | 'svg' | 'mp4' | 'webm' | 'unknown';

export interface ScrapedImage {
  id: string;
  url: string;
  rawUrl: string;
  posterUrl?: string;
  mediaType?: 'image' | 'video';
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  format: ImageFormat;
  selected: boolean;
  status?: 'idle' | 'downloading' | 'completed' | 'error';
  errorMessage?: string;
  isHighResUpgrade?: boolean;
  isDownloaded?: boolean;
}

export interface ScrapeFilterOptions {
  minWidth: number;
  minHeight: number;
  formats: ImageFormat[];
  keyword: string;
}

export interface DownloadTaskOptions {
  folderName: string;
  namingPattern: 'original' | 'sequence';
  prefix: string;
  concurrency?: number;
  directoryHandle?: any; // FileSystemDirectoryHandle
  skipExisting?: boolean;
}

export interface DownloadProgress {
  total: number;
  current: number;
  successCount: number;
  skippedCount: number;
  failureCount: number;
  isDownloading: boolean;
  activeItemName?: string;
}

/**
 * 分頁採集模式：
 * - fast: 當前 DOM 快速快照
 * - deep-scroll: 自動滾動頁面觸發延遲加載 (Lazy loading)
 * - carousel-traverse: 相簿劇院輪巡 (自動按下一張遍歷 Facebook/IG/Twitter 大圖)
 */
export type ActiveTabScrapeMode = 'fast' | 'deep-scroll' | 'carousel-traverse';

export interface CarouselProgress {
  currentCount: number;
  maxLimit: number;
  statusText: string;
  isTraversing: boolean;
}
