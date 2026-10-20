---
title: "Google 生態雙軌同步規格與落地實作計畫 (Tasks & Sheets)"
plugin: "global"
status: "已完成 (Phase 1~5 全數驗收通過)"
created: "2026-10-08"
deadline: "2026-10-15"
---

## 1. 目標
落實 `0.doc_mg/draft/Google 生態雙軌同步規格與落地架構指南.md` 定義之規格，建立 Chrome Plus 插件生態（ScrumClock、FinanceClipper）與 Google 雲端工作空間（Google Tasks、Google Sheets）的零摩擦雙軌自動化同步機制。採用 Google Apps Script (GAS) Web App / 本機微服務雙模橋接架構，徹底規避 Chrome Extension 繁雜之 Web Store OAuth 審核，達成日終戰報數據湖沉澱、看板衝刺手機端推播、投研個股沙盒建檔與行動端靈感反哺收件匣。

## 2. 策略與鎖定檔案

### 核心實作策略
1. **雙模傳輸架構**：
   - **雲端直連模式 (GAS Web App)**：提供即插即用之 Google Apps Script 範本，使用者部署個人 Web App 後在插件設定頁填入 Webhook URL，擴充功能直接透過 `fetch` 發送結構化 JSON。
   - **本機微服務模式 (Local Hub)**：於 `0.doc_mg/tools/main_dispatcher.py` 擴充 `sync_google` 工具，作為離線重試快取與進階整合之退避橋接。
2. **漸進式分期落地 (P0 -> P3)**：
   - 先行落地 **P0 日終戰報 Sheets 匯出** 與 **P1 看板焦點 Tasks 推播**，再行推進 **P2 投研個股追蹤** 與 **P3 Tasks 逆向匯入**。
3. **插件邊界防禦與隔離**：
   - 保持各插件獨立儲存與設定，跨插件採用相同資料結構契約，不產生跨插件程式碼耦合。

### 鎖定檔案 (Target Files)
- `./0.doc_mg/draft/Google 生態雙軌同步規格與落地架構指南.md`
- `./0.doc_mg/tools/main_dispatcher.py`
- `./0.doc_mg/tools/gas/google_sync_hub.gs` (新建：GAS 伺服端標準腳本)
- `./chrome_scrumclock/src/services/googleSyncService.ts` (新建：ScrumClock 同步服務模組)
- `./chrome_scrumclock/src/components/EndOfDayReview.tsx` (實為 `features/scrumclock/components/EndOfDayReview.tsx`)
- `./chrome_scrumclock/src/dashboard/components/BoardView.tsx`
- `./chrome_scrumclock/src/components/SettingsPanel.tsx`
- `./finance-research-clipper-oss/src/modules/export/googleSheetsExporter.ts` (新建：FinanceClipper 試算表匯出器)
- `./finance-research-clipper-oss/src/options/options.html`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md` (更新 Sync Service 與 Storage Schema 宣告)
- [x] L1 專家技能：`./.agents/skills/finance-clipper-core/SKILL.md` (更新 Sheets Exporter 模組宣告)
- [x] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md` (新增 Google Tasks/Sheets 同步操作說明)
- [x] L2 插件導航：`./finance-research-clipper-oss/FINANCE_CLIPPER_README.md` (新增 Google Sheets 匯出說明)
- [x] L3 業務規格：`./0.doc_mg/docs/cross_plugin_contract.md` (更新 Google Sync Webhook 資料合約)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 基礎設施與 GAS 服務端腳本建置 狀態：`[已完成]`
- [x] 任務 1.1: 建立 GAS 標準部署代碼與合約定義
    - [x] 於 `0.doc_mg/tools/gas/google_sync_hub.gs` 實作處理 `SYNC_DAILY_LOG`、`CREATE_GOOGLE_TASK`、`SYNC_PORTFOLIO` 與 `FETCH_INBOX_TASKS` 之 `doPost` / `doGet` 邏輯。
    - [x] 撰寫使用者單鍵部署與授權引導手冊 (`0.doc_mg/docs/gas_deployment_guide.md`)。
- [x] 任務 1.2: 本機微服務橋接擴充
    - [x] 在 `0.doc_mg/tools/main_dispatcher.py` 與 `chrome_gemini_nano/tools/main_dispatcher.py` 擴充 `sync_google` 命令處理器，支援本機轉發與離線重試佇列。

