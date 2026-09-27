import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CapturedSubtitleNote, SubtitleFilterType, SubtitleFilterState } from './types';
import { parseSrt, convertSrtToCapturedNotes } from './services/srtParser';
import { addNoteToTodayBattle, addNoteToInbox, buildJumpUrl } from './services/subtitleConverter';

export interface SubtitleCollectorProps {
  isSidebar?: boolean;
}

export const SubtitleCollector: React.FC<SubtitleCollectorProps> = ({ isSidebar = false }) => {
  const [notes, setNotes] = useState<CapturedSubtitleNote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [convertedId, setConvertedId] = useState<string | null>(null);
  const [inboxAddedId, setInboxAddedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 篩選狀態
  const [filters, setFilters] = useState<SubtitleFilterState>({
    keyword: '',
    selectedTag: 'all',
    typeFilter: 'all'
  });

  // 顯示提示訊息
  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 2500);
  }, []);

  // 讀取 Chrome Storage 資料
  const loadNotes = useCallback(async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['capturedNotes']);
        const list: CapturedSubtitleNote[] = result.capturedNotes || [];
        setNotes(list);
      }
    } catch {
      // 容錯降級處理
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();

    // 監聽 storage 變化以達成即時同步
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      const handleStorageChange = (
        changes: { [key: string]: chrome.storage.StorageChange },
        areaName: string
      ) => {
        if (areaName === 'local' && changes.capturedNotes) {
          setNotes((changes.capturedNotes.newValue as CapturedSubtitleNote[]) || []);
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, [loadNotes]);

  // 開啟連結
  const handleOpenUrl = (url: string, timeStr?: string) => {
    const finalUrl = buildJumpUrl(url, timeStr);
    if (!finalUrl) return;
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: finalUrl });
    } else {
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // 一鍵複製 Markdown
  const handleCopyMarkdown = (note: CapturedSubtitleNote) => {
    const timeTag = note.currentTime ? `[${note.currentTime}] ` : '';
    const tagList = note.tags && note.tags.length > 0 ? ` ${note.tags.join(' ')}` : '';
    const jumpUrl = buildJumpUrl(note.url, note.currentTime);
    const md = `> ${timeTag}${note.text}\n\n— 來源：[${note.title || '影片'}](${jumpUrl})${tagList}`;

    navigator.clipboard.writeText(md).then(() => {
      setCopiedId(note.id);
      showToast('已複製 Markdown 筆記至剪貼簿！');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // 轉為今日作戰任務 (呼叫轉換服務)
  const handleConvertToMission = async (note: CapturedSubtitleNote) => {
    const res = await addNoteToTodayBattle(note);
    if (res.success) {
      setConvertedId(note.id);
      showToast(res.message, 'success');
      setTimeout(() => setConvertedId(null), 3000);
    } else {
      showToast(res.message, 'error');
    }
  };

  // 轉入收件匣
  const handleAddToInbox = async (note: CapturedSubtitleNote) => {
    const res = await addNoteToInbox(note);
    if (res.success) {
      setInboxAddedId(note.id);
      showToast(res.message, 'success');
      setTimeout(() => setInboxAddedId(null), 3000);
    } else {
      showToast(res.message, 'error');
    }
  };

  // 處理 SRT 檔案解析與寫入
  const handleProcessSrtFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.srt')) {
      showToast('僅支援 .srt 格式之字幕檔案', 'error');
      return;
    }

    try {
      const text = await file.text();
      const parsedItems = parseSrt(text);

      if (parsedItems.length === 0) {
        showToast('未能從檔案中解析出有效 SRT 字幕內容', 'error');
        return;
      }

      const importedNotes = convertSrtToCapturedNotes(parsedItems, file.name);
      const updatedNotes = [...importedNotes, ...notes];

      setNotes(updatedNotes);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ capturedNotes: updatedNotes });
      }

      showToast(`成功匯入 ${importedNotes.length} 條 SRT 字幕！`, 'success');
    } catch {
      showToast('解析 SRT 檔案時發生錯誤', 'error');
    }
  };

  // 檔案選取上傳觸發
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessSrtFile(file);
    }
    // 重設 input 值以利重複觸發相同檔名
    e.target.value = '';
  };

  // 拖放事件處理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessSrtFile(file);
    }
  };

  // 刪除單筆紀錄
  const handleDeleteNote = async (id: string) => {
    try {
      const updated = notes.filter((n) => n.id !== id);
      setNotes(updated);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ capturedNotes: updated });
      }
      showToast('已刪除筆記紀錄', 'info');
    } catch {
      showToast('刪除失敗', 'error');
    }
  };

  // 清空所有紀錄
  const handleClearAll = async () => {
    if (notes.length === 0) return;
    const confirmClear = window.confirm('確定要清空所有已收集的影片字幕與筆記嗎？此操作無法還原。');
    if (!confirmClear) return;

    try {
      setNotes([]);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ capturedNotes: [] });
      }
      showToast('已清空所有收集紀錄', 'info');
    } catch {
      showToast('清空失敗', 'error');
    }
  };

  // 全部可選標籤清單
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => {
      if (Array.isArray(n.tags)) {
        n.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet);
  }, [notes]);

  // 篩選後之筆記清單
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // 關鍵字比對
      if (filters.keyword.trim()) {
        const kw = filters.keyword.toLowerCase();
        const inTitle = note.title ? note.title.toLowerCase().includes(kw) : false;
        const inText = note.text ? note.text.toLowerCase().includes(kw) : false;
        const inTime = note.currentTime ? note.currentTime.toLowerCase().includes(kw) : false;
        if (!inTitle && !inText && !inTime) return false;
      }

      // 類型比對
      if (filters.typeFilter !== 'all') {
        const noteType = note.type || 'subtitle';
        if (noteType !== filters.typeFilter) return false;
      }

      // 標籤比對
      if (filters.selectedTag !== 'all') {
        if (!note.tags || !note.tags.includes(filters.selectedTag)) return false;
      }

      return true;
    });
  }, [notes, filters]);

  // 統計數據
  const stats = useMemo(() => {
    const subtitles = notes.filter((n) => (n.type || 'subtitle') === 'subtitle').length;
    const noteCount = notes.filter((n) => n.type === 'note').length;
    return {
      total: notes.length,
      subtitles,
      notes: noteCount,
      tagsCount: availableTags.length
    };
  }, [notes, availableTags]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col h-full ${isSidebar ? 'space-y-3' : 'space-y-4'} ${
        isDragging ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-dark-surface' : ''
      }`}
    >
      {/* 隱藏的 SRT 檔案選取 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".srt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 拖放覆蓋提示視覺 */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-950/80 backdrop-blur-sm border-2 border-dashed border-blue-400 rounded-lg flex flex-col items-center justify-center p-4 text-center pointer-events-none">
          <div className="text-3xl mb-2 animate-bounce">📄</div>
          <div className="text-sm font-bold text-blue-200">放開以解析並匯入 SRT 字幕</div>
          <div className="text-xs text-blue-300/80 mt-1">將自動擷取時間戳並轉化為收集紀錄</div>
        </div>
      )}

      {/* 頂部標頭與操作 */}
      <div className={`flex items-center justify-between pb-2.5 border-b border-dark-border-default ${isSidebar ? 'gap-2' : ''}`}>
        <div>
          <h2 className={`${isSidebar ? 'text-sm' : 'text-lg'} font-bold text-dark-primary flex items-center space-x-1.5`}>
            <span>🎬</span>
            <span>{isSidebar ? '字幕與筆記收集器' : '影片字幕與筆記收集器'}</span>
          </h2>
          {!isSidebar && (
            <p className="text-xs text-dark-muted mt-0.5">
              自動同步來自 VideoSpeedPlus 跨插件收集的影音精選段落與時間戳筆記
            </p>
          )}
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {/* 匯入 SRT 按鈕 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition-colors flex items-center space-x-1"
            title="從本機匯入 .srt 字幕檔"
          >
            <span>📥</span>
            <span>{isSidebar ? 'SRT' : '匯入 SRT'}</span>
          </button>

          {notes.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[11px] px-2 py-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/50 transition-colors"
              title="清空所有筆記"
            >
              清空
            </button>
          )}
          <button
            onClick={loadNotes}
            className="text-[11px] px-2 py-1 rounded bg-dark-card hover:bg-dark-hover text-dark-secondary border border-dark-border-default transition-colors flex items-center space-x-1"
            title="手動重新整理"
          >
            <span>🔄</span>
            {!isSidebar && <span>整理</span>}
          </button>
        </div>
      </div>

      {/* 浮動提示 Toast */}
      {statusMessage && (
        <div
          className={`px-3 py-2 text-xs rounded border transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
              : 'bg-blue-950/60 text-blue-300 border-blue-800/60'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* 統計指標卡片 */}
      <div className={`grid ${isSidebar ? 'grid-cols-2 gap-1.5' : 'grid-cols-4 gap-2'}`}>
        <div className="bg-dark-card p-2 rounded-lg border border-dark-border-default flex flex-col">
          <span className="text-[10px] text-dark-muted font-medium">總收集數</span>
          <span className="text-base font-bold text-blue-400 mt-0.5">{stats.total}</span>
        </div>
        <div className="bg-dark-card p-2 rounded-lg border border-dark-border-default flex flex-col">
          <span className="text-[10px] text-dark-muted font-medium">字幕段落</span>
          <span className="text-base font-bold text-indigo-400 mt-0.5">{stats.subtitles}</span>
        </div>
        <div className="bg-dark-card p-2 rounded-lg border border-dark-border-default flex flex-col">
          <span className="text-[10px] text-dark-muted font-medium">重點筆記</span>
          <span className="text-base font-bold text-amber-400 mt-0.5">{stats.notes}</span>
        </div>
        <div className="bg-dark-card p-2 rounded-lg border border-dark-border-default flex flex-col">
          <span className="text-[10px] text-dark-muted font-medium">標籤總數</span>
          <span className="text-base font-bold text-emerald-400 mt-0.5">{stats.tagsCount}</span>
        </div>
      </div>

      {/* 搜尋與過濾控制列 */}
      <div className="space-y-2 bg-dark-card/50 p-2.5 rounded-lg border border-dark-border-default">
        <div className="flex items-center space-x-2">
          {/* 關鍵字搜尋 */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-dark-muted text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder="搜尋字幕內容、影片標題或時間戳..."
              value={filters.keyword}
              onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-dark-surface border border-dark-border-default rounded text-dark-primary focus:outline-none focus:border-blue-500 transition-colors"
            />
            {filters.keyword && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, keyword: '' }))}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-dark-muted hover:text-dark-primary text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* 類型切換 Pills */}
          <div className="flex items-center space-x-1 bg-dark-surface p-0.5 rounded border border-dark-border-default text-xs">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, typeFilter: 'all' }))}
              className={`px-2 py-1 rounded transition-colors ${
                filters.typeFilter === 'all'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-dark-secondary hover:text-dark-primary'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, typeFilter: 'subtitle' }))}
              className={`px-2 py-1 rounded transition-colors ${
                filters.typeFilter === 'subtitle'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-dark-secondary hover:text-dark-primary'
              }`}
            >
              字幕
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, typeFilter: 'note' }))}
              className={`px-2 py-1 rounded transition-colors ${
                filters.typeFilter === 'note'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-dark-secondary hover:text-dark-primary'
              }`}
            >
              筆記
            </button>
          </div>
        </div>

        {/* 標籤過濾列 */}
        {availableTags.length > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
            <span className="text-dark-muted text-[10px] shrink-0 font-medium">標籤：</span>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, selectedTag: 'all' }))}
              className={`px-2 py-0.5 rounded-full text-[11px] shrink-0 transition-colors ${
                filters.selectedTag === 'all'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-dark-surface text-dark-secondary hover:text-dark-primary border border-dark-border-default'
              }`}
            >
              全部 ({notes.length})
            </button>
            {availableTags.map((tag) => {
              const count = notes.filter((n) => n.tags && n.tags.includes(tag)).length;
              const isSelected = filters.selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      selectedTag: isSelected ? 'all' : tag
                    }))
                  }
                  className={`px-2 py-0.5 rounded-full text-[11px] shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'bg-dark-surface text-dark-secondary hover:text-dark-primary border border-dark-border-default'
                  }`}
                >
                  {tag} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 筆記卡片清單 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-xs text-dark-muted">
            載入收集記錄中...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-12 px-4 text-center bg-dark-card/30 hover:bg-dark-card/50 transition-colors rounded-xl border border-dashed border-dark-border-default cursor-pointer group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📥</div>
            <div className="text-sm font-medium text-dark-primary">尚無收集的影片字幕或筆記</div>
            <p className="text-xs text-dark-muted mt-1 max-w-sm">
              在觀看 YouTube 等影片時利用快捷鍵收集，或<span className="text-indigo-400 font-medium">點擊此處 / 拖放 .srt 檔案</span>直接匯入本地字幕！
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-dark-card hover:border-dark-hover transition-colors rounded-lg p-3.5 border border-dark-border-default flex flex-col space-y-2.5 shadow-sm"
            >
              {/* 卡片頂部：標題、時間戳與類型 Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {note.currentTime && (
                      <button
                        onClick={() => handleOpenUrl(note.url, note.currentTime)}
                        className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-blue-950/60 text-blue-300 border border-blue-800/60 hover:bg-blue-900/80 transition-colors"
                        title="點擊跳轉至影片此時間點"
                      >
                        <span>⏱️</span>
                        <span>{note.currentTime}</span>
                      </button>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-surface text-dark-muted border border-dark-border-default">
                      {note.type === 'note' ? '📝 筆記' : '💬 字幕'}
                    </span>
                    <span className="text-[10px] text-dark-muted truncate">
                      {note.createdAt ? new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <h3
                    onClick={() => handleOpenUrl(note.url, note.currentTime)}
                    className="text-xs font-semibold text-dark-primary hover:text-blue-400 cursor-pointer transition-colors mt-1.5 line-clamp-1"
                    title={note.title}
                  >
                    {note.title || '未命名影片'}
                  </h3>
                </div>

                {/* 刪除按鈕 */}
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-dark-muted hover:text-red-400 p-1 text-xs rounded transition-colors"
                  title="刪除此筆記"
                >
                  ✕
                </button>
              </div>

              {/* 內容文字 */}
              <div className="text-xs text-dark-secondary bg-dark-surface/60 p-2.5 rounded border border-dark-border-default/60 whitespace-pre-wrap leading-relaxed font-sans select-text">
                {note.text}
              </div>

              {/* 卡片底部：標籤與操作動作列 */}
              <div className="flex items-center justify-between pt-1">
                {/* 標籤群 */}
                <div className="flex items-center space-x-1 overflow-x-auto max-w-[40%] scrollbar-none">
                  {note.tags &&
                    note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-dark-surface text-dark-muted border border-dark-border-default shrink-0"
                      >
                        {tag}
                      </span>
                    ))}
                </div>

                {/* 快捷操作按鈕 */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  {/* 一鍵複製 Markdown */}
                  <button
                    onClick={() => handleCopyMarkdown(note)}
                    className="px-2 py-1 text-xs rounded bg-dark-surface hover:bg-dark-hover text-dark-secondary hover:text-dark-primary border border-dark-border-default transition-colors flex items-center space-x-1"
                    title="複製為 Markdown 格式引用"
                  >
                    <span>{copiedId === note.id ? '✅' : '📋'}</span>
                    <span>{copiedId === note.id ? '已複製' : 'MD'}</span>
                  </button>

                  {/* 放入收件匣 */}
                  <button
                    onClick={() => handleAddToInbox(note)}
                    className="px-2 py-1 text-xs rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition-colors flex items-center space-x-1"
                    title="放入 ScrumClock 收件匣"
                  >
                    <span>📥</span>
                    <span>{inboxAddedId === note.id ? '已放入' : '入收件'}</span>
                  </button>

                  {/* 轉化為今日戰役任務 */}
                  <button
                    onClick={() => handleConvertToMission(note)}
                    className="px-2 py-1 text-xs rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition-colors flex items-center space-x-1"
                    title="加入 ScrumClock 今日戰役任務"
                  >
                    <span>🎯</span>
                    <span>{convertedId === note.id ? '已排定' : '入戰役'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
