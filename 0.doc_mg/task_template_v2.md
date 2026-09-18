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
- [ ] **SSOT 文件同步**: 若架構、模組清單、檔案分拆或接口有變動，已同步回寫並更新該插件專屬 SSOT 文件 (如 [PLUGIN]_README.md / docs/spec.md)。
- [ ] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [ ] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [YYYY-MM-DD] ID: [當前對話 ID] (初始化)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_YYYYMMDD_[plugin]_[topic].md，開始執行 Phase 1
> ```
