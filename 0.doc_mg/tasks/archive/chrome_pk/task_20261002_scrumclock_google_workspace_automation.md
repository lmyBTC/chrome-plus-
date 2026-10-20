---
title: "ScrumClock V2：Google 原生生態極簡雙向同步 (Tasks & Calendar) 與站會自動化"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-02"
completed: "2026-10-02"
deadline: "2026-10-25"
archived_path: "0.doc_mg/tasks/archive/chrome_scrumclock/task_20261002_scrumclock_google_workspace_automation.md"
---

## 1. 目標 (Lean Vision)
以最高 ROI 與最小審核阻力為核心，透過 Chrome 原生 `chrome.identity` 取得最小必要授權（Google Tasks 與 Google Calendar Events），打造零摩擦之「雙向工作管理與時間箱 (Timeboxing) 閉環」，並提供純前端站會 Standup 報表生成器：
1. **Google Tasks 雙向同步**：手機/手錶/電腦看板即時連動，任務狀態自動同步。
2. **Google Calendar 時間箱**：番茄鐘專注結束自動回填行事曆實績區塊。
3. **Standup Copilot**：一鍵彙整 Done/Focus/Blockers 生成 Markdown/HTML 剪貼簿，免除敏感 Docs/Sheets 權限開銷。

## 2. 策略與鎖定檔案
- **OAuth 範圍極小化**：僅請求 `tasks` 與 `calendar.events`，降低 Chrome Web Store 審查被拒與 Google 驗證門檻。
- **純資料防腐與佇列**：沿用專案現有 `outboxQueue.ts` 模式，離線狀態或 API 失敗時自動排隊重試。
- **降維與解耦**：捨棄脆弱的 Meet DOM 爬蟲與肥大的 Sheets 雙向資料庫連動，將報表導出收斂為零依賴的剪貼簿/Webhook 引擎。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/manifest.json`
- `./chrome_scrumclock/src/shared/google/googleTypes.ts` (共用資料模型與設定型別)
- `./chrome_scrumclock/src/shared/google/googleAuthClient.ts` (Token 取得、快取與續約)
- `./chrome_scrumclock/src/shared/google/googleTasksService.ts` (Tasks API 雙向連動引擎)
- `./chrome_scrumclock/src/shared/google/googleCalendarService.ts` (Calendar Event 排程與回填)
- `./chrome_scrumclock/src/dashboard/components/StandupModal.tsx` (站會簡報導出 UI)
- `./chrome_scrumclock/src/features/project-management/components/modals/StandupModal.tsx` (模態框相容導出)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md` (Google 整合模組架構與資料模型)
- [x] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md` (OAuth 設定說明與 Google 服務使用指南)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔)

## 3. 任務拆解 (Lean 3-Phase Execution)

### Phase 1: 基礎設施、共用型別與 Google Tasks 雙向同步 狀態：`[已完成]`
- [x] 任務 1.1: OAuth 宣告與共用模型
    - [x] 在 `manifest.json` 宣告 `identity` 權限與必要 Scopes (`tasks`, `calendar.events`)
    - [x] 建立 `googleTypes.ts` 定義 Google 帳戶狀態、映射 ID 對照表與同歩選項
    - [x] 實作 `googleAuthClient.ts` 封裝 `chrome.identity.getAuthToken` 與 Token 失效清除機制
- [x] 任務 1.2: Google Tasks 雙向連動引擎
    - [x] 實作 `googleTasksService.ts` 提供 Tasks 清單列舉、建立、狀態更新 (`status: 'completed'`)
    - [x] 串接看板任務事件：本地任務完成時自動推播 Google Tasks；提供「拉取更新」按鈕同步外部異動

### Phase 2: Google Calendar 時間箱排程與工時實績回填 狀態：`[已完成]`
- [x] 任務 2.1: 行事曆事件建立與時間箱連動
    - [x] 實作 `googleCalendarService.ts` 封裝 Events API
    - [x] 支援從任務卡片排定指定時段，生成 Google Calendar 預約事件
- [x] 任務 2.2: 番茄鐘衝刺實績自動回填
    - [x] 監聽番茄鐘計時完成事件，在使用者主日曆自動追加 `[🍅專注] 任務標題` 之彩色時段區塊

### Phase 3: 每日站會 Copilot (Standup Generator) 與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 3.1: 站會 Markdown 產生器與 UI 互動
    - [x] 在 Dashboard 實作 `StandupModal.tsx`，自動彙總昨日 Done、今日 In-Progress 與標記 Blocked 任務
    - [x] 支援「一鍵複製 Markdown」與「複製 HTML 富文本」（可無縫貼入 Google Docs / Notion / Slack）
- [x] 任務 3.2: 專案驗證、清理與 SSOT 閉環
    - [x] 執行 TypeScript 編譯檢驗與除錯代碼清理 (Vite & tsc build 通過)
    - [x] 回寫 `scrumclock-core` SKILL 與 `SCRUMCLOCK_README.md`
    - [x] 將本任務封存至 `0.doc_mg/tasks/archive/chrome_scrumclock/`

## 4. 影響評估
- 需要在 Google Cloud Console 啟用 Google Tasks API 與 Google Calendar API，並配置 OAuth 2.0 Client ID。
- 若使用者尚未登入 Google 帳號，UI 具備溫和的未登入降級提示（不影響原有純本地看板運作）。

## 5. 驗收標準
- [x] **技術指標**: OAuth2 授權流程順暢，Token 快取與自動續約正常；所有 API 呼叫均具備錯誤攔截保護。
- [x] **核心規範**: 僅請求最小必要權限，符合 Chrome Web Store 與 Google OAuth 安全規範。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 重大架構同步完成，已精準回寫 Target SSOTs 骨架。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件，驗證 Tasks 雙向同步、Calendar 實績寫入與 Standup 產出正常。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: 406e4174-4fdd-4fce-990b-20db5c66e328 (初始化任務拆解)
> - 2026-10-02 ID: 55520282-51b8-41e4-b6c1-53aa4a9696c3 (架構優化：剔除高摩擦 Sheets/Docs/Meet，聚焦 Tasks/Calendar/Standup 極簡三階段)
> - 2026-10-02 ID: bab1e9b0-8f04-4c3f-8a59-c08c91e4a00f (完成 Phase 1：OAuth 宣告、GoogleAuthClient、GoogleTasksService、Tasks 雙向同步引擎與 UI 連動)
> - 2026-10-02 ID: b7de2dd0-bf64-434a-9397-f843c28e2b79 (完成 Phase 2：Google Calendar REST API 服務、任務時間箱預約 UI 與番茄鐘實績自動回填日曆)
> - 2026-10-02 ID: 8a66a89a-64d6-4b0c-a291-6c347fba0254 (完成 Phase 3：實作 StandupModal 站會報表生成器、HTML富文本與Markdown複製、專案建置驗證、SSOT 回寫與任務封存)
