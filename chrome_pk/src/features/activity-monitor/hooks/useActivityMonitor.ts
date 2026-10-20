import { useState, useEffect, useRef, useCallback } from 'react';
import { ActivityLog, ActivityCategory, OriginAuditSettings } from '../types';

export interface UseActivityMonitorReturn {
  isConnected: boolean;
  isMonitoring: boolean;
  logs: ActivityLog[];
  currentTab: { id: number | null; url: string; origin: string } | null;
  originSettings: OriginAuditSettings;
  isInspectorActive: boolean;
  isAuditing: boolean;
  isInjecting: boolean;
  filterCategory: ActivityCategory | 'all';
  searchQuery: string;
  autoScroll: boolean;
  counts: { all: number; probe: number; network: number; download: number };
  filteredLogs: ActivityLog[];
  setFilterCategory: (category: ActivityCategory | 'all') => void;
  setSearchQuery: (query: string) => void;
  setAutoScroll: (auto: boolean) => void;
  toggleMonitoring: (enabled?: boolean) => Promise<void>;
  refreshCurrentTab: () => Promise<void>;
  auditCurrentOrigin: (targetOrigin?: string) => Promise<void>;
  injectInspector: () => Promise<boolean>;
  clearLogs: () => Promise<void>;
  exportLogsJson: () => void;
}

const MAX_LOGS = 500;

