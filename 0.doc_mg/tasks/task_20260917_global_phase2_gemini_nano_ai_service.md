---
title: "Phase 2: Gemini Nano AI 研報摘要引擎共用服務 (AI Service as an Agent)"
plugin: "global"
status: "已完成"
created: "2026-09-17"
deadline: "2026-09-24"
---

## 1. 目標
將 `chrome_scrumclock` 內建的 Chrome 本地端 LLM (Gemini Nano / Built-in AI) 推論能力服務化，透過安全跨插件訊息協議 (`externally_connectable`) 提供給 `finance-research-clipper-oss`。
使 FinanceClipper 能夠在零伺服器成本、零 API Key 配置且完全隱私保障的環境下，為使用者採集之個股財報、估值數據與最新新聞自動產出「智能三句話速讀」、「多空觀點分析」與「財務健康警示」。

## 2. 策略與鎖定檔案
1. **ScrumClock 服務化開放**：
   - 於 ScrumClock `public/manifest.json` 增加 `externally_connectable` 白名單。
   - 於 `src/background.ts` 監聽 `chrome.runtime.onMessageExternal`，提供 `AI_PING`、`AI_CAPABILITIES` 與 `AI_GENERATE_FINANCE_SUMMARY` 訊息端點。
   - 於 `src/utils/ai-helper.ts` / `src/utils/ai-prompts.ts` 封裝專用研報摘要 Prompt 與結構化解析。
2. **FinanceClipper 客戶端與 UI 整合**：
   - 建立 `aiClient.js` 模組，安全調用 ScrumClock 提供的 AI 服務，並支援連線狀態快取與超時防護。
   - 於 `dashboard.html` 與 `dashboard.css` 建立「🤖 AI 智能解讀面板」，包含三句話速讀、多空重點、風險提示與一鍵複製 Markdown。
   - 於 `dashboard.js` 整合：股票採集完成後自動或手動觸發 AI 分析，並將結果持久化至 `chrome.storage.local`。

### 鎖定檔案 (Target Files)
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/public/manifest.json`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/background.ts`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/utils/ai-helper.ts`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/utils/ai-prompts.ts`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/aiClient.js`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/dashboard.html`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/dashboard.css`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/dashboard.js`

## 3. 任務拆解

### Phase 2.1: 通訊協定與服務端端點設計 (ScrumClock) 狀態：`[已完成]`
- [x] 任務 2.1.1: 跨插件外部連線配置
    - [x] [原子任務] 於 ScrumClock `public/manifest.json` 配置 `externally_connectable` 接收來自外部插件之通訊。
    - [x] [原子任務] 於 ScrumClock `src/features/finance-integration/types.ts` 定義 `AI_GENERATE_FINANCE_SUMMARY` 之 Request 與 Response Payload 介面規格。
- [x] 任務 2.1.2: 財務研報 Prompt 範本與 Schema 實作
    - [x] [原子任務] 建立或擴充 `src/utils/ai-prompts.ts`，新增 `buildFinanceSummaryPrompt(data)` 函式，包含三句話摘要、多空核心亮點與財務風險警示。
    - [x] [原子任務] 在 `src/utils/ai-helper.ts` 新增研報結構化抽取安全解析函式，支援 JSON 與結構化 Markdown 雙格式降級。
- [x] 任務 2.1.3: Background Service Worker 處理推論請求
    - [x] [原子任務] 於 `src/background.ts` 的 `onMessageExternal` 註冊 `AI_PING`（偵測 Gemini Nano 是否就緒）與 `AI_GENERATE_FINANCE_SUMMARY` 事件處理器。
    - [x] [原子任務] 串接 `getAICore` 執行本地端推論，實作超時防護 (預設 30 秒) 與錯誤捕捉，回傳標準化 `{ success, summary, error }`。

### Phase 2.2: FinanceClipper AI 客戶端封裝與狀態管理 狀態：`[已完成]`
- [x] 任務 2.2.1: FinanceClipper AI Client 模組建立
    - [x] [原子任務] 建立 `finance-research-clipper-oss/aiClient.js`，封裝呼叫 ScrumClock AI 之非同步方法 `checkAIAvailability()` 與 `requestFinanceSummary(stockData)`。
    - [x] [原子任務] 實作未安裝或未啟動 ScrumClock 之優雅降級邏輯與自訂 Extension ID 快取。
- [x] 任務 2.2.2: 本地研報 AI 結果快取設計
    - [x] [原子任務] 於 `chrome.storage.local` 實作依 `ticker + date` 為 Key 的 AI 摘要快取機制，避免相同標的當日重複消耗運算資源。

### Phase 2.3: FinanceClipper 儀表板 UI 整合 (智能解讀面板) 狀態：`[已完成]`
- [x] 任務 2.3.1: 儀表板 HTML 視圖與 CSS 樣式建置
    - [x] [原子任務] 於 `dashboard.html` 的 Hero 卡片與財報區塊之間，新增「🤖 Gemini Nano 智能解讀」卡片結構。
    - [x] [原子任務] 於 `dashboard.css` 編寫科技深色主題之卡片樣式、骨架屏 (Skeleton Loading) 與流光呼吸動畫。
- [x] 任務 2.3.2: 交互邏輯與自動/手動觸發連動
    - [x] [原子任務] 於 `dashboard.js` 綁定「✨ 生成 AI 解讀」與「🔄 重新分析」按鈕事件。
    - [x] [原子任務] 採集成功後自動檢查快取或發起 AI 摘要請求，即時動態渲染至 UI。
    - [x] [原子任務] 新增「📋 複製 AI 研報摘要」按鈕，方便使用者直接複製產出之重點至筆記軟體。

### Phase 2.4: 整合驗證、容錯與合規審計 狀態：`[已完成]`
- [x] 任務 2.4.1: 異常情境與相容性測試
    - [x] [原子任務] 測試當本機尚未啟用 Chrome AI (Gemini Nano) 時之 UI 友善導引提示 (顯示開啟 flag 指引)。
    - [x] [原子任務] 測試 Service Worker 喚醒與長時間請求中斷點容錯。
- [x] 任務 2.4.2: 建置打包與合規審計
    - [x] [原子任務] 執行 ScrumClock `npm run build` 確認 Vite 打包無報錯。
    - [x] [原子任務] 執行 `python 0.doc_mg/tools/audit_manifests.py` 確認 Manifest V3 審計合規。

## 4. 影響評估
- 效能影響：推論透過 Chrome 本地端 NPU/GPU/CPU 進行，推論期間透過非同步 message 傳遞，不阻礙任何 DOM 渲染。
- 權限影響：ScrumClock 需在 `public/manifest.json` 加入 `externally_connectable`；不新增其他敏感 Chrome 權限。
- 降級保證：若使用者電腦不支援 Gemini Nano，原有 FinanceClipper 與 ScrumClock 功能 100% 正常運作。

## 5. 驗收標準
- [x] **技術指標**: FinanceClipper 在點擊「生成 AI 解讀」後，能獲取由 ScrumClock 背景推論產出的財務摘要。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無跨域或 CSP 違規。
- [x] **除錯清理**: 移除所有暫存 `console.log`，保留必要的警告與錯誤訊息。
- [x] **檔案編碼**: 所有檔案均以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: `npm run build` 通過，Manifest 合規審計無警示。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-17 ID: 62b94652-be5e-4dd8-8a35-f8216a8f824c (自總任務拆分並完成任務細分)
> - 2026-09-17 ID: 88707f67-777d-45ca-8142-8e99a0f249c2 (實施規劃與端點實作準備)
