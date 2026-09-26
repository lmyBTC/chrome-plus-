---
title: "實作 Browser Activity Monitor 混合式架構監控插件"
plugin: "browser-activity-monitor"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-09-25"
deadline: "2026-09-27"
---

## 1. 目標
依據 `./0.doc_mg/chrome.md` 確立之混合架構規範，正式實作與建立 `browser-activity-monitor` 獨立 Chrome 擴充功能，並將其整合至 `chrome_scrumclock` 之「實用工具箱」頁面中，達成：
1. **80% 原生常駐監控**：以 MV3 Background Service Worker 監控 `webRequest` 網路流量、`downloads` 下載事件與 `contentSettings` 原生網站授權審查。
2. **20% 隨選動態注入**：由使用者透過 Side Panel 觸發 `chrome.scripting.executeScript`，注入雙層探針（MAIN/ISOLATED）捕獲敏感 API（相機、麥克風、定位、剪貼簿）。
3. **高效持久化閉環**：Side Panel Port 長連接即時渲染，配合 IndexedDB 非同步批次存儲與 `chrome.alarms` 24 小時定期清理維護。
4. **實用工具箱整合**：在 `chrome_scrumclock` 的「實用工具箱 (ToolboxHub)」新增「瀏覽行為監控器」分頁，依循寬容讀者契約呈現即時安全檢測與快捷調度介面。
5. **合規與模組獨立**：純原生輕量無打包依賴結構，與既有插件遵循黑盒契約完全隔離。

## 2. 策略與鎖定檔案

### 核心策略
- **嚴格隔離與防腐層**：保持 `browser-activity-monitor` 核心獨立，於 `chrome_scrumclock` 工具箱新增之分頁採用純前端展示與防禦性降級（寬容讀者模式），不產生硬依賴構建污染。
- **原子分段推進**：
  - Phase 1：目錄結構、Manifest V3 與原生常駐 Background 服務。`[已完成]`
  - Phase 2：雙層動態探針（MAIN/ISOLATED）與 Background 調度注入。`[已完成]`
  - Phase 3：Side Panel 前端監控視圖、IndexedDB 儲存閉環與 SSOT 文檔。`[已完成]`
  - Phase 4：整合至 `chrome_scrumclock`「實用工具箱」分頁並落實黑盒通訊契約。`[已完成]`


### 鎖定檔案 (Target Files)
- `./browser-activity-monitor/manifest.json`
- `./browser-activity-monitor/background.js`
- `./browser-activity-monitor/scripts/probe-main.js`
- `./browser-activity-monitor/scripts/probe-isolated.js`
- `./browser-activity-monitor/scripts/storage-db.js`
- `./browser-activity-monitor/sidepanel/sidepanel.html`
- `./browser-activity-monitor/sidepanel/sidepanel.css`
- `./browser-activity-monitor/sidepanel/sidepanel.js`
- `./browser-activity-monitor/icons/icon128.png`
- `./browser-activity-monitor/README.md`
- `./chrome_scrumclock/src/features/toolbox/types.ts`
- `./chrome_scrumclock/src/features/toolbox/ToolboxHub.tsx`
- `./chrome_scrumclock/src/features/toolbox/tools/activity-monitor/ActivityMonitor.tsx`
- `./chrome_scrumclock/src/features/toolbox/tools/activity-monitor/index.ts`
- `./chrome_scrumclock/src/features/toolbox/tools/activity-monitor/功能說明.md`
- `./0.doc_mg/tasks/task_20260925_browser_activity_monitor_impl.md`

## 3. 任務拆解

### Phase 1: 基礎目錄骨架與 80% 原生常駐服務 狀態：`[已完成]`

### Phase 2: 20% 隨選深入動態探針與調度 狀態：`[已完成]`
- [x] 任務 2.1: 實作原生 MAIN 執行環境探針 (`scripts/probe-main.js`)
    - [x] 掛鉤 (Monkey Patch) `navigator.mediaDevices.getUserMedia`。
    - [x] 掛鉤 `navigator.geolocation.getCurrentPosition`。
    - [x] 掛鉤 `navigator.clipboard.readText`。
    - [x] 透過 `window.postMessage` 安全發出 `__PROBE_MAIN__` 事件。
- [x] 任務 2.2: 實作 ISOLATED 隔離環境中繼探針 (`scripts/probe-isolated.js`)
    - [x] 監聽 `window` 訊息並過濾來源驗證 `__PROBE_MAIN__`。
    - [x] 透過 `chrome.runtime.sendMessage` 安全轉發至 Background。
- [x] 任務 2.3: 實作 Background 動態調度與生命週期管理
    - [x] 在 `background.js` 實作 `injectDeepInspector(tabId)`，透過 `chrome.scripting.executeScript` 分別注入 MAIN 與 ISOLATED 探針。
    - [x] 監聽 `chrome.tabs.onRemoved` 自動清理分頁追蹤狀態。

