/**
 * ============================================================================
 * Chrome Plus - 統一 Google Apps Script (GAS) 雲端數據匯流智慧路由
 * 檔案：0.doc_mg/scripts/unified_gas_router.gs
 * 版本：v1.0.0 (Unified Protocol v1)
 * ============================================================================
 * 
 * 💡 功能特色：
 * 1. 【智慧多路分流】：依據 action 自動路由至 Tasks_Log 或 Stocks_Research。
 * 2. 【自動防呆建表】：首次執行時自動建立分頁、表頭、色彩標籤、欄位凍結與邊框樣式。
 * 3. 【批次同步支援】：支援 batch_finance_clip 一次寫入多筆個股，顯著提升寫入效能。
 * 4. 【交叉量化分析】：自動配置 Productivity_Cross_Analysis，動態統計各投資標的投入之專注番茄時數與研究價值比。
 * 5. 【安全防禦機制】：支援 Secret Token 驗證，防止未授權寫入。
 * 6. 【向後相容防護】：完全相容舊版 FinanceClipper { action: 'create' } 結構，舊外掛不中斷。
 * ============================================================================
 */

// 工作表名稱常數 (SSOT)
const SHEET_TASKS = "Tasks_Log";
const SHEET_STOCKS = "Stocks_Research";
const SHEET_ANALYSIS = "Productivity_Cross_Analysis";

/**
 * 主要 HTTP POST 處理器
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: "error", message: "缺少 POST 內容 (Empty payload)" });
    }

    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. 安全權杖校驗 (選填，若 Script Properties 有設置 SECRET_TOKEN 則強制校驗)
    const configuredSecret = PropertiesService.getScriptProperties().getProperty("SECRET_TOKEN");
    if (configuredSecret) {
      const incomingSecret = payload.secretToken || (payload.data && payload.data.secretToken);
      if (incomingSecret !== configuredSecret) {
        return responseJSON({ status: "error", message: "未授權存取：Secret Token 驗證失敗" });
      }
    }

    // 2. 確定路由動作 (相容舊版 action 與新版統一 envelope)
    const action = payload.action || "create";

    // 3. 依據 action 進行路由分流
    switch (action) {
      case "scrum_sync":
        return handleScrumSync(ss, payload);

      case "finance_clip":
        return handleFinanceClip(ss, payload);

      case "batch_finance_clip":
        return handleBatchFinanceClip(ss, payload);

      // 向後相容：FinanceClipper 舊版單一紀錄
      case "create":
        return handleLegacyFinanceCreate(ss, payload);

      case "update":
        return handleLegacyFinanceUpdate(ss, payload);

      default:
        return responseJSON({ status: "error", message: `未知操作指令 (Unknown action: ${action})` });
    }
  } catch (err) {
    return responseJSON({ status: "error", message: "伺服器內部錯誤: " + err.toString() });
  }
}

/**
 * 處理 ScrumClock 任務與專注時鐘同步 (Tasks_Log)
 */
function handleScrumSync(ss, payload) {
  const sheet = getOrCreateTasksSheet(ss);
  const data = payload.data || payload;
  const uuid = data.id || Utilities.getUuid();
  const timestamp = data.completedAt || new Date().toISOString();
  const taskText = data.text || data.title || "未命名任務";
  const ticker = (data.ticker || extractTickerFromTags(data.tags, taskText) || "").toUpperCase();
  const tags = Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "");
  const pomodoros = Number(data.completedPomodoros || 1);
  const estimated = Number(data.estimatedPomodoros || pomodoros);
  const durationMin = Number(data.durationMinutes || (pomodoros * 25));
  const status = data.status || "completed";
  const notes = data.notes || "";
  const source = "ScrumClock";

  // 11 欄位定義：UUID, 時間, 任務名稱, 標的代碼, 標籤, 完成番茄數, 預估番茄數, 總時長(分), 狀態, 備註, 來源
  const rowData = [
    uuid,
    timestamp,
    taskText,
    ticker,
    tags,
    pomodoros,
    estimated,
    durationMin,
    status,
    notes,
    source
  ];

  sheet.appendRow(rowData);
  const lastRow = sheet.getLastRow();
  formatTasksRow(sheet, lastRow, ticker);

  // 確保交叉分析表同步更新公式參照
  ensureCrossAnalysisSheet(ss);

  return responseJSON({
    status: "success",
    action: "scrum_sync",
    uuid: uuid,
    ticker: ticker,
    message: "專注時鐘紀錄已順利同步至 Tasks_Log"
  });
}

