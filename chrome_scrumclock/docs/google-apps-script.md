# 每日循環儀表板 - Google Apps Script 同步後台

本文件說明如何將 `chrome_scrumclock` (每日循環儀表板) 透過 Google Apps Script 連接至 Google Sheets，實現雙向任務管理。

## 1. 建立 Google Sheets 試算表

1. 建立一個新的 Google 試算表。
2. 建立兩個工作表 (Tabs)，分別命名為：
   - `Tasks` (用來管理北極星目標與週任務)
   - `Logs` (用來記錄每日衝刺與回顧)

### 🚀 進階：啟用 Google Tasks API
如果你想要讓 Scrumclock 可以直接讀取你的 Google Tasks：
1. 在 Apps Script 編輯器左側選單，點擊 **「服務 (Services)」** 旁邊的 `+`。
2. 找到 **Google Tasks API**，點擊新增 (Add)。
3. 同意授權即可。

### 📁 進階：雲端硬碟 Drive 權限 (跨 Profile 同步必備)
本版本新增了跨瀏覽器 Profile 資料同步功能。當您初次在插件中點擊「推送」或「拉取」時，因為 Apps Script 會調用 `DriveApp` 於您的雲端硬碟根目錄建立 `scrumclock_sync_data.json` 備份檔，您需要依照 Google 提示進行**重新部署**並通過「授權存取雲端硬碟」的驗證。

### `Tasks` 工作表結構
- **A1**: `北極星目標`
- **B1**: (填寫你的北極星目標，例如：成為獨立開發者)
- **A2**: `本週關鍵任務`
- **B2 以下**: 每行填寫一個關鍵任務，例如 B2: `完成產品規格書`, B3: `學習 React Hooks`

### `Logs` 工作表結構
請在第一列 (A1~F1) 建立標題：
`Timestamp` | `Date` | `Type` (Review / Sprint) | `Mission / Highlight` | `Result / Lesson` | `Next Action`

## 2. 建立 Apps Script

1. 在試算表選單中點擊 **擴充功能 > Apps Script**。
2. 將預設的 `Code.gs` 清空，貼上以下程式碼：

```javascript
const SHEET_TASKS = "Tasks";
const SHEET_LOGS = "Logs";

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    // 新增：拉取完整的跨瀏覽器備份 AppData 資料
    if (action === 'pull_app_data') {
      const file = getOrCreateBackupFile();
      const content = file.getContentText();
      const appData = content ? JSON.parse(content) : null;
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: appData }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 如果指定 action=get_tasks，則從 Google Tasks 抓取代辦事項
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

    // 如果指定 action=get_today_events，則從 Google Calendar 抓取今日所有事件
    if (action === 'get_today_events') {
      const cal = CalendarApp.getDefaultCalendar();
      const today = new Date();
      // 將時間設定為今天的 00:00:00 到 23:59:59
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

    // 否則，預設從 Google Sheets 讀取北極星目標與週任務
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
    // 支援 text/plain 避免 CORS Preflight
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(SHEET_LOGS);
    
    if (payload.action === 'push_app_data') {
      // 新增：接收並更新雲端硬碟的 AppData 備份檔
      const file = getOrCreateBackupFile();
      file.setContent(JSON.stringify(payload.appData));
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (payload.action === 'log_sprint') {
      // 記錄單次衝刺
      logSheet.appendRow([
        new Date(),
        payload.date,
        "Sprint",
        payload.missionText,
        payload.result,
        ""
      ]);
    } else if (payload.action === 'log_review') {
      // 記錄日終回顧
      logSheet.appendRow([
        new Date(),
        payload.date,
        "Daily Review",
        payload.highlight,
        payload.lesson,
        payload.nextAction
      ]);
    } else if (payload.action === 'create_event') {
      // 推送至 Google Calendar
      const cal = CalendarApp.getDefaultCalendar();
      const startTime = new Date(payload.startTime);
      const endTime = new Date(payload.endTime);
      const event = cal.createEvent(`[Scrum] ${payload.title}`, startTime, endTime, {
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
      // 新增至 Google Tasks
      Tasks.Tasks.insert({ title: payload.title, notes: payload.notes || "" }, '@default');
    } else if (payload.action === 'complete_task') {
      // 標記 Google Task 為完成
      if (payload.taskId && payload.taskId.startsWith('gtask-')) {
        const rawTaskId = payload.taskId.replace('gtask-', '');
        try {
          const task = Tasks.Tasks.get('@default', rawTaskId);
          task.status = 'completed';
          Tasks.Tasks.patch(task, '@default', rawTaskId);
        } catch (e) {
          // 忽略找不到任務的錯誤
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

// 輔助函數：取得或建立 Google Drive 中的備份 JSON 檔案 (跨 Profile 同步)
function getOrCreateBackupFile() {
  const fileName = "scrumclock_sync_data.json";
  const files = DriveApp.getFilesByName(fileName);
  if (files.hasNext()) {
    return files.next();
  } else {
    return DriveApp.createFile(fileName, "{}");
  }
}

```

3. 點擊上方的 **「部署」 > 「新增部署作業」**。
4. 類型選擇 **「網頁應用程式」**。
5. **執行身分**：我
6. **誰可以存取**：所有人 (Anyone)
7. 部署後，複製 **網頁應用程式網址 (Web App URL)**。
8. 將該網址貼入 `chrome_scrumclock` 擴充功能的設定頁面中。
