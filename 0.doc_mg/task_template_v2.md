---
title: "[任務標題]"
plugin: "[請填寫插件目錄名稱，例如: chrome_scrumclock | chrome_video speed plus | finance-research-clipper-oss]"
status: "規劃中" # 規劃中 | 開發中 | 待審核 | 已完成
created: "YYYY-MM-DD"
deadline: "YYYY-MM-DD"
---

## 1. 目標
<!-- 描述本任務的核心功能、問題修正或改進點，填寫完畢後可刪除此說明 -->

## 2. 策略與鎖定檔案
<!-- 說明預計的實作方案與相依架構，填寫完畢後可刪除此說明 -->

### 鎖定檔案 (Target Files)
<!-- 必須一律使用工作區相對路徑，嚴禁寫入本機絕對路徑 -->
- `./[plugin]/path/to/target_file`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
<!-- 90/10 分級原則：若屬單純樣式/文字/Bugfix 等輕量任務，L1~L3 直接勾選 [N/A] 豁免，結案不讀寫任何文檔；僅重大架構變更才需前置宣告 -->
- [ ] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/[plugin]-core/SKILL.md` (僅骨架：元件字典、Storage Schema)
- [ ] L2 插件導航：`./[plugin]/[PLUGIN]_README.md` (模組速查矩陣、入口索引)
- [ ] L3 業務規格：`./[plugin]/docs/[feature]-spec.md` (業務規格，無則免填)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/[plugin]/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: [階段名稱] 狀態：`[待辦]`
- [ ] 任務 1.1: [小任務標題]
    - [ ] [原子任務] [具體執行細節]

## 4. 影響評估
<!-- 列出此修改是否會影響其他 Chrome API 權限、與其他腳本的通訊、或宿主網頁的相容性，填寫完畢後可刪除此說明 -->

## 5. 驗收標準
- [ ] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [ ] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [ ] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [ ] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [ ] **SSOT 閉環（二選一）**:
  - [ ] [N/A] 輕量任務豁免（無結構變動，L1~L3 免比對免回寫）
  - [ ] 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）
- [ ] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/[plugin]/`。
- [ ] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [ ] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [ ] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - [YYYY-MM-DD] ID: [當前對話 ID] (初始化)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_YYYYMMDD_[plugin]_[topic].md，開始執行 Phase 1
> ```
