/**
 * ==============================================================================
 * Google Apps Script (GAS) Sync Hub - Chrome Plus 雲端雙軌同步中樞
 * ==============================================================================
 * 
 * 專案定位：
 * 本腳本為 Chrome Plus 擴充功能生態系（ScrumClock、FinanceClipper）與 Google Workspace
 * （Google Sheets、Google Tasks）之間的免審核輕量 Webhook 橋接服務。
 * 
 * 核心特色：
 * 1. 零 Chrome Web Store OAuth 審核負擔：使用者自行部署於個人 Google 帳號。
 * 2. 雙軌分工：
 *    - Google Sheets：戰報數據湖 (DailyLogs) 與 投研沙盒 (Portfolio_Tracking)。
 *    - Google Tasks：今日焦點待辦與跨裝置靈感收集箱。
 * 3. 冪等防重複機制：日期與個股代碼智慧比對更新，杜絕重複行堆疊。
 * 
 * 部署前置要求：
 * 在 Apps Script 編輯器左側導航欄「服務 (Services)」點擊「+」，啟用【Google Tasks API (v1)】。
 * 
 * @version 1.0.0
 * @date 2026-10-08
 */

/**
 * 處理 HTTP GET 請求
 * 支援健康檢查與快捷資料提取
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "PING";

    if (action === "PING" || action === "HEALTH") {
      return createJsonResponse({
        status: "ok",
        service: "Chrome Plus Google Sync Hub",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
      });
    }

    if (action === "FETCH_INBOX_TASKS") {
      const tasklistTitle = (e.parameter && e.parameter.listName) || "@ScrumClock-Today";
      const tasks = fetchGoogleTasks(tasklistTitle);
      return createJsonResponse({
        status: "success",
        count: tasks.length,
        tasks: tasks
      });
    }

    return createJsonResponse({
      status: "error",
      message: "未知的 GET 指令: " + action
    });
  } catch (err) {
    return createJsonResponse({
      status: "error",
      error: err.toString()
    });
  }
}

/**
 * 處理 HTTP POST 請求 (主要 Webhook 入口)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        status: "error",
        message: "無效的請求：Payload 為空"
      });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({
        status: "error",
        message: "JSON 解析失敗: " + parseErr.toString()
      });
    }

    const action = data.action;
    const payload = data.payload || {};

    switch (action) {
      // 1. ScrumClock 日終戰報 -> Google Sheets
      case "SYNC_DAILY_LOG":
        return handleSyncDailyLog(payload);

      // 2. ScrumClock 焦點戰役 -> Google Tasks
      case "CREATE_GOOGLE_TASK":
        return handleCreateGoogleTask(payload);

      // 3. FinanceClipper 研報數據 -> Google Sheets
      case "SYNC_PORTFOLIO":
        return handleSyncPortfolio(payload);

      // 4. Google Tasks 逆向匯入看板收件匣
      case "FETCH_INBOX_TASKS":
        const listName = payload.listName || "@ScrumClock-Today";
        const fetchedTasks = fetchGoogleTasks(listName);
        return createJsonResponse({
          status: "success",
          count: fetchedTasks.length,
          tasks: fetchedTasks
        });

      default:
        return createJsonResponse({
          status: "error",
          message: "未支援的 Action: " + action
        });
    }
  } catch (err) {
    return createJsonResponse({
      status: "error",
      error: err.toString()
    });
  }
}

// ==============================================================================
// 業務邏輯處理器 (Action Handlers)
// ==============================================================================

/**
 * 1. 同步日終戰報至 Google Sheets ("DailyLogs")
 * 具備同日資料覆蓋 (Upsert) 冪等邏輯
 */
function handleSyncDailyLog(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("DailyLogs");
  
  if (!sheet) {
    sheet = ss.insertSheet("DailyLogs");
  }

  const headers = ["日期", "番茄數", "完成任務數", "專注分鐘", "核心亮點", "教訓反思", "AI摘要", "最後更新時間"];
  
  // 若為空白試算表，自動建立表頭並凍結首列
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#F3F4F6");
    sheet.setFrozenRows(1);
  }

  const dateStr = payload.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const pomodoros = Number(payload.spentPomodoros) || 0;
  const taskCount = Number(payload.completedTasksCount) || 0;
  const focusMinutes = Number(payload.focusMinutes) || (pomodoros * 25);
  const highlights = payload.highlights || "";
  const lessons = payload.lessons || "";
  const aiDigest = payload.aiDigest || "";
  const updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  const rowData = [
    dateStr,
    pomodoros,
    taskCount,
    focusMinutes,
    highlights,
    lessons,
    aiDigest,
    updatedAt
  ];

  // 尋找當日是否已有紀錄 (第 1 欄)
  const lastRow = sheet.getLastRow();
  let targetRow = -1;

  if (lastRow > 1) {
    const dates = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < dates.length; i++) {
      let cellVal = dates[i][0];
      if (cellVal instanceof Date) {
        cellVal = Utilities.formatDate(cellVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      if (String(cellVal).trim() === String(dateStr).trim()) {
        targetRow = i + 2; // +2 因 1-indexed 且排除表頭
        break;
      }
    }
  }

  if (targetRow > 0) {
    // 覆蓋當日紀錄
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    return createJsonResponse({
      status: "success",
      target: "DailyLogs",
      mode: "updated",
      row: targetRow,
      date: dateStr
    });
  } else {
    // 新增列
    sheet.appendRow(rowData);
    return createJsonResponse({
      status: "success",
      target: "DailyLogs",
      mode: "inserted",
      row: sheet.getLastRow(),
      date: dateStr
    });
  }
}

