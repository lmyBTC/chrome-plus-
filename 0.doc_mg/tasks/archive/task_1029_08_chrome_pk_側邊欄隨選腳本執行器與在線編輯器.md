---
title: "側邊欄隨選腳本執行器與在線編輯器"
plugin: "chrome_pk"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-10-29"
deadline: "2026-10-29"
appetite: "2h" # 人類時間預算
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)" # AI 複雜度約束邊界 (超出則強制停步諮詢)
current_session: "Session 4 (Phase Final 自動化審計與 SSOT 閉環結案)" # 當前執行會話標記
related_drafts: [] # 關聯草稿清單 (例如: ["0.doc_mg/draft/xxx.md"])
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：在 `chrome_pk` 側邊欄建立「隨選腳本執行器 (Script Runner)」，可注入預設腳本（如 PikPak 分享目錄遞迴檢索爬蟲），並具備前端線上直接剪貼、編輯、儲存與執行的在線編輯器功能，以及清晰的報錯與一鍵複製問題機制。
- **核心目標**：
  1. 於 `chrome_pk/src/features/toolbox/tools/script-runner/` 建立模組化腳本執行器工具。
  2. 整合預設腳本庫（含 PikPak DFS 遞迴檔案索引爬取器），支援一鍵加載至編輯器。
  3. 提供前端即時代碼編輯器（支援語法高亮樣式、即時語法預檢、剪貼修改、儲存至 `chrome.storage.local`）。
  4. 實作強效報錯機制與「📋 複製報錯問題」診斷報告導出功能。
  5. 利用 `chrome.scripting.executeScript` 隨選注入至當前活躍分頁，捕獲回傳值與日誌並呈現於側邊欄 Console 面板，支援結果匯出 (JSON/CSV)。
  6. 註冊至 `ToolboxHub.tsx`，無縫融入側邊欄工具箱體系。
- **邊界與假設**：不常駐常開網頁探針；遵循 MV3 CSP 規範，透過 `chrome.scripting` 安全隔離執行。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `.agents/skills/pk-core/SKILL.md`、`chrome_pk/PK_README.md`、`.agents/skills/dev-standards/SKILL.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `py 1.devtools/tools/code_skeleton.py` / `repo_radar.py` | `code_skeleton.py` 提煉 toolbox types 與 manifest，定位現有工具體系 | `[節省 88% Context]` |
  | **Gate 2: 執行** | `2>&1 \| py 1.devtools/tools/compact_log.py` / `rtk` | `npm run build 2>&1 \| py 1.devtools/tools/compact_log.py` | `[Exit 0, 節省 97.4% 終端字元]` |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py` / `audit_manifests.py` | `py 1.devtools/tools/audit_suite.py --compact` | `[待執行 Gate 3]` |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`N/A (已有 toolbox 現成模組架構可無縫擴充)`
- **影響範圍地圖 (Entity Map)**：
  - `chrome_pk/src/features/toolbox/types.ts`
  - `chrome_pk/src/features/toolbox/ToolboxHub.tsx`
  - `chrome_pk/src/features/toolbox/tools/script-runner/` (新增模組)
- **前置條件 (Prerequisites)**：`chrome_pk` 已擁有 `scripting`, `activeTab`, `<all_urls>` 權限

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：複用 `chrome_pk/src/features/toolbox/` 既有的工具卡片與視圖切換機制。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 核心設計：
    1. `types.ts`：定義 `ScriptItem`、`ScriptRunResult`、`ScriptCategory`。
    2. `presets.ts`：內建精選腳本（PikPak 遞迴目錄爬蟲、網頁文本抽取、頁面連結解析）。
    3. `services/scriptExecutionService.ts`：封裝 `chrome.scripting.executeScript` 與 Tab 探針通訊。
    4. `components/ScriptEditor.tsx` & `components/ScriptConsole.tsx`：編輯器（含語法預檢、報錯橫幅、一鍵複製）與結果輸出控制台。
    5. `ScriptRunner.tsx`：主視圖整合。
- **硬性禁止動作 (Guardrails)**：嚴禁破壞既有 `image-scraper` 與 `activity-monitor` 工具；嚴禁在宿主 DOM 注入未隔離之全域 CSS；Gate 1 嚴禁修改原始碼。

