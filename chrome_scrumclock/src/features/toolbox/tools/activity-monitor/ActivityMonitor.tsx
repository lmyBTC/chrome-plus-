import React, { useState, useEffect } from 'react';
import { PermissionItem, ActivityAuditLog } from './types';

const INITIAL_PERMISSIONS: PermissionItem[] = [
  { id: 'camera', name: '攝影機 (Camera)', icon: '📹', status: 'prompt', description: '網頁存取視訊攝影機裝置' },
  { id: 'microphone', name: '麥克風 (Microphone)', icon: '🎙️', status: 'prompt', description: '網頁存取音訊收音設備' },
  { id: 'geolocation', name: '地理位置 (Geolocation)', icon: '📍', status: 'prompt', description: '獲取精確經緯度與地理位置' },
  { id: 'notifications', name: '桌面通知 (Notifications)', icon: '🔔', status: 'prompt', description: '推送瀏覽器桌面橫幅通知' },
  { id: 'clipboard-read', name: '剪貼簿讀取 (Clipboard)', icon: '📋', status: 'prompt', description: '網頁讀取系統剪貼簿內容' }
];

const INITIAL_MOCK_LOGS: ActivityAuditLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toLocaleTimeString(),
    source: '網頁分頁',
    sourceType: 'page',
    domain: 'meet.google.com',
    targetUrl: 'https://meet.google.com/abc-defg-hij',
    api: 'navigator.mediaDevices.getUserMedia',
    riskLevel: 'high',
    detail: '請求存取音訊與視訊串流 (video: true, audio: true)'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toLocaleTimeString(),
    source: '擴充套件',
    sourceType: 'extension',
    domain: 'chrome-extension://ai-assistant',
    targetUrl: 'chrome-extension://ai-assistant/content.js',
    api: 'navigator.clipboard.readText',
    riskLevel: 'medium',
    detail: '嘗試讀取系統剪貼簿文字內容'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toLocaleTimeString(),
    source: '網頁分頁',
    sourceType: 'page',
    domain: 'maps.google.com',
    targetUrl: 'https://maps.google.com/',
    api: 'navigator.geolocation.getCurrentPosition',
    riskLevel: 'high',
    detail: '查詢裝置當前地理位置座標'
  }
];

export interface ActivityMonitorProps {
  isSidebar?: boolean;
}