/**
 * 2. 建立或更新 Google Tasks 待辦
 * 前置依賴：需啟用 Tasks 服務
 */
function handleCreateGoogleTask(payload) {
  if (typeof Tasks === "undefined") {
    throw new Error("Google Tasks API 尚未在 Apps Script 啟用。請在編輯器左側「服務」中啟用 Google Tasks API。");
  }

  const listName = payload.listName || "@ScrumClock-Today";
  const taskListId = getOrCreateTaskList(listName);

  const taskResource = {
    title: payload.title || "未命名任務",
    notes: payload.notes || ""
  };

  const dueTime = payload.dueDate || payload.due;
  if (dueTime) {
    // Google Tasks RFC 3339 格式
    const d = new Date(dueTime);
    taskResource.due = d.toISOString();
  }

  if (payload.status) {
    taskResource.status = payload.status; // 'needsAction' 或 'completed'
  }

  let result;
  if (payload.taskId) {
    // 更新現有任務
    result = Tasks.Tasks.patch(taskResource, taskListId, payload.taskId);
  } else {
    // 建立新任務
    result = Tasks.Tasks.insert(taskResource, taskListId);
  }

  return createJsonResponse({
    status: "success",
    taskId: result.id,
    title: result.title,
    listId: taskListId
  });
}

/**
 * 3. 同步個股投研資料至 Google Sheets ("Portfolio_Tracking")
 */
function handleSyncPortfolio(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Portfolio_Tracking");
  
  if (!sheet) {
    sheet = ss.insertSheet("Portfolio_Tracking");
  }

  const headers = ["代碼", "名稱", "最新股價", "本益比(PE)", "殖利率(%)", "目標價", "評級/核心論點", "更新時間"];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#EEF2FF");
    sheet.setFrozenRows(1);
  }

  const ticker = String(payload.ticker || "").toUpperCase().trim();
  if (!ticker) {
    throw new Error("缺少個股代碼 (ticker)");
  }

  const name = payload.name || "";
  const price = payload.price !== undefined ? payload.price : "";
  const pe = payload.pe !== undefined ? payload.pe : "";
  const yieldVal = payload.yield !== undefined ? payload.yield : "";
  const targetPrice = payload.targetPrice !== undefined ? payload.targetPrice : "";
  const notes = payload.notes || payload.aiDigest || "";
  const updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  const rowData = [ticker, name, price, pe, yieldVal, targetPrice, notes, updatedAt];

  const lastRow = sheet.getLastRow();
  let targetRow = -1;

  if (lastRow > 1) {
    const tickers = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < tickers.length; i++) {
      if (String(tickers[i][0]).toUpperCase().trim() === ticker) {
        targetRow = i + 2;
        break;
      }
    }
  }

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    return createJsonResponse({
      status: "success",
      target: "Portfolio_Tracking",
      mode: "updated",
      ticker: ticker,
      row: targetRow
    });
  } else {
    sheet.appendRow(rowData);
    return createJsonResponse({
      status: "success",
      target: "Portfolio_Tracking",
      mode: "inserted",
      ticker: ticker,
      row: sheet.getLastRow()
    });
  }
}

/**
 * 4. 抓取 Google Tasks 未完成項目
 */
function fetchGoogleTasks(listName) {
  if (typeof Tasks === "undefined") {
    throw new Error("Google Tasks API 尚未在 Apps Script 啟用。請在編輯器左側「服務」中啟用 Google Tasks API。");
  }

  const listId = getOrCreateTaskList(listName);
  const tasksResp = Tasks.Tasks.list(listId, {
    showCompleted: false,
    showHidden: false,
    maxResults: 50
  });

  const rawTasks = tasksResp.items || [];
  return rawTasks.map(function(t) {
    return {
      id: t.id,
      title: t.title,
      notes: t.notes || "",
      due: t.due || null,
      updated: t.updated || null
    };
  });
}

// ==============================================================================
// 輔助工具函式 (Utility Functions)
// ==============================================================================

/**
 * 取得指定名稱之 TaskList，若不存在則尋找或退回預設清單
 */
function getOrCreateTaskList(name) {
  const lists = Tasks.Tasklists.list().items || [];
  for (let i = 0; i < lists.length; i++) {
    if (lists[i].title === name) {
      return lists[i].id;
    }
  }

  // 嘗試建立專屬清單
  try {
    const newList = Tasks.Tasklists.insert({ title: name });
    return newList.id;
  } catch (err) {
    // 若權限或限制無法新建，退回第一筆預設清單
    if (lists.length > 0) {
      return lists[0].id;
    }
    throw new Error("無法建立或取得 Google Tasks 清單: " + err.toString());
  }
}

/**
 * 建立 JSON 格式的回傳輸出 (包含跨域支援)
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
