---
title: "VideoSpeedPlus 讀取影片字幕與內容並傳送至 ScrumClock 收集器"
plugin: "chrome_video speed plus"
status: "已完成"
created: "2026-09-25"
deadline: "2026-09-26"
---

## 1. 目標
為 `chrome_video speed plus` 擴充功能增加影片字幕（即時字幕、逐字稿）與頁面內容萃取能力，並依據跨插件黑盒通訊契約（`cross_plugin_contract.md`），透過 `chrome.runtime.sendMessage` 將萃取出的字幕與影片筆記安全傳送至 `chrome_scrumclock` 的收集器（靈感收集箱 / 側邊欄 AI 暫存區 / 待辦任務），達到影片學習與敏捷任務無縫聯動。

## 2. 策略與鎖定檔案
1. **字幕萃取模組**：
   - 針對 YouTube 頁面萃取當前播放字幕（`.ytp-caption-segment`）、逐字稿（Transcript 面板或字幕軌回退）與影片 Metadata（標題、附帶時間戳記的 URL、當前播放秒數）。
   - 保留標準 HTML5 `<track>` 兜底機制，確保未來的擴展性。
2. **跨插件黑盒防禦傳輸**：
   - 遵循 `cross_plugin_contract.md` 規範，發送端透過 Sanitizer 防腐過濾，封裝為 `protocolVersion: 1` 格式。
   - 支援自動探測 ScrumClock 是否在線（透過 `AI_PING`），提供防呆與優雅降級回饋。
3. **ScrumClock 收集器擴充**：
   - 在 `chrome_scrumclock/src/background/externalService.ts` 擴充支援 `COLLECT_NOTE` 協定，將資料安全寫入 `pendingAnalyzeText` 與通知，側邊欄打開即可自動載入或進行 AI 整理。
4. **UI 觸發整合**：
   - 在 VideoSpeedPlus 之 Shadow DOM 懸浮控制列與 Popup 介面新增「📥 收集至 ScrumClock」按鈕，並提供即時傳送狀態反饋與快捷鍵支援。

### 鎖定檔案 (Target Files)
- `./chrome_video speed plus/manifest.json`
- `./chrome_video speed plus/content.js`
- `./chrome_video speed plus/popup.html`
- `./chrome_video speed plus/popup.js`
- `./chrome_video speed plus/VIDEOSPEED_README.md`
- `./chrome_scrumclock/src/background/externalService.ts`
- `./0.doc_mg/docs/cross_plugin_contract.md`

## 3. 任務拆解

### Phase 1: 跨插件資料契約定義與 ScrumClock 收集器接收端實作 狀態：`[已完成]`
- [x] 任務 1.1: 擴充跨插件通訊契約文件
    - [x] 於 `./0.doc_mg/docs/cross_plugin_contract.md` 新增 `COLLECT_NOTE`（影片筆記/字幕收集）通訊協定規範與資料結構範例。
- [x] 任務 1.2: 實作 ScrumClock 收集器接收處理器
    - [x] 於 `./chrome_scrumclock/src/background/externalService.ts` 新增 `COLLECT_NOTE` 訊息處理分流。
    - [x] 將傳入之影片字幕與資訊寫入 `chrome.storage.local` 的 `pendingAnalyzeText`，並透過 Chrome Notifications 發出收集成功提示。
    - [x] 執行 `npm run build` 驗證 TypeScript 編譯無誤。

### Phase 2: VideoSpeedPlus 字幕萃取與防腐發送核心 狀態：`[已完成]`
- [x] 任務 2.1: 實作字幕與影片資訊萃取器
    - [x] 於 `./chrome_video speed plus/content.js` 新增字幕擷取邏輯（當前播放片段 `.ytp-caption-segment`、影片標題、帶秒數 URL、時間戳字串）。
    - [x] 新增 YouTube 逐字稿（Transcript）面板偵測或多行段落整合提取函式。
- [x] 任務 2.2: 實作跨插件發送與探測客戶端
    - [x] 在 `content.js` 與 `popup.js` 中封裝傳送至 ScrumClock 之發送函式（含超時防護與防腐層白名單過濾）。
    - [x] 支援動態讀取/快取 ScrumClock Extension ID，若未連線提供友善提示。

### Phase 3: VideoSpeedPlus 介面整合、快捷鍵與反饋 狀態：`[已完成]`
- [x] 任務 3.1: Shadow DOM 控制面版與 Popup 介面按鈕整合
    - [x] 於 `content.js` 的 Shadow DOM 懸浮工具列加入「📥 傳送字幕至 ScrumClock」按鈕與樣式隔離。
    - [x] 於 `popup.html` 與 `popup.js` 加入快捷收集按鈕與自訂 ScrumClock ID 設定項。
- [x] 任務 3.2: 快捷鍵綁定與視覺反饋
    - [x] 綁定全域/頁面快捷鍵（如 `Ctrl + Shift + S` 或 `Alt + S`）一鍵收集當前時間戳字幕。
    - [x] 按鈕點擊後提供動畫/色彩狀態回饋（成功「已收集」、失敗「未找到 ScrumClock」）。

### Phase 4: SSOT 文檔回寫與整合驗證 狀態：`[已完成]`
- [x] 任務 4.1: 更新專屬 SSOT 文檔與技能字典
    - [x] 更新 `./chrome_video speed plus/VIDEOSPEED_README.md`，載明字幕收集功能、跨插件協定與快捷鍵設定。
    - [x] 更新 `./.agents/skills/video-speed-core/SKILL.md`，同步新增功能與儲存鍵值規格。
- [x] 任務 4.2: 完整流程回歸測試與收尾
    - [x] 驗證在 YouTube 影片播放時點擊按鈕，字幕與時間戳能正確傳送至 ScrumClock 並觸發通知。
    - [x] 驗證在 ScrumClock 未安裝或關閉時，VideoSpeedPlus 維持優雅降級不報錯。

## 4. 影響評估
- **跨插件通訊**：ScrumClock 原生已在 `manifest.json` 聲明 `"externally_connectable": { "ids": ["*"] }`，無需額外新增高風險權限；通訊採純資料 JSON 傳遞，雙方代碼零依賴。
- **樣式與 DOM 隔離**：新增之收集按鈕 100% 封裝於 VideoSpeedPlus 的 Shadow DOM 中，完全不污染 YouTube 宿主網頁樣式。
- **效能考量**：字幕萃取僅在使用者點擊或按下快捷鍵時按需觸發（On-Demand），不進行常駐輪詢，零效能損耗。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 文件同步**: 若架構、模組清單、檔案分拆或接口有變動，已同步回寫並更新該插件專屬 SSOT 文件 (`VIDEOSPEED_README.md`、`video-speed-core/SKILL.md`)。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-25 ID: 1fb87185-4919-44a0-b902-346816673930 (初始化任務藍圖)
> - 2026-09-25 ID: b53d0be4-1bb9-44a0-af34-53cda6a30bb5 (Phase 1 執行)
> - 2026-09-25 ID: e8bad4ed-534f-4a7c-93b0-f336d9101bb9 (Phase 2 & Phase 3 執行)
> - 2026-09-25 ID: db68d9d6-9dd0-4bd3-8f31-66da28d192de (Phase 4 SSOT 文檔回寫與驗收結案)
>
> **任務狀態結案**: 本任務所有階段 (Phase 1 ~ Phase 4) 已 100% 完成，所有 SSOT 文件與技能字典已閉環同步。
