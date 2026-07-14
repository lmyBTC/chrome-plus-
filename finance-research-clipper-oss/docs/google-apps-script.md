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
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Main");
    
    if (data.action === "create") {
      const uuid = Utilities.getUuid();
      const timestamp = new Date();
      const mode = data.mode || "stock";
      
      // 執行情緒分析
      const sentiment = analyzeSentiment(data.note);
      
      // 處理截圖 (如有)
      let screenshotUrl = "N/A";
      if (data.screenshot) {
        screenshotUrl = saveScreenshotToDrive(data.screenshot, data.ticker);
      }
      
      // 準備新增的一列資料 (共 12 欄)
      // 欄位定義：A:UUID, B:Timestamp, C:Ticker, D:Price, E:Note, F:Status, G:Sentiment, H:Screenshot, I:S&P500, J:Nasdaq, K:MarketCap, L:PE
      const newRow = [
        uuid,
        timestamp,
        data.ticker,
        data.price,
        data.note,
        "Pending",
        sentiment,
        screenshotUrl,
        data.sp500 || "N/A",
        data.nasdaq || "N/A",
        data.mktcap || "N/A",
        data.pe || "N/A"
      ];
      
      sheet.appendRow(newRow);
      const lastRow = sheet.getLastRow();
      
      // --- 自動化排版與上色 ---
      const totalCols = newRow.length;
      const rowRange = sheet.getRange(lastRow, 1, 1, totalCols);
      
      // 1. 根據模式上色
      if (mode === "ai") {
        rowRange.setBackground("#e8f0fe"); // 淺藍色 (AI 模式)
      } else {
        rowRange.setBackground("#e6f4ea"); // 淺綠色 (股票模式)
      }
      
      // 2. 格式優化 (自動對齊、換行、邊框)
      rowRange.setVerticalAlignment("middle");
      rowRange.setBorder(true, true, true, true, true, true, "#dadce0", SpreadsheetApp.BorderStyle.SOLID);
      sheet.getRange(lastRow, 5).setWrap(true); // Note 欄位自動換行
      
      // 3. 情緒標籤顏色優化
      const sentimentCell = sheet.getRange(lastRow, 7);
      if (sentiment.includes("看多")) sentimentCell.setFontColor("#1e8e3e").setFontWeight("bold");
      if (sentiment.includes("看空")) sentimentCell.setFontColor("#d93025").setFontWeight("bold");
      
      // 4. 截圖連結優化
      if (screenshotUrl !== "N/A" && !screenshotUrl.startsWith("Error")) {
        const screenshotCell = sheet.getRange(lastRow, 8);
        screenshotCell.setFormula(`=HYPERLINK("${screenshotUrl}", "🖼️ 查看截圖")`);
      }
      
      return responseJSON({ status: "success", uuid: uuid });
      
    } else if (data.action === "update") {
      const uuid = data.uuid;
      const newStatus = data.status;
      const rows = sheet.getDataRange().getValues();
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === uuid) {
          sheet.getRange(i + 1, 6).setValue(newStatus);
          return responseJSON({ status: "success", message: `UUID ${uuid} updated to ${newStatus}` });
        }
      }
      return responseJSON({ status: "error", message: "UUID not found" });
    }
    
    return responseJSON({ status: "error", message: "Invalid action" });
  } catch(err) {
    return responseJSON({ status: "error", message: err.message });
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