### Phase 3: Side Panel 前端面板與 IndexedDB 閉環 狀態：`[已完成]`
- [x] 任務 3.1: 實作 Side Panel 前端頁面與控制腳本
    - [x] 撰寫 `sidepanel/sidepanel.html`：權限徽章區、隨選注入按鈕、即時日誌串流容器。
    - [x] 撰寫 `sidepanel/sidepanel.css`：現代深色科技感主題與微動畫。
    - [x] 撰寫 `sidepanel/sidepanel.js`：建立 Port 連線、呼叫權限查詢、綁定深度追蹤點擊、渲染多色日誌瀑布流。
- [x] 任務 3.2: 實作 IndexedDB 持久化與定時清理
    - [x] 撰寫 `scripts/storage-db.js`：封裝 `AuditStorageDB` 類別，支援 `batchInsert` 與 `purgeExpiredLogs`。
    - [x] 在 `background.js` 設定 `chrome.alarms` 定期清理 7 天前過期日誌。
- [x] 任務 3.3: 圖示資產、SSOT 回寫與工程驗收
    - [x] 產出基礎圖示 `./browser-activity-monitor/icons/icon128.png`。
    - [x] 撰寫插件專屬 SSOT 文檔 `./browser-activity-monitor/README.md`。

### Phase 4: 整合至「實用工具箱」分頁 (ToolboxHub) 狀態：`[已完成]`
- [x] 任務 4.1: 定義工具箱分頁型別與註冊新分頁
    - [x] 在 `chrome_scrumclock/src/features/toolbox/types.ts` 新增 `'activity-monitor'` 工具 ID 與資訊介面。
    - [x] 在 `chrome_scrumclock/src/features/toolbox/ToolboxHub.tsx` 加入「瀏覽行為監控器」Tab 選項與按鈕。
- [x] 任務 4.2: 實作 ActivityMonitor 工具視圖與卡片元件
    - [x] 建立 `chrome_scrumclock/src/features/toolbox/tools/activity-monitor/ActivityMonitor.tsx`。
    - [x] 提供「當前頁面權限審查」、「安全監控日誌快照」及「快速開啟 Side Panel 監控」之控制介面。
    - [x] 實作寬容降級：若獨立插件未啟用，展示離線提示與手動引導，不破壞 ScrumClock 執行。
- [x] 任務 4.3: 模組匯出與 SSOT 說明文件建立
    - [x] 建立 `chrome_scrumclock/src/features/toolbox/tools/activity-monitor/index.ts`。
    - [x] 撰寫 `chrome_scrumclock/src/features/toolbox/tools/activity-monitor/功能說明.md`。
- [x] 任務 4.4: 專案編譯驗證與 SSOT 閉環
    - [x] 執行 TypeScript 構建驗證，確保無型別錯誤。
    - [x] 更新相關 SSOT 與任務狀態收斂。

## 4. 影響評估
- **多插件隔離防護**：本插件維持獨立目錄，`chrome_scrumclock` 僅在前端 UI 層擴充一個純展示與調度之分頁，無直接代碼耦合，符合零依賴與防腐原則。
- **效能開銷評估**：工具箱分頁僅於使用者切換至「瀏覽行為監控器」時掛載與查詢狀態，不消耗常駐背景資源。
- **權限與合規安全**：使用標準 React + Tailwind 元件，無危險 innerHTML 或 eval，符合 Web Store 審查規範。

## 5. 驗收標準
- [x] **獨立目錄完整性**: 建立完整之 `./browser-activity-monitor/` 目錄與標準檔案配置。
- [x] **80% 原生層運作**: 能正確捕獲網路請求、下載事件，並能批次檢測當前分頁之原生 `contentSettings`。
- [x] **20% 隨選動態注入**: 點擊 Side Panel 按鈕後，能成功注入雙層探針並回傳敏感 API 調用日誌。
- [x] **IndexedDB 與定時清理**: 事件能順利寫入 IndexedDB，`chrome.alarms` 註冊清理常式正常運作。
- [x] **工具箱分頁整合**: 在 `chrome_scrumclock` 實用工具箱成功切換「瀏覽行為監控器」分頁並正常渲染。
- [x] **防禦性降級**: 監控器分頁在無外部連線時具備友善離線引導。
- [x] **除錯清理**: 程式碼中無殘留之測試用除錯語句。
- [x] **檔案編碼與路徑**: 所有新增檔案均為 UTF-8 (無 BOM) 編碼，所有 Markdown 連結均為工作區相對路徑。
- [x] **SSOT 閉環**: 完成 `功能說明.md` 與任務檔案狀態更新。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-25 ID: fa9f6dc2-1368-4166-98e2-9e85e9ae5089 (Gate 1 任務藍圖建立)
> - 2026-09-25 ID: 582d5f23-b41a-432f-ab34-6c8b26e03499 (Gate 2 Phase 1 執行)
> - 2026-09-25 ID: 48c23877-0b2b-4804-963a-f7a629fece9b (Gate 2 Phase 2 執行)
> - 2026-09-25 ID: 00a49ac0-c2fe-4483-b72d-40697054872e (Gate 2 Phase 3 執行完畢)
> - 2026-09-26 ID: cbf6277c-4ef7-4888-92bc-070899898ca7 (Gate 1 擴充 Phase 4 實用工具箱分頁藍圖)
> - 2026-09-26 ID: edc4704d-985c-4a08-bef7-9f8e9a5ee0aa (Gate 2 Phase 4 工具箱分頁整合與全案結案)



