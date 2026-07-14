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
      const event = cal.createEvent(\`[Scrum] \${payload.title}\`, startTime, endTime, {
        description: payload.description || "Scrumclock 自動同步紀錄"
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
  const fileName = "scrumclock_sync_data.json";
  const files = DriveApp.getFilesByName(fileName);
  if (files.hasNext()) {
    return files.next();
  } else {
    return DriveApp.createFile(fileName, "{}");
  }
}`;

export const InstallDocs: React.FC = () => {
  const [copied, setCopied] = useState(false);

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
        <h1 className="text-3xl font-bold text-dark-primary mb-2">📖 同步後台安裝說明</h1>
        <p className="text-dark-muted">教您如何透過 Google Apps Script 同步任務與行事曆</p>
      </div>

      {/* 步驟 1 */}
      <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 mb-6 shadow-lg shadow-slate-950/40">
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
      <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 mb-6 shadow-lg shadow-slate-950/40">
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
      <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 mb-6 shadow-lg shadow-slate-950/40">
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
      <div className="bg-dark-card border border-dark-border-subtle rounded-xl p-6 mb-6 shadow-lg shadow-slate-950/40">
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
  );
};
