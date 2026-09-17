import React, { useState, useEffect } from 'react';
import { StockWatchItem } from './types';
import { financeClient } from './financeClient';

export const WatchListWidget: React.FC = () => {
  const [watchlist, setWatchlist] = useState<StockWatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCrawling, setIsCrawling] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [extId, setExtId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configInputId, setConfigInputId] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setIsLoading(true);
    const id = await financeClient.getExtensionId();
    setExtId(id);
    setConfigInputId(id);

    if (id) {
      const pingOk = await financeClient.ping(id);
      setIsConnected(pingOk);
      if (pingOk) {
        const res = await financeClient.getWatchlist();
        if (res.success) {
          setWatchlist(res.watchlist);
        }
      }
    } else {
      setIsConnected(false);
    }
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    const res = await financeClient.getWatchlist();
    if (res.success) {
      setWatchlist(res.watchlist);
      setStatusMsg('已更新標的數據');
    } else {
      setStatusMsg(res.error || '更新失敗');
    }
    setIsLoading(false);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleOpenDashboard = (ticker?: string) => {
    financeClient.openDashboard(ticker);
  };

  const handleSaveExtId = async () => {
    if (!configInputId.trim()) return;
    setIsLoading(true);
    const testPing = await financeClient.ping(configInputId.trim());
    if (testPing) {
      await financeClient.setExtensionId(configInputId.trim());
      setExtId(configInputId.trim());
      setIsConnected(true);
      setShowConfigModal(false);
      setStatusMsg('連線成功！');
      const res = await financeClient.getWatchlist();
      if (res.success) setWatchlist(res.watchlist);
    } else {
      setStatusMsg('連線失敗：請確認 Extension ID 正確且 FinanceClipper 已載入');
    }
    setIsLoading(false);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleQuickCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) return;

    if (!isConnected) {
      setShowConfigModal(true);
      return;
    }

    setIsCrawling(true);
    setStatusMsg(`背景採集中 [${ticker}]...`);
    const res = await financeClient.crawlStock(ticker);
    setIsCrawling(false);
    setNewTicker('');

    if (res.success) {
      setStatusMsg(`[${ticker}] 採集成功！`);
      handleRefresh();
    } else {
      setStatusMsg(`採集失敗: ${res.error || '請確認網路與代號'}`);
    }
    setTimeout(() => setStatusMsg(null), 4000);
  };

  return (
    <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-5 shadow-lg shadow-slate-950/20 flex flex-col h-full">
      {/* 標題與操作欄 */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-border-subtle mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📈</span>
          <div>
            <h3 className="text-base font-bold text-dark-primary flex items-center gap-2">
              財務自選監控
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'
                }`}
                title={isConnected ? '已連線至 FinanceClipper' : '未連線或未設定 Extension ID'}
              />
            </h3>
            <span className="text-xs text-dark-muted">與 Finance Research Clipper 即時聯動</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenDashboard()}
            className="text-xs px-2.5 py-1.5 bg-dark-surface hover:bg-dark-hover text-dark-primary border border-dark-border-default rounded-md transition-colors flex items-center gap-1"
            title="開啟 FinanceClipper 獨立大螢幕儀表板"
          >
            <span>🖥️</span> 儀表板
          </button>
          <button
            onClick={() => setShowConfigModal(true)}
            className="text-xs p-1.5 text-dark-muted hover:text-dark-primary hover:bg-dark-surface rounded-md transition-colors"
            title="設定插件連線 ID"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* 狀態提示 */}
      {statusMsg && (
        <div className="mb-3 px-3 py-1.5 text-xs bg-dark-surface border border-dark-border-default text-dark-primary rounded-md animate-fade-in flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-dark-muted hover:text-dark-primary ml-2">✕</button>
        </div>
      )}

      {/* 快速背景爬取輸入框 */}
      <form onSubmit={handleQuickCrawl} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value)}
          placeholder="輸入代號背景爬取 (如: NVDA, TSLA)..."
          className="flex-1 bg-dark-surface border border-dark-border-default text-xs text-dark-primary px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 uppercase placeholder:normal-case placeholder:text-dark-muted"
          disabled={isCrawling}
        />
        <button
          type="submit"
          disabled={isCrawling || !newTicker.trim()}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm"
        >
          {isCrawling ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <span>🚀 抓取</span>
          )}
        </button>
      </form>

      {/* 標的清單 */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px] max-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-xs text-dark-muted">
            <span className="animate-spin mr-2">🔄</span> 讀取標的庫中...
          </div>
        ) : !isConnected ? (
          <div className="p-4 text-center bg-dark-surface/50 border border-dashed border-dark-border-default rounded-lg">
            <p className="text-xs text-dark-muted mb-2">尚未連接 FinanceClipper 擴充功能</p>
            <button
              onClick={() => setShowConfigModal(true)}
              className="text-xs px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-600/30 transition-colors"
            >
              點此設定連線 ID
            </button>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="p-4 text-center text-xs text-dark-muted">
            目前自選庫無標的，請在上方輸入代號直接爬取！
          </div>
        ) : (
          watchlist.map((item) => {
            const isNegative = item.change?.startsWith('-') || item.changePercent?.startsWith('-');
            return (
              <div
                key={item.ticker}
                onClick={() => handleOpenDashboard(item.ticker)}
                className="group flex items-center justify-between p-2.5 bg-dark-surface hover:bg-dark-hover border border-dark-border-default hover:border-blue-500/50 rounded-lg cursor-pointer transition-all"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-dark-primary group-hover:text-blue-400 transition-colors">
                      {item.ticker}
                    </span>
                    {item.name && item.name !== item.ticker && (
                      <span className="text-xs text-dark-muted truncate max-w-[120px]">
                        {item.name}
                      </span>
                    )}
                  </div>
                  {item.updatedAt && (
                    <span className="text-[10px] text-dark-muted block">
                      {item.updatedAt}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold text-dark-primary">
                    {item.price || '--'}
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      isNegative ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {item.changePercent || item.change || ''}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 連線設定 Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-5 max-w-md w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-dark-border-subtle mb-4">
              <h4 className="text-sm font-bold text-dark-primary flex items-center gap-2">
                <span>⚙️</span> 配置 FinanceClipper 連線
              </h4>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-dark-muted hover:text-dark-primary text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-dark-secondary mb-3 leading-relaxed">
              請輸入 Chrome 擴充功能管理頁面 (<code>chrome://extensions</code>) 中 <br />
              <strong>Finance Research Clipper</strong> 的 ID（32 位字母字串）。
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs text-dark-muted font-medium block">
                FinanceClipper Extension ID:
              </label>
              <input
                type="text"
                value={configInputId}
                onChange={(e) => setConfigInputId(e.target.value)}
                placeholder="例如: kjflkdsjflkasjdfkljasdflkjas"
                className="w-full bg-dark-surface border border-dark-border-default text-xs text-dark-primary px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-3 py-1.5 text-xs text-dark-muted hover:text-dark-primary bg-dark-surface rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveExtId}
                disabled={isLoading || !configInputId.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1"
              >
                {isLoading ? '測試中...' : '儲存並測試連線'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
