---
title: "ScrumClock 敏捷番茄鐘與專案管理職責解耦與重疊優化"
plugin: "chrome_scrumclock"
status: "已完成 (All Phases Completed)"
created: "2026-10-02"
deadline: "2026-10-05"
---

## 1. 目標
解決 Chrome ScrumClock 插件中「敏捷番茄鐘 (`scrumclock`)」與「專案管理 (`projects`)」兩個視圖功能高度重疊、操作心智模型割裂的問題。透過職責重新劃分，落實「**番茄鐘專注執行態 (Execution)**」與「**專案管理專注規劃態 (Planning & Review)**」的架構邊界，使使用者心智路徑清晰、操作流暢。

## 2. 策略與鎖定檔案
- **策略核心**：
  1. **定位正名**：移除專案管理分頁的 `(Demo)` 標籤，正名為「專案規劃看板」，確立其為任務 Backlog、GTD 收件匣、AI 任務拆解、Google Sheets 雲端同步的唯一真理源 (SSOT)。
  2. **番茄鐘瘦身**：敏捷番茄鐘聚焦於「當下 25 分鐘衝刺 + 今日 3~5 個焦點戰役」，精簡繁複的每週排程規劃彈窗，提供「從任務池挑選」入口與雙向聯動。
  3. **收件匣與靈感收斂**：統一 QuickCapture 與 InboxTab 的資料模型與流向，避免兩處功能重複。
  4. **衝刺日誌互補**：番茄鐘完成衝刺僅負責即時回報，歷史衝刺紀錄與分析統一在專案管理的「衝刺日誌」中呈現。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/core/layout/Sidebar.tsx`
- `./chrome_scrumclock/src/core/layout/MainLayout.tsx`
- `./chrome_scrumclock/src/core/layout/CommandPalette.tsx`
- `./chrome_scrumclock/src/features/scrumclock/components/SprintPomodoro.tsx`
- `./chrome_scrumclock/src/features/project-management/components/ProjectManagementDemo.tsx`
- `./chrome_scrumclock/src/features/project-management/components/tabs/TaskPoolTab.tsx`
- `./chrome_scrumclock/SCRUMCLOCK_README.md`
- `./.agents/skills/scrumclock-core/SKILL.md`

## 3. 任務拆解

### Phase 1: 視圖命名與導航邊界重構 狀態：`[已完成]`
- [x] 任務 1.1: 側邊欄與版面標籤重構
    - [x] 在 `Sidebar.tsx` 將 `專案管理 (Demo)` 正式更名為 `專案規劃看板`，移除 Demo 後綴。
    - [x] 同步更新 `MainLayout.tsx` 與 `CommandPalette.tsx` 中的視圖名稱與命令快捷鍵。

### Phase 2: 敏捷番茄鐘執行態瘦身與聚焦 狀態：`[已完成]`
- [x] 任務 2.1: 精簡番茄鐘介面雜訊
    - [x] 檢視 `SprintPomodoro.tsx`，保持「今日焦點戰役 (Focus Battles)」清單與番茄鐘計時器之高專注度。
    - [x] 在戰役列表上方加入「📋 前往專案池挑選/規劃任務」快速錨點連結，引導使用者在專案池整理任務，而非在番茄鐘頁面塞入過多規劃操作。

### Phase 3: 專案規劃看板功能強化與資料聯動 狀態：`[已完成]`
- [x] 任務 3.1: 強化 TaskPoolTab 與今日戰役的聯動
    - [x] 在 `TaskPoolTab.tsx` 任務卡片上強化「加入今日焦點 (Focus)」開關/按鈕，讓規劃好的任務能一鍵推入今日衝刺戰役。
    - [x] 確保 Google Sheets 雲端同步與 AI 任務拆解作為專案規劃看板的核心能力，提供直觀引導。
- [x] 任務 3.2: 統整靈感捕捉與收件匣體驗
    - [x] 確保快取靈感與待辦資料無縫匯入專案管理的 `InboxTab`，並可轉化為每週任務池項目。

### Phase 4: 打包建置驗證與 SSOT 文檔同步 狀態：`[已完成]`
- [x] 任務 4.1: TypeScript 型別檢查與建置驗證
    - [x] 執行 `npm run build` 於 `chrome_scrumclock/`，確認無型別報錯與編譯警告。
- [x] 任務 4.2: SSOT 文檔回寫與狀態收斂
    - [x] 更新 `chrome_scrumclock/SCRUMCLOCK_README.md`，記載新架構職責分工與元件說明。
    - [x] 同步更新 `.agents/skills/scrumclock-core/SKILL.md`規格字典。

## 4. 影響評估
- **儲存相容性**: 維持既有 `chrome.storage.local` 的 `WeeklyMission`、`CoreBattle` 與 `SprintLog` 結構，不更動底層 key，現有使用者儲存資料 100% 相容。
- **權限與 Manifest**: 不新增或修改任何 Manifest V3 權限，無安全或 CSP 影響。
- **跨插件通訊**: 不影響與 `FinanceClipper` 或 `VideoSpeedPlus` 之訊息協定。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 文件同步**: 若架構、模組清單、檔案分拆或接口有變動，已同步回寫並更新該插件專屬 SSOT 文件 (如 SCRUMCLOCK_README.md / SKILL.md)。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-10-02] ID: `dbcc3c63-8ed5-41f1-bf66-7613d311aaf9` (初始化 Gate 1 任務藍圖)
> - [2026-10-02] ID: `38e064de-d6f7-416a-befb-f84e8c23943e` (完成 Phase 1 視圖命名與導航邊界重構)
> - [2026-10-02] ID: `4f3366ef-8041-406f-a639-f11886eab21b` (完成 Phase 2 敏捷番茄鐘執行態瘦身與聚焦)
> - [2026-10-02] ID: `277409a4-c5bf-40f1-9206-bb165ef8e7d8` (完成 Phase 3 專案規劃看板功能強化與資料聯動)
> - [2026-10-02] ID: `361a123a-fa2a-4fbd-81c1-b2a92322ffb7` (完成 Phase 4 打包建置驗證與 SSOT 文檔同步，全案結案)
>
> **跨會話接力指令 (Session Handover)**:
> 本任務所有階段 (Phase 1 ~ Phase 4) 已全部圓滿完成！如需展開新功能，請開啟新會話並提出需求。

