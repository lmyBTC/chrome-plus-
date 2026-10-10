import React, { useState, useEffect } from 'react';

const GAS_CODE = `const SHEET_TASKS = "Tasks";
const SHEET_LOGS = "Logs";

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    // 拉取完整的跨瀏覽器備份 AppData 資料
    if (action === 'pull_app_data') {
      const file = getOrCreateBackupFile();
      const content = file.getContentText();
      const appData = content ? JSON.parse(content) : null;
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: appData }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 從 Google Tasks 抓取代辦事項
    if (action === 'get_tasks') {
      const taskListId = '@default'; // 預設清單
      const tasksResponse = Tasks.Tasks.list(taskListId, {
        showHidden: false,
        maxResults: 20
      });
      const tasks = tasksResponse.items || [];
      const formattedTasks = tasks.map((t, index) => ({
        id: 'gtask-' + t.id,
        text: t.title,
        isCompleted: t.status === 'completed'
      }));
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: formattedTasks }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 從 Google Calendar 抓取今日所有事件
    if (action === 'get_today_events') {
      const cal = CalendarApp.getDefaultCalendar();
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const events = cal.getEvents(startOfDay, endOfDay);
      const formattedEvents = events.map(e => ({
        title: e.getTitle(),
        startTime: e.getStartTime().getTime(),
        endTime: e.getEndTime().getTime()
      }));
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: formattedEvents }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 預設從 Google Sheets 讀取北極星目標與週任務
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const taskSheet = ss.getSheetByName(SHEET_TASKS);
    
    const northStar = taskSheet.getRange("B1").getValue();
    const lastRow = Math.max(taskSheet.getLastRow(), 2);
    const missionsData = taskSheet.getRange(2, 2, lastRow - 1, 1).getValues();
    const missions = [];
    
    missionsData.forEach((row, index) => {
      if (row[0] && row[0].toString().trim() !== "") {
        missions.push({
          id: 'gsheet-mission-' + index,
          text: row[0].toString().trim(),
          isCompleted: false
        });
      }
    });

    const responsePayload = {
      status: "success",
      data: {
        northStarGoal: { id: "gsheet-goal", text: northStar },
        weeklyMissions: missions
      }
    };

    return ContentService.createTextOutput(JSON.stringify(responsePayload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(SHEET_LOGS);
    
    if (payload.action === 'push_app_data') {
      const file = getOrCreateBackupFile();
      file.setContent(JSON.stringify(payload.appData));
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (payload.action === 'log_sprint') {
      logSheet.appendRow([
        new Date(),
        payload.date,
        "Sprint",
        payload.missionText,
        payload.result,
        ""
      ]);
    } else if (payload.action === 'log_review') {
      logSheet.appendRow([
        new Date(),
        payload.date,
        "Daily Review",
        payload.highlight,
        payload.lesson,
        payload.nextAction
      ]);
    } else if (payload.action === 'create_event') {
      const cal = CalendarApp.getDefaultCalendar();
      const startTime = new Date(payload.startTime);
      const endTime = new Date(payload.endTime);
      const event = cal.createEvent(\`[Power Kit] \${payload.title}\`, startTime, endTime, {
        description: payload.description || "Power Kit 自動同步紀錄"
      });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", eventId: event.getId() }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (payload.action === 'delete_event') {
      if (payload.eventId) {
        const cal = CalendarApp.getDefaultCalendar();
        const event = cal.getEventById(payload.eventId);
        if (event) event.deleteEvent();
      }
    } else if (payload.action === 'quick_capture_task') {
      Tasks.Tasks.insert({ title: payload.title, notes: payload.notes || "" }, '@default');
    } else if (payload.action === 'complete_task') {
      if (payload.taskId && payload.taskId.startsWith('gtask-')) {
        const rawTaskId = payload.taskId.replace('gtask-', '');
        try {
          const task = Tasks.Tasks.get('@default', rawTaskId);
          task.status = 'completed';
          Tasks.Tasks.patch(task, '@default', rawTaskId);
        } catch (e) {
          // 忽略錯誤
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateBackupFile() {
  const fileName = "power_kit_sync_data.json";
  const files = DriveApp.getFilesByName(fileName);
  if (files.hasNext()) {
    return files.next();
  } else {
    return DriveApp.createFile(fileName, "{}");
  }
}`;

const DEBUG_CODE = `(async () => {
  console.log("=== 本地 AI 偵測測試 ===");
  const namespaces = {
    "self.ai": typeof self !== 'undefined' ? self.ai : undefined,
    "window.ai": typeof window !== 'undefined' ? window.ai : undefined,
    "chrome.aiLanguageModel": typeof chrome !== 'undefined' ? chrome.aiLanguageModel : undefined,
    "LanguageModel": typeof LanguageModel !== 'undefined' ? LanguageModel : undefined
  };
  console.table(namespaces);

  const getAICore = () => {
    if (typeof self !== 'undefined' && self.ai?.languageModel) return self.ai.languageModel;
    if (typeof window !== 'undefined' && window.ai?.languageModel) return window.ai.languageModel;
    if (typeof chrome !== 'undefined' && chrome.aiLanguageModel) return chrome.aiLanguageModel;
    if (typeof LanguageModel !== 'undefined') return LanguageModel;
    return null;
  };

  const aiAPI = getAICore();
  if (!aiAPI) {
    console.error("❌ 找不到任何本地 AI API 命名空間。請確認 Chrome flags 與 components 設定。");
    return;
  }
  console.log("✅ 成功偵測到 API 核心：", aiAPI);

  try {
    console.log("正在檢測 capabilities...");
    const caps = await aiAPI.capabilities();
    console.log("capabilities 結果:", caps);
  } catch (e) {
    console.warn("⚠️ capabilities 檢測失敗 (可能是舊版不支援無參數呼叫):", e);
  }

  try {
    console.log("正在嘗試建立測試 Session...");
    const session = await aiAPI.create({ systemPrompt: "你是一個測試助手。" });
    console.log("✅ 成功建立 Session！正在進行 Prompt 測試...");
    const response = await session.prompt("你好，請回覆『測試成功』四個字。");
    console.log("🎉 Prompt 回應結果:", response);
    session.destroy();
    console.log("✅ Session 銷毀成功，VRAM 已釋放。");
  } catch (e) {
    console.error("❌ 建立 Session 或 Prompt 推理失敗，錯誤訊息:", e);
  }
})();`;

