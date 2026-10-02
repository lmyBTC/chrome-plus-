import React, { useState, useEffect, useRef } from 'react';
import { StockWatchItem, FinanceSnapshotItem, ResearchChecklistItem } from './types';
import { financeClient } from './financeClient';
import { storage } from '../../core/chrome/storage';

declare const chrome: any;

export interface WatchListWidgetProps {
  isSidebar?: boolean;
}

const DEFAULT_CHECKLIST: ResearchChecklistItem[] = [
  { id: 'c1', text: '檢視最新一季財報營收與 EPS 表現', done: false },
  { id: 'c2', text: '驗證華爾街共識目標價與分析師觀點', done: false },
  { id: 'c3', text: '評估競爭優勢 (Moat) 與潛在下行風險', done: false },
  { id: 'c4', text: '撰寫投研核心總結與操作策略', done: false }
];

export const WatchListWidget: React.FC<WatchListWidgetProps> = ({ isSidebar = false }) => {
  // 資料狀態
  const [snapshots, setSnapshots] = useState<FinanceSnapshotItem[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'importer' | 'researchLogs'>('watchlist');

  // 連線狀態
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCrawling, setIsCrawling] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  // 匯入器狀態
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 番茄鐘計時聯動狀態
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);

  // 研究日誌
  const [researchLogs, setResearchLogs] = useState<any[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // 初始載入
  useEffect(() => {
    loadData();
    initTimerSync();
  }, []);

  const showStatus = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 載入本地快照
      const localSnapshots = await financeClient.getSnapshots();
      const logs = await financeClient.getResearchLogs();
      setResearchLogs(logs);

      // 檢查 FinanceClipper 連線
      const extId = await financeClient.getExtensionId();
      if (extId) {
        const pingOk = await financeClient.ping(extId);
        setIsConnected(pingOk);
        if (pingOk && localSnapshots.length === 0) {
          // 若本地無快照但有連線，自動嘗試同步遠端 Watchlist
          const res = await financeClient.getWatchlist();
          if (res.success && res.watchlist && res.watchlist.length > 0) {
            const mapped: FinanceSnapshotItem[] = res.watchlist.map((w: StockWatchItem) => ({
              id: `snap-${w.ticker}`,
              ticker: w.ticker,
              name: w.name,
              price: w.price,
              change: w.change,
              changePercent: w.changePercent,
              updatedAt: w.updatedAt || new Date().toLocaleString(),
              checklist: DEFAULT_CHECKLIST
            }));
            await financeClient.saveSnapshots(mapped);
            setSnapshots(mapped);
            if (mapped.length > 0) setSelectedTicker(mapped[0].ticker);
            setIsLoading(false);
            return;
          }
        }
      } else {
        setIsConnected(false);
      }

      setSnapshots(localSnapshots);
      if (localSnapshots.length > 0 && !selectedTicker) {
        setSelectedTicker(localSnapshots[0].ticker);
      }
    } catch (err) {
      console.warn('載入財務資料異常:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 監聽 Chrome Local Storage 之 activeTimer
  const initTimerSync = () => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;

    chrome.storage.local.get('activeTimer', (result: any) => {
      if (result?.activeTimer) {
        setActiveTimer(result.activeTimer);
      }
    });

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && changes.activeTimer) {
        setActiveTimer(changes.activeTimer.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  };

  // 實時秒數倒數
  useEffect(() => {
    let intervalId: any = null;
    if (activeTimer && activeTimer.state === 'running' && activeTimer.endTime) {
      const tick = () => {
        const diff = Math.max(0, Math.round((activeTimer.endTime - Date.now()) / 1000));
        setTimerRemaining(diff);
        if (diff <= 0) {
          clearInterval(intervalId);
        }
      };
      tick();
      intervalId = setInterval(tick, 1000);
    } else {
      setTimerRemaining(0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTimer]);

  // 當前選中的標的快照
  const currentSnapshot = snapshots.find(
    (s) => s.ticker.toUpperCase() === (selectedTicker || '').toUpperCase()
  ) || snapshots[0];

  // 處理匯入快照 JSON
  const handleImportJson = async (jsonText: string) => {
    if (!jsonText.trim()) {
      showStatus('請輸入或選擇包含快照的 JSON 內容', 'error');
      return;
    }
    setIsImporting(true);
    const result = financeClient.parseSnapshotJson(jsonText);
    if (!result.success || result.items.length === 0) {
      showStatus(result.error || '快照解析失敗', 'error');
      setIsImporting(false);
      return;
    }

    // 合併既有快照（相同代號進行覆蓋更新，保留使用者已勾選之 Checklist）
    const existingMap = new Map<string, FinanceSnapshotItem>();
    snapshots.forEach((s) => existingMap.set(s.ticker.toUpperCase(), s));

    result.items.forEach((item) => {
      const key = item.ticker.toUpperCase();
      if (existingMap.has(key)) {
        const prev = existingMap.get(key)!;
        existingMap.set(key, {
          ...prev,
          ...item,
          checklist: prev.checklist || item.checklist || DEFAULT_CHECKLIST
        });
      } else {
        existingMap.set(key, item);
      }
    });

    const updated = Array.from(existingMap.values());
    await financeClient.saveSnapshots(updated);
    setSnapshots(updated);
    setSelectedTicker(result.items[0].ticker);
    setRawJsonInput('');
    setIsImporting(false);
    setActiveTab('watchlist');
    showStatus(`成功匯入 ${result.items.length} 筆投研快照！`, 'success');
  };

  // 處理本機檔案選取
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleImportJson(content);
      }
    };
    reader.onerror = () => {
      showStatus('讀取檔案失敗', 'error');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 同步 FinanceClipper Watchlist
  const handleSyncFromClipper = async () => {
    setIsLoading(true);
    const res = await financeClient.getWatchlist();
    if (res.success && res.watchlist) {
      const existingMap = new Map<string, FinanceSnapshotItem>();
      snapshots.forEach((s) => existingMap.set(s.ticker.toUpperCase(), s));

      res.watchlist.forEach((w) => {
        const key = w.ticker.toUpperCase();
        if (existingMap.has(key)) {
          const prev = existingMap.get(key)!;
          existingMap.set(key, {
            ...prev,
            price: w.price,
            change: w.change,
            changePercent: w.changePercent,
            updatedAt: w.updatedAt || new Date().toLocaleString()
          });
        } else {
          existingMap.set(key, {
            id: `snap-${w.ticker}`,
            ticker: w.ticker,
            name: w.name,
            price: w.price,
            change: w.change,
            changePercent: w.changePercent,
            updatedAt: w.updatedAt || new Date().toLocaleString(),
            checklist: DEFAULT_CHECKLIST
          });
        }
      });

      const updated = Array.from(existingMap.values());
      await financeClient.saveSnapshots(updated);
      setSnapshots(updated);
      showStatus('已同步 FinanceClipper 最新自選行情', 'success');
    } else {
      showStatus(res.error || '無法同步 FinanceClipper', 'error');
    }
    setIsLoading(false);
  };

  // 刪除快照標的
  const handleDeleteSnapshot = async (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = snapshots.filter((s) => s.ticker.toUpperCase() !== ticker.toUpperCase());
    await financeClient.saveSnapshots(filtered);
    setSnapshots(filtered);
    if (selectedTicker?.toUpperCase() === ticker.toUpperCase()) {
      setSelectedTicker(filtered.length > 0 ? filtered[0].ticker : null);
    }
    showStatus(`已移除標的 [${ticker}]`, 'info');
  };

  // 勾選/切換 Checklist 項目
  const handleToggleChecklist = async (itemId: string) => {
    if (!currentSnapshot) return;
    const updatedChecklist = (currentSnapshot.checklist || DEFAULT_CHECKLIST).map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    const updatedSnapshot = { ...currentSnapshot, checklist: updatedChecklist };
    const updatedList = await financeClient.saveSnapshot(updatedSnapshot);
    setSnapshots(updatedList);
  };

  // 新增自訂 Checklist 項目
  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim() || !currentSnapshot) return;
    const newItem: ResearchChecklistItem = {
      id: `c-${Date.now()}`,
      text: newChecklistText.trim(),
      done: false
    };
    const updatedChecklist = [...(currentSnapshot.checklist || DEFAULT_CHECKLIST), newItem];
    const updatedSnapshot = { ...currentSnapshot, checklist: updatedChecklist };
    const updatedList = await financeClient.saveSnapshot(updatedSnapshot);
    setSnapshots(updatedList);
    setNewChecklistText('');
  };

  // 啟動 25m 研究番茄鐘衝刺
  const handleStartResearchSprint = async (targetTicker?: string) => {
    const item = targetTicker ? snapshots.find((s) => s.ticker === targetTicker) : currentSnapshot;
    if (!item) return;

    const ticker = item.ticker.toUpperCase();
    const missionTitle = `[${ticker}] 深度投研分析 (${item.name || ticker})`;
    const missionId = `mission-finance-${ticker}-${Date.now()}`;
    const durationMinutes = 25;
    const endTime = Date.now() + durationMinutes * 60 * 1000;

    try {
      // 1. 在 weeklyMissions 與 dailyLogs 建立任務
      const weeklyMissions = await storage.getWeeklyMissions();
      const todayLog = await storage.getTodayLog();
      const existingMission = weeklyMissions.find(
        (m) => m.ticker === ticker || m.text.includes(ticker)
      );

      let targetMissionId = missionId;
      if (existingMission) {
        targetMissionId = existingMission.id;
      } else {
        const newMission: any = {
          id: missionId,
          text: missionTitle,
          isCompleted: false,
          priority: 'P1',
          ticker: ticker,
          tags: ['#投資研究', `$${ticker}`],
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          progressPercent: 0
        };
        await storage.saveWeeklyMissions([...weeklyMissions, newMission]);
        todayLog.coreBattles.push({ missionId: newMission.id, committedTime: '投研衝刺' });
        await storage.saveTodayLog(todayLog);
      }

      // 2. 寫入 activeTimer 啟動衝刺
      const sprintData = {
        sprintId: `sprint-${Date.now()}`,
        missionId: targetMissionId,
        ticker: ticker,
        startTime: Date.now(),
        durationMinutes: durationMinutes
      };

      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({
          activeTimer: {
            state: 'running',
            endTime: endTime,
            sprint: sprintData,
            missionText: missionTitle
          }
        });

        // 3. 通知 background 鬧鐘與專注模式
        if (chrome.runtime?.sendMessage) {
          try {
            chrome.runtime.sendMessage({
              type: 'START_FOCUS_MODE',
              payload: {
                missionId: targetMissionId,
                missionText: missionTitle,
                duration: durationMinutes
              }
            });
          } catch (_) {}
        }
      }

      showStatus(`已為 [${ticker}] 啟動 25 分鐘投研番茄鐘！`, 'success');
    } catch (err: any) {
      showStatus(`啟動計時失敗: ${err?.message || '未知錯誤'}`, 'error');
    }
  };

  // 結算並產出專注紀錄
  const handleFinishResearchSprint = async () => {
    if (!currentSnapshot) return;
    const ticker = currentSnapshot.ticker.toUpperCase();
    const checklist = currentSnapshot.checklist || DEFAULT_CHECKLIST;
    const doneCount = checklist.filter((c) => c.done).length;
    const totalCount = checklist.length;
    const summaryText = `[${ticker}] 完成投研專注衝刺 (25 min)，Checklist 完成度 ${doneCount}/${totalCount}`;

    try {
      // 1. 記錄至 dailyLogs.sprintLogs
      const todayLog = await storage.getTodayLog();
      todayLog.sprintLogs.push({
        sprintId: activeTimer?.sprint?.sprintId || `sprint-${Date.now()}`,
        missionId: activeTimer?.sprint?.missionId || `mission-${ticker}`,
        startTime: activeTimer?.sprint?.startTime || Date.now() - 25 * 60 * 1000,
        endTime: Date.now(),
        result: summaryText
      });
      await storage.saveTodayLog(todayLog);

      // 2. 記錄至 financeClient 研究日誌
      const researchLogEntry = {
        id: `log-${Date.now()}`,
        ticker: ticker,
        title: summaryText,
        checklistDone: doneCount,
        checklistTotal: totalCount,
        timestamp: new Date().toLocaleString(),
        note: currentSnapshot.note || ''
      };
      await financeClient.saveResearchLog(researchLogEntry);
      const updatedLogs = await financeClient.getResearchLogs();
      setResearchLogs(updatedLogs);

      // 3. 更新當前標的快照中的最後研究資訊
      const updatedSnapshot: FinanceSnapshotItem = {
        ...currentSnapshot,
        lastResearchAt: new Date().toLocaleString(),
        lastResearchSummary: summaryText
      };
      const updatedList = await financeClient.saveSnapshot(updatedSnapshot);
      setSnapshots(updatedList);

      // 4. 重置 activeTimer
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({
          activeTimer: { state: 'idle', timeLeft: 0, sprint: null }
        });
        if (chrome.runtime?.sendMessage) {
          try {
            chrome.runtime.sendMessage({ type: 'STOP_FOCUS_MODE' });
          } catch (_) {}
        }
      }

      showStatus(`投研專注紀錄已產出並保存至日誌！`, 'success');
    } catch (err: any) {
      showStatus(`儲存日誌失敗: ${err?.message || '未知錯誤'}`, 'error');
    }
  };

  // 格式化秒數為 mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 快速爬取
  const handleQuickCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = newTicker.trim().toUpperCase();
    if (!ticker) return;

    setIsCrawling(true);
    showStatus(`正在爬取 [${ticker}]...`, 'info');
    const res = await financeClient.crawlStock(ticker);
    setIsCrawling(false);
    setNewTicker('');

    if (res.success) {
      showStatus(`[${ticker}] 採集成功！`, 'success');
      handleSyncFromClipper();
    } else {
      showStatus(`採集失敗: ${res.error || '請確認網路與代號'}`, 'error');
    }
  };

  // 判斷當前標的是否正在計時衝刺
  const isCurrentTickerRunning =
    activeTimer?.state === 'running' &&
    activeTimer?.sprint?.ticker?.toUpperCase() === currentSnapshot?.ticker?.toUpperCase();

  return (
    <div className={`flex flex-col h-full bg-dark-bg text-dark-primary select-none ${isSidebar ? 'p-2 space-y-2.5' : 'p-5 space-y-4 max-w-6xl mx-auto'}`}>
      {/* 頂部 Header & 導航 */}
      <div className="flex items-center justify-between pb-2.5 border-b border-dark-border-subtle bg-dark-card/40 px-3 py-2 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xl">📈</span>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold tracking-wide text-dark-primary">投研自選看板</h2>
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'}`}
                title={isConnected ? '已連線 FinanceClipper' : '離線自治模式 (支援快照匯入與番茄鐘)'}
              />
              <span className="text-[10px] text-dark-muted px-1.5 py-0.5 rounded bg-dark-hover">
                {snapshots.length} 檔標的
              </span>
            </div>
            {!isSidebar && (
              <p className="text-[11px] text-dark-muted">
                載入 Clipper 投研快照，展示共識目標價偏離程度，聯動深度專注衝刺
              </p>
            )}
          </div>
        </div>

        {/* 右側動作按鈕 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              activeTab === 'watchlist' ? 'bg-blue-600 text-white shadow-sm' : 'text-dark-muted hover:text-dark-primary hover:bg-dark-hover'
            }`}
          >
            📊 看板
          </button>
          <button
            onClick={() => setActiveTab('importer')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              activeTab === 'importer' ? 'bg-blue-600 text-white shadow-sm' : 'text-dark-muted hover:text-dark-primary hover:bg-dark-hover'
            }`}
          >
            📁 匯入快照
          </button>
          <button
            onClick={() => setActiveTab('researchLogs')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              activeTab === 'researchLogs' ? 'bg-blue-600 text-white shadow-sm' : 'text-dark-muted hover:text-dark-primary hover:bg-dark-hover'
            }`}
          >
            📝 專注日誌
          </button>
        </div>
      </div>

      {/* 狀態提示列 */}
      {statusMsg && (
        <div
          className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : statusMsg.type === 'error'
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-blue-950/40 border-blue-800 text-blue-300'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-dark-muted hover:text-white ml-2 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* 全域番茄鐘倒數橫幅 (若正在衝刺) */}
      {activeTimer?.state === 'running' && (
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-red-950/50 to-amber-950/40 border border-red-800/60 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="animate-pulse text-base">🍅</span>
            <div>
              <span className="font-bold text-red-300">
                {activeTimer?.sprint?.ticker ? `[${activeTimer.sprint.ticker}] 專注衝刺進行中` : '專注衝刺中'}
              </span>
              <span className="text-[10px] text-red-200/70 block truncate max-w-[200px]">
                {activeTimer.missionText || '投研深度分析'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-base font-bold text-red-400">
              {formatTime(timerRemaining)}
            </span>
            <button
              onClick={handleFinishResearchSprint}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-all shadow-sm"
              title="完成當次投研衝刺並結算成果"
            >
              結算紀錄
            </button>
          </div>
        </div>
      )}

      {/* 主視圖 1: 標的看板與深度研究聯動 */}
      {activeTab === 'watchlist' && (
        <div className={`flex-1 flex ${isSidebar ? 'flex-col gap-3 overflow-y-auto' : 'flex-row gap-4 overflow-hidden'}`}>
          {/* 左側 / 標的卡片列表 */}
          <div className={`flex flex-col ${isSidebar ? 'w-full' : 'w-5/12 border-r border-dark-border-subtle pr-4 overflow-y-auto'}`}>
            {/* 快速背景爬取與同步列 */}
            <div className="flex items-center gap-1.5 mb-3">
              <form onSubmit={handleQuickCrawl} className="flex-1 flex gap-1.5">
                <input
                  type="text"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  placeholder="輸入代號 (NVDA, TSLA)..."
                  className="flex-1 bg-dark-card border border-dark-border-subtle text-xs text-dark-primary px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 uppercase placeholder:normal-case placeholder:text-dark-muted"
                  disabled={isCrawling}
                />
                <button
                  type="submit"
                  disabled={isCrawling || !newTicker.trim()}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm shrink-0"
                  title="背景爬取標的"
                >
                  {isCrawling ? '⏳' : '抓取'}
                </button>
              </form>

              {isConnected && (
                <button
                  onClick={handleSyncFromClipper}
                  disabled={isLoading}
                  className="p-1.5 bg-dark-card hover:bg-dark-hover text-dark-muted hover:text-dark-primary border border-dark-border-subtle rounded-lg text-xs"
                  title="同步 Clipper 自選庫"
                >
                  🔄
                </button>
              )}
            </div>

            {/* 標的清單 */}
            {isLoading ? (
              <div className="p-6 text-center text-xs text-dark-muted">
                <span className="animate-spin mr-2">🔄</span> 載入標的快照中...
              </div>
            ) : snapshots.length === 0 ? (
              <div className="p-6 text-center bg-dark-card/40 border border-dashed border-dark-border-subtle rounded-xl">
                <p className="text-xs text-dark-muted mb-2">尚無投研標的或快照</p>
                <button
                  onClick={() => setActiveTab('importer')}
                  className="px-3 py-1.5 bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs hover:bg-blue-600/40 transition-colors"
                >
                  📁 匯入 Clipper 快照 JSON
                </button>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-1">
                {snapshots.map((item) => {
                  const isSelected = (selectedTicker || '').toUpperCase() === item.ticker.toUpperCase();
                  const upside = item.targetStats?.upsidePercent;
                  const isPositiveUpside = upside !== undefined && upside > 0;
                  const isNegativeUpside = upside !== undefined && upside < 0;

                  return (
                    <div
                      key={item.ticker}
                      onClick={() => setSelectedTicker(item.ticker)}
                      className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950/30 border-blue-500/70 shadow-md shadow-blue-950/50'
                          : 'bg-dark-card hover:bg-dark-hover border-dark-border-subtle'
                      }`}
                    >
                      {/* 上半部：代號、名稱、現價 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-sm text-dark-primary group-hover:text-blue-400">
                            {item.ticker}
                          </span>
                          {item.name && item.name !== item.ticker && (
                            <span className="text-[11px] text-dark-muted truncate max-w-[110px]">
                              {item.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-dark-primary">
                            {item.price || '--'}
                          </span>
                          <button
                            onClick={(e) => handleDeleteSnapshot(item.ticker, e)}
                            className="opacity-0 group-hover:opacity-100 text-dark-muted hover:text-rose-400 text-xs transition-opacity px-1"
                            title="刪除此標的"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* 中半部：目標價與偏離程度展示 (SSOT 要求) */}
                      <div className="mt-2 pt-2 border-t border-dark-border-subtle/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-[11px] text-dark-muted">
                          <span>目標價:</span>
                          <span className="font-semibold text-dark-secondary">
                            {item.targetStats?.median
                              ? `$${item.targetStats.median}`
                              : item.analyst?.targetMedian
                              ? `$${item.analyst.targetMedian}`
                              : '--'}
                          </span>
                        </div>

                        {/* 偏離程度 (Upside %) Badge */}
                        {upside !== undefined ? (
                          <div
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              isPositiveUpside
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                : isNegativeUpside
                                ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <span>{isPositiveUpside ? '▲' : isNegativeUpside ? '▼' : '●'}</span>
                            <span>{upside > 0 ? `+${upside}%` : `${upside}%`}</span>
                            <span className="font-normal opacity-80">空間</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-dark-muted">無目標價</span>
                        )}
                      </div>

                      {/* 視覺化偏離條 (Deviation Progress Bar) */}
                      {upside !== undefined && (
                        <div className="mt-1.5 w-full bg-dark-surface rounded-full h-1.5 overflow-hidden flex">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isPositiveUpside ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                            style={{
                              width: `${Math.min(Math.max(Math.abs(upside), 10), 100)}%`
                            }}
                          />
                        </div>
                      )}

                      {/* 快捷研究與評等標籤 */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-dark-muted">
                        <div className="flex items-center gap-1">
                          {item.analyst?.consensus && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                              {item.analyst.consensus}
                            </span>
                          )}
                          {item.targetStats?.cv !== undefined && (
                            <span className="px-1 py-0.2 rounded bg-dark-surface text-dark-muted" title="共識離散係數 (CV)">
                              CV: {item.targetStats.cv}%
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicker(item.ticker);
                            handleStartResearchSprint(item.ticker);
                          }}
                          className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 transition-colors flex items-center gap-1"
                        >
                          <span>🍅</span>
                          <span>開始研究</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右側 / 深度研究番茄鐘聯動面板 */}
          {currentSnapshot ? (
            <div className={`flex flex-col bg-dark-card/50 border border-dark-border-subtle rounded-xl p-4 overflow-y-auto ${isSidebar ? 'w-full' : 'flex-1'}`}>
              {/* 標的焦點頂部 */}
              <div className="flex items-start justify-between pb-3 border-b border-dark-border-subtle">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-dark-primary">
                      {currentSnapshot.ticker}
                    </h3>
                    <span className="text-xs text-dark-muted">{currentSnapshot.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-dark-muted">
                      現價: <strong className="text-dark-primary">{currentSnapshot.price || '--'}</strong>
                    </span>
                    <span className="text-dark-muted">
                      共識目標價:{' '}
                      <strong className="text-dark-primary">
                        {currentSnapshot.targetStats?.median
                          ? `$${currentSnapshot.targetStats.median}`
                          : currentSnapshot.analyst?.targetMedian
                          ? `$${currentSnapshot.analyst.targetMedian}`
                          : '--'}
                      </strong>
                    </span>
                    {currentSnapshot.targetStats?.upsidePercent !== undefined && (
                      <span
                        className={`font-semibold ${
                          currentSnapshot.targetStats.upsidePercent >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        偏離空間:{' '}
                        {currentSnapshot.targetStats.upsidePercent > 0
                          ? `+${currentSnapshot.targetStats.upsidePercent}%`
                          : `${currentSnapshot.targetStats.upsidePercent}%`}
                      </span>
                    )}
                  </div>
                </div>

                {/* 啟動 / 結算番茄鐘按鈕 */}
                <div>
                  {isCurrentTickerRunning ? (
                    <button
                      onClick={handleFinishResearchSprint}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-emerald-950 flex items-center gap-1.5"
                    >
                      <span>✅</span>
                      <span>結算成果 ({formatTime(timerRemaining)})</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartResearchSprint()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-blue-950 flex items-center gap-1.5"
                    >
                      <span>🍅</span>
                      <span>啟動 25m 研究番茄鐘</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 深度投研清單 (Checklist) */}
              <div className="mt-4 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-dark-primary flex items-center gap-1.5">
                    <span>📋</span>
                    <span>深度投研審查清單 (Checklist)</span>
                  </h4>
                  <span className="text-[11px] text-dark-muted">
                    完成度:{' '}
                    {(currentSnapshot.checklist || DEFAULT_CHECKLIST).filter((c) => c.done).length} /{' '}
                    {(currentSnapshot.checklist || DEFAULT_CHECKLIST).length}
                  </span>
                </div>

                {/* Checklist 項目 */}
                <div className="space-y-1.5">
                  {(currentSnapshot.checklist || DEFAULT_CHECKLIST).map((chk) => (
                    <label
                      key={chk.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border transition-all cursor-pointer text-xs ${
                        chk.done
                          ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                          : 'bg-dark-surface/60 hover:bg-dark-surface border-dark-border-subtle text-dark-secondary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={chk.done}
                        onChange={() => handleToggleChecklist(chk.id)}
                        className="mt-0.5 rounded border-dark-border-default text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <span className={`leading-relaxed ${chk.done ? 'line-through opacity-70' : ''}`}>
                        {chk.text}
                      </span>
                    </label>
                  ))}
                </div>

                {/* 新增客製研究項目 */}
                <form onSubmit={handleAddChecklist} className="mt-2.5 flex gap-1.5">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="新增自訂研究檢驗項目..."
                    className="flex-1 bg-dark-surface border border-dark-border-subtle text-xs text-dark-primary px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newChecklistText.trim()}
                    className="px-2.5 py-1.5 bg-dark-card hover:bg-dark-hover disabled:opacity-50 text-xs text-dark-primary border border-dark-border-subtle rounded-lg transition-colors"
                  >
                    + 新增
                  </button>
                </form>
              </div>

              {/* 上次研究紀錄 */}
              {currentSnapshot.lastResearchAt && (
                <div className="mt-4 p-2.5 bg-dark-surface/40 border border-dark-border-subtle rounded-lg text-xs">
                  <div className="flex items-center justify-between text-dark-muted mb-1 text-[10px]">
                    <span>最近專注研究紀錄</span>
                    <span>{currentSnapshot.lastResearchAt}</span>
                  </div>
                  <p className="text-dark-secondary text-[11px] leading-relaxed">
                    {currentSnapshot.lastResearchSummary || '已完成專注分析'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-xs text-dark-muted">
              請從左側點選標的開始深度研究
            </div>
          )}
        </div>
      )}

      {/* 主視圖 2: 快照載入器 (Snapshot Importer) */}
      {activeTab === 'importer' && (
        <div className="flex-1 flex flex-col bg-dark-card/50 border border-dark-border-subtle rounded-xl p-4 overflow-y-auto space-y-4">
          <div>
            <h3 className="text-sm font-bold text-dark-primary flex items-center gap-1.5">
              <span>📁</span>
              <span>Clipper 快照 JSON 載入器</span>
            </h3>
            <p className="text-xs text-dark-muted mt-1 leading-relaxed">
              支援載入由 FinanceClipper 匯出或 0.doc_mg 管線生成的標準 JSON 快照檔。系統會自動驗證 Schema、提取華爾街目標價並即時計算偏離空間。
            </p>
          </div>

          {/* 檔案上傳按鈕 */}
          <div className="p-4 border-2 border-dashed border-dark-border-default hover:border-blue-500/60 rounded-xl text-center transition-all bg-dark-surface/30">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all inline-flex items-center gap-2"
            >
              <span>📂</span>
              <span>選擇快照 JSON 檔案</span>
            </button>
            <p className="text-[11px] text-dark-muted mt-2">支援單檔快照或多標的批次快照 JSON</p>
          </div>

          {/* 直接貼上 JSON 文本 */}
          <div className="flex-1 flex flex-col space-y-2">
            <label className="text-xs font-semibold text-dark-secondary">
              或直接貼上 JSON 內容：
            </label>
            <textarea
              value={rawJsonInput}
              onChange={(e) => setRawJsonInput(e.target.value)}
              placeholder={`{\n  "ticker": "NVDA",\n  "name": "NVIDIA",\n  "price": "$120.50",\n  "analyst": {\n    "consensus": "Strong Buy",\n    "targetMedian": 160.0\n  }\n}`}
              className="flex-1 min-h-[160px] bg-dark-surface border border-dark-border-subtle rounded-lg p-3 text-xs font-mono text-dark-primary focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRawJsonInput('')}
                className="px-3 py-1.5 text-xs text-dark-muted hover:text-dark-primary bg-dark-card rounded-lg transition-colors"
              >
                清空
              </button>
              <button
                type="button"
                disabled={isImporting || !rawJsonInput.trim()}
                onClick={() => handleImportJson(rawJsonInput)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                {isImporting ? '解析中...' : '確認載入快照'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主視圖 3: 專注日誌歷史 (Research Logs) */}
      {activeTab === 'researchLogs' && (
        <div className="flex-1 flex flex-col bg-dark-card/50 border border-dark-border-subtle rounded-xl p-4 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-dark-border-subtle">
            <h3 className="text-sm font-bold text-dark-primary flex items-center gap-1.5">
              <span>📝</span>
              <span>投研專注紀錄歷史</span>
            </h3>
            <span className="text-xs text-dark-muted">共 {researchLogs.length} 筆衝刺紀錄</span>
          </div>

          {researchLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-dark-muted">
              尚無投研專注日誌。在看板點擊「啟動 25m 研究番茄鐘」並於結束時結算即可產生日誌！
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto">
              {researchLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-dark-surface/60 border border-dark-border-subtle rounded-lg text-xs"
                >
                  <div className="flex items-center justify-between text-dark-muted mb-1 text-[10px]">
                    <span className="font-bold text-blue-400">[{log.ticker}]</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="text-dark-primary font-medium">{log.title}</p>
                  {log.checklistTotal !== undefined && (
                    <div className="mt-1 text-[11px] text-emerald-400">
                      Checklist 完成率: {log.checklistDone} / {log.checklistTotal} 項
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