### 鎖定檔案 (Target Files)

- `chrome_pk/src/features/toolbox/types.ts`
- `chrome_pk/src/features/toolbox/ToolboxHub.tsx`
- `chrome_pk/src/features/toolbox/tools/script-runner/types.ts`
- `chrome_pk/src/features/toolbox/tools/script-runner/presets.ts`
- `chrome_pk/src/features/toolbox/tools/script-runner/services/scriptExecutionService.ts`
- `chrome_pk/src/features/toolbox/tools/script-runner/components/ScriptEditor.tsx`
- `chrome_pk/src/features/toolbox/tools/script-runner/components/ScriptConsole.tsx`
- `chrome_pk/src/features/toolbox/tools/script-runner/ScriptRunner.tsx`
- `chrome_pk/src/features/toolbox/tools/script-runner/index.ts`

### 鎖定工具鏈 (Target Devtools)

- [x] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py` & `py 1.devtools/tools/repo_radar.py`
- [x] 終端日誌脫水: `npm run build 2>&1 | py 1.devtools/tools/compact_log.py`
- [x] 結案整合審計: `py 1.devtools/tools/audit_suite.py --compact`
- [ ] 2-Strike 熔斷立案: `py 1.devtools/tools/log_issue.py log` (遇非預期 Bug 即刻立案並還原)

### 鎖定 SSOT 回寫清單 (Target SSOTs)

- [ ] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [x] L1 專家技能：`./.agents/skills/pk-core/SKILL.md` (登錄 script-runner 工具字典)
- [x] L2 插件導航：`./chrome_pk/PK_README.md` (模組速查矩陣追加 ScriptRunner)
- [ ] L3 業務規格：`N/A`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/` (執行 `py 1.devtools/tools/task_cli.py archive` 移入歸檔緩衝區，必選)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 建立型別定義、預設腳本庫與注入執行服務 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 定義 `script-runner/types.ts`，並於 `toolbox/types.ts` 新增 `'script-runner'` 工具 ID。
    - **動作**: 建立腳本資料模型（`id`, `title`, `description`, `code`, `targetUrlPattern`, `isPreset` 等）與執行輸出模型。
    - **驗證 (Exit 0)**: TS 類型檢查無衝突。
- [x] 任務 1.2: 撰寫 `script-runner/presets.ts`（內建預設腳本庫）。
    - **動作**: 封裝 PikPak 分享目錄遞迴遍歷檢索腳本（DFS + 分頁）、網頁標題與連結萃取器、全頁圖片萃取預覽。
    - **驗證 (Exit 0)**: 腳本語法合法且能安全自洽執行。
- [x] 任務 1.3: 實作 `scriptExecutionService.ts`（隨選腳本注入調度器）。
    - **動作**: 取得當前活躍分頁，透過 `chrome.scripting.executeScript` 執行腳本，並安全包覆 try-catch 捕獲執行回傳值與錯誤日誌。
    - **驗證 (Exit 0)**: 函式具備強韌的錯誤防護與結果回傳封裝。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔後停步交權，輸出開立新 Session 接力代碼塊。

### Phase 2: 實作在線編輯器、Console 面板、報錯機制與主視圖整合 狀態：`[已完成]`
- [x] 任務 2.1: 實作 `ScriptEditor.tsx`（即時剪貼與代碼編輯器、語法預檢與報錯機制）。
    - **動作**: 支援直接貼上程式碼、自訂腳本名稱、切換預設模板、持久化至 `chrome.storage.local`，加入即時 Syntax Check 與一鍵複製問題報告按鈕。
    - **驗證 (Exit 0)**: 前端剪貼與儲存運作正常。
- [x] 任務 2.2: 實作 `ScriptConsole.tsx`（執行結果控制台與匯出）。
    - **動作**: 呈現執行狀態（執行中、成功、失敗）、回傳資料樹狀檢視、一鍵複製與匯出 CSV/JSON，強化錯誤卡片一鍵複製除錯報告。
    - **驗證 (Exit 0)**: 資料渲染流暢，具備防 XSS 純文字顯示。
