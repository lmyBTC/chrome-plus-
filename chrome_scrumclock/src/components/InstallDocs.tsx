import React, { useState } from 'react';

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

export const InstallDocs: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'setup' | 'guide'>('setup');

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
        <p className="text-dark-muted">了解如何設定同步後台，以及如何最大化利用此工具提升生產力</p>
      </div>

      {/* Tab 切換選單 */}
      <div className="flex justify-center gap-4 mb-8 border-b border-dark-border-subtle">
        <button
          onClick={() => setActiveTab('setup')}
          className={`px-6 py-3 font-semibold text-sm transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'setup'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-dark-muted hover:text-dark-primary'
          }`}
        >
          🔧 後台同步設定
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`px-6 py-3 font-semibold text-sm transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'guide'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-dark-muted hover:text-dark-primary'
          }`}
        >
          💡 最大化利用指南
        </button>
      </div>

      {/* Tab 1: 後台同步設定 */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          {/* 步驟 1 */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-dark-primary mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              建立 Google 試算表
            </h2>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>前往您的 Google 雲端硬碟，建立一個全新的 <strong className="text-dark-primary">Google 試算表</strong>。</li>
              <li>在該試算表中，建立兩個工作表 (Tabs)，分別命名為：
                <ul className="list-disc list-inside pl-6 mt-1 text-dark-muted">
                  <li><strong className="text-dark-primary">Tasks</strong> (用來管理北極星目標與週任務)</li>
                  <li><strong className="text-dark-primary">Logs</strong> (用來記錄每日衝刺與回顧)</li>
                </ul>
              </li>
              <li>在 <strong className="text-dark-primary">Tasks</strong> 工作表結構中：
                <ul className="list-disc list-inside pl-6 mt-1 text-dark-muted">
                  <li>A1 填寫：`北極星目標`，B1 填寫：您的北極星目標 (例如：`成為獨立開發者`)</li>
                  <li>A2 填寫：`本週關鍵任務`，B2 以下每行填寫一個關鍵任務</li>
                </ul>
              </li>
              <li>在 <strong className="text-dark-primary">Logs</strong> 工作表結構中，在第一列 (A1~F1) 分別填入以下標題：
                <div className="mt-2 bg-dark-surface p-2 rounded-lg font-mono text-xs border border-dark-border-default overflow-x-auto text-dark-primary whitespace-nowrap">
                  Timestamp | Date | Type | Mission / Highlight | Result / Lesson | Next Action
                </div>
              </li>
            </ol>
          </div>

          {/* 步驟 2 */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-dark-primary mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
              建立 Apps Script 並貼上程式碼
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
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all \${
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

          {/* 步驟 3 */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-dark-primary mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
              啟用進階服務 API
            </h2>
            <p className="mb-2 pl-2 text-dark-secondary">
              因為本插件支援了「Google Tasks 同步」與「行事曆事件自動建立」，請在 Apps Script 中啟用服務：
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>在 Apps Script 編輯器左側選單中，點擊 <strong className="text-dark-primary">「服務 (Services)」</strong> 旁邊的 <strong className="text-dark-primary font-bold">+</strong>。</li>
              <li>在彈出的服務清單中找到 <strong className="text-dark-primary">Google Tasks API</strong>，點擊 **新增 (Add)**。</li>
            </ol>
          </div>

          {/* 步驟 4 */}
          <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-dark-primary mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
              部署為網頁應用程式 (Web App)
            </h2>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>點擊右上方的 <strong className="text-dark-primary">「部署 (Deploy)」 &gt; 「新增部署作業 (New deployment)」</strong>。</li>
              <li>點擊齒輪圖示，選取類型為 <strong className="text-dark-primary">「網頁應用程式 (Web App)」</strong>。</li>
              <li>設定引導參數：
                <ul className="list-disc list-inside pl-6 mt-1 text-dark-muted">
                  <li>實施執行身分 (Execute as)：<strong className="text-dark-primary">我 (Me)</strong></li>
                  <li>誰可以存取 (Who has access)：<strong className="text-dark-primary">所有人 (Anyone)</strong></li>
                </ul>
              </li>
              <li>點擊下方 **部署 (Deploy)** 按鈕。過程中如有要求安全性授權核准，請依照提示點擊確認。</li>
              <li>部署完成後，複製產生的 <strong className="text-dark-primary">網頁應用程式網址 (Web App URL)</strong>。</li>
              <li>回到插件中的「全域設定」，在 **Google Apps Script URL (同步用)** 中貼上此網址並儲存，即完成雙向同步！</li>
            </ol>
          </div>
        </div>
      )}

      {/* Tab 2: 最大化利用指南 */}
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
    </div>
  );
};