/**
 * 處理 FinanceClipper 單筆研報同步 (Stocks_Research)
 */
function handleFinanceClip(ss, payload) {
  const sheet = getOrCreateStocksSheet(ss);
  const data = payload.data || payload;
  const uuid = Utilities.getUuid();
  const timestamp = data.timestamp || new Date().toISOString();
  const ticker = (data.ticker || "UNKNOWN").toUpperCase();
  const name = data.name || "";
  const price = data.price !== undefined ? data.price : "";
  const rating = data.analystRating || (data.analyst && data.analyst.rating) || "中立 (Hold)";
  const targetPrice = data.analystTargetPrice || (data.analyst && data.analyst.targetPrice) || "";
  const sentiment = data.sentiment || analyzeSentiment(data.note || "");
  const note = data.note || "";
  const pe = data.pe || (data.stats && data.stats.pe) || "N/A";
  const mktcap = data.mktcap || (data.stats && data.stats.mktcap) || "N/A";
  const screenshot = data.screenshotUrl || (data.screenshot ? saveScreenshotToDrive(data.screenshot, ticker) : "N/A");
  const marketCompare = formatMarketCompare(data);
  const sourceUrl = data.sourceUrl || (data.url || "");

  // 14 欄位：UUID, 時間, Ticker, 公司名稱, 股價, 分析師評級, 目標價, 情緒, 研究筆記, 本益比, 市值, 截圖, 大盤指數, 網址
  const rowData = [
    uuid,
    timestamp,
    ticker,
    name,
    price,
    rating,
    targetPrice,
    sentiment,
    note,
    pe,
    mktcap,
    screenshot,
    marketCompare,
    sourceUrl
  ];

  sheet.appendRow(rowData);
  const lastRow = sheet.getLastRow();
  formatStocksRow(sheet, lastRow, sentiment, screenshot, sourceUrl);

  // 確保交叉分析表存在
  ensureCrossAnalysisSheet(ss);

  return responseJSON({
    status: "success",
    action: "finance_clip",
    uuid: uuid,
    ticker: ticker,
    message: `個股研報 [${ticker}] 已成功同步至 Stocks_Research`
  });
}

/**
 * 處理 FinanceClipper 批次研報同步 (batch_finance_clip)
 */
function handleBatchFinanceClip(ss, payload) {
  const sheet = getOrCreateStocksSheet(ss);
  const items = payload.data && Array.isArray(payload.data.items) ? payload.data.items : (Array.isArray(payload.data) ? payload.data : []);

  if (items.length === 0) {
    return responseJSON({ status: "error", message: "批次同步陣列為空 (Empty items)" });
  }

  const rowsToAppend = [];
  const startRow = sheet.getLastRow() + 1;

  items.forEach(data => {
    const uuid = Utilities.getUuid();
    const timestamp = data.timestamp || new Date().toISOString();
    const ticker = (data.ticker || "UNKNOWN").toUpperCase();
    const name = data.name || "";
    const price = data.price !== undefined ? data.price : "";
    const rating = data.analystRating || (data.analyst && data.analyst.rating) || "中立 (Hold)";
    const targetPrice = data.analystTargetPrice || (data.analyst && data.analyst.targetPrice) || "";
    const sentiment = data.sentiment || analyzeSentiment(data.note || "");
    const note = data.note || "";
    const pe = data.pe || (data.stats && data.stats.pe) || "N/A";
    const mktcap = data.mktcap || (data.stats && data.stats.mktcap) || "N/A";
    const screenshot = data.screenshotUrl || "N/A";
    const marketCompare = formatMarketCompare(data);
    const sourceUrl = data.sourceUrl || (data.url || "");

    rowsToAppend.push([
      uuid, timestamp, ticker, name, price, rating, targetPrice,
      sentiment, note, pe, mktcap, screenshot, marketCompare, sourceUrl
    ]);
  });

  if (rowsToAppend.length > 0) {
    const range = sheet.getRange(startRow, 1, rowsToAppend.length, rowsToAppend[0].length);
    range.setValues(rowsToAppend);

    // 格式化整個區間
    for (let i = 0; i < rowsToAppend.length; i++) {
      const curRow = startRow + i;
      const sentiment = rowsToAppend[i][7];
      const screenshot = rowsToAppend[i][11];
      const sourceUrl = rowsToAppend[i][13];
      formatStocksRow(sheet, curRow, sentiment, screenshot, sourceUrl);
    }
  }

  ensureCrossAnalysisSheet(ss);

  return responseJSON({
    status: "success",
    action: "batch_finance_clip",
    count: rowsToAppend.length,
    message: `成功批次寫入 ${rowsToAppend.length} 筆個股研報至 Stocks_Research`
  });
}

