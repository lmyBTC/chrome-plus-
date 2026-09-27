import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ScrapedImage, ImageFormat, DownloadTaskOptions, DownloadProgress, ActiveTabScrapeMode, CarouselProgress } from './types';
import { executeScrapeWorkflow } from './services/imageExtractor';
import { BatchDownloader, pickDownloadDirectory, downloadSingleMedia } from './services/downloader';
import {
  ScraperInputBar,
  ScraperFilterBar,
  ScraperImageList,
  ScraperDownloadControls,
  ScraperPreviewModal
} from './components';

export interface ImageScraperProps {
  defaultMode?: 'url' | 'active-tab';
  defaultActiveTabMode?: ActiveTabScrapeMode;
  isSidebar?: boolean;
}

export const ImageScraper: React.FC<ImageScraperProps> = ({
  defaultMode = 'url',
  defaultActiveTabMode = 'fast',
  isSidebar = false
}) => {
  // 爬取模式: url | active-tab
  const [crawlMode, setCrawlMode] = useState<'url' | 'active-tab'>(defaultMode);
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [pageTitle, setPageTitle] = useState<string>('');
  const [images, setImages] = useState<ScrapedImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTabInfo, setCurrentTabInfo] = useState<{ title: string; url: string } | null>(null);

  // 篩選控制
  const [formatFilters, setFormatFilters] = useState<Set<ImageFormat>>(
    new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'mp4', 'webm', 'unknown'])
  );
  const [minWidth, setMinWidth] = useState<number>(0);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 下載設定
  const [downloadFolder, setDownloadFolder] = useState<string>('flickr-album');
  const [namingPattern, setNamingPattern] = useState<'original' | 'sequence'>('original');
  const [namingPrefix, setNamingPrefix] = useState<string>('photo');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  // 自訂本機目錄（免彈窗儲存模式）
  const [targetDirHandle, setTargetDirHandle] = useState<any | null>(null);
  const [targetDirName, setTargetDirName] = useState<string>('');

  // 預覽燈箱
  const [previewImage, setPreviewImage] = useState<ScrapedImage | null>(null);

  // 參照
  const downloaderRef = useRef<BatchDownloader | null>(null);
  const lastClickedIndexRef = useRef<number | null>(null);
  const abortTraverseRef = useRef<boolean>(false);

  // 分頁採集進階選項
  const [activeTabMode, setActiveTabMode] = useState<ActiveTabScrapeMode>(defaultActiveTabMode);
  const [carouselProgress, setCarouselProgress] = useState<CarouselProgress | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [skipExisting, setSkipExisting] = useState<boolean>(true);

  // 自動偵測當前主視窗分頁狀態
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab?.url) {
          setCurrentTabInfo({ title: tab.title || '', url: tab.url });
          if (/instagram\.com\/(p|reel)/i.test(tab.url) || /facebook\.com/i.test(tab.url)) {
            setActiveTabMode('carousel-traverse');
          }
        }
      }).catch(() => {});
    }
  }, []);

  // 中斷相簿輪巡
  const handleStopTraverse = () => {
    abortTraverseRef.current = true;
    if (carouselProgress) {
      setCarouselProgress(prev => prev ? { ...prev, statusText: '正在停止並匯出已擷取的照片...' } : null);
    }
  };

  // 執行網頁與分頁爬取
  const handleStartScrape = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setImages([]);
    setCarouselProgress(null);
    abortTraverseRef.current = false;
    lastClickedIndexRef.current = null;

    try {
      const { images: extracted, title } = await executeScrapeWorkflow({
        crawlMode,
        targetUrl,
        activeTabMode,
        onCarouselProgress: setCarouselProgress,
        shouldAbort: () => abortTraverseRef.current
      });

      setPageTitle(title || '採集結果');
      setImages(extracted.map(img => ({
        ...img,
        selected: formatFilters.has(img.format) ? img.selected : false
      })));

      const folderName = (title || 'scraped-images').replace(/[^\w\u4e00-\u9fa5-_]/g, '_').slice(0, 30);
      setDownloadFolder(folderName || 'Toolbox-Album');
    } catch (err: any) {
      console.error('爬取失敗:', err);
      setErrorMsg(err?.message || '爬取過程中發生錯誤，請檢查網址或分頁狀態');
    } finally {
      setIsLoading(false);
    }
  };

  // 篩選與統計
  const filteredImages = useMemo(() => {
    return images.filter(img => {
      if (!formatFilters.has(img.format)) return false;
      if (minWidth > 0 && img.width && img.width < minWidth) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        if (!img.url.toLowerCase().includes(kw) && !img.alt?.toLowerCase().includes(kw)) return false;
      }
      return true;
    });
  }, [images, formatFilters, minWidth, searchKeyword]);

  const selectedCount = useMemo(() => {
    return images.filter(img => img.selected && formatFilters.has(img.format)).length;
  }, [images, formatFilters]);

  // 全選 / 反選 / 單張切換
  const handleSelectAll = (select: boolean) => {
    const visibleIds = new Set(filteredImages.map(img => img.id));
    setImages(prev => prev.map(img => visibleIds.has(img.id) ? { ...img, selected: select } : img));
  };

  const handleInvertSelect = () => {
    const visibleIds = new Set(filteredImages.map(img => img.id));
    setImages(prev => prev.map(img => visibleIds.has(img.id) ? { ...img, selected: !img.selected } : img));
  };

  const handleToggleImage = (id: string, filteredIndex: number, event?: React.MouseEvent) => {
    if (event?.shiftKey && lastClickedIndexRef.current !== null) {
      event.preventDefault();
      const from = Math.min(lastClickedIndexRef.current, filteredIndex);
      const to = Math.max(lastClickedIndexRef.current, filteredIndex);
      const clickedItem = filteredImages[filteredIndex];
      const targetState = clickedItem ? !clickedItem.selected : true;
      const rangeIds = new Set(filteredImages.slice(from, to + 1).map(img => img.id));
      setImages(prev => prev.map(img => rangeIds.has(img.id) ? { ...img, selected: targetState } : img));
      lastClickedIndexRef.current = filteredIndex;
      return;
    }
    setImages(prev => prev.map(img => img.id === id ? { ...img, selected: !img.selected } : img));
    lastClickedIndexRef.current = filteredIndex;
  };

  const toggleFormatFilter = (fmt: ImageFormat, solo: boolean = false) => {
    let next: Set<ImageFormat>;
    if (solo) {
      next = new Set<ImageFormat>([fmt]);
      if (fmt === 'jpg') next.add('jpeg');
    } else {
      next = new Set(formatFilters);
      if (next.has(fmt)) {
        next.delete(fmt);
        if (fmt === 'jpg') next.delete('jpeg');
      } else {
        next.add(fmt);
        if (fmt === 'jpg') next.add('jpeg');
      }
    }
    setFormatFilters(next);
    setImages(prev => prev.map(img => !next.has(img.format) && img.selected ? { ...img, selected: false } : img));
  };

  // 目錄選擇與批量下載
  const handlePickDirectory = async () => {
    try {
      const handle = await pickDownloadDirectory();
      if (handle) {
        setTargetDirHandle(handle);
        setTargetDirName(handle.name || '已選定資料夾');
      }
    } catch (err: any) {
      console.warn('選取本機資料夾失敗:', err);
      alert(`選取目錄失敗: ${err?.message || err}`);
    }
  };

  const handleBatchDownload = async () => {
    if (selectedCount === 0) return;
    const downloader = new BatchDownloader();
    downloaderRef.current = downloader;

    const options: DownloadTaskOptions = {
      folderName: downloadFolder,
      namingPattern,
      prefix: namingPrefix,
      concurrency: 3,
      directoryHandle: targetDirHandle,
      skipExisting
    };

    const targetImages = images.filter(img => img.selected && formatFilters.has(img.format));
    if (targetImages.length === 0) return;

    try {
      await downloader.run(targetImages, options, progress => setDownloadProgress({ ...progress }));
      setImages(prev => {
        const downloadedIds = new Set(targetImages.filter(img => img.isDownloaded).map(img => img.id));
        return prev.map(img => downloadedIds.has(img.id) ? { ...img, isDownloaded: true, selected: false } : img);
      });
    } catch (err: any) {
      console.error('下載佇列中斷:', err);
      alert(`下載失敗: ${err?.message || err}`);
    }
  };

  const handleCancelDownload = () => {
    if (downloaderRef.current) {
      downloaderRef.current.cancel();
      setDownloadProgress(prev => (prev ? { ...prev, isDownloading: false } : null));
    }
  };

  const handleDownloadSingle = async (img: ScrapedImage) => {
    try {
      const newDir = await downloadSingleMedia(img, downloadFolder, targetDirHandle);
      if (newDir && !targetDirHandle) {
        setTargetDirHandle(newDir);
        setTargetDirName(newDir.name || '已選定資料夾');
      }
      setImages(prev => prev.map(item => item.id === img.id ? { ...item, isDownloaded: true, selected: false } : item));
    } catch (err: any) {
      alert(`下載失敗: ${err?.message || '未知錯誤'}`);
    }
  };

  return (
    <div className={`flex flex-col ${isSidebar ? 'gap-3 p-1' : 'gap-6'}`}>
      {/* 頂部說明卡片與輸入列 */}
      <ScraperInputBar
        crawlMode={crawlMode}
        onCrawlModeChange={setCrawlMode}
        targetUrl={targetUrl}
        onTargetUrlChange={setTargetUrl}
        isLoading={isLoading}
        errorMsg={errorMsg}
        currentTabInfo={currentTabInfo}
        activeTabMode={activeTabMode}
        onActiveTabModeChange={setActiveTabMode}
        carouselProgress={carouselProgress}
        onStartScrape={handleStartScrape}
        onStopTraverse={handleStopTraverse}
        selectedCount={selectedCount}
        downloadProgress={downloadProgress}
        onStartBatchDownload={handleBatchDownload}
        targetDirHandle={targetDirHandle}
        targetDirName={targetDirName}
        onPickDirectory={handlePickDirectory}
        hasImages={images.length > 0}
        isSidebar={isSidebar}
      />

      {/* 爬取結果面板 */}
      {images.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className={`bg-dark-card border border-dark-border-subtle rounded-xl ${isSidebar ? 'p-3 gap-2.5' : 'p-5 gap-4'} shadow-sm flex flex-col`}>
            <ScraperFilterBar
              pageTitle={pageTitle}
              totalCount={images.length}
              videoCount={images.filter(img => img.mediaType === 'video' || img.format === 'mp4' || img.format === 'webm').length}
              selectedCount={selectedCount}
              hasHighRes={images.some(img => img.isHighResUpgrade)}
              formatFilters={formatFilters}
              onToggleFormatFilter={toggleFormatFilter}
              onResetFormatFilters={() => {
                const all = new Set<ImageFormat>(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'mp4', 'webm', 'unknown']);
                setFormatFilters(all);
              }}
              minWidth={minWidth}
              onMinWidthChange={setMinWidth}
              searchKeyword={searchKeyword}
              onSearchKeywordChange={setSearchKeyword}
              onSelectAll={handleSelectAll}
              onInvertSelect={handleInvertSelect}
              showAdvanced={showAdvanced}
              onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
              isSidebar={isSidebar}
            />

            {(showAdvanced || !isSidebar || Boolean(downloadProgress?.isDownloading)) && (
              <div className="bg-dark-surface/90 p-3 rounded-lg border border-dark-border-subtle flex flex-col gap-3 animate-fadeIn text-xs">
                <ScraperDownloadControls
                  downloadFolder={downloadFolder}
                  onDownloadFolderChange={setDownloadFolder}
                  namingPattern={namingPattern}
                  onNamingPatternChange={setNamingPattern}
                  namingPrefix={namingPrefix}
                  onNamingPrefixChange={setNamingPrefix}
                  skipExisting={skipExisting}
                  onSkipExistingChange={setSkipExisting}
                  targetDirHandle={targetDirHandle}
                  targetDirName={targetDirName}
                  onPickDirectory={handlePickDirectory}
                  selectedCount={selectedCount}
                  downloadProgress={downloadProgress}
                  onStartBatchDownload={handleBatchDownload}
                  onCancelDownload={handleCancelDownload}
                  isSidebar={isSidebar}
                />
              </div>
            )}
          </div>

          <ScraperImageList
            images={filteredImages}
            onToggleImage={handleToggleImage}
            onPreviewImage={setPreviewImage}
            onDownloadSingle={handleDownloadSingle}
          />
        </div>
      )}

      {/* 放大預覽燈箱 Modal */}
      <ScraperPreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
        onDownloadSingle={handleDownloadSingle}
      />
    </div>
  );
};