### Phase 2: ScrumClock 日終戰報 ➔ Google Sheets 自動同步 (P0) 狀態：`[已完成]`
- [x] 任務 2.1: ScrumClock 設定層擴充
    - [x] 於 `chrome_scrumclock` 新增 GAS Webhook URL 與同步開關設定欄位，持久化至 `chrome.storage.local`。
- [x] 任務 2.2: 同步核心模組實作
    - [x] 建立 `googleSyncService.ts`，封裝日報 Payload 結構化封裝、逾時處理與錯誤退避。
- [x] 任務 2.3: `EndOfDayReview.tsx` 整合與 UI 回饋
    - [x] 在結算流程新增「📊 同步至 Google Sheets」選項與狀態提示（成功/失敗重試）。

### Phase 3: ScrumClock 看板焦點 ➔ Google Tasks 雙向推播 (P1) 狀態：`[已完成]`
- [x] 任務 3.1: 看板狀態轉移事件掛載
    - [x] 於 `BoardView.tsx` 當卡片移入 `in-progress` 或標記完成 `done` 時，觸發 Tasks 建立與狀態更新。
- [x] 任務 3.2: 標籤、番茄計數與到期日對齊
    - [x] 格式化任務標題（如 `[1🍅] 任務名稱`）與 Google Tasks `notes` / `due` 連動。

### Phase 4: FinanceClipper 研報 ➔ Google Sheets 估值沙盒建檔 (P2) 狀態：`[已完成]`
- [x] 任務 4.1: 個股資料與試算表欄位結構對齊
    - [x] 於 `finance-research-clipper-oss` 建立 `googleSheetsExporter.js` 與 `googleSheetsExporter.ts`，支援代碼比對更新或新增列。
- [x] 任務 4.2: 研報摘要與 Nano 反常識論點寫入
    - [x] 匯出時包含 P/E、殖利率、目標價及 AI 萃取之核心觀點。

### Phase 5: Google Tasks 逆向匯入看板收件匣 (P3) 與全域驗收 狀態：`[已完成]`
- [x] 任務 5.1: 逆向抓取與 Inbox 轉化
    - [x] 於 ScrumClock 加入輕量巡檢邏輯，抓取行動端新增之 Google Tasks 並經由 `TaskAIEngine` 轉入看板收件匣。
- [x] 任務 5.2: 全域整合驗收與 SSOT 閉環
    - [x] 完整端到端傳輸測試、除錯日誌清理與 UTF-8 編碼檢查。
    - [x] 完成 L1~L4 SSOT 文檔回寫與任務歸檔。

## 4. 影響評估
- **權限衝擊**：完全無需在 `manifest.json` 宣告 `identity` 權限；僅需確保 `declarativeNetRequest` 或外部 fetch 允許使用者自訂之 GAS 網域。
- **隔離性**：各插件獨立維護其同步設定，彼此零耦合。
- **安全性**：Webhook URL 僅儲存於使用者本機 `chrome.storage.local`，無任何第三方伺服器中繼。

## 5. 驗收標準
- [x] **技術指標**: 前端 fetch 請求具備健全逾時（10 秒）與錯誤捕獲機制，網路斷線時不阻礙核心 UI 流程。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範與各插件原有樣式隔離架構。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 完成 Target SSOTs 骨架更新（L1 專家技能、L2 插件導航、L3 業務規格、L4 任務歸檔）。
- [x] **插件驗證**: 各插件在 Chrome 中重新載入或構建測試皆無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - 2026-10-08 ID: 81fedec5-1b6d-4314-9e76-6e8053ccefe5 (初始化規劃)
> - 2026-10-08 ID: a9452dc7-0605-4a6d-8567-57353b7ed254 (Phase 1 基礎設施與 GAS 腳本建置)
> - 2026-10-08 ID: b0a90117-fbce-43ea-96b4-8f664199b330 (Phase 2 日終戰報 Sheets 自動同步落地)
> - 2026-10-08 ID: dd7e5fc0-7764-44b6-8020-932c6fbbe478 (Phase 3 看板焦點與 Tasks 雙向推播落地)
> - 2026-10-08 ID: b49e31c5-af9d-4074-bf38-f5cd0e6e08a1 (Phase 4 FinanceClipper 研報與估值沙盒建檔落地)
> - 2026-10-08 ID: 8009e736-fc61-488c-8be0-cbeffe668103 (Phase 5 Google Tasks 逆向匯入看板收件匣與全域驗收結案)
>
> **結案狀態**: 本任務全體 Phase 1 ~ Phase 5 已全數落地完成，所有 SSOT 閉環更新完畢。