/**
 * 向後相容舊版 FinanceClipper 單筆建立
 */
function handleLegacyFinanceCreate(ss, payload) {
  let sheet = ss.getSheetByName("Main");
  if (!sheet) {
    // 若無舊 Main 表，轉發給 Stocks_Research
    return handleFinanceClip(ss, { data: payload });
  }

  const uuid = Utilities.getUuid();
  const timestamp = new Date();
  const sentiment = analyzeSentiment(payload.note || "");
  let screenshotUrl = "N/A";
  if (payload.screenshot) {
    screenshotUrl = saveScreenshotToDrive(payload.screenshot, payload.ticker || "STOCK");
  }

  const newRow = [
    uuid,
    timestamp,
    payload.ticker || "UNKNOWN",
    payload.price || "N/A",
    payload.note || "",
    "Pending",
    sentiment,
    screenshotUrl,
    payload.sp500 || "N/A",
    payload.nasdaq || "N/A",
    payload.mktcap || "N/A",
    payload.pe || "N/A"
  ];

  sheet.appendRow(newRow);
  return responseJSON({ status: "success", uuid: uuid, message: "已向後相容寫入 Main 表" });
}

/**
 * 向後相容舊版狀態更新
 */
function handleLegacyFinanceUpdate(ss, payload) {
  const sheet = ss.getSheetByName("Main") || getOrCreateStocksSheet(ss);
  const uuid = payload.uuid;
  const newStatus = payload.status;
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === uuid) {
      sheet.getRange(i + 1, 6).setValue(newStatus);
      return responseJSON({ status: "success", message: `UUID ${uuid} 已更新為 ${newStatus}` });
    }
  }
  return responseJSON({ status: "error", message: "找不到指定 UUID" });
}

// ============================================================================
// 工作表初始化與防呆樣式處理 (Sheets Initialization & Formatting)
// ============================================================================

/**
 * 取得或建立 Tasks_Log 分頁
 */
function getOrCreateTasksSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_TASKS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TASKS);
    const headers = [
      "UUID", "完成時間", "任務名稱", "標的代碼", "標籤",
      "完成番茄數", "預估番茄數", "總時長(分鐘)", "狀態", "執行備註", "來源"
    ];
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1a73e8")
               .setFontColor("#ffffff")
               .setFontWeight("bold")
               .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 120); // UUID
    sheet.setColumnWidth(2, 160); // 時間
    sheet.setColumnWidth(3, 240); // 任務
    sheet.setColumnWidth(4, 90);  // Ticker
    sheet.setColumnWidth(5, 120); // 標籤
    sheet.setColumnWidth(8, 100); // 總時長
    sheet.setColumnWidth(10, 240);// 備註
  }
  return sheet;
}

/**
 * 取得或建立 Stocks_Research 分頁
 */
function getOrCreateStocksSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_STOCKS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_STOCKS);
    const headers = [
      "UUID", "研究時間", "Ticker", "公司名稱", "當前價格",
      "分析師評級", "目標價", "研究情緒", "分析筆記",
      "本益比", "市值", "圖表截圖", "大盤表現", "研報連結"
    ];
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#0d904f")
               .setFontColor("#ffffff")
               .setFontWeight("bold")
               .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 120); // UUID
    sheet.setColumnWidth(2, 160); // 時間
    sheet.setColumnWidth(3, 90);  // Ticker
    sheet.setColumnWidth(4, 160); // 公司名稱
    sheet.setColumnWidth(9, 280); // 分析筆記
    sheet.setColumnWidth(12, 110);// 截圖
    sheet.setColumnWidth(14, 180);// 研報連結
  }
  return sheet;
}

