import React, { useState, useMemo, useRef } from 'react';
import { ScrapedImage, ImageFormat, DownloadTaskOptions, DownloadProgress, ActiveTabScrapeMode, CarouselProgress } from './types';
import { fetchAndExtractFromUrl, extractFromActiveTab } from './services/imageExtractor';
import {
  BatchDownloader,
  downloadImage,
  fetchMediaBlob,
  sanitizePathSegment,
  isFileSystemAccessSupported,
  pickDownloadDirectory,
  saveBlobToDirectory,
  getExtensionFromUrl
} from './services/downloader';

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

  // 複製回饋
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // 下載控制器與點選游標參照
  const downloaderRef = useRef<BatchDownloader | null>(null);
  const lastClickedIndexRef = useRef<number | null>(null);

  // 分頁採集進階選項
  const [activeTabMode, setActiveTabMode] = useState<ActiveTabScrapeMode>(defaultActiveTabMode);
  const [carouselProgress, setCarouselProgress] = useState<CarouselProgress | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [skipExisting, setSkipExisting] = useState<boolean>(true);
  const abortTraverseRef = useRef<boolean>(false);

  // 自動偵測當前主視窗分頁狀態
  React.useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab && tab.url) {
          setCurrentTabInfo({
            title: tab.title || '',
            url: tab.url
          });
          // 若為 Instagram 或 Facebook，自動預選相簿輪巡模式
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

  // 執行爬取
  const handleStartScrape = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setImages([]);
    setCarouselProgress(null);
    abortTraverseRef.current = false;
    lastClickedIndexRef.current = null;

    try {
      if (crawlMode === 'url') {
        if (!targetUrl.trim()) {
          throw new Error('請輸入欲爬取的網頁網址');
        }

        const isInstagram = /instagram\.com\/(p|reel|reels)\/([A-Za-z0-9_-]+)/i.test(targetUrl);
        let extractedImages: ScrapedImage[] = [];
        let extractedTitle = '未知網頁';

        // 若輸入的是 Instagram 貼文網址
        if (isInstagram && typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          // 檢查使用者是否已經在某個分頁打開了該 Instagram 貼文
          const cleanTarget = targetUrl.split('?')[0].replace(/\/+$/, '');
          const tabs = await chrome.tabs.query({});
          const matchedTab = tabs.find(t => t.url && t.url.split('?')[0].replace(/\/+$/, '') === cleanTarget);

          if (matchedTab && matchedTab.id) {
            // 直接借用已打開分頁進行原生提取！
            const res = await extractFromActiveTab({
              targetTabId: matchedTab.id,
              mode: 'fast',
              onCarouselProgress: setCarouselProgress
            });
            extractedImages = res.images;
            extractedTitle = res.tabTitle;
          } else {
            // 若未開啟該分頁，嘗試常規 fetch
            try {
              const res = await fetchAndExtractFromUrl(targetUrl);
              extractedImages = res.images;
              extractedTitle = res.title;
            } catch (fetchErr) {
              console.warn('URL fetch 失敗:', fetchErr);
            }

            // 若提取數量為 0 或沒有影片，提示切換至分頁模式
            if (extractedImages.length === 0) {
              throw new Error('Instagram 影片與貼文受防盜鏈保護。請在瀏覽器分頁中開啟該貼文，並使用「採集當前分頁」即可一鍵抓取完整影片與高畫質圖片！');
            }
          }
        } else {
          const { title, images: extracted } = await fetchAndExtractFromUrl(targetUrl);
          extractedImages = extracted;
          extractedTitle = title;
        }

        setPageTitle(extractedTitle || '未知網頁');
        // 依當前格式篩選設定預設選取狀態 (非符合格式者預設取消勾選)
        const formattedExtracted = extractedImages.map(img => ({
          ...img,
          selected: formatFilters.has(img.format) ? img.selected : false
        }));
        setImages(formattedExtracted);

        // 自動推測適合的資料夾名稱
        const defaultFolderName = (extractedTitle || 'scraped-images')
          .replace(/[^\w\u4e00-\u9fa5-_]/g, '_')
          .slice(0, 30);
        setDownloadFolder(defaultFolderName || 'Toolbox-Album');
      } else {
        const { tabTitle, images: extracted } = await extractFromActiveTab({
          mode: activeTabMode,
          maxTraverseCount: 80,
          traverseDelayMs: 850,
          onCarouselProgress: (progress) => {
            setCarouselProgress(progress);
          },
          shouldAbort: () => abortTraverseRef.current
        });
        setPageTitle(tabTitle || '當前分頁');
        // 依當前格式篩選設定預設選取狀態 (非符合格式者預設取消勾選)
        const formattedExtracted = extracted.map(img => ({
          ...img,
          selected: formatFilters.has(img.format) ? img.selected : false
        }));
        setImages(formattedExtracted);

        const defaultFolderName = (tabTitle || 'active-tab-images')
          .replace(/[^\w\u4e00-\u9fa5-_]/g, '_')
          .slice(0, 30);
        setDownloadFolder(defaultFolderName || 'Toolbox-Album');
      }
    } catch (err: any) {
      console.error('爬取失敗:', err);
      setErrorMsg(err?.message || '爬取過程中發生錯誤，請檢查網址或分頁狀態');
    } finally {
      setIsLoading(false);
    }
  };

  // 篩選後的圖片列表
  const filteredImages = useMemo(() => {
    return images.filter(img => {
      // 格式篩選
      if (!formatFilters.has(img.format)) return false;

      // 寬度篩選
      if (minWidth > 0 && img.width && img.width < minWidth) return false;

      // 關鍵字搜尋
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchUrl = img.url.toLowerCase().includes(kw);
        const matchAlt = img.alt?.toLowerCase().includes(kw);
        if (!matchUrl && !matchAlt) return false;
      }

      return true;
    });
  }, [images, formatFilters, minWidth, searchKeyword]);

  // 選取統計 (僅統計符合當前格式篩選且被勾選之有效圖片)
  const selectedCount = useMemo(() => {
    return images.filter(img => img.selected && formatFilters.has(img.format)).length;
  }, [images, formatFilters]);

  // 全選 / 全部取消 / 反向選取
  const handleSelectAll = (select: boolean) => {
    const visibleIds = new Set(filteredImages.map(img => img.id));
    setImages(prev =>
      prev.map(img => (visibleIds.has(img.id) ? { ...img, selected: select } : img))
    );
  };

  const handleInvertSelect = () => {
    const visibleIds = new Set(filteredImages.map(img => img.id));
    setImages(prev =>
      prev.map(img => (visibleIds.has(img.id) ? { ...img, selected: !img.selected } : img))
    );
  };

  // 單張勾選 / Shift+點擊 連續範圍快速勾選或取消
  const handleToggleImage = (id: string, filteredIndex: number, event?: React.MouseEvent) => {
    if (event?.shiftKey && lastClickedIndexRef.current !== null) {
      event.preventDefault();
      const from = Math.min(lastClickedIndexRef.current, filteredIndex);
      const to = Math.max(lastClickedIndexRef.current, filteredIndex);

      // 依據點擊目標的反向狀態作為整段區間之目標狀態
      const clickedItem = filteredImages[filteredIndex];
      const targetState = clickedItem ? !clickedItem.selected : true;

      const rangeIds = new Set(filteredImages.slice(from, to + 1).map(img => img.id));
      setImages(prev =>
        prev.map(img => (rangeIds.has(img.id) ? { ...img, selected: targetState } : img))
      );
      lastClickedIndexRef.current = filteredIndex;
      return;
    }

    // 一般點擊切換單一項目
    setImages(prev =>
      prev.map(img => (img.id === id ? { ...img, selected: !img.selected } : img))
    );
    lastClickedIndexRef.current = filteredIndex;
  };

  // 格式過濾切換 (支援單項切換與 Alt+點擊 Solo 模式，並連動取消非篩選格式之勾選)
  const toggleFormatFilter = (fmt: ImageFormat, solo: boolean = false) => {
    let next: Set<ImageFormat>;

    if (solo) {
      // 僅選此格式 (Solo)
      next = new Set<ImageFormat>([fmt]);
      if (fmt === 'jpg') next.add('jpeg');
    } else {
      next = new Set(formatFilters);
      const isCurrentlyActive = next.has(fmt);

      if (isCurrentlyActive) {
        next.delete(fmt);
        if (fmt === 'jpg') next.delete('jpeg');
      } else {
        next.add(fmt);
        if (fmt === 'jpg') next.add('jpeg');
      }
    }

    setFormatFilters(next);

    // 核心連動：若某圖片之格式已不在新的篩選範圍中，自動將其取消勾選！
    setImages(prev =>
      prev.map(img => {
        if (!next.has(img.format) && img.selected) {
          return { ...img, selected: false };
        }
        return img;
      })
    );
  };

  // 選取本機儲存資料夾（免逐張彈窗）
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

  const handleClearDirectory = () => {
    setTargetDirHandle(null);
    setTargetDirName('');
  };

  // 啟動批次下載
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
      await downloader.run(targetImages, options, progress => {
        setDownloadProgress({ ...progress });
      });

      // 下載完成後，更新 images 狀態：將下載成功或跳過的項目標記為 isDownloaded，並取消勾選
      setImages(prevImages => {
        const downloadedIds = new Set(targetImages.filter(img => img.isDownloaded).map(img => img.id));
        return prevImages.map(img => {
          if (downloadedIds.has(img.id)) {
            return { ...img, isDownloaded: true, selected: false };
          }
          return img;
        });
      });
    } catch (err: any) {
      console.error('下載佇列中斷:', err);
      alert(`下載失敗: ${err?.message || err}`);
    }
  };

  // 取消下載
  const handleCancelDownload = () => {
    if (downloaderRef.current) {
      downloaderRef.current.cancel();
      setDownloadProgress(prev => (prev ? { ...prev, isDownloading: false } : null));
    }
  };

  // 單張/單片立即下載（若支援目錄選擇，優先存入選定或新選目錄）
  const handleDownloadSingle = async (img: ScrapedImage) => {
    try {
      const isVideo = img.mediaType === 'video' || img.format === 'mp4' || img.format === 'webm';
      let ext = getExtensionFromUrl(img.url, img.format);
      if (isVideo && ext !== 'mp4' && ext !== 'webm') {
        ext = 'mp4';
      }

      const validMediaExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif', 'mp4', 'webm']);
      let rawName = img.url.split('/').pop()?.split('?')[0] || '';
      const currentExt = rawName.split('.').pop()?.toLowerCase() || '';
      if (!rawName || !validMediaExts.has(currentExt)) {
        rawName = `${isVideo ? 'video' : 'image'}_${img.id}.${ext}`;
      }
      const filename = sanitizePathSegment(rawName);
      
      let targetDir = targetDirHandle;
      if (!targetDir && isFileSystemAccessSupported()) {
        try {
          const picked = await pickDownloadDirectory();
          if (picked) {
            targetDir = picked;
            setTargetDirHandle(picked);
            setTargetDirName(picked.name || '已選定資料夾');
          }
        } catch {
          // 若使用者取消選擇則繼續向下 fallback
        }
      }

      if (targetDir) {
        // 直接存入已選定的本機目錄（免彈窗）
        let finalDir = targetDir;
        if (downloadFolder.trim()) {
          try {
            const sub = sanitizePathSegment(downloadFolder);
            finalDir = await targetDir.getDirectoryHandle(sub, { create: true });
          } catch {
            finalDir = targetDir;
          }
        }
        const blob = await fetchMediaBlob(img.url);
        await saveBlobToDirectory(finalDir, filename, blob);
      } else {
        const folder = sanitizePathSegment(downloadFolder);
        await downloadImage(img.url, `PowerKit-Toolbox/${folder}/${filename}`);
      }

      // 成功儲存後標記為已存並取消選取
      setImages(prev => prev.map(item => item.id === img.id ? { ...item, isDownloaded: true, selected: false } : item));
    } catch (err: any) {
      alert(`下載失敗: ${err?.message || '未知錯誤'}`);
    }
  };

  return (
    <div className={`flex flex-col ${isSidebar ? 'gap-3 p-1' : 'gap-6'}`}>
      {/* 頂部說明卡片與輸入列 */}
      <div className={`bg-dark-card border border-dark-border-subtle rounded-xl ${isSidebar ? 'p-3' : 'p-6'} shadow-sm`}>
        <div className={`flex items-center justify-between gap-2 ${isSidebar ? 'mb-2.5' : 'mb-4'}`}>
          <div className="flex items-center gap-2">
            <h2 className={`${isSidebar ? 'text-sm' : 'text-xl'} font-bold text-dark-primary flex items-center gap-1.5`}>
              <span>🖼️</span> <span>{isSidebar ? '圖片採集器' : '網頁圖片爬取與批量下載器'}</span>
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 模式切換 */}
            <div className="flex items-center bg-dark-surface p-0.5 rounded-lg border border-dark-border-subtle">
              <button
                type="button"
                onClick={() => setCrawlMode('url')}
                className={`px-2 py-1 text-xs font-medium rounded transition-all cursor-pointer ${
                  crawlMode === 'url'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-dark-secondary hover:text-dark-primary'
                }`}
              >
                🌐 網址
              </button>
              <button
                type="button"
                onClick={() => setCrawlMode('active-tab')}
                className={`px-2 py-1 text-xs font-medium rounded transition-all cursor-pointer ${
                  crawlMode === 'active-tab'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-dark-secondary hover:text-dark-primary'
                }`}
              >
                📑 分頁
              </button>
            </div>

            {isSidebar && (
              <button
                type="button"
                onClick={() => chrome.tabs.create({ url: 'chrome://newtab' })}
                className="text-xs text-blue-400 hover:text-blue-300 p-1 hover:bg-dark-surface rounded transition-colors"
                title="在新分頁開啟全螢幕儀表板"
              >
                <span>🖥️</span>
              </button>
            )}
          </div>
        </div>

        {!isSidebar && (
          <p className="text-sm text-dark-secondary mb-4">
            一鍵提取任意網頁所有高畫質原圖，支援條件篩選、全選預覽與多執行緒平滑下載。
          </p>
        )}

        {/* 輸入與觸發區 */}
        {crawlMode === 'url' ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="請輸入網頁 URL (例如 https://example.com/...)"
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStartScrape()}
                className="flex-1 bg-dark-surface border border-dark-border-subtle rounded-lg px-4 py-2.5 text-sm text-dark-primary placeholder-dark-muted focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleStartScrape}
                disabled={isLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>深度分析中...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>開始爬取圖片</span>
                  </>
                )}
              </button>
            </div>

            {/* Instagram 貼心提醒 */}
            {targetUrl.toLowerCase().includes('instagram.com') && (
              <div className="p-3 bg-pink-950/40 border border-pink-800/50 rounded-lg text-xs text-pink-200 flex items-start gap-2.5">
                <span className="text-base leading-none">📷</span>
                <div className="flex-1">
                  <strong>Instagram 多圖貼文採集提示：</strong>
                  <div className="text-pink-300/90 mt-0.5">
                    Instagram 對外部直接 URL 爬取有嚴格的反爬與登入限制。若要完整採集貼文中的所有多張相片（如 index 1~14），強烈建議您在瀏覽器分頁開啟貼文後，切換為「<strong>抓取當前瀏覽分頁</strong>」並使用「<strong>相簿劇院輪巡</strong>」模式！
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCrawlMode('active-tab');
                      setActiveTabMode('carousel-traverse');
                    }}
                    className="mt-2 px-2.5 py-1 bg-pink-600/30 hover:bg-pink-600/50 text-pink-200 border border-pink-500/40 rounded text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>👉</span>
                    <span>一鍵切換至「當前分頁相簿輪巡」</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* 當前鎖定分頁即時指示條 */}
            {currentTabInfo && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-950/25 border border-emerald-800/40 rounded-lg text-xs text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                <span className="font-semibold flex-shrink-0">鎖定分頁：</span>
                <span className="truncate flex-1 text-slate-200 font-medium text-[11px]" title={currentTabInfo.title}>
                  {currentTabInfo.title || currentTabInfo.url}
                </span>
              </div>
            )}

            {/* 分頁模式選擇：精簡 Segmented Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-dark-surface rounded-lg border border-dark-border-subtle text-xs">
              <button
                type="button"
                onClick={() => setActiveTabMode('fast')}
                className={`py-1.5 px-1.5 rounded font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTabMode === 'fast'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-dark-secondary hover:text-dark-primary hover:bg-dark-hover/40'
                }`}
                title="瞬間提取當前 DOM 樹中已渲染之所有圖片（最快）"
              >
                <span>⚡</span>
                <span className="truncate">快速快照</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTabMode('deep-scroll')}
                className={`py-1.5 px-1.5 rounded font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTabMode === 'deep-scroll'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-dark-secondary hover:text-dark-primary hover:bg-dark-hover/40'
                }`}
                title="自動向下平滑滑動以觸發延遲載入 (Lazy-load) 圖片"
              >
                <span>📜</span>
                <span className="truncate">深度滾動</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTabMode('carousel-traverse')}
                className={`py-1.5 px-1.5 rounded font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTabMode === 'carousel-traverse'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-dark-secondary hover:text-dark-primary hover:bg-dark-hover/40'
                }`}
                title="自動模擬切換下一張，逐張擷取 FB / IG 貼文多圖"
              >
                <span>🔄</span>
                <span className="truncate">相簿輪巡</span>
              </button>
            </div>

            {/* 雙核心高能主控列 (Dual Action Bar: 輪巡與下載同屏聯動) */}
            <div className="flex flex-col gap-2 p-2.5 bg-dark-surface/90 rounded-lg border border-dark-border-subtle shadow-inner">
              {/* 輪巡進度條 (輪巡進行時即時展示) */}
              {activeTabMode === 'carousel-traverse' && carouselProgress?.isTraversing && (
                <div className="flex flex-col gap-1 px-0.5">
                  <div className="flex items-center justify-between text-[11px] text-indigo-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                      <span className="truncate max-w-[190px]">{carouselProgress.statusText}</span>
                    </div>
                    <span className="text-indigo-300 font-mono text-[10px]">已採集 {carouselProgress.currentCount} 張</span>
                  </div>
                  <div className="w-full bg-dark-card h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(8, (carouselProgress.currentCount / 30) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 雙核心按鈕區：左【輪巡/採集】+ 右【立即下載】 */}
              <div className="grid grid-cols-2 gap-2">
                {/* 按鈕 1: 輪巡/採集控制 */}
                {isLoading && activeTabMode === 'carousel-traverse' ? (
                  <button
                    type="button"
                    onClick={handleStopTraverse}
                    className="w-full py-2 px-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-1 cursor-pointer"
                    title="立即停止相簿輪巡並保留已採集圖片"
                  >
                    <span className="text-sm">🛑</span>
                    <span className="truncate">停止並匯出</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartScrape}
                    disabled={isLoading}
                    className={`w-full py-2 px-2 font-semibold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer ${
                      activeTabMode === 'carousel-traverse'
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
                    } disabled:opacity-50`}
                    title={
                      activeTabMode === 'carousel-traverse'
                        ? '自動遍歷下一張並逐張採集 FB / IG 相簿'
                        : activeTabMode === 'deep-scroll'
                        ? '向下平滑滾動以觸發延遲加載'
                        : '瞬間提取當前頁面所有圖片'
                    }
                  >
                    {isLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="truncate">{activeTabMode === 'carousel-traverse' ? '輪巡中...' : '採集中...'}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm">{activeTabMode === 'carousel-traverse' ? '🔄' : activeTabMode === 'deep-scroll' ? '📜' : '⚡'}</span>
                        <span className="truncate">
                          {activeTabMode === 'carousel-traverse'
                            ? images.length > 0 ? '繼續輪巡相簿' : '開始輪巡相簿'
                            : activeTabMode === 'deep-scroll'
                            ? '深度滾動抓取'
                            : '即時快照'}
                        </span>
                      </>
                    )}
                  </button>
                )}

                {/* 按鈕 2: 立即下載 (同屏一鍵觸發！) */}
                <button
                  type="button"
                  onClick={handleBatchDownload}
                  disabled={selectedCount === 0 || downloadProgress?.isDownloading}
                  className={`w-full py-2 px-2 font-semibold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1 ${
                    selectedCount > 0
                      ? targetDirHandle
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 ring-1 ring-emerald-400/40 cursor-pointer'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25 cursor-pointer'
                      : 'bg-dark-card text-dark-muted border border-dark-border-subtle cursor-not-allowed opacity-50'
                  }`}
                  title={
                    selectedCount > 0
                      ? `立即下載已選取的 ${selectedCount} 個項目 (儲存至 ${targetDirName || '預設下載匣'})`
                      : '請先透過左側按鈕輪巡或選取圖片'
                  }
                >
                  <span className="text-sm">{downloadProgress?.isDownloading ? '⏳' : targetDirHandle ? '⚡' : '⬇️'}</span>
                  <span className="truncate">
                    {downloadProgress?.isDownloading
                      ? `下載中 (${downloadProgress.current}/${downloadProgress.total})`
                      : selectedCount > 0
                      ? `立即下載 (${selectedCount}張)`
                      : '下載圖片 (0張)'}
                  </span>
                </button>
              </div>

              {/* 儲存目錄與快捷切換指示列 */}
              <div className="flex items-center justify-between text-[11px] text-dark-muted pt-1 border-t border-dark-border-subtle/50 px-0.5">
                <div className="flex items-center gap-1.5 truncate max-w-[210px]">
                  <span>📁</span>
                  <span className="truncate text-dark-secondary" title={targetDirName ? `儲存至: ${targetDirName} (免逐張彈窗)` : '儲存至瀏覽器預設下載匣'}>
                    {targetDirName ? (
                      <span className="text-emerald-300 font-mono text-[10px]">
                        {targetDirName} <span className="text-[9px] px-1 py-0.2 bg-emerald-950/80 text-emerald-400 rounded border border-emerald-800/40">免彈窗</span>
                      </span>
                    ) : (
                      '預設下載匣'
                    )}
                  </span>
                </div>

                {isFileSystemAccessSupported() && (
                  <button
                    type="button"
                    onClick={handlePickDirectory}
                    className="text-blue-400 hover:text-blue-300 underline text-[10px] cursor-pointer flex-shrink-0 transition-colors"
                    title="指定本機資料夾，建立獨立相簿並免彈窗直存"
                  >
                    {targetDirHandle ? '更換目錄' : '選定資料夾'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 錯誤反饋提示 */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* 爬取結果面板 */}
      {images.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* 控制工具列 */}
          <div className={`bg-dark-card border border-dark-border-subtle rounded-xl ${isSidebar ? 'p-3 gap-2.5' : 'p-5 gap-4'} shadow-sm flex flex-col`}>
            {/* 頂部資訊列 */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dark-border-subtle/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">📁</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-semibold text-dark-primary truncate max-w-[150px]" title={pageTitle}>
                      {pageTitle}
                    </h3>
                    <span className="text-[11px] text-dark-muted">
                      共 {images.length} 項
                      {images.some(img => img.mediaType === 'video' || img.format === 'mp4' || img.format === 'webm') && (
                        <span className="text-purple-300 ml-1">
                          (含 {images.filter(img => img.mediaType === 'video' || img.format === 'mp4' || img.format === 'webm').length} 影片)
                        </span>
                      )}
                    </span>
                    <span className="text-blue-400 font-medium text-[11px]">
                      已選 {selectedCount}
                    </span>
                    {images.some(img => img.isHighResUpgrade) && (
                      <span className="text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-800/40 text-[10px]">
                        ✨ 高清原圖
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 選取快捷操作與進階開關 */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="px-2 py-1 bg-dark-surface hover:bg-dark-hover text-dark-primary rounded border border-dark-border-subtle transition-colors text-[11px] cursor-pointer"
                  title="全選所有圖片"
                >
                  全選
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="px-2 py-1 bg-dark-surface hover:bg-dark-hover text-dark-secondary rounded border border-dark-border-subtle transition-colors text-[11px] cursor-pointer"
                  title="取消全部選取"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleInvertSelect}
                  className="px-2 py-1 bg-dark-surface hover:bg-dark-hover text-dark-secondary rounded border border-dark-border-subtle transition-colors text-[11px] cursor-pointer"
                  title="反向選取"
                >
                  反選
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`px-2 py-1 rounded border transition-colors text-[11px] flex items-center gap-1 cursor-pointer ${
                    showAdvanced
                      ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                      : 'bg-dark-surface text-dark-secondary border-dark-border-subtle hover:text-dark-primary'
                  }`}
                  title="展開/收合詳細儲存設定與篩選條件"
                >
                  <span>⚙️</span>
                  <span>{showAdvanced ? '收起' : '進階'}</span>
                </button>
              </div>
            </div>

            {/* 格式標籤篩選列 */}
            <div className="flex items-center gap-1 flex-wrap text-xs">
              <span className="text-dark-muted mr-1 text-[11px]">格式:</span>
              {(['jpg', 'png', 'webp', 'gif', 'svg', 'mp4', 'webm'] as ImageFormat[]).map(fmt => {
                const isChecked = formatFilters.has(fmt);
                const isVid = fmt === 'mp4' || fmt === 'webm';
                return (
                  <button
                    key={fmt}
                    onClick={(e) => toggleFormatFilter(fmt, e.altKey)}
                    title="點擊切換；按住 Alt+點擊可「僅選此格式」"
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-all flex items-center gap-0.5 cursor-pointer ${
                      isChecked
                        ? isVid
                          ? 'bg-purple-600/30 text-purple-300 border border-purple-500/60 shadow-sm'
                          : 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-sm'
                        : 'bg-dark-surface text-dark-muted border border-dark-border-subtle opacity-60 hover:opacity-100'
                    }`}
                  >
                    {isVid && <span>🎥</span>}
                    <span>{fmt}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  const all = new Set<ImageFormat>(['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'mp4', 'webm', 'unknown']);
                  setFormatFilters(all);
                }}
                className="text-[10px] text-dark-muted hover:text-blue-400 underline ml-1 cursor-pointer transition-colors"
                title="重設為顯示所有圖片與影片格式"
              >
                全部
              </button>
            </div>

            {/* 可折疊之進階選項與目錄設定 (側邊欄預設收起，避免佔據垂直空間) */}
            {(showAdvanced || !isSidebar) && (
              <div className="bg-dark-surface/90 p-3 rounded-lg border border-dark-border-subtle flex flex-col gap-3 animate-fadeIn text-xs">
                {/* 寬度過濾與關鍵字搜尋 */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-dark-muted text-[11px]">最小寬度:</span>
                    <select
                      value={minWidth}
                      onChange={e => setMinWidth(Number(e.target.value))}
                      className="bg-dark-card border border-dark-border-subtle text-dark-primary rounded px-2 py-1 outline-none text-xs"
                    >
                      <option value={0}>不限</option>
                      <option value={200}>&gt; 200px</option>
                      <option value={500}>&gt; 500px</option>
                      <option value={1000}>&gt; 1000px</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="搜尋檔名或描述..."
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    className="bg-dark-card border border-dark-border-subtle rounded px-2 py-1 text-dark-primary placeholder-dark-muted outline-none w-32 focus:w-40 transition-all text-xs"
                  />
                </div>

                {/* 資料夾與命名設定 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dark-border-subtle/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-dark-muted text-[11px]">子資料夾:</span>
                      <input
                        type="text"
                        value={downloadFolder}
                        onChange={e => setDownloadFolder(e.target.value)}
                        className="bg-dark-card border border-dark-border-subtle rounded px-2 py-1 text-dark-primary outline-none text-xs font-mono w-28"
                        placeholder="資料夾名稱"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-dark-muted text-[11px]">命名:</span>
                      <select
                        value={namingPattern}
                        onChange={e => setNamingPattern(e.target.value as any)}
                        className="bg-dark-card border border-dark-border-subtle rounded px-1.5 py-1 text-dark-primary outline-none text-xs"
                      >
                        <option value="original">原始檔名</option>
                        <option value="sequence">序號命名</option>
                      </select>
                    </div>

                    {namingPattern === 'sequence' && (
                      <input
                        type="text"
                        value={namingPrefix}
                        onChange={e => setNamingPrefix(e.target.value)}
                        placeholder="前綴"
                        className="bg-dark-card border border-dark-border-subtle rounded px-1.5 py-1 text-dark-primary outline-none w-16 text-xs"
                      />
                    )}

                    {/* 智慧跳過重複檔案開關 */}
                    <label className="flex items-center gap-1.5 text-dark-secondary hover:text-dark-primary text-xs cursor-pointer select-none ml-1">
                      <input
                        type="checkbox"
                        checked={skipExisting}
                        onChange={e => setSkipExisting(e.target.checked)}
                        className="rounded border-dark-border-subtle bg-dark-card text-blue-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>跳過已存在檔案</span>
                    </label>
                  </div>

                  {/* 目錄設定與下載按鈕 */}
                  {/* 目錄設定與下載按鈕 (對調順序：立即下載優先於選定資料夾) */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBatchDownload}
                      disabled={selectedCount === 0 || downloadProgress?.isDownloading}
                      className={`px-3 py-1.5 disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer ${
                        targetDirHandle
                          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                          : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                      }`}
                      title={
                        targetDirHandle
                          ? `批量下載至 ${targetDirName} (${selectedCount} 張)`
                          : `直接下載至預設下載匣 (${selectedCount} 張)`
                      }
                    >
                      <span>{targetDirHandle ? '⚡' : '⬇️'}</span>
                      <span>立即下載 ({selectedCount}張)</span>
                    </button>

                    {targetDirHandle ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const newDir = await pickDownloadDirectory();
                            if (newDir) {
                              setTargetDirHandle(newDir);
                              setTargetDirName(newDir.name || '已選定資料夾');
                            }
                          } catch (err: any) {
                            alert(`更換資料夾失敗: ${err?.message || err}`);
                          }
                        }}
                        className="px-2.5 py-1 bg-dark-card hover:bg-dark-hover text-dark-secondary hover:text-dark-primary text-xs rounded border border-dark-border-subtle transition-colors flex items-center gap-1 cursor-pointer"
                        title="更換當前儲存的本機目標資料夾"
                      >
                        <span>📁</span>
                        <span>更換資料夾</span>
                      </button>
                    ) : (
                      isFileSystemAccessSupported() && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const dir = await pickDownloadDirectory();
                              if (dir) {
                                setTargetDirHandle(dir);
                                setTargetDirName(dir.name || '已選定資料夾');
                              }
                            } catch (err: any) {
                              console.warn('選取資料夾略過:', err);
                            }
                          }}
                          className="px-2.5 py-1 bg-dark-card hover:bg-dark-hover text-dark-secondary hover:text-dark-primary text-xs rounded border border-dark-border-subtle transition-colors flex items-center gap-1 cursor-pointer"
                          title="可選：指定一個本機資料夾，自動建立相簿並免彈窗直存"
                        >
                          <span>📁</span>
                          <span>選定資料夾</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 下載進度條 */}
            {downloadProgress && downloadProgress.isDownloading && (
              <div className="bg-dark-surface p-3 rounded-lg border border-dark-border-subtle flex flex-col gap-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    <span className="text-dark-primary font-medium">
                      下載中... ({downloadProgress.current} / {downloadProgress.total})
                    </span>
                    <span className="text-dark-muted font-mono truncate max-w-xs">
                      {downloadProgress.activeItemName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400">成功: {downloadProgress.successCount}</span>
                    {downloadProgress.skippedCount > 0 && (
                      <span className="text-amber-400">跳過重複: {downloadProgress.skippedCount}</span>
                    )}
                    {downloadProgress.failureCount > 0 && (
                      <span className="text-red-400">失敗: {downloadProgress.failureCount}</span>
                    )}
                    <button
                      onClick={handleCancelDownload}
                      className="text-xs text-red-400 hover:text-red-300 underline"
                    >
                      中止下載
                    </button>
                  </div>
                </div>

                <div className="w-full bg-dark-hover h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-200"
                    style={{
                      width: `${(downloadProgress.current / downloadProgress.total) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 圖片網格卡片視圖 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredImages.map((img, index) => {
              return (
                <div
                  key={img.id}
                  onClick={e => handleToggleImage(img.id, index, e)}
                  className={`group relative bg-dark-card border rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-200 flex flex-col ${
                    img.selected
                      ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                      : 'border-dark-border-subtle hover:border-dark-border-strong opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* 縮圖預覽容器 */}
                  <div className="relative aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
                    {(() => {
                      const isVideo = img.mediaType === 'video' || img.format === 'mp4' || img.format === 'webm';
                      const thumbSrc = isVideo ? (img.posterUrl || img.url) : img.url;
                      return (
                        <>
                          <img
                            src={thumbSrc}
                            alt={img.alt || (isVideo ? `影片 ${index + 1}` : `圖片 ${index + 1}`)}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => {
                              // 載入失敗時降級顯示
                              (e.target as HTMLImageElement).src = img.rawUrl;
                            }}
                          />

                          {/* 影片中央播放小圖示 */}
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white text-sm shadow-md group-hover:scale-110 transition-transform">
                                ▶
                              </div>
                            </div>
                          )}

                          {/* 勾選標籤與已存標籤 */}
                          <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                            <div
                              className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                                img.selected
                                  ? 'bg-blue-600 text-white shadow'
                                  : 'bg-black/60 border border-white/50 text-transparent'
                              }`}
                            >
                              ✓
                            </div>
                            {img.isDownloaded && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600/90 text-white border border-emerald-400/40 shadow-sm flex items-center gap-0.5">
                                <span>✓</span>
                                <span>已存</span>
                              </span>
                            )}
                          </div>

                          {/* 畫質 / 格式徽章 */}
                          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                            <span
                              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1 ${
                                isVideo
                                  ? 'bg-purple-600/90 text-white border border-purple-400/40 shadow-sm'
                                  : 'bg-black/70 text-white'
                              }`}
                            >
                              {isVideo && <span>🎥</span>}
                              <span>{img.format}</span>
                            </span>
                            {img.isHighResUpgrade && (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/90 text-black">
                                HD
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* 懸浮放大 / 下載動作按鈕群 */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        title="放大檢視"
                        onClick={e => {
                          e.stopPropagation();
                          setPreviewImage(img);
                        }}
                        className="p-2 bg-black/70 hover:bg-black text-white rounded-full transition-transform hover:scale-110"
                      >
                        🔍
                      </button>
                      <button
                        title={img.isDownloaded ? "已存過，點擊重新下載" : "單張下載"}
                        onClick={e => {
                          e.stopPropagation();
                          handleDownloadSingle(img);
                        }}
                        className={`p-2 rounded-full transition-transform hover:scale-110 text-white ${
                          img.isDownloaded ? 'bg-slate-700 hover:bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-500'
                        }`}
                      >
                        {img.isDownloaded ? '💾' : '⬇️'}
                      </button>
                    </div>
                  </div>

                  {/* 底部卡片資訊 */}
                  <div className="p-2.5 flex flex-col gap-1 text-[11px] bg-dark-card border-t border-dark-border-subtle/50">
                    <span className="text-dark-primary truncate font-medium" title={img.alt || img.url}>
                      {img.alt || `相片 #${index + 1}`}
                    </span>
                    <span className="text-dark-muted font-mono truncate text-[10px]" title={img.url}>
                      {img.url.split('/').pop()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredImages.length === 0 && (
            <div className="text-center py-12 text-dark-muted bg-dark-card rounded-xl border border-dark-border-subtle">
              沒有符合目前篩選條件的圖片，請嘗試放寬尺寸或格式限制。
            </div>
          )}
        </div>
      )}

      {/* 放大預覽燈箱 Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-dark-surface border border-dark-border-strong rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔍</span>
                <h4 className="text-sm font-semibold text-dark-primary truncate max-w-md">
                  {previewImage.alt || previewImage.url.split('/').pop()}
                </h4>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-dark-muted hover:text-dark-primary text-xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Image / Video Body */}
            <div className="flex-1 bg-black/90 p-4 flex items-center justify-center overflow-auto min-h-[300px]">
              {(() => {
                const isVideo = previewImage.mediaType === 'video' || previewImage.format === 'mp4' || previewImage.format === 'webm';
                if (isVideo) {
                  return (
                    <video
                      src={previewImage.url}
                      poster={previewImage.posterUrl}
                      controls
                      autoPlay
                      className="max-h-[65vh] max-w-full rounded shadow-xl bg-black"
                    />
                  );
                }
                return (
                  <img
                    src={previewImage.url}
                    alt="大圖預覽"
                    className="max-h-[65vh] max-w-full object-contain rounded"
                  />
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-dark-card border-t border-dark-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-dark-secondary font-mono truncate max-w-lg">
                <span className="text-dark-muted mr-1">URL:</span>
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {previewImage.url}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewImage.url);
                    alert('已複製媒體網址！');
                  }}
                  className="px-3 py-1.5 bg-dark-surface hover:bg-dark-hover text-dark-primary rounded border border-dark-border-subtle transition-colors"
                >
                  複製網址
                </button>
                <button
                  onClick={() => handleDownloadSingle(previewImage)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors"
                >
                  {(previewImage.mediaType === 'video' || previewImage.format === 'mp4' || previewImage.format === 'webm')
                    ? '下載此影片'
                    : '下載此圖'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
