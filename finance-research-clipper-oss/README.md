# Finance Research Clipper (Open-Source Version)

一個輕量、安全且隱私友好的 Chrome 瀏覽器擴充功能。幫助您在瀏覽 Google Finance 時，一鍵擷取股票數據、財務指標與個人筆記，並自動同步至您個人的 Google Sheets 雲端試算表。

此版本為**開源上架版本**，已徹底去識別化，無硬編碼任何個人敏感試算表 ID 或伺服器位址，完全採用本地 `chrome.storage.local` 進行參數化儲存。

---

## 🌟 主要功能

- 📈 **一鍵擷取個股數據**：自動偵測並擷取當前 Google Finance 股票頁面的標的 (Ticker)、目前價格 (Price)、市值、本益比、當日高低範圍、52 週高低範圍。
- 🤖 **AI 對話擷取**：整合 Google Finance Beta 版「研究面板」，可勾選並擷取與 AI 的對話段落。
- 🧹 **智能文字清理**：內建規則引擎，自動過濾常見的 AI 免責聲明與開場白。
- 📊 **表格化輸出**：自動將條列式的數據轉化為 Markdown 表格。
- 📸 **圖表截圖**：支援在個股模式下，自動擷取並等比例壓縮當前畫面，一併同步至雲端。
- ⬇️ **本地導出**：支援將擷取的內容一鍵下載為 Markdown (`.md`) 或 CSV 檔案。

---

## 🛠️ 安裝說明

1. 下載本專案並解壓縮。
2. 開啟 Chrome 瀏覽器，進入 `chrome://extensions/` (擴充功能管理頁面)。
3. 開啟右上角的「**開發人員模式**」。
4. 點擊左上角的「**載入未封裝項目**」，並選擇本專案資料夾。
5. 安裝完成後，建議將「Finance Research Clipper」固定在瀏覽器工具列。

---

## ⚙️ 快速設定指南

為了讓數據能夠同步至您的 Google Sheets，您需要先佈署一個簡單的 Google Apps Script (GAS) 作為 API 中繼站。

1. **建立試算表**：在您的 Google Drive 建立一個新的試算表，並新增一個名為 `Main` 的工作表。
2. **佈署 Google Apps Script**：
   - 點擊試算表選單的 `延伸功能` -> `Apps Script`。
   - 將本專案中的 `docs/google-apps-script.md` 內提供的代碼複製貼入編輯器中。
   - 點擊右上角的「佈署」 -> 「新增佈署作業」。
   - 類型選擇「網頁應用程式」，並設定：
     - **執行身分**：您的 Google 帳戶 (Me)
     - **誰有權限存取**：任何人 (Anyone)
   - 完成佈署後，**複製產生的「網頁應用程式 URL」** (即 Web App URL)。
3. **設定插件**：
   - 點擊瀏覽器工具列中的本插件圖示。
   - 點擊右上角的齒輪圖示 ⚙️ 開啟設定面板。
   - 將剛才複製的 Web App URL 貼入「Google Apps Script URL」欄位。
   - (選填) 將您剛才建立的 Google Sheets 網址貼入「Google Sheets URL」欄位。
   - 點擊「儲存設定」即可。

---

## 🔒 隱私與安全說明

- 本插件**不會收集、傳輸或儲存您的任何個人數據至任何第三方伺服器**。
- 所有擷取到的數據皆只會透過您自己設定的 Google Apps Script URL 直接傳送至您個人的 Google Sheets 中。
- 請妥善保管您的 Google Apps Script URL，切勿外洩，因為任何擁有該 URL 的人都可以向您的試算表寫入數據。