/**
 * 試算表開啟時建立專屬選單
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📊 Chrome Plus 戰情室")
    .addItem("🔄 重新整理交叉分析模型", "refreshCrossAnalysisSheet")
    .addItem("📋 初始化所有分頁", "initializeAllSheets")
    .addToUi();
}

/**
 * 手動重新整理交叉分析模型
 */
function refreshCrossAnalysisSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureCrossAnalysisSheet(ss, true);
  SpreadsheetApp.getActiveSpreadsheet().toast("交叉分析模型與動態公式已成功重新整理！", "Chrome Plus", 3);
}

/**
 * 手動初始化所有分頁
 */
function initializeAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateTasksSheet(ss);
  getOrCreateStocksSheet(ss);
  ensureCrossAnalysisSheet(ss, true);
  SpreadsheetApp.getActiveSpreadsheet().toast("所有分頁初始化完成！", "Chrome Plus", 3);
}

/**
 * 確保 Productivity_Cross_Analysis 交叉分析量化分頁存在且具備動態彙整公式
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss 試算表物件
 * @param {boolean} forceRefresh 是否強制刷新表頭與公式
 */
function ensureCrossAnalysisSheet(ss, forceRefresh = false) {
  let sheet = ss.getSheetByName(SHEET_ANALYSIS);
  const exists = !!sheet;
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ANALYSIS);
  } else if (!forceRefresh) {
    return sheet;
  }

  // 清除舊公式與格式（若為 forceRefresh）
  if (forceRefresh) {
    sheet.clear();
  }

  // 設定分頁標籤色彩 (紫色)
  sheet.setTabColor("#8430ce");

  // 1. 主要報表表頭 (A1:I1)
  const headers = [
    "標的代碼", "研報次數", "投入番茄鐘總數", "總專注時長(小時)",
    "最新股價", "目標價", "潛在空間 (%)", "分析師評級", "研究效益評估"
  ];
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers])
             .setBackground("#8430ce")
             .setFontColor("#ffffff")
             .setFontWeight("bold")
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 110); // 標的代碼
  sheet.setColumnWidth(2, 100); // 研報次數
  sheet.setColumnWidth(3, 140); // 投入番茄鐘總數
  sheet.setColumnWidth(4, 150); // 總專注時長(小時)
  sheet.setColumnWidth(5, 110); // 最新股價
  sheet.setColumnWidth(6, 110); // 目標價
  sheet.setColumnWidth(7, 130); // 潛在空間 (%)
  sheet.setColumnWidth(8, 120); // 分析師評級
  sheet.setColumnWidth(9, 210); // 研究效益評估

  // 2. 注入動態陣列公式 (全面採用 ARRAYFORMULA 與 MAP 自動展延，無需手動下拉)
  
  // A2: 自動列出在 Stocks_Research 或 Tasks_Log 出現之不重複標的代碼（過濾空白並排序）
  sheet.getRange("A2").setFormula(
    `=IFERROR(SORT(UNIQUE(FILTER({IFERROR(${SHEET_STOCKS}!C2:C, ""); IFERROR(${SHEET_TASKS}!D2:D, "")}, {IFERROR(${SHEET_STOCKS}!C2:C, ""); IFERROR(${SHEET_TASKS}!D2:D, "")}<>""))), "暫無標的")`
  );

  // B2: 研報筆數 (COUNTIF 陣列)
  sheet.getRange("B2").setFormula(
    `=ARRAYFORMULA(IF(A2:A="","", COUNTIF(${SHEET_STOCKS}!C:C, A2:A)))`
  );

  // C2: 投入番茄鐘總數 (SUMIF 陣列)
  sheet.getRange("C2").setFormula(
    `=ARRAYFORMULA(IF(A2:A="","", SUMIF(${SHEET_TASKS}!D:D, A2:A, ${SHEET_TASKS}!F:F)))`
  );

  // D2: 總專注時長(小時) (換算番茄鐘為小時，保留 1 位小數)
  sheet.getRange("D2").setFormula(
    `=ARRAYFORMULA(IF(A2:A="","", ROUND(C2:C * 25 / 60, 1)))`
  );

  // E2: 最新股價 (MAP + XLOOKUP，由下而上反向查詢最新一筆)
  sheet.getRange("E2").setFormula(
    `=MAP(A2:INDEX(A2:A, MAX(2, COUNTA(A2:A))), LAMBDA(t, IF(t="","", IFERROR(XLOOKUP(t, ${SHEET_STOCKS}!C:C, ${SHEET_STOCKS}!E:E, "N/A", 0, -1), "N/A"))))`
  );

  // F2: 目標價 (MAP + XLOOKUP，反向查詢最新一筆)
  sheet.getRange("F2").setFormula(
    `=MAP(A2:INDEX(A2:A, MAX(2, COUNTA(A2:A))), LAMBDA(t, IF(t="","", IFERROR(XLOOKUP(t, ${SHEET_STOCKS}!C:C, ${SHEET_STOCKS}!G:G, "N/A", 0, -1), "N/A"))))`
  );

  // G2: 潛在空間 % (MAP 判斷是否為數值並計算回報空間)
  sheet.getRange("G2").setFormula(
    `=MAP(E2:INDEX(E2:E, MAX(2, COUNTA(A2:A))), F2:INDEX(F2:F, MAX(2, COUNTA(A2:A))), LAMBDA(p, tp, IF(OR(p="", tp="", NOT(ISNUMBER(p)), NOT(ISNUMBER(tp))), "N/A", TEXT((tp-p)/p, "+0.0%;-0.0%"))))`
  );

  // H2: 分析師評級 (MAP + XLOOKUP 最新評級)
  sheet.getRange("H2").setFormula(
    `=MAP(A2:INDEX(A2:A, MAX(2, COUNTA(A2:A))), LAMBDA(t, IF(t="","", IFERROR(XLOOKUP(t, ${SHEET_STOCKS}!C:C, ${SHEET_STOCKS}!F:F, "中立", 0, -1), "中立"))))`
  );

  // I2: 研究效益評估 (依番茄鐘投入等級劃分)
  sheet.getRange("I2").setFormula(
    `=MAP(C2:INDEX(C2:C, MAX(2, COUNTA(A2:A))), LAMBDA(pomo, IF(pomo="","", IF(pomo>=6, "🔥 深度核心配置 (≥6🍅)", IF(pomo>=2, "⭐ 重點關注 (2-5🍅)", "🌱 初步靈感 (1🍅)")))))`
  );

  // 3. 側邊戰情看板：Top 5 專注投入個股 (K1:M7)
  const kpiHeaders = ["排名", "深度研究標的", "累計專注時長(小時)"];
  const kpiHeaderRange = sheet.getRange("K1:M1");
  kpiHeaderRange.setValues([kpiHeaders])
                .setBackground("#4c1d95")
                .setFontColor("#ffffff")
                .setFontWeight("bold")
                .setHorizontalAlignment("center");

  sheet.setColumnWidth(11, 70);
  sheet.setColumnWidth(12, 130);
  sheet.setColumnWidth(13, 160);

  // K2 注入動態 QUERY 聚合排行榜
  sheet.getRange("K2").setFormula(
    `=IFERROR(QUERY(A2:D, "SELECT 'Top ' || ROW_NUMBER(), A, D WHERE A IS NOT NULL AND A != '暫無標的' ORDER BY D DESC LIMIT 5 LABEL 'Top ' || ROW_NUMBER() ''", 0), {"1", "尚無資料", "-"})`
  );

  return sheet;
}

