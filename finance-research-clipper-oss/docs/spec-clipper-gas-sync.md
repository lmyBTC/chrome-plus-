/**
 * ============================================================================
 * Google Apps Script (Code.gs) - 開源部署範本 (專業 12 欄位版)
 * ============================================================================
 * 
 * 💡 使用說明：
 * 1. 請在您的 Google 雲端硬碟建立一個新的試算表，並將工作表命名為 "Main" (或是修改下方代碼中的名稱)。
 * 2. 在試算表中點擊「延伸功能」 -> 「Apps Script」，將本檔案的代碼完整複製並貼入編輯器中。
 * 3. 點擊儲存，然後點擊「部署」 -> 「新增部署作業」。
 * 4. 類型選擇「網頁應用程式 (Web App)」，並配置如下：
 *    - 執行身分：您的 Google 帳戶 (我)
 *    - 誰有權限存取：任何人 (Anyone) -> 這是使 Chrome 插件能順利 POST 數據的必要設置
 * 5. 完成部署後，請複製產生的「網頁應用程式 URL」並填入 Chrome 插件的設定面板中。
 * 
 * ⚠️ 安全提醒：
 * - 部署網頁應用程式後，該 Web App URL 即可繞過登入對試算表寫入數據。請務必妥善保管，勿將該 URL 提交至公開的 Git 倉庫或與他人共用。
 * ============================================================================
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: "error", success: false, message: "未接收到 POST 資料內容" });
    }

    const data = JSON.parse(e.postData.contents);
    
    // 1. 智慧試算表定位：優先支援外掛設定之 Google Sheets URL，次選當前綁定之試算表
    let ss = null;
    const targetUrl = (data.sheetUrl || data.userSpreadsheetUrl || data.sheetsUrl || "").trim();
    if (targetUrl && targetUrl.startsWith("https://docs.google.com/spreadsheets/")) {
      try {
        ss = SpreadsheetApp.openByUrl(targetUrl);
      } catch (openErr) {
        console.warn("無法透過 URL 開啟試算表，改用預設試算表:", openErr);
      }
    }
    if (!ss) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    if (!ss) {
      return responseJSON({ status: "error", success: false, message: "找不到目標試算表，請確認已綁定試算表或在插件設定中填入試算表網址" });
    }

    // 2. 智慧工作表解析：優先使用 "Main" 或 "Portfolio_Tracking"，若不存在則自動使用當前第一個工作表
    let sheet = ss.getSheetByName("Main") || ss.getSheetByName("Portfolio_Tracking") || ss.getActiveSheet();
    if (!sheet) {
      sheet = ss.insertSheet("Main");
    }

    // 3. 檢查現有表頭與欄位數
    let lastCol = sheet.getLastColumn();
    let lastRow = sheet.getLastRow();

    // 表頭自動初始化 (僅當為全新空白試算表時，自動建立預設 12 欄專業表頭與凍結列)
    if (lastRow === 0 || lastCol === 0) {
      const defaultHeaders = [
        "UUID", "時間戳記 (Timestamp)", "觀測標的 (Ticker)", "價格 (Price)", 
        "研報筆記 (Note)", "狀態 (Status)", "情緒 (Sentiment)", "截圖 (Screenshot)", 
        "標普500 (S&P 500)", "那斯達克 (Nasdaq)", "市值 (Market Cap)", "本益比 (P/E)"
      ];
      sheet.appendRow(defaultHeaders);
      const headerRange = sheet.getRange(1, 1, 1, defaultHeaders.length);
      headerRange.setBackground("#1a73e8")
                 .setFontColor("#ffffff")
                 .setFontWeight("bold")
                 .setHorizontalAlignment("center")
                 .setVerticalAlignment("middle");
      sheet.setRowHeight(1, 35);
      sheet.setFrozenRows(1);
      lastCol = defaultHeaders.length;
      lastRow = 1;
    }
    
    // 4. 判定動作：相容 SYNC_PORTFOLIO (新合約)、CREATE (舊範本)、以及預設寫入
    const action = (data.action || data.type || "create").toUpperCase();

    if (action === "SYNC_PORTFOLIO" || action === "CREATE") {
      const item = data.payload || data;
      const uuid = data.uuid || Utilities.getUuid();
      const timestamp = new Date();
      const mode = data.mode || "stock";
      
      const rawTicker = String(item.ticker || data.ticker || "UNKNOWN").trim().toUpperCase();
      // 乾淨代號 (去除 :NASDAQ, :NYSE 等交易所後綴以方便比對與展示)
      const cleanTicker = rawTicker.replace(/:(NASDAQ|NYSE|AMEX|TPE|OTC)$/i, "");
      const price = String(item.price || data.price || "N/A");
      const note = String(item.notes || item.note || data.note || data.notes || data.aiDigest || "");
      const marketCap = String(item.marketCap || item.mktcap || data.marketCap || data.mktcap || "N/A");
      const beta = String(item.beta || data.beta || "N/A");
      const low52 = String(item.low52 || data.low52 || "N/A");
      const high52 = String(item.high52 || data.high52 || "N/A");
      const targetPrice = String(item.targetPrice || data.targetPrice || "N/A");
      const pe = String(item.pe || data.pe || "N/A");
      const yieldVal = String(item.yield || data.yield || "N/A");
      const sp500 = String(data.sp500 || item.sp500 || "N/A");
      const nasdaq = String(data.nasdaq || item.nasdaq || "N/A");
      const sentiment = data.sentiment || item.sentiment || analyzeSentiment(note);
      
      let screenshotUrl = "N/A";
      if (data.screenshot) {
        screenshotUrl = saveScreenshotToDrive(data.screenshot, cleanTicker);
      }

      // 5. 智慧讀取現有表頭 (Row 1)，動態對齊欄位數值
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      
      const newRowValues = headers.map(header => {
        const h = String(header).trim().toLowerCase();
        if (/^ticker|代號|標的|symbol/.test(h)) return cleanTicker;
        if (/^price|現價|價格|目前價格/.test(h)) return price;
        if (/marketcap|mktcap|市值/.test(h)) return marketCap;
        if (/^beta|貝他/.test(h)) return beta;
        if (/low52|52.*(低|low)/.test(h)) return low52;
        if (/high52|52.*(高|high)/.test(h)) return high52;
        if (/target.*price|目標價/.test(h)) return targetPrice;
        if (/uuid/.test(h)) return uuid;
        if (/timestamp|時間|日期/.test(h)) return timestamp;
        if (/note|筆記|觀點/.test(h)) return note;
        if (/status|狀態/.test(h)) return "Pending";
        if (/sentiment|情緒/.test(h)) return sentiment;
        if (/screenshot|截圖/.test(h)) return screenshotUrl;
        if (/^pe|本益比/.test(h)) return pe;
        if (/yield|殖利率/.test(h)) return yieldVal;
        if (/sp500|標普/.test(h)) return sp500;
        if (/nasdaq|那斯達克/.test(h)) return nasdaq;
        return "";
      });

      // 6. 同代號覆蓋更新機制 (Smart Upsert)
      let targetRowIndex = -1;
      const tickerColIndex = headers.findIndex(h => /ticker|代號|標的|symbol/i.test(String(h).trim()));
      
      if (tickerColIndex >= 0 && lastRow > 1) {
        const existingTickers = sheet.getRange(2, tickerColIndex + 1, lastRow - 1, 1).getValues();
        for (let i = 0; i < existingTickers.length; i++) {
          const rowVal = String(existingTickers[i][0]).replace(/:(NASDAQ|NYSE|AMEX|TPE|OTC)$/i, "").trim().toUpperCase();
          if (rowVal === cleanTicker) {
            targetRowIndex = i + 2; // +2 因為第 1 列為表頭且 1-indexed
            break;
          }
        }
      }

      if (targetRowIndex > 0) {
        // 已存在同代號：原地覆蓋更新！
        sheet.getRange(targetRowIndex, 1, 1, newRowValues.length).setValues([newRowValues]);
      } else {
        // 不存在同代號：新增列！
        sheet.appendRow(newRowValues);
        targetRowIndex = sheet.getLastRow();
      }
      
      return responseJSON({ 
        status: "success", 
        success: true, 
        uuid: uuid, 
        ticker: cleanTicker, 
        row: targetRowIndex,
        mode: targetRowIndex <= lastRow ? "updated" : "appended",
        message: `成功將 [${cleanTicker}] 數據智慧同步至試算表！` 
      });
      
    } else if (action === "UPDATE") {
      const uuid = data.uuid;
      const newStatus = data.status;
      const rows = sheet.getDataRange().getValues();
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === uuid) {
          sheet.getRange(i + 1, 6).setValue(newStatus);
          return responseJSON({ status: "success", success: true, message: `UUID ${uuid} updated to ${newStatus}` });
        }
      }
      return responseJSON({ status: "error", success: false, message: "UUID not found" });
    }
    
    return responseJSON({ status: "error", success: false, message: `Invalid action: ${action}` });
  } catch(err) {
    return responseJSON({ status: "error", success: false, message: err.message });
  }
}

/**
 * 將截圖儲存至 Google Drive 並回傳連結
 */
function saveScreenshotToDrive(base64Data, ticker) {
  try {
    const folderName = "Finance_Research_Screenshots";
    let folder;
    const folders = DriveApp.getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    const contentType = "image/jpeg";
    const rawData = base64Data.split(",")[1];
    const blob = Utilities.newBlob(Utilities.base64Decode(rawData), contentType, `${ticker}_${new Date().getTime()}.jpg`);
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (e) {
    return "Error: " + e.toString();
  }
}

/**
 * 簡單的情緒分析邏輯 (基於關鍵字)
 */
function analyzeSentiment(text) {
  if (!text) return "😐 中性";
  const bullishWords = ["看多", "強勁", "增長", "優於", "買入", "多頭", "潛力", "利多", "Blackwell", "需求強勁"];
  const bearishWords = ["看空", "疲軟", "下降", "落後", "賣出", "空頭", "風險", "利空", "高估", "飽和"];
  let score = 0;
  bullishWords.forEach(word => { if (text.includes(word)) score++; });
  bearishWords.forEach(word => { if (text.includes(word)) score--; });
  if (score > 0) return "📈 看多 (Bullish)";
  if (score < 0) return "📉 看空 (Bearish)";
  return "😐 中性";
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}