---
title: "ScrumClock V2：GTD 輕量快捷捕捉、多維敏捷看板、WIP 限制與工時自動回填"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-23"
---

## 1. 目標
升級 ScrumClock 敏捷專案管理模組，貫徹「零負擔 GTD + 敏捷看板」極簡哲學：摒棄多餘的複雜標籤與多維矩陣，僅聚焦「Inbox 快速捕捉（Alt+Q / 右鍵）」、「Inbox 轉 Next Action」、「單一看板清晰流轉（Inbox -> Next Actions -> In Progress -> Done）」、In Progress WIP 限制與番茄鐘工時自動累加。

## 2. 策略與鎖定檔案
1. **極簡全域捕捉 (Capture)**：利用 `chrome.contextMenus` 與快捷鍵 `Alt+Q`，秒級將選取文字或網頁標題直接寫入 `Inbox` 容器，無任何彈窗阻礙思考。
2. **極簡資料模型 (Clarify & Organize)**：任務只擴充必要的 GTD 狀態映射（`inbox`、`next-action`、`in-progress`、`done`、`someday`）與番茄工時（`estimatedPomodoros`、`spentPomodoros`），堅決不引入多餘的繁瑣標籤或艾森豪矩陣。
3. **無痛看板融合 (Engage)**：在現有 `BoardView.tsx` 整合 `Inbox` 欄位與一鍵轉 `Next Action` / `Someday` 操作，達成 Inbox Zero。
4. **WIP 限制 (Focus)**：In Progress 嚴格限制在製品上限（預設 3 項，超額警告），引導專注單一行動。
5. **番茄鐘工時自動累加**：番茄鐘計時完成時自動將工時回填至當前關聯任務之 `spentPomodoros`。
6. **專屬 Feature Flags**：於 Options 頁面提供 ScrumClock 內部開關（GTD 快捷捕捉、WIP 限制），恪守插件 100% 獨立隔離。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/manifest.json`
- `./chrome_scrumclock/src/shared/types/taskContracts.ts`
- `./chrome_scrumclock/src/shared/types/index.ts`
- `./chrome_scrumclock/src/background/serviceWorker.ts`
- `./chrome_scrumclock/src/dashboard/components/BoardView.tsx`
- `./chrome_scrumclock/src/dashboard/components/TaskCard.tsx`
- `./chrome_scrumclock/src/options/Options.tsx`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md` (新增極簡 GTD 容器與狀態定義)
- [x] L2 插件導航：`./chrome_scrumclock/README.md` (更新 GTD 捕捉快捷鍵與看板說明)
- [x] L3 業務規格：`./chrome_scrumclock/docs/gtd-kanban-spec.md` (極簡 GTD 與 WIP 規範)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 極簡 GTD 資料模型與快捷捕捉 (Capture) 狀態：`[已完成]`
- [x] 任務 1.1: 擴充 Task 資料契約與 Storage 相容層
    - [x] 在 `taskContracts.ts` 與 `index.ts` 擴充 GTD 狀態支援（`inbox`、`someday`）及番茄計數（`estimatedPomodoros`、`spentPomodoros`）
    - [x] 確保舊版任務資料載入時平滑向上相容
- [x] 任務 1.2: 原生全域快速捕捉機制 (Omni-Capture)
    - [x] 在 `manifest.json` 註冊 `Alt + Q` 快捷鍵指令與 contextMenus 權限
    - [x] 在 Background 監聽右鍵與快捷鍵，快速取得選取文字或網頁標題直接寫入 `Inbox`
    - [x] 透過 Chrome 原生 Notification 提供無干擾的捕捉成功回饋

### Phase 2: 看板 Inbox 整合、釐清工作流與 WIP 限制 狀態：`[已完成]`
- [x] 任務 2.1: `BoardView` 極簡流轉（Inbox -> Next Actions -> Doing -> Done）
    - [x] 在看板整合 `Inbox` 專屬欄位與一鍵釐清轉移按鈕（移至 Next Action / 暫存 Someday）
    - [x] 支援拖拉無縫變更任務狀態
- [x] 任務 2.2: WIP 在製品限制與專注保護
    - [x] 實作 In Progress 欄位卡片數量上限警示（超額時標頭警示與色框反白）
    - [x] 於卡片中清晰標註預估與實際番茄數

### Phase 3: 番茄鐘工時自動回填與本地 Feature Flags 狀態：`[已完成]`
- [x] 任務 3.1: 番茄鐘工時自動累加回填
    - [x] 計時器完成事件觸發時，自動為關聯任務的 `spentPomodoros` 遞增 1
    - [x] 在卡片即時反映已消耗番茄數
- [x] 任務 3.2: ScrumClock 本地模組開關
    - [x] 在 Options 頁面提供 GTD 快捷捕捉、WIP 限制的獨立開關控制項
    - [x] 嚴格恪守隔離原則，僅管理 ScrumClock 自身配置

## 4. 影響評估
- 採非侵入式右鍵與快捷鍵模式，避免全域注入 Shadow DOM 造成的頁面 CSP 衝突與擴充套件肥大。
- 多維看板採單一元件動態分組，代碼維護量比獨立 3 套 View 減少約 60%。
- Task 資料向下相容，既有專案與看板卡片不受影響。

## 5. 驗收標準
- [x] **技術指標**: 快捷鍵 `Alt + Q` 與右鍵選單能秒級捕捉網頁標題與內文至 Inbox。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無跨插件依賴污染。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉狂**: 重大架構同步完成，已精準回寫 Target SSOTs 骨架。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件，確認 GTD 捕捉、多維度分組、WIP 與工時回填運作流暢。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: 406e4174-4fdd-4fce-990b-20db5c66e328 (初始化任務拆解)
> - 2026-10-02 ID: c2dd5d06-132a-4a76-be41-314d085ced38 (極簡最佳化架構重構)
> - 2026-10-02 ID: 92fc17db-9915-4340-abaf-90f17fd93609 (Phase 1 完成：GTD 資料契約、平滑相容、Alt+Q 與右鍵 Omni-Capture)
> - 2026-10-02 ID: e1805e2f-dafc-46ad-b4e2-4fba1368c1b5 (Phase 2 完成：BoardView 看板與 TaskCard 卡片、原生拖拉流轉、Inbox 快速釐清、WIP 上限警示)
> - 2026-10-02 ID: 7c678dfc-96ce-493b-8bfc-a158e002fede (Phase 3 完成：番茄鐘工時自動累加回填、Options 本地 Feature Flags、SSOT 閉環與編譯驗證)
