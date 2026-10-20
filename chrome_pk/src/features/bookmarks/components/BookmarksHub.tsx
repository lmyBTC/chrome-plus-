import React, { useState, useEffect } from 'react';

// 確保 Chrome API 可用
declare const chrome: any;

interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon?: string;
  tag?: string;
}

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: 'google-tasks', title: 'Google Tasks', url: 'https://tasks.google.com', icon: '✅', tag: '雲端同步' },
  { id: 'google-sheets', title: 'Google Sheets', url: 'https://sheets.google.com', icon: '📊', tag: '雲端同步' },
  { id: '1', title: 'Notion', url: 'https://notion.so', icon: '📝' },
  { id: '2', title: 'Jira', url: 'https://jira.com', icon: '🎫' },
  { id: '3', title: 'Figma', url: 'https://figma.com', icon: '🎨' },
  { id: '4', title: 'GitHub', url: 'https://github.com', icon: '💻' }
];

const QUICK_ICONS = ['🔗', '✅', '📊', '📝', '🎫', '🎨', '💻', '🚀', '⚡', '💡', '💬', '📂'];

export const BookmarksHub: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // 新增狀態
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIcon, setNewIcon] = useState('🔗');
  const [hasCloudSync, setHasCloudSync] = useState(false);

  // 拖曳狀態
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 手動編輯狀態
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editIcon, setEditIcon] = useState('🔗');

  useEffect(() => {
    chrome.storage.local.get(['bookmarks', 'userSettings']).then((res: any) => {
      const userSettings = res.userSettings || {};
      const sheetTargetUrl = userSettings.spreadsheetUrl || 'https://sheets.google.com';
      const hasAppsScript = !!userSettings.appsScriptUrl;
      setHasCloudSync(hasAppsScript);

      let currentBookmarks: Bookmark[] = [];

      if (!res.bookmarks || !Array.isArray(res.bookmarks) || res.bookmarks.length === 0) {
        currentBookmarks = DEFAULT_BOOKMARKS.map(b => {
          if (b.id === 'google-sheets' && userSettings.spreadsheetUrl) {
            return { ...b, url: userSettings.spreadsheetUrl };
          }
          return b;
        });
        chrome.storage.local.set({ bookmarks: currentBookmarks });
      } else {
        currentBookmarks = [...res.bookmarks];

        // 自動補齊：檢查是否缺少 Google Tasks
        const hasTasks = currentBookmarks.some(b => 
          b.id === 'google-tasks' || 
          b.url.includes('tasks.google.com') || 
          b.url.includes('calendar.google.com/calendar/u/0/r/tasks') ||
          b.title.toLowerCase().includes('google tasks')
        );

        // 自動補齊：檢查是否缺少 Google Sheets
        const hasSheets = currentBookmarks.some(b => 
          b.id === 'google-sheets' || 
          b.url.includes('sheets.google.com') || 
          b.url.includes('docs.google.com/spreadsheets') ||
          b.title.toLowerCase().includes('google sheets')
        );

        let modified = false;

        if (!hasSheets) {
          currentBookmarks.unshift({
            id: 'google-sheets',
            title: 'Google Sheets',
            url: sheetTargetUrl,
            icon: '📊',
            tag: '雲端同步'
          });
          modified = true;
        }

        if (!hasTasks) {
          currentBookmarks.unshift({
            id: 'google-tasks',
            title: 'Google Tasks',
            url: 'https://tasks.google.com',
            icon: '✅',
            tag: '雲端同步'
          });
          modified = true;
        }

        // 若使用者在設定中指定了專屬試算表網址，且目前 Google Sheets 書籤仍是通用首頁，自動升級為專屬試算表
        if (userSettings.spreadsheetUrl) {
          currentBookmarks = currentBookmarks.map(b => {
            if ((b.id === 'google-sheets' || b.title === 'Google Sheets') && 
                (b.url === 'https://sheets.google.com' || b.url === 'https://sheets.google.com/')) {
              modified = true;
              return { ...b, url: userSettings.spreadsheetUrl };
            }
            return b;
          });
        }

        if (modified) {
          chrome.storage.local.set({ bookmarks: currentBookmarks });
        }
      }

      setBookmarks(currentBookmarks);
    });
  }, []);

  // 新增傳送門
  const handleAddBookmark = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    
    let formattedUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      url: formattedUrl,
      icon: newIcon.trim() || '🔗'
    };
    const updated = [...bookmarks, newBookmark];
    setBookmarks(updated);
    chrome.storage.local.set({ bookmarks: updated });
    setNewTitle('');
    setNewUrl('');
    setNewIcon('🔗');
  };

  // 刪除傳送門
  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    chrome.storage.local.set({ bookmarks: updated });
  };

  // 移動位置 (左右按鈕)
  const handleMoveBookmark = (index: number, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= bookmarks.length) return;

    const updated = [...bookmarks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setBookmarks(updated);
    chrome.storage.local.set({ bookmarks: updated });
  };

  // 拖曳處理
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...bookmarks];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setBookmarks(updated);
    chrome.storage.local.set({ bookmarks: updated });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 開始手動編輯傳送門
  const handleStartEdit = (bookmark: Bookmark, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingBookmark(bookmark);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
    setEditIcon(bookmark.icon || '🔗');
  };

  // 儲存編輯結果
  const handleSaveEdit = () => {
    if (!editingBookmark || !editTitle.trim() || !editUrl.trim()) return;

    let formattedUrl = editUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const updated = bookmarks.map(b => {
      if (b.id === editingBookmark.id) {
        return {
          ...b,
          title: editTitle.trim(),
          url: formattedUrl,
          icon: editIcon.trim() || '🔗'
        };
      }
      return b;
    });

    setBookmarks(updated);
    chrome.storage.local.set({ bookmarks: updated });
    setEditingBookmark(null);
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* 頂部標題與狀態 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-dark-primary">辦公室傳送門</h1>
            {hasCloudSync && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                雲端同步已連線
              </span>
            )}
          </div>
          <p className="text-xs text-dark-muted mt-1.5">
            {isEditing 
              ? '💡 編輯模式已開啟：可直接拖曳卡片換位、點擊 ◀ ▶ 微調位置，或點擊 ✏️ 修改名稱與網址。'
              : '自動同步您的生產力生態系（Google Tasks / Google Sheets 計畫日誌），一鍵直達工作陣地。'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 ${
              isEditing 
                ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-blue-950/40' 
                : 'bg-dark-card hover:bg-dark-hover text-dark-secondary hover:text-dark-primary border-dark-border-default hover:border-dark-border-hover'
            }`}
          >
            {isEditing ? '✓ 完成編輯' : '⚙️ 編輯與排序'}
          </button>
        </div>
      </div>

      {/* 傳送門卡片網格 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {bookmarks.map((bookmark, index) => {
          const isCloud = bookmark.tag === '雲端同步' || 
                          bookmark.id === 'google-tasks' || 
                          bookmark.id === 'google-sheets' ||
                          bookmark.url.includes('tasks.google.com') ||
                          bookmark.url.includes('calendar.google.com/calendar/u/0/r/tasks') ||
                          bookmark.url.includes('docs.google.com/spreadsheets') ||
                          bookmark.url.includes('sheets.google.com');

          const isBeingDragged = draggedIndex === index;
          const isDragTarget = dragOverIndex === index && draggedIndex !== index;

          return (
            <div 
              key={bookmark.id} 
              draggable={isEditing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group select-none transition-all duration-200 ${
                isEditing ? 'cursor-grab active:cursor-grabbing' : ''
              } ${isBeingDragged ? 'opacity-30 scale-95' : ''} ${
                isDragTarget ? 'ring-2 ring-blue-500 scale-[1.03] shadow-lg shadow-blue-500/20' : ''
              }`}
            >
              <a
                href={isEditing ? undefined : bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (isEditing) {
                    e.preventDefault();
                  }
                }}
                className={`flex flex-col items-center justify-center p-5 bg-dark-card hover:bg-dark-hover rounded-xl shadow-md border transition-all h-36 shadow-slate-950/20 relative overflow-hidden ${
                  isCloud 
                    ? 'border-blue-500/30 hover:border-blue-400 hover:shadow-blue-500/10' 
                    : 'border-dark-border-subtle hover:border-dark-border-default hover:shadow-lg'
                }`}
              >
                {/* 標籤 */}
                {isCloud && (
                  <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                    雲端同步
                  </span>
                )}

                {/* 圖示 */}
                <span className="text-3xl mb-2.5 group-hover:scale-110 transition-transform duration-200">
                  {bookmark.icon || '🔗'}
                </span>

                {/* 標題 */}
                <span className="font-semibold text-dark-primary text-sm text-center line-clamp-1 px-1">
                  {bookmark.title}
                </span>

                {/* 簡短網址 */}
                <span className="text-[11px] text-dark-muted mt-1 truncate max-w-[90%] opacity-70 group-hover:opacity-100 font-mono">
                  {bookmark.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
                </span>
              </a>

              {/* 編輯模式下的控制按鈕 */}
              {isEditing && (
                <>
                  {/* 左上角：編輯按鈕 */}
                  <button
                    onClick={(e) => handleStartEdit(bookmark, e)}
                    title="編輯此傳送門"
                    className="absolute -top-2 -left-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-500 transition-colors shadow-blue-950/40 text-xs font-bold z-10"
                  >
                    ✏️
                  </button>

                  {/* 右上角：刪除按鈕 */}
                  <button
                    onClick={(e) => handleDeleteBookmark(bookmark.id, e)}
                    title="刪除此傳送門"
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-400 transition-colors shadow-red-950/40 text-sm font-bold z-10"
                  >
                    ×
                  </button>

                  {/* 底部：位置左右移動按鈕 */}
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-dark-surface/90 border border-dark-border-default rounded-full px-2 py-0.5 shadow-md z-10 backdrop-blur-sm">
                    <button
                      onClick={(e) => handleMoveBookmark(index, 'left', e)}
                      disabled={index === 0}
                      title="向前移動"
                      className="text-xs text-dark-secondary hover:text-blue-400 disabled:opacity-20 disabled:hover:text-dark-secondary px-1 transition-colors font-bold"
                    >
                      ◀
                    </button>
                    <span className="text-[10px] text-dark-muted font-mono">{index + 1}</span>
                    <button
                      onClick={(e) => handleMoveBookmark(index, 'right', e)}
                      disabled={index === bookmarks.length - 1}
                      title="向後移動"
                      className="text-xs text-dark-secondary hover:text-blue-400 disabled:opacity-20 disabled:hover:text-dark-secondary px-1 transition-colors font-bold"
                    >
                      ▶
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 編輯模式：新增傳送門面板 */}
      {isEditing && (
        <div className="mt-10 p-6 bg-dark-surface rounded-2xl border border-dark-border-default shadow-inner">
          <h3 className="text-base font-bold text-dark-primary mb-3 flex items-center gap-2">
            <span>➕</span> 新增自訂傳送門
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="圖示 (例: 🚀)"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              className="w-full sm:w-20 px-3 py-2.5 bg-dark-card text-dark-primary border border-dark-border-default rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center"
            />
            <input
              type="text"
              placeholder="名稱 (例: Slack)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-dark-card text-dark-primary border border-dark-border-default rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <input
              type="url"
              placeholder="網址 (例: https://slack.com)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="flex-2 px-4 py-2.5 bg-dark-card text-dark-primary border border-dark-border-default rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <button
              onClick={handleAddBookmark}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-950/40 font-semibold text-sm transition-colors whitespace-nowrap"
            >
              新增
            </button>
          </div>
        </div>
      )}

      {/* 手動編輯彈窗 (Modal) */}
      {editingBookmark && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingBookmark(null)}
        >
          <div 
            className="bg-dark-card border border-dark-border-default rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-dark-border-subtle">
              <h3 className="text-lg font-bold text-dark-primary flex items-center gap-2">
                <span>✏️</span> 編輯傳送門
              </h3>
              <button 
                onClick={() => setEditingBookmark(null)}
                className="text-dark-muted hover:text-dark-primary text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* 圖示選擇與自訂 */}
              <div>
                <label className="block text-xs font-semibold text-dark-secondary mb-1.5">
                  圖示 Emoji
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={editIcon}
                    onChange={(e) => setEditIcon(e.target.value)}
                    className="w-16 px-3 py-2 bg-dark-surface border border-dark-border-default rounded-xl text-center text-xl outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary"
                  />
                  <div className="flex flex-wrap gap-1 flex-1">
                    {QUICK_ICONS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditIcon(emoji)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition-all ${
                          editIcon === emoji 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'bg-dark-surface border-dark-border-subtle hover:border-dark-border-default'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 名稱 */}
              <div>
                <label className="block text-xs font-semibold text-dark-secondary mb-1.5">
                  傳送門名稱
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border-default rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm"
                  placeholder="例如：Google Sheets"
                />
              </div>

              {/* 網址 */}
              <div>
                <label className="block text-xs font-semibold text-dark-secondary mb-1.5">
                  目標網址 (URL)
                </label>
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border-default rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm font-mono"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-dark-border-subtle">
              <button
                type="button"
                onClick={() => setEditingBookmark(null)}
                className="px-4 py-2 rounded-xl border border-dark-border-default hover:border-dark-border-hover text-dark-secondary hover:text-dark-primary text-xs font-semibold transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-950/40 transition-colors"
              >
                💾 儲存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
