# 🛡️ Browser Activity Monitor - 混合架構瀏覽器活動監控與原生授權審查 (SSOT)

> [!IMPORTANT]
> **AI 開發專用導航指引 (SSOT)**：
> 本文檔為 `browser-activity-monitor` 之**單一真實來源說明與架構手冊 (SSOT)**。
> 本插件遵循 Chrome Extension Manifest V3 規範，採用「80% 原生常駐 + 20% 隨選深入」之混合監控架構。
> 所有 Markdown 連結與檔案參照一律相對於當前檔案或工作區相對路徑，嚴格禁止本機絕對路徑。

---

## 🌟 核心功能亮點 (Key Features)

- 🌐 **80% 原生常駐監控 (Zero Content Script Overhead)**：
  - **網路流量捕獲**：監聽 `chrome.webRequest.onBeforeRequest`，即時攔截並記錄第三方請求、API 調用與跨站流量。
  - **下載行為審查**：監聽 `chrome.downloads.onCreated`，記錄下載目標檔名、檔案大小與 MIME 類型。
  - **原生網站權限審查**：動態調用 `chrome.contentSettings`，即時批次審查當前網域之相機、麥克風、地理定位、系統通知與剪貼簿原生物理設定。
- 🔬 **20% 隨選動態深入探針 (On-Demand Deep Inspector)**：
  - 平時 0% 網頁腳本注入，不干擾頁面執行或佔用常駐記憶體。
  - 使用者點擊時，透過 `chrome.scripting.executeScript` 注入雙層探針：
    - **MAIN 探針** (`scripts/probe-main.js`)：掛鉤 `navigator.mediaDevices.getUserMedia`、`navigator.geolocation.getCurrentPosition`、`navigator.clipboard.readText` 原生 API，捕獲精確調用參數與呼叫堆疊。
    - **ISOLATED 探針** (`scripts/probe-isolated.js`)：作為中繼防禦層，驗證 `__PROBE_MAIN__` 訊息並轉發至 Background。
- 📊 **Side Panel 現代監控面板**：
  - 採用 Chrome 原生 Side Panel API，支援點擊 Action 圖示直接開啟側邊欄。
  - 提供當前分頁 Origin 權限徽章區、隨選探針開關、多色即時瀑布流、分類篩選 (全部/探針/網路/下載)、日誌 JSON 匯出與一鍵清除。
- 💾 **IndexedDB 本機持久化與排程維護**：
  - 封裝 `AuditStorageDB` 非同步資料庫，支援事務批次寫入與多索引倒序查詢。
  - 整合 `chrome.alarms`，每日定期自動清理 7 天前過期日誌，防止 Storage 膨脹。
- 🛡️ **純原生零打包依賴**：
  - 採用純原生 Vanilla JavaScript (ES Module) + Vanilla CSS，無 Webpack/Vite 複雜建置負擔，輕量高效。

---

## 🧭 專案檔案架構速查 (Architecture & File Map)

| 檔案相對路徑 | 類型 / 職責 | 關鍵技術實作 |
| :--- | :--- | :--- |
| `manifest.json` | **擴充功能配置宣告** | Manifest V3 規範、`sidePanel`、`alarms`、`contentSettings`、`webRequest`、`downloads` 權限宣告 |
| `background.js` | **背景服務背景常駐核心 (Service Worker)** | 80% 原生事件監聽、Origin 權限審查、雙層探針注入調度、Port 長連接廣播、IndexedDB 寫入與定時清理 |
| `scripts/probe-main.js` | **MAIN 世界原生探針 (Dynamic Injected)** | 原生 API 掛鉤 (Monkey Patch)、`window.postMessage` 安全事件發佈 |
| `scripts/probe-isolated.js` | **ISOLATED 世界中繼探針 (Dynamic Injected)** | 驗證 `__PROBE_MAIN__` 來源與事件有效性、`chrome.runtime.sendMessage` 安全轉發 |
| `scripts/storage-db.js` | **IndexedDB 審計儲存層 (Storage Module)** | `AuditStorageDB` 類別、日誌批次寫入、倒序時間索引查詢、7 天過期清理 |
| `sidepanel/sidepanel.html` | **側邊監控視圖 UI (HTML)** | 權限徽章網格、深入探針控制列、串流過濾工具列、活動瀑布流容器 |
| `sidepanel/sidepanel.css` | **現代深色毛玻璃樣式 (CSS)** | 科技深色主題、狀態發光指示燈、各類別彩色標籤、流暢微動畫 |
| `sidepanel/sidepanel.js` | **側邊欄控制器邏輯 (Module)** | Port 長連接管理、活動分頁同步、權限渲染、探針啟動控制、日誌篩選與匯出 |
| `icons/icon128.png` | **擴充功能圖示** | 128x128 像素擴充功能品牌圖示 |