/**
 * 格式化 Tasks 行
 */
function formatTasksRow(sheet, rowIdx, ticker) {
  const range = sheet.getRange(rowIdx, 1, 1, 11);
  range.setVerticalAlignment("middle");
  range.setBorder(true, true, true, true, true, true, "#e0e0e0", SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(rowIdx, 10).setWrap(true); // 備註自動換行

  if (ticker) {
    // 投資相關任務標亮微淡金底色
    range.setBackground("#fef9e7");
    sheet.getRange(rowIdx, 4).setFontWeight("bold").setFontColor("#b06000");
  } else {
    range.setBackground("#f8f9fa");
  }
}

/**
 * 格式化 Stocks 行
 */
function formatStocksRow(sheet, rowIdx, sentiment, screenshotUrl, sourceUrl) {
  const range = sheet.getRange(rowIdx, 1, 1, 14);
  range.setVerticalAlignment("middle");
  range.setBackground("#f0fdf4"); // 淺清新綠底色
  range.setBorder(true, true, true, true, true, true, "#e0e0e0", SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(rowIdx, 9).setWrap(true); // 筆記換行

  // 情緒色彩標記 (欄位 8: H)
  const sentimentCell = sheet.getRange(rowIdx, 8);
  if (sentiment.includes("看多") || sentiment.includes("Bullish")) {
    sentimentCell.setFontColor("#15803d").setFontWeight("bold");
  } else if (sentiment.includes("看空") || sentiment.includes("Bearish")) {
    sentimentCell.setFontColor("#b91c1c").setFontWeight("bold");
  }

  // 截圖連結超連結化 (欄位 12: L)
  if (screenshotUrl && screenshotUrl !== "N/A" && !screenshotUrl.startsWith("Error")) {
    sheet.getRange(rowIdx, 12).setFormula(`=HYPERLINK("${screenshotUrl}", "🖼️ 查看截圖")`);
  }

  // 研報連結超連結化 (欄位 14: N)
  if (sourceUrl && sourceUrl.startsWith("http")) {
    sheet.getRange(rowIdx, 14).setFormula(`=HYPERLINK("${sourceUrl}", "🔗 開啟 Google Finance")`);
  }
}

// ============================================================================
// 輔助工具函式 (Utility Functions)
// ============================================================================

/**
 * 從 tags 或文字中提煉出個股代碼
 */
function extractTickerFromTags(tags, text) {
  if (Array.isArray(tags)) {
    for (let tag of tags) {
      const clean = tag.replace(/^[#$]/, "").trim();
      if (/^[A-Za-z]{1,5}$/.test(clean) && clean.toUpperCase() !== "TASK") {
        return clean.toUpperCase();
      }
    }
  }
  const match = (text || "").match(/\$([A-Za-z]{1,5})\b/);
  return match ? match[1].toUpperCase() : "";
}

/**
 * 格式化大盤漲跌字串
 */
function formatMarketCompare(data) {
  const sp = data.sp500 || (data.stats && data.stats.sp500) || "";
  const nasdaq = data.nasdaq || (data.stats && data.stats.nasdaq) || "";
  if (!sp && !nasdaq) return "N/A";
  return `S&P: ${sp} | Nasdaq: ${nasdaq}`;
}

/**
 * 將 Base64 截圖存入 Google Drive
 */
function saveScreenshotToDrive(base64Data, ticker) {
  try {
    const folderName = "Chrome_Plus_Screenshots";
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    const contentType = "image/jpeg";
    const rawData = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
    const blob = Utilities.newBlob(Utilities.base64Decode(rawData), contentType, `${ticker}_${new Date().getTime()}.jpg`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "Error: " + e.toString();
  }
}

/**
 * 簡易情緒分析函式
 */
function analyzeSentiment(text) {
  if (!text) return "😐 中性";
  const bullishWords = ["看多", "強勁", "增長", "優於", "買入", "多頭", "潛力", "利多", "Blackwell", "升評", "超預期"];
  const bearishWords = ["看空", "疲軟", "下降", "落後", "賣出", "空頭", "風險", "利空", "高估", "降評", "低於預期"];
  let score = 0;
  bullishWords.forEach(w => { if (text.includes(w)) score++; });
  bearishWords.forEach(w => { if (text.includes(w)) score--; });
  if (score > 0) return "📈 看多 (Bullish)";
  if (score < 0) return "📉 看空 (Bearish)";
  return "😐 中性";
}

/**
 * 統一 JSON 回傳函式
 */
function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
