---
title: "修復 Power Kit (chrome_scrumclock) 工具列點擊 Action 無反應與 Popup 行為常駐防禦"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-10"
deadline: "2026-10-10"
---

## 1. 目標
修復 `chrome_scrumclock` (Power Kit) 在 Chrome 瀏覽器工具列點擊擴充功能 Action 圖示時毫無反應、無法正常開啟 Popup 彈窗的問題。透過在 Service Worker 啟動入口與背景生命週期中常駐防禦 `openPanelOnActionClick: false` 及明確設置 `chrome.action.setPopup`，並為 Popup 頁面補齊最小尺寸防禦，徹底解決點擊失靈與 Chrome Canary 偏好覆蓋問題。

## 2. 策略與鎖定檔案

### 根本原因分析
1. **Side Panel 與 Action 行為覆蓋且未全時常駐**：先前僅在 `chrome.runtime.onInstalled` 中呼叫了 `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })`。當瀏覽器重啟、SW 閒置喚醒或未觸發安裝事件時，Chrome 可能沿用側邊欄預設或遭覆蓋為 `openPanelOnActionClick: true`。在不支援開啟側欄的特殊頁面（如 `chrome://` 或空白頁）點擊 Action 時，瀏覽器會直接靜默忽略，造成「點擊完全無反應」。
2. **缺乏執行時 `action.setPopup` 顯式綁定**：未在 SW 初始化階段主動呼叫 `chrome.action.setPopup({ popup: 'src/entries/popup/index.html' })`，導致在多插件切換或更新時，Action 點擊目標可能被重置。
3. **Popup HTML 缺少最小尺寸骨架防禦**：`popup/index.html` 僅指定 `width: 320px` 且 `overflow-hidden`，若 React 初始化渲染短暫延遲，可能因彈窗高度為 0 或過小而瞬間閉合或無法正確展開。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/background.ts`
- `./chrome_scrumclock/src/entries/popup/index.html`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md` (豁免)
- [ ] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md` (豁免)
- [ ] L3 業務規格：`./chrome_scrumclock/docs/` (豁免)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 背景服務常駐防禦與 Popup 尺寸強化 狀態：`[已完成]`

### Phase 2: 打包編譯與功能回歸驗證 狀態：`[已完成]`

## 4. 影響評估
- 本次修改聚焦於 Service Worker 初始化邏輯與 Action/SidePanel 行為解耦，不變更 Storage 模型與看板資料。
- 側邊欄（Side Panel）依然可透過 Popup 內的「開啟工作側欄」按鈕或右鍵選單順暢呼叫，兩者職責清楚分離。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環（二選一）**:
  - [x] [N/A] 輕量任務豁免（無結構變動，L1~L3 免比對免回寫）
  - [ ] 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - 2026-10-10 ID: c3d46c63-c1d9-48d0-a271-9d2bd10c2364 (初始化)
> - 2026-10-10 ID: 88ac673e-ab7d-46ae-991c-f93cd38e689f (Phase 2 建置驗收與結案封存)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261010_chrome_scrumclock_fix_popup_action.md，開始執行 Phase 1
> ```