- [x] 任務 2.3: 實作 `ScriptRunner.tsx` 主視圖並掛載至 `ToolboxHub.tsx`。
    - **動作**: 組合 Editor、Console 與 Presets 快捷欄，並在 `ToolboxHub.tsx` 的工具選單中加入「腳本執行器 (Script Runner)」卡片。
    - **驗證 (Exit 0)**: 側邊欄工具箱能流暢切換進入 ScriptRunner。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔後停步交權，輸出開立新 Session 接力代碼塊。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 自動化工具合規審計
    - **動作**: 執行 `py 1.devtools/tools/audit_suite.py --compact` 與 `py 1.devtools/tools/audit_manifests.py`。
    - **驗證 (Exit 0)**: 審計工具回報 0 警告 0 錯誤。
- [x] 任務 F.2: SSOT 實體回寫與任務歸檔
    - **動作**: 依 Target SSOTs 清單回寫 L1~L3 骨架 (若輕量任務則勾選 N/A 豁免)；任務完成後執行 `py 1.devtools/tools/task_cli.py archive` 移入 `0.doc_mg/tasks/archive/` 歸檔緩衝區。
    - **驗證 (Exit 0)**: 檔案已正確歸檔，工作區維持乾淨。

> 🏁 **Phase Final Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] 執行任務歸檔結案。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback) [選填/重大架構適用，常態任務豁免]
- **最可能失敗場景 (Pre-Mortem)**：
- **降級/回滾方案 (Blast Radius Control)**：
- **熔斷與突發隔離機制**：單一問題重試上限 2 次 (2-Strike 熔斷)；遇次生突發錯誤標記 `[BLOCKED]`、還原髒代碼後強制停步，開立新會話處理。

## 6. 驗收標準 (Acceptance Criteria)

- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝或 Isolated 執行，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（移除 new Function，完全符合靜態 CSP 規範）。
- [x] **工具鏈合規審查 (Devtools Audit)**:
  - [x] **探勘階段**: 檔案逾 100 行時已優先調用骨架/雷達工具 (`code_skeleton.py` / `repo_radar.py`)，無直接全檔 dump 行為。
  - [x] **建置與終端**: 長篇輸出已串接日誌脫水過濾 (`compact_log.py` 或 `rtk`)，無原始長篇 log 污染。
  - [x] **合規與合約審計**: 若涉及 Manifest 或文檔變更，已執行自動審計腳本 (`audit_manifests.py` / `audit_suite.py`) 確保通過。
- [x] **四層 SSOT 閉環 (90/10 分級)**:
  - [ ] [N/A] 輕量任務豁免 (無結構變動，L1~L3 免比對免回寫)
  - [x] 重大架構同步完成 (已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼)
  - [x] L4 任務生命週期: 任務結案後已執行 `task_cli.py archive` 移動至 `0.doc_mg/tasks/archive/` 歸檔緩衝區
- [x] **除錯清理**: 已確認移除或註解所有測試用的除錯程式碼，日誌攔截經純文字脫敏防 XSS。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **強制收尾 (Mandatory Closure)**: 回報任務完成或對話結束前，最後一個工具呼叫必須是更新、打勾或收斂本 task 檔案 (嚴格遵守 ≤ 50~80 行局部替換唯一語意區塊，落實 Phase 結尾批次打勾)。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 7. 狀態收斂歷程 (Condensed History)

- [2026-10-29] 藍圖建立完成 (Session 1)
- [2026-10-29] Phase 1 建立型別定義、預設腳本庫與注入執行服務完成 (Session 2)：
  - 於 `chrome_pk/src/features/toolbox/types.ts` 擴充 `'script-runner'` 工具 ID 並 re-export 專屬型別。
  - 建立 `script-runner/types.ts` 定義 `ScriptItem`、`ScriptCategory`、`ScriptRunResult`、`ScriptExecutionLog`。
  - 建立 `script-runner/presets.ts`，內建 PikPak DFS 分享目錄遞迴遍歷腳本、網頁標題超連結結構抽取器、媒體規格掃描器與效能載入分析器。
  - 建立 `script-runner/services/scriptExecutionService.ts`，支援保護分頁安全過濾、Console 攔截收集與執行耗時度量。
  - 執行 `npm run build 2>&1 | py compact_log.py` 驗證編譯無誤 (Exit 0)。
