import { ScrapedImage, ImageFormat, DownloadProgress, ActiveTabScrapeMode, CarouselProgress } from '../types';

export interface ScraperInputBarProps {
  crawlMode: 'url' | 'active-tab';
  onCrawlModeChange: (mode: 'url' | 'active-tab') => void;
  targetUrl: string;
  onTargetUrlChange: (url: string) => void;
  isLoading: boolean;
  errorMsg: string | null;
  currentTabInfo: { title: string; url: string } | null;
  activeTabMode: ActiveTabScrapeMode;
  onActiveTabModeChange: (mode: ActiveTabScrapeMode) => void;
  carouselProgress: CarouselProgress | null;
  onStartScrape: () => void;
  onStopTraverse: () => void;
  selectedCount: number;
  downloadProgress: DownloadProgress | null;
  onStartBatchDownload: () => void;
  targetDirHandle: any | null;
  targetDirName: string;
  onPickDirectory: () => void;
  hasImages: boolean;
  isSidebar?: boolean;
}

export interface ScraperFilterBarProps {
  pageTitle: string;
  totalCount: number;
  videoCount: number;
  selectedCount: number;
  hasHighRes: boolean;
  formatFilters: Set<ImageFormat>;
  onToggleFormatFilter: (format: ImageFormat, exclusive?: boolean) => void;
  onResetFormatFilters: () => void;
  minWidth: number;
  onMinWidthChange: (width: number) => void;
  searchKeyword: string;
  onSearchKeywordChange: (keyword: string) => void;
  onSelectAll: (select: boolean) => void;
  onInvertSelect: () => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  isSidebar?: boolean;
}

export interface ScraperDownloadControlsProps {
  downloadFolder: string;
  onDownloadFolderChange: (folder: string) => void;
  namingPattern: 'original' | 'sequence';
  onNamingPatternChange: (pattern: 'original' | 'sequence') => void;
  namingPrefix: string;
  onNamingPrefixChange: (prefix: string) => void;
  skipExisting: boolean;
  onSkipExistingChange: (skip: boolean) => void;
  targetDirHandle: any | null;
  targetDirName: string;
  onPickDirectory: () => void;
  selectedCount: number;
  downloadProgress: DownloadProgress | null;
  onStartBatchDownload: () => void;
  onCancelDownload: () => void;
  isSidebar?: boolean;
}

export interface ScraperImageListProps {
  images: ScrapedImage[];
  onToggleImage: (id: string, filteredIndex: number, event?: React.MouseEvent) => void;
  onPreviewImage: (img: ScrapedImage) => void;
  onDownloadSingle: (img: ScrapedImage) => void;
}

export interface ScraperPreviewModalProps {
  image: ScrapedImage | null;
  onClose: () => void;
  onDownloadSingle: (img: ScrapedImage) => void;
}