export function useActivityMonitor(): UseActivityMonitorReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [currentTab, setCurrentTab] = useState<{ id: number | null; url: string; origin: string } | null>(null);
  const [originSettings, setOriginSettings] = useState<OriginAuditSettings>({});
  const [isInspectorActive, setIsInspectorActive] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<ActivityCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const portRef = useRef<chrome.runtime.Port | null>(null);
  const currentTabRef = useRef<{ id: number | null; url: string; origin: string } | null>(null);

  // 同步 ref
  useEffect(() => {
    currentTabRef.current = currentTab;
  }, [currentTab]);

  // 1. 取得當前活躍分頁資訊
  const refreshCurrentTab = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      setCurrentTab({ id: null, url: 'https://example.com', origin: 'https://example.com' });
      return;
    }

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        const tab = tabs[0];
        let origin = 'unknown';
        try {
          if (tab.url && tab.url.startsWith('http')) {
            origin = new URL(tab.url).origin;
          } else {
            origin = tab.url || 'unknown';
          }
        } catch {
          origin = tab.url || 'unknown';
        }

        const tabInfo = {
          id: tab.id ?? null,
          url: tab.url || '',
          origin
        };
        setCurrentTab(tabInfo);

        // 自動檢查該分頁探針狀態與審核權限
        if (tab.id && portRef.current) {
          portRef.current.postMessage({ type: 'CHECK_INSPECTOR_STATUS', tabId: tab.id });
        }
        if (origin.startsWith('http')) {
          auditCurrentOrigin(origin);
        }
      }
    } catch (err) {
      console.warn('[ActivityMonitor] 查詢當前分頁失敗:', err);
    }
  }, []);

  // 2. 審查指定 Origin 原生權限
  const auditCurrentOrigin = useCallback(async (targetOrigin?: string) => {
    const originToQuery = targetOrigin || currentTabRef.current?.origin;
    if (!originToQuery || !originToQuery.startsWith('http')) return;

    setIsAuditing(true);
    if (portRef.current) {
      portRef.current.postMessage({ type: 'AUDIT_ORIGIN', origin: originToQuery });
    } else if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const res = await chrome.runtime.sendMessage({ type: 'AUDIT_ORIGIN_QUERY', origin: originToQuery });
        if (res && res.settings) {
          setOriginSettings(res.settings);
        }
      } catch (err) {
        console.warn('[ActivityMonitor] 審核權限失敗:', err);
      } finally {
        setIsAuditing(false);
      }
    }
  }, []);

  // 3. 隨選注入深入動態探針
  const injectInspector = useCallback(async (): Promise<boolean> => {
    const tabId = currentTabRef.current?.id;
    if (!tabId) {
      alert('未偵測到有效的分頁 ID，無法注入探針');
      return false;
    }

    setIsInjecting(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const res = await chrome.runtime.sendMessage({ type: 'INJECT_INSPECTOR', tabId });
        if (res && res.success) {
          setIsInspectorActive(true);
          return true;
        } else {
          alert(`探針注入失敗: ${res?.error || '未知錯誤'}`);
          return false;
        }
      }
      return false;
    } catch (err: any) {
      alert(`探針注入失敗: ${err?.message || '未知錯誤'}`);
      return false;
    } finally {
      setIsInjecting(false);
    }
  }, []);

  // 4. 清除日誌
  const clearLogs = useCallback(async () => {
    setLogs([]);
    if (portRef.current) {
      portRef.current.postMessage({ type: 'CLEAR_ALL_LOGS' });
    } else if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({ type: 'CLEAR_ACTIVITY_LOGS' });
      } catch (err) {
        console.warn('[ActivityMonitor] 清除日誌失敗:', err);
      }
    }
  }, []);

  // 5. 切換監控啟用狀態
  const toggleMonitoring = useCallback(async (enabled?: boolean) => {
    const nextState = enabled !== undefined ? enabled : !isMonitoring;
    setIsMonitoring(nextState);
    if (portRef.current) {
      portRef.current.postMessage({ type: 'SET_MONITOR_STATUS', enabled: nextState });
    } else if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({ type: 'SET_MONITOR_STATUS', enabled: nextState });
      } catch (err) {
        console.warn('[ActivityMonitor] 設定監控狀態失敗:', err);
      }
    }
  }, [isMonitoring]);

  // 6. 匯出日誌 JSON
  const exportLogsJson = useCallback(() => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `activity_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('[ActivityMonitor] 匯出 JSON 失敗:', err);
    }
  }, [logs]);

  // 7. 長連接生命週期與訊息分派
  useEffect(() => {
    let reconnectTimeout: any = null;
    let isSubscribed = true;

    const connect = () => {
      if (typeof chrome === 'undefined' || !chrome.runtime?.connect) {
        setIsConnected(false);
        return;
      }

      try {
        const port = chrome.runtime.connect({ name: 'monitor-stream' });
        portRef.current = port;
        setIsConnected(true);

        port.onMessage.addListener((msg) => {
          if (!isSubscribed || !msg || typeof msg !== 'object') return;

          switch (msg.type) {
            case 'ACTIVITY_LOG':
              if (msg.log) {
                setLogs((prev) => [msg.log, ...prev].slice(0, MAX_LOGS));
              }
              break;

            case 'RECENT_LOGS_RESULT':
              if (Array.isArray(msg.logs)) {
                setLogs(msg.logs.slice(0, MAX_LOGS));
              }
              break;

            case 'AUDIT_RESULT':
              if (msg.settings) {
                setOriginSettings(msg.settings);
              }
              setIsAuditing(false);
              break;

            case 'INSPECTOR_STATUS_RESULT':
              if (currentTabRef.current?.id === msg.tabId) {
                setIsInspectorActive(Boolean(msg.active));
              }
              break;

            case 'INSPECTOR_STATUS_CHANGED':
              if (currentTabRef.current?.id === msg.tabId) {
                setIsInspectorActive(Boolean(msg.active));
              }
              break;

            case 'MONITOR_STATUS_RESULT':
            case 'MONITORING_STATUS_CHANGED':
              if (typeof msg.enabled === 'boolean') {
                setIsMonitoring(msg.enabled);
              }
              break;

            case 'ALL_LOGS_CLEARED':
              setLogs([]);
              break;
          }
        });

        port.onDisconnect.addListener(() => {
          portRef.current = null;
          if (isSubscribed) {
            setIsConnected(false);
            reconnectTimeout = setTimeout(connect, 2000);
          }
        });

        // 連接建立後，拉取狀態與近期日誌
        port.postMessage({ type: 'GET_MONITOR_STATUS' });
        port.postMessage({ type: 'GET_RECENT_LOGS', limit: 100 });
      } catch (err) {
        console.warn('[ActivityMonitor] 連接 background 失敗，2秒後重試:', err);
        setIsConnected(false);
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connect, 2000);
        }
      }
    };

    connect();
    refreshCurrentTab();

    // 監聽分頁切換事件
    const handleTabActivated = () => {
      refreshCurrentTab();
    };

    if (typeof chrome !== 'undefined' && chrome.tabs?.onActivated) {
      chrome.tabs.onActivated.addListener(handleTabActivated);
    }

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (portRef.current) {
        try {
          portRef.current.disconnect();
        } catch {
          // ignore
        }
        portRef.current = null;
      }
      if (typeof chrome !== 'undefined' && chrome.tabs?.onActivated) {
        chrome.tabs.onActivated.removeListener(handleTabActivated);
      }
    };
  }, [refreshCurrentTab]);

  // 8. 計算統計計數
  const counts = {
    all: logs.length,
    probe: logs.filter((l) => l.category === 'probe').length,
    network: logs.filter((l) => l.category === 'network').length,
    download: logs.filter((l) => l.category === 'download').length
  };

  // 9. 計算過濾後日誌列表
  const filteredLogs = logs.filter((log) => {
    if (filterCategory !== 'all' && log.category !== filterCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUrl = log.url?.toLowerCase().includes(q);
      const matchDomain = log.domain?.toLowerCase().includes(q);
      const matchApi = log.api?.toLowerCase().includes(q);
      const matchFilename = log.filename?.toLowerCase().includes(q);
      const matchMethod = log.method?.toLowerCase().includes(q);
      return Boolean(matchUrl || matchDomain || matchApi || matchFilename || matchMethod);
    }
    return true;
  });

  return {
    isConnected,
    isMonitoring,
    logs,
    currentTab,
    originSettings,
    isInspectorActive,
    isAuditing,
    isInjecting,
    filterCategory,
    searchQuery,
    autoScroll,
    counts,
    filteredLogs,
    setFilterCategory,
    setSearchQuery,
    setAutoScroll,
    toggleMonitoring,
    refreshCurrentTab,
    auditCurrentOrigin,
    injectInspector,
    clearLogs,
    exportLogsJson
  };
}
