---
title: "安全監控日誌快照來源透明化與一鍵複製 AI 診斷日誌"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-09-26"
deadline: "2026-09-27"
---

## 1. 目標
優化 `chrome_scrumclock` 工具箱中「瀏覽行為監控器」（Activity Monitor）的「安全監控日誌快照」：
1. **來源識別透明化 (Source & Origin Attribution)**：解決原本僅標示籠統 `active-tab`、無法辨識受影響網頁或特定擴充套件的問題。為每筆日誌提供具體來源類型（網頁分頁、外部擴充套件、背景服務或模擬測試）、網域名稱與目標網址標記。
2. **一鍵複製 AI 診斷日誌 (Copy for AI Analysis)**：在日誌工具列新增一鍵複製按鈕，將當前分頁上下文、安全評估統計與篩選後的日誌轉換為結構化的 Markdown 診斷報告，方便使用者一鍵貼入 AI 詢問安全性與防護建議。

## 2. 策略與鎖定檔案
1. **資料模型與型別層 (`types.ts`)**：
   - 擴充 `ActivityAuditLog` 介面，納入 `sourceType` (`'page' | 'extension' | 'internal' | 'mock'`)、`domain` (來源網域/套件識別碼) 與 `targetUrl` (完整網址)。
   - 更新初始模擬日誌與事件產生函式，帶入真實當前分頁網域或插件識別資訊。
2. **UI 視覺化與互動層 (`ActivityMonitor.tsx`)**：
   - 強化卡片來源標籤：以圖示和徽章清楚區分「🌐 網頁 (含網域)」、「🧩 外掛/擴充套件」、「🧪 模擬測試」，滑鼠懸停顯示完整路徑。
   - 實作一鍵複製按鈕：加入 `navigator.clipboard.writeText` 複製函式，將日誌轉換為精美的 Markdown 格式，並提供「已複製 ✅」暫態成功反饋。
3. **功能文檔與建置驗證**：
   - 更新 `activity-monitor/功能說明.md`，說明來源歸屬欄位與 AI 格式導出。
   - 執行 `npm run build` 確保 TypeScript 編譯無誤。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/features/toolbox/tools/activity-monitor/types.ts`
- `chrome_scrumclock/src/features/toolbox/tools/activity-monitor/ActivityMonitor.tsx`
- `chrome_scrumclock/src/features/toolbox/tools/activity-monitor/功能說明.md`

---

## 3. 任務拆解

### Phase 1: 資料模型擴充與來源追蹤增強 狀態：`[已完成]`
- [x] 任務 1.1: 擴充 `ActivityAuditLog` 資料介面
    - 於 `chrome_scrumclock/src/features/toolbox/tools/activity-monitor/types.ts` 加入 `sourceType?: 'page' | 'extension' | 'internal' | 'mock'`、`domain?: string`、`targetUrl?: string`。
- [x] 任務 1.2: 重構初始日誌與模擬事件觸發器
    - 在 `ActivityMonitor.tsx` 中更新 `INITIAL_MOCK_LOGS`，補齊具體網域與來源型態。
    - 改寫 `triggerSimulation`，動態綁定當前分頁的 `currentOrigin` 與 `currentUrl`，模擬更加真實的來源情境。

### Phase 2: UI 來源識別標籤與一鍵複製 AI 診斷實作 狀態：`[已完成]`
- [x] 任務 2.1: 實作日誌卡片來源區塊視覺重構
    - 在日誌卡片中渲染來源徽章（區分網頁域名、擴充功能識別、模擬標籤），提供清晰的視覺層次。
- [x] 任務 2.2: 實作一鍵複製 AI 診斷 Markdown 功能
    - 在頂部過濾器/清空按鈕旁加入「📋 複製 AI 報告」按鈕。
    - 實作結構化 Markdown 匯出字串（包含檢測時間、網址/網域、風險分級統計、詳細調用清單與 AI 審核提示詞）。
    - 實作複製成功視覺反饋（按鈕顯示綠色勾勾與「已複製」狀態 2 秒）。

### Phase 3: 功能文檔更新與 TypeScript 建置驗證 狀態：`[已完成]`
- [x] 任務 3.1: 更新模組說明文檔
    - 於 `chrome_scrumclock/src/features/toolbox/tools/activity-monitor/功能說明.md` 補齊來源歸屬與一鍵複製功能之操作說明。
- [x] 任務 3.2: 專案編譯與型別安全驗證
    - 於 `chrome_scrumclock` 執行 `npm run build`，確保無編譯與型別錯誤。