---

## 🔄 混合架構通訊與資料流 (Architecture Dataflow)

```
[使用者點擊擴充圖示] ──> 開啟 Side Panel (sidepanel.html)
                              │
                              ├── 建立 Port ('monitor-stream') ──> [Background Service Worker]
                              │                                          │
                              │ <── 廣播即時日誌 (ACTIVITY_LOG) ─────────┼── webRequest (網路請求)
                              │ <── 廣播權限狀態 (AUDIT_RESULT) ─────────┼── contentSettings (相機/麥克風/定位/通知/剪貼簿)
                              │ <── 歷史日誌 (RECENT_LOGS_RESULT) ───────┼── downloads (下載審查)
                              │                                          └── AuditStorageDB (IndexedDB 儲存)
                              │
                    [點擊「注入深度探針」]
                              │
                              ▼
                      [Background SW]
                              │
                              ├── 注入 ISOLATED ──> [scripts/probe-isolated.js]
                              │                             ▲
                              │                             │ (window.postMessage)
                              └── 注入 MAIN ──────> [scripts/probe-main.js]
                                                            │
                                                  (攔截敏感 API 調用)
```

---

## 🚀 載入與測試步驟 (Installation & Manual Test)

1. **載入擴充功能**：
   - 開啟 Google Chrome 瀏覽器，前往 `chrome://extensions/`。
   - 開啟右上角的「**開發人員模式**」(Developer mode)。
   - 點擊「**載入未打包項目**」(Load unpacked)，選取此目錄：`./browser-activity-monitor/`。
2. **開啟監控面板**：
   - 點擊 Chrome 工具列上的擴充功能圖示，或將其固定 (Pin) 後點擊圖示，將自動滑出右側 **Side Panel**。
3. **驗證 80% 原生監控**：
   - 在分頁中瀏覽任何網頁（例如 `https://news.ycombinator.com` 或 `https://google.com`），Side Panel 即時顯示網路請求瀑布流。
   - 觀察上方「**網站原生權限審查**」，即時顯示該 Origin 的相機、麥克風、定位等原生物理授權狀態。
4. **驗證 20% 深入隨選探針**：
   - 點擊面板上的「**注入深度探針**」按鈕，狀態燈切換為紅色閃爍（探針已運作中）。
   - 在該網頁控制台中執行 `navigator.geolocation.getCurrentPosition(()=>{})` 或複製文字，面板立即彈出高亮紅色的 `PROBE` 事件卡片，並附帶調用參數。
5. **持久化與清除**：
   - 點擊「清除」按鈕，同步清空畫面與 IndexedDB；重新整理 Side Panel 歷史記錄持久化正常。

---

## 🧰 實用工具箱 (ToolboxHub) 整合說明

本監控器亦提供輕量前端審查視圖，整合至 `chrome_scrumclock/src/features/toolbox/ToolboxHub.tsx`：
- **工具識別**：`activity-monitor`（「瀏覽行為監控器」分頁）。
- **零依賴與防禦性降級**：在 ScrumClock 儀表板中提供安全沙盒權限檢測與日誌快照，與本外掛代碼完全解耦。
- **組件位置**：參見 `chrome_scrumclock/src/features/toolbox/tools/activity-monitor/功能說明.md`。

---


## 🔒 隱私與 Chrome Web Store 合規保證 (Compliance & Privacy)

- **符合 Manifest V3 規範**：無遠端代碼載入 (`unsafe-eval` 零使用)，所有程式碼為在地靜態封裝。
- **資料本機性**：所有日誌僅保存在使用者瀏覽器的 IndexedDB (`BrowserActivityMonitorDB`)，絕不上傳外部伺服器。
- **無侵入性保證**：探針注入採嚴格隨選觸發，分頁關閉或刷新後探針自動失效，絕不污染全域日常瀏覽效能。
