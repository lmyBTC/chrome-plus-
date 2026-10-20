---
title: "ScrumClock 側邊欄實用工具箱整合與 AI 模組延遲載入"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-09-26"
deadline: "2026-09-27"
---

## 1. 目標
優化 `chrome_scrumclock` 右側欄（SidePanel）啟動與載入機制：
1. **AI 模組延遲載入 (Lazy Loading)**：解決側邊欄一開啟即強行觸發 Gemini Nano AI 模組初始化 (`checkAndInitAI()`) 導致的效能損耗與資源佔用問題，改為使用者切換至 AI 助理時才按需載入。
2. **實用工具箱 (ToolboxHub) 原生整合**：將側邊欄一級導航重構為「🧰 實用工具箱」與「🤖 PK+ 助理」雙模式（預設進入實用工具箱），讓使用者在右側欄即時切換並使用 3 大工具（網頁圖片爬取器、瀏覽行為監控器、影片字幕收集器）。
3. **窄螢幕側欄樣式自適應**：強化 `ToolboxHub` 支援 `isSidebar` 模式，提供符合側邊欄寬度的自適應滾動排版與卡片視圖。

## 2. 策略與鎖定檔案
1. **AI 視圖元件解耦**：
   - 將 `main.tsx` 內的 AI 對話介面、訊息串列與 `useAISession` 抽離至獨立子元件 `src/entries/sidebar/components/AIAssistantView.tsx`。
   - 只有當前作用中分頁為 `assistant` 時，才掛載 `<AIAssistantView />` 並觸發 AI 初始化。
2. **工具箱中樞側欄適配**：
   - 修改 `src/features/toolbox/ToolboxHub.tsx`，加入 `isSidebar?: boolean` 介面參數，針對側邊欄緊湊寬度調整 Padding 與 Tab 排版。
   - 在 `src/entries/sidebar/main.tsx` 中掛載 `<ToolboxHub isSidebar={true} />`。
3. **SSOT 文檔閉環**：
   - 回寫 `chrome_scrumclock/SCRUMCLOCK_README.md`。
   - 回寫 `.agents/skills/scrumclock-core/SKILL.md`。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/features/toolbox/ToolboxHub.tsx`
- `chrome_scrumclock/src/entries/sidebar/main.tsx`
- `chrome_scrumclock/src/entries/sidebar/components/AIAssistantView.tsx`
- `chrome_scrumclock/SCRUMCLOCK_README.md`
- `.agents/skills/scrumclock-core/SKILL.md`

## 3. 任務拆解

### Phase 1: 側邊欄 AI 模組解耦與延遲載入 狀態：`[已完成]`
- [x] 任務 1.1: 抽離 AIAssistantView 子元件
    - 建立 `chrome_scrumclock/src/entries/sidebar/components/AIAssistantView.tsx`。
    - 封裝 `useAISession`、對話歷史渲染、快捷功能按鈕與訊息輸入框。
- [x] 任務 1.2: 重構側邊欄 main.tsx 模式切換
    - 預設模式切換為 `'toolbox'`，並提供 `'toolbox' | 'assistant'` 二元切換列。
    - 透過條件渲染達到按需掛載 `<AIAssistantView />`，徹底避免啟動自動載入 AI。

### Phase 2: ToolboxHub 側邊欄自適應與工具整合 狀態：`[已完成]`
- [x] 任務 2.1: ToolboxHub 支援 isSidebar 模式
    - 調整 `ToolboxHub.tsx` 介面支援 `isSidebar?: boolean`。
    - 依據 `isSidebar` 動態調整 Header 標題字級、邊距與 3 大工具（圖片爬取、行為監控、字幕收集）切換 Pills 排版。
- [x] 任務 2.2: 側邊欄無縫嵌入 ToolboxHub
    - 在 `main.tsx` 中引入並渲染 `<ToolboxHub isSidebar={true} />`，確保三項工具在側欄隨點即用。

### Phase 3: 編譯驗證與 SSOT 文檔回寫 狀態：`[已完成]`
- [x] 任務 3.1: 執行 TypeScript 編譯與打包驗證
    - 於 `chrome_scrumclock` 目錄下執行 `npm run build`，確保無型別錯誤與打包異常。
- [x] 任務 3.2: 回寫 SSOT 索引與技能字典
    - 更新 `chrome_scrumclock/SCRUMCLOCK_README.md`。
    - 更新 `.agents/skills/scrumclock-core/SKILL.md`。

## 4. 影響評估
- **效能與啟動速度**：側邊欄一開啟預設載入輕量級工具箱，徹底消除 Gemini Nano 初始化的卡頓與記憶體負擔。
- **操作體驗提升**：使用者在右側欄即享圖片爬取、行為監控、字幕收集 3 大功能，並可隨時一鍵切換回 PK+ AI 助理。
- **權限與通訊相容**：無破壞性修改，既有番茄鐘狀態同步與右鍵劃詞同步均完整保留。

## 5. 驗收標準
- [x] **技術指標**: 新增與重構之 React 元件符合 TypeScript Strict 檢查，無任何 `any` 繞過或型別報錯。
- [x] **延遲載入**: 側邊欄開啟時不呼叫 `checkAndInitAI()`，切換至「PK+ 助理」時才初始化 AI 模組。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範與 Vite 建置流程。
- [x] **除錯清理**: 程式碼內無殘留之 `console.log()` 或除錯測試代碼。
- [x] **檔案編碼**: 確認所有新增與修改的檔案皆為 UTF-8 (無 BOM) 編碼。
- [x] **SSOT 文件同步**: 完成回寫 `SCRUMCLOCK_README.md` 與 `scrumclock-core/SKILL.md`。
- [x] **插件驗證**: `npm run build` 成功完成，無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: 9301de98-92cc-4bc9-ac9b-67e029db70b0 (Gate 0 評估與 Gate 1 任務藍圖擬定)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20260926_scrumclock_sidebar_lazy_ai_and_toolbox.md，開始執行 Phase 1
> ```
