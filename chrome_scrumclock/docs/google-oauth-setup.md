# Google OAuth 2.0 Client ID 申請與設定指南

本擴充套件支援將每日任務 (Tasks) 與復盤日程 (Calendar) 雙向同步至您的 Google 帳號。要啟用此功能，您需要向 Google Cloud Console 申請並設置 OAuth 2.0 Client ID。

---

## 步驟 1：取得您的 Chrome 擴充套件 ID (Extension ID)

1. 開啟 Chrome 瀏覽器並造訪 `chrome://extensions/`。
2. 開啟右上角的 **「開發者模式 (Developer mode)」**。
3. 找到 **Power Kit (Chrome Scrumclock)** 擴充套件，複製其 **ID**（例如：`abcdefghijklmnopqrstuvwxyz123456`）。

---

## 步驟 2：在 Google Cloud Console 設定 OAuth 2.0

1. 造訪 [Google Cloud Console](https://console.cloud.google.com/)。
2. 建立新專案或選擇既有專案。
3. 導覽至 **API 與服務 -> 憑證 (Credentials)**。
4. 點擊 **+ 建立憑證 (+ CREATE CREDENTIALS)** -> 選擇 **OAuth 用戶端 ID (OAuth client ID)**。
5. 應用程式類型選擇 **Chrome 應用程式 (Chrome extension)**。
6. 輸入區段說明：
   - **名稱**：`Chrome Scrumclock Sync`
   - **項目 ID (Application ID)**：貼上步驟 1 取得的 32 位字元 Extension ID。
7. 點擊 **建立 (CREATE)**，複製產生的 Client ID（格式如：`123456789-xxxxxxxx.apps.googleusercontent.com`）。

---

## 步驟 3：啟用所需的 Google APIs

1. 在 Google Cloud Console 導覽至 **API 與服務 -> 啟用的 API 和服務**。
2. 點擊 **+ 啟用 API 和服務**。
3. 搜尋並啟用以下兩個 API：
   - **Google Tasks API**
   - **Google Calendar API**

---

## 步驟 4：設定至專案 `public/manifest.json`

打開發佈目錄中的 [public/manifest.json](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/chrome_scrumclock/public/manifest.json)，將 `oauth2.client_id` 替換為步驟 2 取得的 Client ID：

```json
  "oauth2": {
    "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/tasks"
    ]
  }
```

---

## 步驟 5：重新載入擴充套件

1. 在專案根目錄執行 `npm run build`。
2. 前往 `chrome://extensions/` 點擊 **重新載入 (Reload)** 圖示。
3. 重新打開發佈設定頁面，點擊 **「使用 Google 帳號登入」** 即可彈出 Google 官方授權視窗！
