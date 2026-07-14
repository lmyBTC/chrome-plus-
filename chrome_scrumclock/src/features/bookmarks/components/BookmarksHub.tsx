import React, { useState, useEffect } from 'react';

// 確保 Chrome API 可用
declare const chrome: any;

interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: '1', title: 'Notion', url: 'https://notion.so', icon: '📝' },
  { id: '2', title: 'Jira', url: 'https://jira.com', icon: '🎫' },
  { id: '3', title: 'Figma', url: 'https://figma.com', icon: '🎨' },
  { id: '4', title: 'GitHub', url: 'https://github.com', icon: '💻' }
];

export const BookmarksHub: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    chrome.storage.local.get('bookmarks').then((res: any) => {
      if (res.bookmarks) {
        setBookmarks(res.bookmarks);
      } else {
        setBookmarks(DEFAULT_BOOKMARKS);
        chrome.storage.local.set({ bookmarks: DEFAULT_BOOKMARKS });
      }
    });
  }, []);

  const handleAddBookmark = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      title: newTitle,
      url: newUrl,
      icon: '🔗'
    };
    const updated = [...bookmarks, newBookmark];
    setBookmarks(updated);
    chrome.storage.local.set({ bookmarks: updated });
    setNewTitle('');
    setNewUrl('');
  };

  const handleDeleteBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    chrome.storage.local.set({ bookmarks: updated });
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">辦公室傳送門</h1>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="text-gray-500 hover:text-gray-900"
        >
          {isEditing ? '完成編輯' : '編輯傳送門'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {bookmarks.map(bookmark => (
          <div key={bookmark.id} className="relative group">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow h-32"
            >
              <span className="text-3xl mb-3">{bookmark.icon || '🔗'}</span>
              <span className="font-medium text-gray-700">{bookmark.title}</span>
            </a>
            {isEditing && (
              <button
                onClick={() => handleDeleteBookmark(bookmark.id)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow hover:bg-red-600"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4">新增傳送門</h3>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="名稱 (例: Notion)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="url"
              placeholder="網址 (例: https://notion.so)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="flex-2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={handleAddBookmark}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              新增
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