export const ActivityMonitor: React.FC<ActivityMonitorProps> = ({ isSidebar = false }) => {
  const [currentUrl, setCurrentUrl] = useState<string>('https://example.com');
  const [currentOrigin, setCurrentOrigin] = useState<string>('example.com');
  const [permissions, setPermissions] = useState<PermissionItem[]>(INITIAL_PERMISSIONS);
  const [logs, setLogs] = useState<ActivityAuditLog[]>(INITIAL_MOCK_LOGS);
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [standaloneConnected, setStandaloneConnected] = useState<boolean>(false);

  // 檢查當前活躍分頁資訊與權限
  const inspectCurrentTab = async () => {
    setIsScanning(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if (tabs && tabs[0] && tabs[0].url) {
            try {
              const urlObj = new URL(tabs[0].url);
              setCurrentUrl(tabs[0].url);
              setCurrentOrigin(urlObj.origin);
            } catch {
              setCurrentUrl(tabs[0].url);
              setCurrentOrigin(tabs[0].url);
            }
          }
        });
      }

      // 嘗試透過 Permissions API 檢查權限 (寬容處理不支援的 API)
      if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
        const updated = await Promise.all(
          INITIAL_PERMISSIONS.map(async (perm) => {
            try {
              // Note: permission names in W3C spec
              const permName = perm.id === 'clipboard-read' 
                ? ('clipboard-read' as PermissionName)
                : (perm.id as PermissionName);
              const result = await navigator.permissions.query({ name: permName });
              return {
                ...perm,
                status: (result.state as 'granted' | 'denied' | 'prompt') || 'prompt'
              };
            } catch {
              return perm;
            }
          })
        );
        setPermissions(updated);
      }
    } catch {
      // 容錯降級處理
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 400);
    }
  };

  useEffect(() => {
    inspectCurrentTab();

    // 探測獨立擴充套件通訊通道 (防腐防禦性檢查)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        // 嘗試發送 ping 測試是否在 BAM 環境或外部通訊中
        chrome.runtime.sendMessage({ action: 'BAM_PING' }, (response) => {
          if (!chrome.runtime.lastError && response?.status === 'ok') {
            setStandaloneConnected(true);
          }
        });
      } catch {
        setStandaloneConnected(false);
      }
    }
  }, []);

  // 模擬觸發 API 監聽測試
  const triggerSimulation = (apiType: 'media' | 'clipboard' | 'geo') => {
    const timestamp = new Date().toLocaleTimeString();
    let newLog: ActivityAuditLog;

    // 解析當前 origin 取得乾淨 domain
    let activeDomain = currentOrigin;
    try {
      if (currentOrigin.startsWith('http')) {
        activeDomain = new URL(currentOrigin).hostname;
      }
    } catch {
      activeDomain = currentOrigin;
    }

    if (apiType === 'media') {
      newLog = {
        id: `log-${Date.now()}`,
        timestamp,
        source: '模擬測試',
        sourceType: 'mock',
        domain: activeDomain || 'mock-env.local',
        targetUrl: currentUrl || 'https://mock-env.local/video-call',
        api: 'navigator.mediaDevices.getUserMedia',
        riskLevel: 'high',
        detail: `攔截到音訊/視訊裝置呼叫 (video: true, audio: true)`
      };
    } else if (apiType === 'clipboard') {
      newLog = {
        id: `log-${Date.now()}`,
        timestamp,
        source: '模擬測試',
        sourceType: 'mock',
        domain: activeDomain || 'mock-env.local',
        targetUrl: currentUrl || 'https://mock-env.local/clipboard',
        api: 'navigator.clipboard.readText',
        riskLevel: 'medium',
        detail: '攔截到系統剪貼簿讀取請求'
      };
    } else {
      newLog = {
        id: `log-${Date.now()}`,
        timestamp,
        source: '模擬測試',
        sourceType: 'mock',
        domain: activeDomain || 'mock-env.local',
        targetUrl: currentUrl || 'https://mock-env.local/geo',
        api: 'navigator.geolocation.getCurrentPosition',
        riskLevel: 'high',
        detail: '攔截到高精度地理座標查詢'
      };
    }

    setLogs((prev) => [newLog, ...prev]);
  };

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    return log.riskLevel === filterLevel;
  });

  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  // 匯出結構化 AI 診斷 Markdown 報告
  const generateAiReport = (): string => {
    const highRiskCount = logs.filter((l) => l.riskLevel === 'high').length;
    const mediumRiskCount = logs.filter((l) => l.riskLevel === 'medium').length;
    const lowRiskCount = logs.filter((l) => l.riskLevel === 'low').length;

    const reportLines = [
      '# 🛡️ 瀏覽器行為安全監控與 AI 診斷快照報告',
      '',
      `> 產出時間：${new Date().toLocaleString()}`,
      `> 檢測環境：${standaloneConnected ? 'Chrome 擴充套件原生探針 (BAM 雙層架構)' : '前端安全沙盒與模擬器'}`,
      `> 目標來源 (Origin)：\`${currentOrigin}\``,
      `> 完整網址 (URL)：\`${currentUrl}\``,
      '',
      '## 1. 安全風險摘要統計',
      `- **總捕獲事件數**：${logs.length} 筆`,
      `- 🔴 **高風險事件**：${highRiskCount} 筆`,
      `- 🟡 **中風險事件**：${mediumRiskCount} 筆`,
      `- 🔵 **一般/低風險事件**：${lowRiskCount} 筆`,
      '',
      '## 2. 當前分頁核心敏感權限狀態',
      '| 權限項目 | 狀態識別 | 說明 |',
      '| :--- | :--- | :--- |',
      ...permissions.map((p) => `| ${p.name} | \`${p.status}\` | ${p.description} |`),
      '',
      '## 3. 安全行為審計明細清單',
      logs.length === 0 ? '_（無監控日誌事件）_' : [
        '| 時間 | 風險等級 | 調用 API | 來源類型 | 來源網域/標的 | 調用細節 |',
        '| :--- | :---: | :--- | :--- | :--- | :--- |',
        ...logs.map((l) => {
          const riskEmoji = l.riskLevel === 'high' ? '🔴 高' : l.riskLevel === 'medium' ? '🟡 中' : '🔵 低';
          const sourceText = l.sourceType === 'page' ? '網頁分頁' : l.sourceType === 'extension' ? '擴充套件' : l.sourceType === 'mock' ? '模擬測試' : (l.source || '其他');
          const domainText = l.domain || '-';
          return `| ${l.timestamp} | ${riskEmoji} | \`${l.api}\` | ${sourceText} | \`${domainText}\` | ${l.detail.replace(/\|/g, '\\|')} |`;
        })
      ].join('\n'),
      '',
      '## 4. AI 專業審核建議指令 (Prompt)',
      '```text',
      '請身為 Chrome 擴充功能與網頁前端資訊安全專家，依據上述捕獲的 API 呼叫日誌、來源網域與權限配置進行分析：',
      '1. 評估是否有潛在的指紋追蹤、惡意截取剪貼簿、未授權音訊/地理位置監控或擴充功能越權風險。',
      '2. 針對高/中風險的呼叫來源（網頁與外掛），提供針對性的瀏覽器防護原則與最小權限設定建議。',
      '```'
    ];

    return reportLines.join('\n');
  };

  const copyForAiAnalysis = async () => {
    try {
      const report = generateAiReport();
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(report);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = report;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2000);
    } catch (err) {
      console.error('複製報告失敗:', err);
    }
  };

  const getStatusBadge = (status: PermissionItem['status']) => {
    switch (status) {
      case 'granted':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-900/60 text-red-200 border border-red-700/60">已授權 (敏感)</span>;
      case 'denied':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700/60">已封鎖 (安全)</span>;
      case 'prompt':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-900/60 text-amber-200 border border-amber-700/60">每次詢問</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-800 text-gray-400">未知/未支援</span>;
    }
  };

  const getRiskBadge = (level: ActivityAuditLog['riskLevel']) => {
    switch (level) {
      case 'high':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-red-950/80 text-red-300 border border-red-800/80">高風險</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">中風險</span>;
      case 'low':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-950/80 text-blue-300 border border-blue-800/80">一般</span>;
    }
  };

  const getSourceBadge = (log: ActivityAuditLog) => {
    const type = log.sourceType;
    let icon = '🌐';
    let label = log.source || '網頁分頁';
    let badgeClass = 'bg-blue-950/50 text-blue-300 border-blue-800/40';

    if (type === 'extension') {
      icon = '🧩';
      label = '擴充功能';
      badgeClass = 'bg-purple-950/60 text-purple-300 border-purple-800/50';
    } else if (type === 'mock') {
      icon = '🧪';
      label = '模擬測試';
      badgeClass = 'bg-amber-950/50 text-amber-300 border-amber-800/40';
    } else if (type === 'internal') {
      icon = '⚙️';
      label = '背景服務';
      badgeClass = 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60';
    }

    const domainDisplay = log.domain ? (
      <span className="font-mono text-[10px] opacity-80 ml-1">
        ({log.domain.replace('chrome-extension://', '')})
      </span>
    ) : null;

    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${badgeClass} transition-colors max-w-[210px] truncate`}
        title={`來源類型: ${label}\n網域/識別: ${log.domain || '無'}\n完整標的: ${log.targetUrl || '無'}`}
      >
        <span className="mr-1">{icon}</span>
        <span>{label}</span>
        {domainDisplay}
      </span>
    );
  };

  return (
    <div className={isSidebar ? "space-y-3" : "space-y-6"}>
      {/* 頂部整合模式與說明橫幅 */}
      <div className={`bg-dark-surface border border-dark-border-subtle rounded-xl ${isSidebar ? 'p-3' : 'p-5'} shadow-sm`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <span className={`${isSidebar ? 'text-xl p-1.5' : 'text-3xl p-2.5'} bg-blue-950/40 border border-blue-800/30 rounded-lg shrink-0`}>🛡️</span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className={`${isSidebar ? 'text-sm' : 'text-lg'} font-bold text-dark-primary`}>瀏覽行為監控器</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-900/40 text-blue-300 border border-blue-700/30">
                  {standaloneConnected ? '獨立外掛連線中' : '前端安全沙盒模式'}
                </span>
              </div>
              {!isSidebar && (
                <p className="text-sm text-dark-secondary mt-1">
                  零依賴隔離架構：實時檢測網頁敏感權限狀態、捕獲高風險 API 存取行徑，守護瀏覽隱私安全。
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end md:self-center">
            <button
              onClick={inspectCurrentTab}
              disabled={isScanning}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-card hover:bg-dark-hover text-dark-primary border border-dark-border-subtle transition-all active:scale-95 disabled:opacity-50"
            >
              <span className={isScanning ? 'animate-spin' : ''}>🔄</span>
              <span>{isScanning ? '正在掃描...' : '重新審查'}</span>
            </button>
          </div>
        </div>

        {/* 降級友善提示 */}
        {!standaloneConnected && !isSidebar && (
          <div className="mt-4 p-3 rounded-lg bg-dark-card/60 border border-dark-border-subtle/80 flex items-center justify-between text-xs text-dark-secondary">
            <div className="flex items-center space-x-2">
              <span className="text-amber-400">💡</span>
              <span>
                目前以內建沙盒視圖運行。若需啟用雙層探針 (MAIN+ISOLATED) 與網路攔截，可載入 <code className="text-blue-400 font-mono">browser-activity-monitor</code> 擴充功能並開啟專屬 Side Panel。
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 區塊 1: 當前分頁網域與敏感權限審查 */}
      <div className={`bg-dark-surface border border-dark-border-subtle rounded-xl ${isSidebar ? 'p-3' : 'p-5'} shadow-sm`}>
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-dark-border-subtle">
          <div>
            <h3 className={`${isSidebar ? 'text-xs' : 'text-base'} font-semibold text-dark-primary flex items-center space-x-1.5`}>
              <span>🌐</span>
              <span>當前分頁敏感權限審查</span>
            </h3>
            <p className="text-[11px] text-dark-secondary mt-0.5">
              目標來源：<span className="font-mono text-blue-300">{currentOrigin}</span>
            </p>
          </div>
          <span className="text-[10px] text-dark-muted truncate max-w-[140px]" title={currentUrl}>
            {currentUrl}
          </span>
        </div>

        <div className={`grid ${isSidebar ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5'}`}>
          {permissions.map((perm) => (
            <div
              key={perm.id}
              className={`bg-dark-card border border-dark-border-subtle/70 rounded-lg ${isSidebar ? 'p-2.5' : 'p-3.5'} flex flex-col justify-between hover:border-dark-border transition-all`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className={isSidebar ? 'text-base' : 'text-xl'}>{perm.icon}</span>
                  <div>
                    <h4 className="text-xs font-semibold text-dark-primary">{perm.name}</h4>
                    {!isSidebar && <p className="text-[11px] text-dark-secondary mt-0.5">{perm.description}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-dark-border-subtle/40 flex items-center justify-between">
                <span className="text-[10px] text-dark-muted">狀態</span>
                {getStatusBadge(perm.status)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 區塊 2: 敏感行為日誌與即時串流 */}
      <div className={`bg-dark-surface border border-dark-border-subtle rounded-xl ${isSidebar ? 'p-3' : 'p-5'} shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-dark-border-subtle">
          <div>
            <h3 className={`${isSidebar ? 'text-xs' : 'text-base'} font-semibold text-dark-primary flex items-center space-x-1.5`}>
              <span>📋</span>
              <span>安全監控日誌快照</span>
            </h3>
            {!isSidebar && (
              <p className="text-xs text-dark-secondary mt-0.5">
                即時紀錄攔截之敏感 API 調用、權限存取與高風險操作
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto flex-wrap gap-y-1">
            {/* 風險等級篩選 */}
            <div className="flex items-center bg-dark-card rounded-lg p-0.5 border border-dark-border-subtle text-xs">
              {(['all', 'high', 'medium', 'low'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2 py-0.5 rounded-md capitalize text-[11px] font-medium transition-all ${
                    filterLevel === lvl
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-dark-secondary hover:text-dark-primary'
                  }`}
                >
                  {lvl === 'all' ? '全部' : lvl}
                </button>
              ))}
            </div>

            {/* 一鍵複製 AI 診斷報告 */}
            <button
              onClick={copyForAiAnalysis}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                copiedStatus
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/70 shadow-sm'
                  : 'bg-dark-card hover:bg-dark-hover text-dark-primary border-dark-border-subtle hover:border-dark-border active:scale-95'
              }`}
              title="一鍵複製 Markdown 格式之完整安全審計日誌與 AI 專業提問詞"
            >
              <span>{copiedStatus ? '✅' : '📋'}</span>
              <span>{copiedStatus ? '已複製 AI 報告' : '複製 AI 報告'}</span>
            </button>

            <button
              onClick={() => setLogs([])}
              className="px-2 py-1 rounded-lg text-[11px] font-medium bg-dark-card hover:bg-red-950/40 text-dark-secondary hover:text-red-300 border border-dark-border-subtle transition-all"
              title="清空日誌快照"
            >
              清空
            </button>
          </div>
        </div>

        {/* 模擬攔截測試控制列 */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5 p-2 bg-dark-card/50 rounded-lg border border-dark-border-subtle/50 text-[11px]">
          <span className="text-dark-secondary font-medium">模擬事件：</span>
          <button
            onClick={() => triggerSimulation('media')}
            className="px-2 py-0.5 rounded bg-dark-card hover:bg-dark-hover text-dark-primary border border-dark-border-subtle transition-all"
          >
            📹 影音存取
          </button>
          <button
            onClick={() => triggerSimulation('clipboard')}
            className="px-2 py-0.5 rounded bg-dark-card hover:bg-dark-hover text-dark-primary border border-dark-border-subtle transition-all"
          >
            📋 剪貼簿
          </button>
          <button
            onClick={() => triggerSimulation('geo')}
            className="px-2 py-0.5 rounded bg-dark-card hover:bg-dark-hover text-dark-primary border border-dark-border-subtle transition-all"
          >
            📍 定位
          </button>
        </div>

        {/* 日誌清單 */}
        <div className={`space-y-2 ${isSidebar ? 'max-h-[260px]' : 'max-h-[380px]'} overflow-y-auto pr-1`}>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-dark-muted text-xs">
              目前無相符之安全審查事件
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-dark-card/80 border border-dark-border-subtle/80 hover:border-dark-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all"
              >
                <div className="flex items-start sm:items-center space-x-3">
                  <span className="font-mono text-[11px] text-dark-muted shrink-0">
                    [{log.timestamp}]
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-mono text-xs font-semibold text-blue-400">
                        {log.api}
                      </span>
                      {getSourceBadge(log)}
                    </div>
                    <p className="text-xs text-dark-secondary">{log.detail}</p>
                    {log.targetUrl && (
                      <p className="text-[10px] font-mono text-dark-muted truncate max-w-[280px] sm:max-w-md" title={log.targetUrl}>
                        標的：{log.targetUrl}
                      </p>
                    )}
                  </div>
                </div>

                <div className="self-end sm:self-center shrink-0">
                  {getRiskBadge(log.riskLevel)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