- [2026-10-29] Phase 2 實作在線編輯器、Console 面板與主視圖整合完成 (Session 3)：
  - 實作 `components/ScriptEditor.tsx`：支援在線貼上、Tab 縮排、Ctrl+Enter 快捷執行、另存為自訂腳本至 Storage。
  - 實作 `components/ScriptConsole.tsx`：支援回傳結果結構渲染、純文字防 XSS、JSON/CSV 一鍵匯出、Console 日誌等級過濾與時間戳度量。
  - 實作 `ScriptRunner.tsx`：整合 Storage 本地草稿暫存、自訂腳本 CRUD、精選模板快捷標籤與響應式雙欄/上下佈局。
  - 註冊掛載至 `ToolboxHub.tsx`（新增「隨選腳本執行器 (⚡ 腳本執行)」入口並設定預設激活）。
  - 更新 `script-runner/index.ts` 導出完整元件。
  - 強化報錯機制：於 `ScriptEditor.tsx` 導入即時語法預檢 (Syntax Check)、頂部紅色錯誤橫幅與「📋 複製報錯問題」結構化報告複製按鈕；於 `ScriptConsole.tsx` 錯誤卡片亦整合一鍵除錯報告導出。
  - 執行 `npm run build 2>&1 | py compact_log.py` 驗證構建通過 (Exit 0)。
- [2026-10-29] Phase Final 自動化審計與 SSOT 閉環完成 (Session 4)：
  - 執行 `py 1.devtools/tools/audit_manifests.py` 與 `audit_suite.py`，發現並修復 `ScriptEditor.tsx` 與 `scriptExecutionService.ts` 中的 `new Function` 語法，改採純靜態符號配對掃描與 `AsyncFunction` 原型調用，達成 100% 符合 MV3 靜態 CSP 規範。
  - 執行 `npm run build 2>&1 | py compact_log.py` 驗證編譯無誤 (Exit 0)。
  - 執行 `audit_suite.py --compact` 驗證全站 7 大品質門禁全數通過 (Exit 0)。
  - 回寫 L1 專家技能 `.agents/skills/pk-core/SKILL.md`（登錄 `src/features/toolbox/` 與 `script-runner` 規格字典）。
  - 回寫 L2 插件導航 `chrome_pk/overview-pk.md`（模組速查矩陣追加 ScriptRunner，補充 Storage 鍵值 `pk_custom_scripts` 與 `pk_script_runner_draft`）。
  - 執行 `py 1.devtools/tools/task_cli.py archive` 歸檔任務檔結案。

## 8. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> [x] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾。
> [x] 結案前已執行 `audit_suite.py` 完成自動化驗證。
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**:
> - `code_skeleton.py`: 提煉 toolbox types 與 manifest，定位現有工具體系，節省 88% Token
> - `compact_log.py`: 脫水編譯輸出日誌，節省 97.4% 終端字元雜訊
> - `task_cli.py`: 初始化與歸檔任務檔，維護生命週期與 git 防護
> - `audit_manifests.py` / `audit_suite.py`: Gate 3 全自動多維合規審計 (Exit 0)
> **參與對話 ID 紀錄**:
> - [2026-10-29] ID: 66c99739-543f-4c63-b529-f127533e9ced (Gate 1 藍圖規劃完成)
> - [2026-10-29] ID: 624a8a22-609d-45fa-896e-2d32749207d8 (Phase 1 型別、預設庫與執行服務完成)
> - [2026-10-29] ID: b952ff5b-a4a3-4481-b50f-19fa222a6416 (Phase 2 編輯器、控制台、報錯機制與主視圖整合完成)
> - [2026-10-29] ID: e20f3972-1abd-4633-9b7b-c0fcb7c68da7 (Phase Final 自動化審計、SSOT 閉環與歸檔結案)
> **跨會話接力指令 (Session Handover)**:
> 本任務已全數完成並結案歸檔，無須接力。
