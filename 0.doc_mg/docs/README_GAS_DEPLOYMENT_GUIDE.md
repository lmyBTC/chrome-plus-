# 🚀 Google Apps Script (GAS) Web App 部署與設定手冊

> **定位**：為 Chrome Plus 生態系（`ScrumClock` 敏捷看板、`FinanceClipper` 投研採集器）提供免 Chrome Web Store 審查、個人專屬、零外洩風險的雲端 Google Tasks / Google Sheets 同步中樞。

---

## 📌 為什麼採用個人 GAS Web App？
1. **零審核門檻**：Chrome 擴充功能若要求 Google OAuth 權限，需要建立 Google Cloud Project 並進行嚴格審核。使用個人 GAS Web App 僅在個人 Google 雲端帳號內部運作，無需審核。
2. **隱私與安全 100% 掌握**：資料由 Chrome 擴充功能直接透過 HTTPS 發送至使用者的個人 GAS 專案，不經由任何第三方伺服器中繼。
3. **即開即用**：只需 3 分鐘部署一次，即可取得專屬 Webhook URL。

---

## 🛠️ 三步驟極速部署指南 (Step-by-Step)

### 第一步：建立試算表與開啟 Apps Script
1. 開啟 [Google 雲端硬碟](https://drive.google.com/) 或 [Google 試算表](https://sheets.new)，新建一個名為 **`Chrome Plus Sync Hub`** 的空白試算表。
2. 在頂部功能表點選 **「擴充功能 (Extensions)」 ➔ 「Apps Script」**。
3. 將專案名稱命名為 **`Chrome Plus Sync Hub`**。

---

### 第二步：啟用 Google Tasks 服務與貼上代碼
1. 在 Apps Script 編輯器左側導航欄，找到 **「服務 (Services)」**，點選右側的 **「+」** 號。
2. 在彈出的服務清單中找到 **`Google Tasks API`**（版本選擇預設 `v1`），點選 **「新增 (Add)」**。
   > [!NOTE]
   > 必須啟用此服務，才能讓腳本具有讀寫 Google Tasks 的能力。
3. 開啟本機專案中的 `0.doc_mg/tools/gas/google_sync_hub.gs` 檔案，**複製全部內容**。
4. 清空 Apps Script 編輯器中現有的 `Code.gs` 內容，將複製的代碼貼上並儲存（`Ctrl + S`）。

---

### 第三步：部署為 Web 應用程式 (Web App)
1. 點擊右上角藍色按鈕 **「部署 (Deploy)」 ➔ 「新增部署作業 (New deployment)」**。
2. 點擊齒輪圖示，選擇 **「網頁應用程式 (Web app)」**。
3. 設定以下欄位（**極度重要，請務必正確設定**）：
   - **說明 (Description)**：`Chrome Plus Webhook v1`
   - **以何人身分執行 (Execute as)**：**我 (Me)** *(您的 Google 帳號)*
   - **誰可以存取 (Who has access)**：**所有人 (Anyone)**
   > [!IMPORTANT]
   > 「誰可以存取」必須選擇 **所有人 (Anyone)**。這並非公開您的試算表，而是允許 Chrome 擴充功能在不攜帶複雜 Google 登入 Cookie 的情況下，透過專屬隨機網址以您的權限執行指令。
4. 點選 **「部署 (Deploy)」**。
5. 首次部署會彈出授權視窗：
   - 點擊 **「審查權限 (Review Permissions)」**。
   - 選擇您的 Google 帳號。
   - 若出現「Google 尚未驗證此應用程式」警告，點選左下方 **「進階 (Advanced)」 ➔ 「前往 Chrome Plus Sync Hub (不安全)」**。
   - 點選 **「允許 (Allow)」**。
6. 部署完成後，複製畫面上顯示的 **網頁應用程式網址 (Web app URL)**。
   - 格式範例：`https://script.google.com/macros/s/AKfycbx.../exec`

---

## 🧪 驗證部署是否成功

您可以在瀏覽器直接開啟複製的網址，或使用 curl / Postman 測試：
```bash
curl -L "https://script.google.com/macros/s/您的部署ID/exec?action=PING"
```
若回傳以下 JSON 即表示部署成功：
```json
{
  "status": "ok",
  "service": "Chrome Plus Google Sync Hub",
  "version": "1.0.0"
}
```

---

## ⚙️ 在 Chrome 擴充功能中配置

### 1. ScrumClock (`chrome_scrumclock`)
1. 點擊擴充功能圖示開啟 ScrumClock 面板。
2. 開啟 **「設定 (Settings)」** ➔ 找到 **「Google 生態整合」**。
3. 開啟「啟用 Google 雙軌同步」開關。
4. 在 **「GAS Webhook URL」** 輸入欄貼上剛才複製的網址。
5. 完成！在日終戰報或看板拖曳任務時即可自動同步。

### 2. FinanceClipper (`finance-research-clipper-oss`)
1. 開啟 FinanceClipper 設定頁 (Options)。
2. 找到 **「Google Sheets 匯出設定」**。
3. 貼上相同的 **「GAS Webhook URL」**。
4. 點擊儲存。在儀表板即可一鍵將研報估值寫入 `Portfolio_Tracking` 工作表。

---

## 🛡️ 常見問題與排除 (FAQ)

- **Q: 收到 `Google Tasks API 尚未在 Apps Script 啟用` 錯誤？**
  - **A**: 請返回 Apps Script 編輯器，確認左側「服務」中已有 `Tasks`。若沒有，請點「+」手動新增。
- **Q: 更新代碼後，前端沒有生效？**
  - **A**: Google Apps Script 修改代碼後，必須點選「部署」➔「管理部署作業」➔ 點選鉛筆編輯 ➔ 版本切換為 **「新版本」** ➔ 點選「部署」，新代碼才會正式上線。
