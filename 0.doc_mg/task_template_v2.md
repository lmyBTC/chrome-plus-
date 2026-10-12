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
<!-- 必須一律使用工作區相對路徑，嚴禁寫入本機絕對路徑。探勘大檔 (> 100 行) 強制先跑 code_skeleton.py 提煉骨架，嚴禁盲讀全檔 -->
- `./[plugin]/path/to/target_file`

### 鎖定工具鏈 (Target Devtools)
<!-- Gate 1 探勘與 Gate 2 執行鎖定調用之工具鏈，於建檔時前置鎖定宣告 -->
- [ ] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py <目標檔案>` 或 `py 1.devtools/tools/repo_radar.py`
- [ ] 終端日誌脫水: `npm run build 2>&1 | py 1.devtools/tools/compact_log.py` (或 `rtk`)
- [ ] 結案自動審計: `py 1.devtools/tools/audit_manifests.py` / `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
<!-- 90/10 分級原則：若屬單純樣式/文字/Bugfix 等輕量任務，L1~L3 直接勾選 [N/A] 豁免，結案不讀寫任何文檔；僅重大架構變更才需前置宣告 -->
- [ ] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/[plugin]-core/SKILL.md` (僅骨架：元件字典、Storage Schema)
- [ ] L2 插件導航：`./[plugin]/[PLUGIN]_README.md` (模組速查矩陣、入口索引)
- [ ] L3 業務規格：`./[plugin]/docs/[feature]-spec.md` (業務規格，無則免填)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/[plugin]/` (結案後移動封存歸檔，必選)

## 3. 任務拆解
<!--
【Devtools 工具鏈觸發流程規範】：
1. [探勘前置]: 目標檔案 > 100 行時，任務第一步必須排入骨架/雷達工具提煉介面。
2. [執行脫水]: 涉及建置、編譯、打包或測試，指令必須串接脫水工具過濾雜訊。
3. [審計結案]: 必須包含 Phase Final 作為固定結案階段，執行合規審計與 SSOT 歸檔。
-->

### Phase 1: [階段名稱 - 核心實作] 狀態：`[待辦]`
- [ ] 任務 1.1: [前置探勘 / 介面鎖定]
    - [ ] [骨架提煉] 若目標檔案 > 100 行，調用 `py 1.devtools/tools/code_skeleton.py <路徑>` 獲取精簡介面，嚴禁直接盲讀全檔。
    - [ ] [原子任務] [核心邏輯實作細節]
- [ ] 任務 1.2: [實作與建置驗證]
    - [ ] [原子任務] [功能實作與細節]
    - [ ] [終端脫水] 執行建置/檢查時串接脫水工具 (例: `npm run build 2>&1 | py 1.devtools/tools/compact_log.py` 或 `rtk npm run build`)。

<!-- 依需求增加中間 Phase 2, Phase 3... -->

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[待辦]`
- [ ] 任務 F.1: 自動化工具合規審計
    - [ ] [Manifest 審計] 執行 `py 1.devtools/tools/audit_manifests.py` 驗證權限與 CSP 合規 (無修改則勾選 N/A)。
    - [ ] [文檔交叉引用] 執行 `py 1.devtools/tools/doc_cross_ref.py` 驗證 SSOT 鏈條無死連結。
- [ ] 任務 F.2: SSOT 實體回寫與任務歸檔
    - [ ] [SSOT 回寫] 依 Target SSOTs 清單回寫 L1~L3 骨架 (若輕量任務則勾選 N/A 豁免)。
    - [ ] [實體歸檔] 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/[plugin]/`。

## 4. 影響評估
<!-- 列出此修改是否會影響其他 Chrome API 權限、與其他腳本的通訊、或宿主網頁的相容性，填寫完畢後可刪除此說明 -->

## 5. 驗收標準
- [ ] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [ ] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [ ] **工具鏈合規審查 (Devtools Audit)**:
  - [ ] **探勘階段**: 檔案逾 100 行時已優先調用骨架/雷達工具 (`code_skeleton.py` / `repo_radar.py`)，無直接全檔 dump 行為。
  - [ ] **建置與終端**: 長篇輸出已串接日誌脫水過濾 (`compact_log.py` 或 `rtk`)，無原始長篇 log 污染。
  - [ ] **合規與合約審計**: 若涉及 Manifest 或文檔變更，已執行自動審計腳本 (`audit_manifests.py` / `doc_cross_ref.py`) 確保通過。
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
> [ ] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾。
> [ ] 結案前已執行 `audit_manifests.py` / `doc_cross_ref.py` 完成自動化驗證。
>
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**:
> - `code_skeleton.py`: [範例: 提煉 popup.ts 介面骨架，節省 88% Token]
> - `compact_log.py`: [範例: 建置錯誤日誌脫水，過濾 120 行堆疊]
> - `audit_manifests.py`: [範例: Manifest V3 審計通過]
>
> **參與對話 ID 紀錄**:
> - [YYYY-MM-DD] ID: [當前對話 ID] (初始化)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_YYYYMMDD_[plugin]_[topic].md，開始執行 Phase 1
> ```