export type InstallDocsTab = 'setup' | 'troubleshoot' | 'guide' | 'debug';

export interface InstallDocsProps {
  initialTab?: InstallDocsTab;
}

export const InstallDocs: React.FC<InstallDocsProps> = ({ initialTab = 'setup' }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<InstallDocsTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleCopy = () => {
    navigator.clipboard.writeText(GAS_CODE)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 text-sm leading-relaxed text-dark-secondary">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-dark-primary mb-2">📖 安裝與使用說明書</h1>
        <p className="text-dark-muted">了解如何設定同步後台，掌握跨插件聯動，並利用自我排錯手冊排除連線障礙</p>
      </div>

      {/* Tab 切換選單 */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8 border-b border-dark-border-subtle">
        <button
          onClick={() => setActiveTab('setup')}
          className={`px-5 py-3 font-semibold text-sm transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'setup'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-dark-muted hover:text-dark-primary'
          }`}
        >
          🔧 後台同步設定
        </button>
        <button
          onClick={() => setActiveTab('troubleshoot')}
          className={`px-5 py-3 font-semibold text-sm transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'troubleshoot'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-dark-muted hover:text-dark-primary'
          }`}
        >
          🔌 跨插件與同步排錯
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`px-5 py-3 font-semibold text-sm transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'guide'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-dark-muted hover:text-dark-primary'
          }`}
        >
          💡 最大化利用指南
        </button>
        <button
          onClick={() => setActiveTab('debug')}
          className={`px-5 py-3 font-semibold text-sm transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'debug'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-dark-muted hover:text-dark-primary'
          }`}
        >
          🤖 本地 AI 偵測與排錯
        </button>
      </div>

      {/* Tab 1: 後台同步設定 */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          {/* 步驟 1 */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-dark-primary mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              建立 Google 試算表與欄位配置
            </h2>
            <ol className="list-decimal list-inside space-y-3 pl-2">
              <li>前往您的 Google 雲端硬碟，建立一個全新的 <strong className="text-dark-primary">Google 試算表</strong>。</li>
              <li>
                在該試算表中，建立兩個工作表 (Tabs 分頁)，務必完全一致命名為：
                <ul className="list-disc list-inside pl-6 mt-1 text-dark-muted">
                  <li><strong className="text-blue-400 font-mono">Tasks</strong> (用來管理北極星目標與週任務)</li>
                  <li><strong className="text-blue-400 font-mono">Logs</strong> (用來記錄每日衝刺與回顧)</li>
                </ul>
              </li>
            </ol>

            {/* 資料讀取邏輯解析卡片 */}
            <div className="mt-5 bg-gradient-to-r from-blue-950/40 to-indigo-950/20 border border-blue-900/50 rounded-xl p-4">
              <h3 className="text-sm font-bold text-blue-300 mb-2 flex items-center gap-1.5">
                <span>🔍</span> 後台讀取邏輯說明 (How it works)
              </h3>
              <ul className="text-xs text-blue-200/80 space-y-1.5 leading-relaxed pl-1">
                <li>• <strong>只讀取 B 欄</strong>：Apps Script 後台鎖定讀取 B 欄數值。<strong>B1 儲存格</strong>對應「北極星目標」，<strong>B2 以下</strong>每列對應一個「週任務」。</li>
                <li>• <strong>A 欄純為人類閱讀用</strong>：GAS 程式碼完全不讀取 A 欄，A 欄僅供您填寫標籤備忘（如：北極星目標、本週任務）。</li>
                <li>• <strong>分頁名稱必須為 Tasks</strong>：若分頁為「工作表1」或「Sheet1」，後台將無法找到對象。</li>
              </ul>
            </div>

            {/* Tasks 欄位視覺化範例表格 */}
            <div className="mt-5">
              <h3 className="text-sm font-bold text-dark-primary mb-2 flex items-center gap-1.5">
                <span>📋</span> Tasks 工作表正確填寫範例：
              </h3>
              <div className="border border-dark-border-default rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-dark-surface text-dark-muted font-mono border-b border-dark-border-default">
                    <tr>
                      <th className="py-2 px-3 w-16 text-center border-r border-dark-border-default">列號</th>
                      <th className="py-2 px-4 border-r border-dark-border-default">A 欄 (人類標籤，選填)</th>
                      <th className="py-2 px-4 text-blue-300 font-bold border-r border-dark-border-default">B 欄 (★ 插件實際讀取內容)</th>
                      <th className="py-2 px-4 text-dark-muted">對應儀表板位置</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border-subtle bg-dark-card/60">
                    <tr className="hover:bg-dark-hover/50">
                      <td className="py-2 px-3 text-center font-mono text-dark-muted border-r border-dark-border-default">1</td>
                      <td className="py-2 px-4 text-dark-secondary border-r border-dark-border-default">北極星目標</td>
                      <td className="py-2 px-4 text-dark-primary font-semibold border-r border-dark-border-default bg-blue-950/20">
                        成為獨立開發者 (或您的長期目標)
                      </td>
                      <td className="py-2 px-4 text-dark-muted">頂部「北極星目標」</td>
                    </tr>
                    <tr className="hover:bg-dark-hover/50">
                      <td className="py-2 px-3 text-center font-mono text-dark-muted border-r border-dark-border-default">2</td>
                      <td className="py-2 px-4 text-dark-secondary border-r border-dark-border-default">本週任務 1</td>
                      <td className="py-2 px-4 text-dark-primary font-semibold border-r border-dark-border-default bg-blue-950/20">
                        完成產品規格書
                      </td>
                      <td className="py-2 px-4 text-dark-muted">週任務清單第 1 項</td>
                    </tr>
                    <tr className="hover:bg-dark-hover/50">
                      <td className="py-2 px-3 text-center font-mono text-dark-muted border-r border-dark-border-default">3</td>
                      <td className="py-2 px-4 text-dark-secondary border-r border-dark-border-default">本週任務 2</td>
                      <td className="py-2 px-4 text-dark-primary font-semibold border-r border-dark-border-default bg-blue-950/20">
                        學習 React Hooks
                      </td>
                      <td className="py-2 px-4 text-dark-muted">週任務清單第 2 項</td>
                    </tr>
                    <tr className="hover:bg-dark-hover/50">
                      <td className="py-2 px-3 text-center font-mono text-dark-muted border-r border-dark-border-default">4</td>
                      <td className="py-2 px-4 text-dark-secondary border-r border-dark-border-default">本週任務 3</td>
                      <td className="py-2 px-4 text-dark-primary font-semibold border-r border-dark-border-default bg-blue-950/20">
                        部署第一個 SaaS 產品
                      </td>
                      <td className="py-2 px-4 text-dark-muted">週任務清單第 3 項</td>
                    </tr>
                    <tr className="hover:bg-dark-hover/50">
                      <td className="py-2 px-3 text-center font-mono text-dark-muted border-r border-dark-border-default">5+</td>
                      <td className="py-2 px-4 text-dark-muted italic border-r border-dark-border-default">(可留空)</td>
                      <td className="py-2 px-4 text-dark-secondary border-r border-dark-border-default bg-blue-950/20">
                        更多任務...（每格填寫一個）
                      </td>
                      <td className="py-2 px-4 text-dark-muted">依序往下新增</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Logs 欄位結構說明 */}
            <div className="mt-5">
              <h3 className="text-sm font-bold text-dark-primary mb-1.5 flex items-center gap-1.5">
                <span>📊</span> Logs 工作表結構（每日衝刺與回顧自動記錄）：
              </h3>
              <p className="text-xs text-dark-muted mb-2">
                請在 <strong className="text-dark-primary font-mono">Logs</strong> 工作表的第一列 (A1~F1) 建立以下標題，後續番茄鐘衝刺與日終回顧將自動由外掛往下寫入：
              </p>
              <div className="bg-dark-surface p-2.5 rounded-xl font-mono text-xs border border-dark-border-default overflow-x-auto text-blue-300 whitespace-nowrap shadow-inner">
                Timestamp | Date | Type | Mission / Highlight | Result / Lesson | Next Action
              </div>
            </div>
          </div>

          {/* 步驟 2 */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-dark-primary mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              建立 Apps Script 並貼上後端程式碼
            </h2>
            <ol className="list-decimal list-inside space-y-2 pl-2 mb-4">
              <li>在試算表選單中點擊：<strong className="text-dark-primary">擴充功能 (Extensions) &gt; Apps Script</strong>。</li>
              <li>將預設的編輯區代碼全部清空。</li>
              <li>點擊下方按鈕複製後端代碼，並貼回剛剛的編輯區中。</li>
            </ol>

            <div className="mt-4 border border-dark-border-default rounded-xl overflow-hidden bg-dark-surface">
              <div className="flex justify-between items-center px-4 py-2 border-b border-dark-border-default bg-dark-surface/80">
                <span className="text-xs font-mono text-dark-muted">Google Apps Script Template (Code.gs)</span>
                <button
                  onClick={handleCopy}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    copied 
                      ? 'bg-green-600 text-white' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {copied ? '✅ 已複製代碼！' : '📋 一鍵複製後端代碼'}
                </button>
              </div>
              <pre className="p-4 font-mono text-xs max-h-60 overflow-y-auto text-dark-primary bg-dark-surface/50">
                {GAS_CODE}
              </pre>
            </div>
          </div>

          {/* 步驟 3: 啟用 Google Tasks API 進階服務 */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-dark-primary mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              啟用進階服務 API (Google Tasks API & Calendar)
            </h2>
            <p className="mb-2 pl-2 text-dark-secondary">
              本插件整合了「Google Tasks 雙向即時同步」與「行事曆專注事件自動建立」，需在 Apps Script 中啟用相應服務權限：
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-2 mb-4">
              <li>在 Apps Script 編輯器左側導航選單中，點擊 <strong className="text-dark-primary">「服務 (Services)」</strong> 旁邊的 <strong className="text-blue-400 font-bold">+</strong>。</li>
              <li>在服務清單中滾動找到 <strong className="text-dark-primary font-mono">Tasks (Google Tasks API)</strong>，確認識別碼為 <code className="text-blue-300 bg-dark-surface px-1.5 py-0.5 rounded font-mono">Tasks</code>，點擊 **新增 (Add)**。</li>
              <li>確認左側「服務」清單已出現 <code className="text-blue-300 font-mono">Tasks</code> 項目。</li>
            </ol>
            <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-xs text-blue-200/90 leading-relaxed">
              💡 <strong>提示</strong>：Google Calendar API 預設已透過 Apps Script 內建的 <code className="font-mono">CalendarApp</code> 直接支援，無需額外新增服務；但 Tasks API 必須在此處點擊啟用。
            </div>
          </div>

          {/* 步驟 4: Google Tasks 雙向同步機制與欄位對齊 */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-dark-primary mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              Google Tasks 雙向同步生命週期與欄位對齊規則
            </h2>
            <p className="text-xs text-dark-muted mb-4 leading-relaxed">
              ScrumClock 採用非侵入式的雙向資料合併協議，能完美在桌面新分頁、手機 Google Tasks App 與 Google 日曆側欄之間保持任務一致：
            </p>

            {/* 欄位對齊表格 */}
            <div className="border border-dark-border-default rounded-xl overflow-hidden mb-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-surface text-dark-muted font-mono border-b border-dark-border-default">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-dark-border-default">ScrumClock 欄位</th>
                    <th className="py-2.5 px-3 border-r border-dark-border-default">Google Tasks 欄位</th>
                    <th className="py-2.5 px-4 text-blue-300 font-bold border-r border-dark-border-default">雙向對齊行為</th>
                    <th className="py-2.5 px-4 text-dark-muted">說明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border-subtle bg-dark-card/60">
                  <tr className="hover:bg-dark-hover/50">
                    <td className="py-2 px-3 font-mono text-blue-300 border-r border-dark-border-default">id</td>
                    <td className="py-2 px-3 font-mono text-dark-muted border-r border-dark-border-default">t.id</td>
                    <td className="py-2 px-4 text-dark-primary font-semibold border-r border-dark-border-default">
                      <code className="text-emerald-400 font-mono">gtask-&#123;id&#125;</code> 唯一對齊
                    </td>
                    <td className="py-2 px-4 text-dark-muted">避免重複建立，本地任務與雲端任務精準對應。</td>
                  </tr>
                  <tr className="hover:bg-dark-hover/50">
                    <td className="py-2 px-3 font-mono text-blue-300 border-r border-dark-border-default">text</td>
                    <td className="py-2 px-3 font-mono text-dark-muted border-r border-dark-border-default">t.title</td>
                    <td className="py-2 px-4 text-dark-primary font-semibold border-r border-dark-border-default">雙向合併與標題同步</td>
                    <td className="py-2 px-4 text-dark-muted">拉取時自動帶入看板；手機建立的任務直接顯示於新分頁。</td>
                  </tr>
                  <tr className="hover:bg-dark-hover/50">
                    <td className="py-2 px-3 font-mono text-blue-300 border-r border-dark-border-default">isCompleted</td>
                    <td className="py-2 px-3 font-mono text-dark-muted border-r border-dark-border-default">t.status === 'completed'</td>
                    <td className="py-2 px-4 text-dark-primary font-semibold border-r border-dark-border-default">雙向勾選狀態即時回寫</td>
                    <td className="py-2 px-4 text-dark-muted">新分頁勾選完成，雲端自動標記完成；手機勾選完成，分頁自動同步。</td>
                  </tr>
                  <tr className="hover:bg-dark-hover/50">
                    <td className="py-2 px-3 font-mono text-blue-300 border-r border-dark-border-default">靈感快速捕獲</td>
                    <td className="py-2 px-3 font-mono text-dark-muted border-r border-dark-border-default">Tasks.insert()</td>
                    <td className="py-2 px-4 text-dark-primary font-semibold border-r border-dark-border-default">一鍵自動派發</td>
                    <td className="py-2 px-4 text-dark-muted">透過側欄靈感收集箱或快速截圖，可一鍵生成 Google Task。</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 三大生命週期 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-dark-surface/60 border border-dark-border-default rounded-xl">
                <div className="font-bold text-blue-400 mb-1">📥 1. 定時與智慧拉取</div>
                <div className="text-dark-muted leading-relaxed">
                  每當開啟新分頁或手動點擊「立即雙向同步 Tasks」時，自動拉取預設清單前 20 筆未完成事項，採用 ID 鍵值智慧合併，保留本地排序。
                </div>
              </div>
              <div className="p-3 bg-dark-surface/60 border border-dark-border-default rounded-xl">
                <div className="font-bold text-emerald-400 mb-1">📤 2. 背景即時回寫 (Patch)</div>
                <div className="text-dark-muted leading-relaxed">
                  在看板或任務清單中打勾完成時，系統非同步向 GAS 發送 <code className="font-mono text-emerald-300">complete_task</code> 指令，即時對齊 Google 伺服器狀態。
                </div>
              </div>
              <div className="p-3 bg-dark-surface/60 border border-dark-border-default rounded-xl">
                <div className="font-bold text-indigo-400 mb-1">🛡️ 3. 離線容錯與重播</div>
                <div className="text-dark-muted leading-relaxed">
                  若遇離線或網路中斷，狀態異動會暫存於離線隊列；當網路恢復或 Local Hub 備援就緒時，自動重播回寫，不丟失進度。
                </div>
              </div>
            </div>
          </div>

          {/* 步驟 5: 部署為 Web App */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-dark-primary mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">5</span>
              部署為網頁應用程式 (Web App) 與權限配置
            </h2>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>點擊右上方的 <strong className="text-dark-primary">「部署 (Deploy)」 &gt; 「新增部署作業 (New deployment)」</strong>。</li>
              <li>點擊齒輪圖示，選取類型為 <strong className="text-dark-primary">「網頁應用程式 (Web App)」</strong>。</li>
              <li>設定引導參數（關鍵步驟！）：
                <ul className="list-disc list-inside pl-6 mt-1 text-dark-muted space-y-1">
                  <li>實施執行身分 (Execute as)：<strong className="text-dark-primary">我 (Me)</strong>（代表由您的帳號存取試算表與 Tasks）。</li>
                  <li>誰可以存取 (Who has access)：<strong className="text-emerald-400 font-bold">所有人 (Anyone)</strong>（避免外掛請求時遭遇 302 重新導向或 Google 登入驗證攔截）。</li>
                </ul>
              </li>
              <li>點擊下方 **部署 (Deploy)** 按鈕。過程中如有要求安全性授權核准，請點選「進階 &gt; 前往 (不安全)」完成一次性授權。</li>
              <li>部署完成後，複製產生的 <strong className="text-dark-primary">網頁應用程式網址 (Web App URL)</strong>。</li>
              <li>回到插件中的「全域設定」，在 **Google Apps Script URL (同步用)** 中貼上此網址並儲存，即完成雙向同步！</li>
            </ol>

            {/* 跨裝置 AppData 備份說明 */}
            <div className="mt-4 p-3.5 bg-indigo-950/20 border border-indigo-900/50 rounded-xl text-xs text-indigo-200/90 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-indigo-300 mb-1">
                <span>🔄</span> 跨裝置 AppData 自動備份機制：
              </div>
              <div>
                當您在設定面板點擊「推送本地到雲端」時，後端 GAS 會在您的個人 Google 雲端硬碟根目錄自動維護一個名為 <code className="font-mono text-indigo-300">power_kit_sync_data.json</code> 的加密備份檔。換電腦或切換 Chrome Profile 時，只需輸入同一個 GAS URL 並點擊「拉取並智慧合併」，即可瞬間無縫還原所有設定、目標與歷史戰報。
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 跨插件與同步排錯手冊 */}
      {activeTab === 'troubleshoot' && (
        <div className="space-y-6">
          {/* 區塊 A: 跨插件協同通訊架構 */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-emerald-300 mb-3 flex items-center gap-2">
              <span>🔌</span> 跨插件聯動協同架構 (Cross-Plugin Hub Protocol v2)
            </h2>
            <p className="text-dark-muted leading-relaxed mb-4 text-xs sm:text-sm">
              Chrome Plus 採用「松耦合純資料契約」實現跨擴充功能無縫協同。所有插件皆在完全隔離的沙箱運行，透過 Chrome 原生 <code className="font-mono text-emerald-400">chrome.runtime.sendMessage(targetExtensionId, payload)</code> 進行零信任通訊：
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-dark-surface/60 border border-emerald-900/40">
                <div className="font-bold text-emerald-300 text-sm mb-1 flex items-center gap-2">
                  <span>📈</span> Finance Research Clipper (投研採集)
                </div>
                <div className="text-xs text-dark-muted leading-relaxed space-y-1">
                  <div>• <strong>協同職責</strong>：將網頁研究時標記的自選股與個股速記同步至 ScrumClock 看板。</div>
                  <div>• <strong>預設 Extension ID</strong>：<code className="text-emerald-300 font-mono text-[11px]">lhghjfnlchdmbghhjjgpeebkocijfdcf</code></div>
                  <div>• <strong>支援通訊 Action</strong>：<code className="font-mono text-[11px]">PING</code>, <code className="font-mono text-[11px]">WATCHLIST_SYNC</code></div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-dark-surface/60 border border-emerald-900/40">
                <div className="font-bold text-emerald-300 text-sm mb-1 flex items-center gap-2">
                  <span>🛡️</span> Browser Activity Monitor (行為審計)
                </div>
                <div className="text-xs text-dark-muted leading-relaxed space-y-1">
                  <div>• <strong>協同職責</strong>：在番茄鐘專注時段觀測網頁活躍度，日終自動計算專注佔比與分心指數。</div>
                  <div>• <strong>預設 Extension ID</strong>：<code className="text-emerald-300 font-mono text-[11px]">gphjfeapbfkocmbhhjjgpeebkocijfa1</code></div>
                  <div>• <strong>支援通訊 Action</strong>：<code className="font-mono text-[11px]">PING</code>, <code className="font-mono text-[11px]">GET_STATUS</code>, <code className="font-mono text-[11px]">ACTIVITY_SUMMARY</code></div>
                </div>
              </div>
            </div>

            {/* SOP 指引 */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-2">
              <div className="font-bold text-emerald-200 text-xs sm:text-sm flex items-center gap-1.5">
                <span>📋</span> 跨插件連線配置與權限確認 SOP：
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-emerald-200/80 leading-relaxed pl-1">
                <li><strong>確認目標插件已載入</strong>：開啟瀏覽器分頁 <code className="font-mono text-white bg-dark-surface px-1.5 py-0.5 rounded">chrome://extensions</code>，確認目標插件已載入且開關為開啟。</li>
                <li><strong>核對 Extension ID</strong>：若使用官方預先封裝版本，直接在 ScrumClock 設定面板中點擊 <strong className="text-emerald-300">「帶入預設 ID」</strong>；若是本機自建開發版本，請複製延伸模組卡片上的「ID: ...」32 位元字串並貼上。</li>
                <li><strong>執行連線健檢 (Ping)</strong>：點擊對應卡片右側的 <strong className="text-emerald-300">「⚡ 測試連線 (Ping)」</strong>。若指示燈轉為綠色「在線 (XXms)」，代表雙向握手成功！</li>
              </ol>
            </div>
          </div>

          {/* 區塊 B: 常見跨插件錯誤代碼對照表與自我修復指南 */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-dark-primary mb-3 flex items-center gap-2">
              <span>🩺</span> 常見錯誤代碼對照表與逐步自我修復指南
            </h2>
            <p className="text-xs text-dark-muted mb-4 leading-relaxed">
              當點擊「測試連線 (Ping)」或執行同步時若出現異常指示燈，請查照下表代碼與逐步修復步驟：
            </p>

            <div className="border border-dark-border-default rounded-xl overflow-hidden mb-5">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-surface text-dark-muted font-mono border-b border-dark-border-default">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-dark-border-default w-36">錯誤代碼 / 狀態</th>
                    <th className="py-2.5 px-4 border-r border-dark-border-default">潛在發生原因</th>
                    <th className="py-2.5 px-4 text-emerald-300 font-bold border-r border-dark-border-default">逐步自我修復流程 (Action Item)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border-subtle bg-dark-card/60">
                  <tr className="hover:bg-dark-hover/50">
                    <td className="py-2.5 px-3 font-mono text-red-400 font-bold border-r border-dark-border-default bg-red-950/10">
                      ERR_EXTENSION_NOT_FOUND
                    </td>
                    <td className="py-2.5 px-4 text-dark-secondary border-r border-dark-border-default">
                      目標插件未安裝、已被使用者停用，或設定中的 Extension ID 填寫有誤。
                    </td>
                    <td className="py-2.5 px-4 text-dark-primary leading-relaxed">
                      1. 開啟 <code className="font-mono bg-dark-surface px-1 text-blue-300">chrome://extensions</code> 檢查目標插件是否開啟。<br/>
                      2. 點擊「帶入預設 ID」還原官方 Extension ID。<br/>
                      3. 若為本地自解壓版本，請確認已複製正確的 32 位 ID。
                    </td>
                  </tr>
                  <tr className="hover:bg-dark-hover/50">
                    <td className="py-2.5 px-3 font-mono text-amber-400 font-bold border-r border-dark-border-default bg-amber-950/10">
                      TIMEOUT
                    </td>
                    <td className="py-2.5 px-4 text-dark-secondary border-r border-dark-border-default">
                      目標插件背景 Service Worker 閒置休眠 (Inactive) 未及時喚醒，或逾時超過 3000ms。
                    </td>
                    <td className="py-2.5 px-4 text-dark-primary leading-relaxed">
                      1. 點擊瀏覽器工具列上的目標插件圖示，喚醒其背景背景進程。<br/>
                      2. 回到 ScrumClock 設定面板重新點擊「測試連線 (Ping)」。<br/>
                      3. 確認電腦未處於極端低功耗節能或凍結背景模式。
                    </td>
                  </tr>
                  <tr className="hover:bg-dark-hover/50">
                    <td className="py-2.5 px-3 font-mono text-rose-400 font-bold border-r border-dark-border-default bg-rose-950/10">
                      PERMISSION_DENIED
                    </td>
                    <td className="py-2.5 px-4 text-dark-secondary border-r border-dark-border-default">
                      目標插件的 <code className="font-mono text-xs">manifest.json</code> 外部連線白名單 (<code className="font-mono text-[11px]">externally_connectable</code>) 未包含 ScrumClock。
                    </td>
                    <td className="py-2.5 px-4 text-dark-primary leading-relaxed">
                      1. 確認雙邊插件皆更新至 Chrome Plus 最新版本發行包。<br/>
                      2. 本機開發模式下，確認目標插件 manifest 已允許萬用匹配或加入當前開發版 ID。
                    </td>
                  </tr>
                  <tr className="hover:bg-dark-hover/50">
                    <td className="py-2.5 px-3 font-mono text-indigo-400 font-bold border-r border-dark-border-default bg-indigo-950/10">
                      ERR_LOCAL_HUB_OFFLINE
                    </td>
                    <td className="py-2.5 px-4 text-dark-secondary border-r border-dark-border-default">
                      啟用本機 Local Hub 離線備援，但本地轉發服務 (Port 8765) 尚未啟動。
                    </td>
                    <td className="py-2.5 px-4 text-dark-primary leading-relaxed">
                      1. 若無需本地轉發，可於設定面板關閉「本機 Local Hub 離線重試備援」。<br/>
                      2. 若需本機隊列，請在終端機啟動本機轉發代理器。<br/>
                      3. 系統將自動降級至純雲端 GAS 直連模式。
                    </td>
                  </tr>
                  <tr className="hover:bg-dark-hover/50">
                    <td className="py-2.5 px-3 font-mono text-yellow-400 font-bold border-r border-dark-border-default bg-yellow-950/10">
                      INVALID_PAYLOAD
                    </td>
                    <td className="py-2.5 px-4 text-dark-secondary border-r border-dark-border-default">
                      通訊封包格式不合契約或目標插件版本過舊。
                    </td>
                    <td className="py-2.5 px-4 text-dark-primary leading-relaxed">
                      請將兩側插件同步升級至 Protocol v2 相容版本。
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 區塊 C: 雲端同步與 GAS Webhook 故障診斷指南 */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2">
              <span>☁️</span> 雲端同步與 GAS Webhook 故障診斷手冊
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-dark-surface/50 border border-dark-border-default rounded-xl">
                <div className="font-bold text-red-400 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                  <span>🚨</span> 故障 1：點擊同步跳出「HTTP 302 重定向」或「回傳 HTML 登入頁面」
                </div>
                <div className="text-xs text-dark-secondary space-y-1 pl-4 border-l-2 border-red-500/50">
                  <div>• <strong>根本原因</strong>：Apps Script 部署權限設定錯誤。若「誰可以存取 (Who has access)」設定為「僅限我」或「機構內所有人」，Google 會強制跳轉 OAuth 登入頁面，外掛 fetch API 因 CORS 跨域政策攔截而拋出錯誤。</div>
                  <div>• <strong>快速修復</strong>：至 Apps Script 點擊右上角「部署」&gt;「管理部署作業」&gt; 點擊鉛筆圖示編輯，將「誰可以存取」修改為 <strong className="text-emerald-400 font-bold">所有人 (Anyone)</strong>，並點擊「部署」。</div>
                </div>
              </div>

              <div className="p-4 bg-dark-surface/50 border border-dark-border-default rounded-xl">
                <div className="font-bold text-amber-400 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                  <span>🚨</span> 故障 2：Google Tasks 雙向同步顯示「Tasks API 未啟用 (ReferenceError: Tasks is not defined)」
                </div>
                <div className="text-xs text-dark-secondary space-y-1 pl-4 border-l-2 border-amber-500/50">
                  <div>• <strong>根本原因</strong>：未在 Apps Script 左側「服務 (Services)」中手動新增 Google Tasks API。</div>
                  <div>• <strong>快速修復</strong>：在 Apps Script 編輯器左側「服務」點擊「+」，選取「Google Tasks API」，保留識別碼為「Tasks」並點擊新增。</div>
                </div>
              </div>

              <div className="p-4 bg-dark-surface/50 border border-dark-border-default rounded-xl">
                <div className="font-bold text-blue-400 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                  <span>🚨</span> 故障 3：試算表抓取失敗「找不到工作表 Tasks 或 Logs」
                </div>
                <div className="text-xs text-dark-secondary space-y-1 pl-4 border-l-2 border-blue-500/50">
                  <div>• <strong>根本原因</strong>：工作表名稱仍保留為「工作表1」或命名大小寫不一致。</div>
                  <div>• <strong>快速修復</strong>：右鍵將第一個工作表重新命名為 <code className="text-blue-300 font-mono">Tasks</code>，第二個工作表重新命名為 <code className="text-blue-300 font-mono">Logs</code>（請確認字首大寫，無多餘空格）。</div>
                </div>
              </div>

              <div className="p-4 bg-dark-surface/50 border border-dark-border-default rounded-xl">
                <div className="font-bold text-indigo-400 text-xs sm:text-sm mb-1 flex items-center gap-1.5">
                  <span>🚨</span> 故障 4：跨瀏覽器備份失敗「DriveApp 授權未核准」
                </div>
                <div className="text-xs text-dark-secondary space-y-1 pl-4 border-l-2 border-indigo-500/50">
                  <div>• <strong>根本原因</strong>：初次部署時尚未授予 Apps Script 存取 Google Drive 建立檔案的授權。</div>
                  <div>• <strong>快速修復</strong>：在 Apps Script 頂部函式下拉選單選取 <code className="font-mono text-indigo-300">getOrCreateBackupFile</code>，點擊「執行 (Run)」按鈕，在跳出的權限彈窗中完成「進階 &gt; 前往 (不安全)」授權。</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 最大化利用指南 */}
      {activeTab === 'guide' && (
        <div className="space-y-6 text-dark-secondary">
          {/* 核心心法引言 */}
          <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-blue-400 mb-2 flex items-center gap-2">
              🎯 核心理念：時間盒（Timeboxing）與敏捷反思的極致融合
            </h2>
            <p className="text-dark-muted leading-relaxed text-xs sm:text-sm">
              Power Kit 不僅僅是一個番茄鐘或待辦清單，它是一套專為個人開發者與高效工作者設計的<strong className="text-dark-primary">敏捷自我管理系統</strong>。透過將「北極星目標」拆解成「每日戰役」，再利用「AI 側欄助理」進行反思，您將能建立起一個不斷自我優化的成長閉環。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 卡片 1 */}
            <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg hover:border-blue-500/30 transition-all duration-300">
              <h3 className="text-base font-semibold text-dark-primary mb-3 flex items-center gap-2">
                🚀 1. 錨定北極星目標，拒絕無效忙碌
              </h3>
              <p className="text-dark-muted leading-relaxed mb-3 text-xs sm:text-sm">
                在新分頁或 Google Sheets 的 <strong className="text-dark-primary">Tasks</strong> 工作表中設定您的<strong className="text-blue-400">北極星目標</strong>（例如：<em>「成為獨立開發者，上架首款付費產品」</em>）。
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-dark-muted/80 pl-2">
                <li>每天開啟瀏覽器時，第一眼看見北極星，校準前進方向。</li>
                <li>將本週任務拆解為 1~2 個最核心的<strong className="text-dark-primary">「今日核心戰役 (Core Battles)」</strong>，其餘瑣事放一旁。</li>
              </ul>
            </div>

            {/* 卡片 2 */}
            <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg hover:border-blue-500/30 transition-all duration-300">
              <h3 className="text-base font-semibold text-dark-primary mb-3 flex items-center gap-2">
                🍅 2. 番茄鐘專注與主動敏捷回顧
              </h3>
              <p className="text-dark-muted leading-relaxed mb-3 text-xs sm:text-sm">
                開啟番茄鐘進行 25 分鐘專注。當計時結束時，AI 側欄會彈出對話泡泡，主動詢問您剛才的專注進展。
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-dark-muted/80 pl-2">
                <li><strong className="text-blue-400 font-bold">高效心法</strong>：花 10 秒隨手記錄您的「成果反思」與「阻礙 (Blockers)」。</li>
                <li>即使只有一句話，這些數據都會寫入儲存，成為 AI 深入了解您的關鍵上下文。</li>
              </ul>
            </div>

            {/* 卡片 3 */}
            <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg hover:border-blue-500/30 transition-all duration-300">
              <h3 className="text-base font-semibold text-dark-primary mb-3 flex items-center gap-2">
                📥 3. 善用 AI 靈感收集箱 (Scratchpad)
              </h3>
              <p className="text-dark-muted leading-relaxed mb-3 text-xs sm:text-sm">
                在任意網頁閱讀文件、寫程式或查找 API 時，選取文字按右鍵點擊 <strong className="text-dark-primary font-bold">「📥 收集至 Power Kit 暫存區」</strong>（或使用快捷鍵 <kbd className="px-1.5 py-0.5 rounded bg-dark-surface border border-dark-border-default font-mono text-[10px] text-dark-primary font-bold">Alt + Shift + A</kbd>）。
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-dark-muted/80 pl-2">
                <li>碎料文字會自動追加到側欄的靈感草稿區，不佔用系統剪貼簿。</li>
                <li>收集完畢後，一鍵命令側欄 AI：「<em>幫我將這些草稿素材整理成一份開發規格書大綱</em>」。</li>
              </ul>
            </div>

            {/* 卡片 4 */}
            <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg hover:border-blue-500/30 transition-all duration-300">
              <h3 className="text-base font-semibold text-dark-primary mb-3 flex items-center gap-2">
                🤖 4. 一鍵生成工作日報，解放繁瑣記錄
              </h3>
              <p className="text-dark-muted leading-relaxed mb-3 text-xs sm:text-sm">
                在一天工作結束前，點擊數據統計 (Analytics) 面板上方的 <strong className="text-dark-primary">「🤖 生成工作日報」</strong>。
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-dark-muted/80 pl-2">
                <li>AI 會自動讀取並串聯今日完成的番茄鐘名稱、時長、反思與筆記。</li>
                <li>自動產出排版精美的 Markdown 格式個人生產力日報。</li>
                <li>點擊一鍵複製，1 秒即可貼至 Slack、Teams 或 Notion 等工作回報群組。</li>
              </ul>
            </div>
          </div>

          {/* 卡片 5 (跨欄) */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg hover:border-blue-500/30 transition-all duration-300">
            <h3 className="text-base font-semibold text-dark-primary mb-3 flex items-center gap-2">
              🔀 5. 配置 Google Apps Script 實現資料永續與生態聯動
            </h3>
            <p className="text-dark-muted leading-relaxed mb-3 text-xs sm:text-sm">
              強烈建議完成「後台同步設定」！透過簡單的 Google Apps Script (GAS) 部署，您將能實現以下三大核心優勢：
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              <div className="bg-dark-surface/50 p-3 rounded-lg border border-dark-border-default">
                <span className="text-blue-400 font-bold block mb-1 text-xs sm:text-sm">📊 雲端實體存檔</span>
                <span className="text-[11px] text-dark-muted leading-relaxed">所有專注數據與每日回顧自動寫入您專屬的 Google Sheets，完全由您自主掌控，永不遺失。</span>
              </div>
              <div className="bg-dark-surface/50 p-3 rounded-lg border border-dark-border-default">
                <span className="text-blue-400 font-bold block mb-1 text-xs sm:text-sm">📅 行事曆雙向同步</span>
                <span className="text-[11px] text-dark-muted leading-relaxed">番茄鐘計時啟動時自動在 Google Calendar 建立 Scrum 事件，並在完成時同步更新，整合日程。</span>
              </div>
              <div className="bg-dark-surface/50 p-3 rounded-lg border border-dark-border-default">
                <span className="text-blue-400 font-bold block mb-1 text-xs sm:text-sm">📋 Google Tasks 聯動</span>
                <span className="text-[11px] text-dark-muted leading-relaxed">直接在新分頁拉取與勾選您在 Google Tasks 的待辦事項，並透過語音開會結論一鍵派發任務。</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: 本地 AI 偵測與排錯 */}
      {activeTab === 'debug' && (
        <div className="space-y-6">
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-dark-primary mb-3 flex items-center gap-2">
              🤖 本地 AI (Gemini Nano) 開發排錯說明
            </h2>
            <p className="text-dark-muted leading-relaxed mb-4 text-xs sm:text-sm">
              如果您在使用 AI 助理時遇到錯誤，或是不確定瀏覽器的 Gemini Nano 是否已經就緒，您可以直接使用以下偵測腳本進行排錯。
            </p>

            <div className="space-y-4">
              <div>
                <strong className="text-dark-primary text-xs sm:text-sm block mb-1">💡 診斷使用步驟：</strong>
                <ol className="list-decimal list-inside space-y-1 text-xs text-dark-muted pl-1">
                  <li>在您的瀏覽器任意位置按 <kbd className="px-1.5 py-0.5 rounded bg-dark-surface border border-dark-border-default font-mono text-[10px] text-dark-primary font-bold">F12</kbd> (或按右鍵選擇「檢查」) 開啟開發者工具。</li>
                  <li>切換到 <strong className="text-dark-primary">Console (主控台)</strong> 分頁。</li>
                  <li>複製下方代碼框中的完整內容，並貼到 Console 中按 Enter 執行。</li>
                  <li>根據 Console 中輸出的日誌，您即可得知 API 命名空間是否缺失、模型是否就緒、或是否有其他錯誤資訊。</li>
                </ol>
              </div>

              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-dark-secondary">💻 診斷排錯測試代碼：</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(DEBUG_CODE).then(() => {
                        alert("📋 排錯代碼已複製到剪貼簿！");
                      });
                    }}
                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded transition-all"
                  >
                    📋 複製代碼
                  </button>
                </div>

                <pre className="bg-dark-surface p-4 rounded-lg border border-dark-border-default overflow-x-auto text-[11px] text-emerald-400 font-mono select-all max-h-80 overflow-y-auto">
                  {DEBUG_CODE}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
