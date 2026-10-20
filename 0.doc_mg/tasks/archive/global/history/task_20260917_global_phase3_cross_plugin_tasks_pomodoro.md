---
title: "Phase 3: 研報任務化與研究番茄鐘雙向工作流 (Research-to-Action Closed Loop)"
plugin: "global"
status: "已完成"
created: "2026-09-17"
deadline: "2026-09-26"
---

## 1. 目標
打通「投資資訊輸入」與「深度專注行動」之間的斷層，建立研究到行動的雙向生產力閉環：
1. **研報一鍵轉待辦任務 (FinanceClipper -> ScrumClock)**：在個股儀表板或側欄採集時，可直接將該標的轉為 ScrumClock 的今日作戰任務，自動帶入個股代碼、研究目標與 Markdown 筆記。
2. **研究番茄鐘標的連動 (ScrumClock -> FinanceClipper)**：在 ScrumClock 啟動標記有 `#投資研究` 或 `$TICKER` 的番茄鐘時，自動喚起 FinanceClipper 的側邊欄或預熱行情，協助投資人進入沉浸式研究。

## 2. 策略與鎖定檔案
1. **任務建立協定實作**：
   - 擴充 ScrumClock `src/background.ts` 的 `onMessageExternal`，提供 `CREATE_TASK` 端點。
   - 透過 ScrumClock 的任務管理邏輯（或 `weeklyMissions` / 今日戰役資料結構），安全新增任務，並支援系統通知提醒。
2. **FinanceClipper 轉任務交互**：
   - 於 `dashboard.html` / `sidepanel.html` 新增「🎯 加入今日作戰戰役」按鈕。
   - 彈出輕量確認介面（設定預估番茄鐘數、研究備註），呼叫 API 寫入。
3. **專注模式廣播與快速捕捉識別**：
   - 於 ScrumClock 啟動番茄鐘時檢查任務標籤，若包含金融相關標籤則廣播 `FOCUS_STARTED` 事件。
   - 於 ScrumClock `QuickCapture.tsx` 增強語法識別（如輸入 `$NVDA` 自動分類為投資研究）。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/background.ts`
- `./chrome_scrumclock/src/types/index.ts`
- `./chrome_scrumclock/src/features/scrumclock/components/QuickCapture.tsx`
- `./chrome_scrumclock/src/features/scrumclock/contexts/TimerContext.tsx`
- `./chrome_scrumclock/src/features/finance-integration/types.ts`
- `./finance-research-clipper-oss/aiClient.js`
- `./finance-research-clipper-oss/background.js`
- `./finance-research-clipper-oss/dashboard.html`
- `./finance-research-clipper-oss/dashboard.js`
- `./finance-research-clipper-oss/sidepanel.html`
- `./finance-research-clipper-oss/sidepanel.js`
- `./0.doc_mg/docs/cross_plugin_contract.md`

## 3. 任務拆解

### Phase 3.1: 研報一鍵轉待辦任務協議與實作 (Finance -> ScrumClock) 狀態：`[已完成]`
- [x] 任務 3.1.1: 跨插件任務建立 API (ScrumClock 端)
    - [x] [原子任務] 於 `src/features/finance-integration/types.ts` 定義 `CreateTaskPayload`（包含 `title`、`notes`、`tags`、`estimatedPomodoros`、`url`、`ticker`）。
    - [x] [原子任務] 於 `src/background.ts` 新增 `CREATE_TASK` 監聽器，校驗資料並呼叫 StorageQueue 寫入 `weeklyMissions` 或日常任務庫。
    - [x] [原子任務] 實作建立成功後彈出桌面通知 (`chrome.notifications`) 與發送響應。
- [x] 任務 3.1.2: FinanceClipper 儀表板與側邊欄轉任務 UI
    - [x] [原子任務] 於 `dashboard.html` 的導航列與功能操作區新增「🎯 加入今日作戰戰役」按鈕與樣式。
    - [x] [原子任務] 於 `dashboard.js` 實作點擊事件：組合當前個股代碼、最新價格、AI 摘要與個人筆記，格式化為 Markdown 並發送至 ScrumClock。
    - [x] [原子任務] 於 `sidepanel.html` 與 `sidepanel.js` 同步加入「轉為研究任務」捷徑按鈕。

### Phase 3.2: 研究番茄鐘與標的導航連動 (ScrumClock -> Finance) 狀態：`[已完成]`
- [x] 任務 3.2.1: 專注模式金融標籤識別與廣播
    - [x] [原子任務] 於 ScrumClock 的專注模式啟動邏輯中，解析當前任務標題或標籤（檢測是否包含 `#投資研究`、`#美股`、`#台股` 或 `$TICKER`）。
    - [x] [原子任務] 若符合金融標籤，於 `src/background.ts` 透過 `chrome.runtime.sendMessage` 向 FinanceClipper 發送 `FOCUS_STARTED` 訊息，附帶目標標的。
- [x] 任務 3.2.2: FinanceClipper 自動預備與側邊欄喚起
    - [x] [原子任務] 於 FinanceClipper `background.js` 接收 `FOCUS_STARTED` 訊息。
    - [x] [原子任務] 支援根據傳入的 `ticker` 自動載入快取行情，或在符合條件下喚起 Finance 側邊欄供使用者隨時查閱。

### Phase 3.3: 快速捕捉 (Quick Capture) 股票標籤智能辨識 狀態：`[已完成]`
- [x] 任務 3.3.1: QuickCapture 語法增強
    - [x] [原子任務] 於 `QuickCapture.tsx` 增加正規表示法識別 `$([A-Za-z0-9]+)` 語法。
    - [x] [原子任務] 輸入股票代碼時，自動於下拉選單推薦加上 `#投資研究` 標籤並預估 2 顆番茄鐘。

### Phase 3.4: 整合驗收與防禦性測試 狀態：`[已完成]`
- [x] 任務 3.4.1: 去重與邊界情況防護
    - [x] [原子任務] 測試重複點擊「加入戰役」時的防重複機制（相同標的當日已存在時，提示「任務已存在」或允許追加備註）。
    - [x] [原子任務] 測試雙方插件在各種啟動順序（先啟動 A 或先啟動 B）下的通訊穩健性。
- [x] 任務 3.4.2: 打包與合規審計
    - [x] [原子任務] 執行 Vite 打包與兩造插件 Manifest V3 合規審計驗證。

## 4. 影響評估
- 使用者體驗：大幅簡化從瀏覽財報到安排專注研究的繁瑣手動複製貼上步驟。
- 數據一致性：任務建立採用嚴格 payload 結構驗證，無資料損毀風險。

## 5. 驗收標準
- [x] **技術指標**: 在 FinanceClipper 點擊「加入今日戰役」後，ScrumClock 任務清單立即出現該標的研究卡片，包含格式化之 Markdown 筆記。
- [x] **核心規範**: 訊息通訊嚴格進行參數型別檢查，無 XSS 注入或任意指令執行風險。
- [x] **除錯清理**: 程式碼乾淨無殘留除錯日誌。
- [x] **檔案編碼**: UTF-8 (無 BOM) 編碼。
- [x] **插件驗證**: `npm run build` 通過，Manifest 合規審計無警示。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-17 ID: 62b94652-be5e-4dd8-8a35-f8216a8f824c (自總任務拆分並完成任務細分)
> - 2026-09-17 ID: 34d2f3a4-6963-4aca-a610-15bfa2a0add1 (完成 Phase 3 全部子任務實作、Manifest 審計與打包驗證)
