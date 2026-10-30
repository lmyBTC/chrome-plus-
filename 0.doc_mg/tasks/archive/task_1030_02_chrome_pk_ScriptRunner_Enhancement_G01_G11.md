---
title: "ScriptRunner 全功能增強 G01~G11"
plugin: "chrome_pk"
status: "已完成"
created: "2026-10-30"
deadline: "2026-10-30"
appetite: "4h"
complexity_budget: "Max 4 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 1 (Gate 1 藍圖 + Phase 1~3 + Final 完成歸檔)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：對 `script-runner` 模組實施全面功能增強，涵蓋 G-01~G-11 中除跨模組的 G-08/G-10 外共 9 項。
- **核心目標**：
  1. **G-01** 執行歷程 (History Ring Buffer)：環形佇列 20 筆，Storage 持久化，Console 新增「歷史」Tab。
  2. **G-02** 多分頁批次執行：`chrome.tabs.query` 多選器 + `executeScriptOnTabs`。
  3. **G-03** 預設腳本版本化：`ScriptItem` 加 `version`/`changelog` 欄位，UI 顯示。
  4. **G-04** 語法高亮：引入 Prism.js 輕量方案，textarea overlay 技術。
  5. **G-05** 進度條 + 中斷控制：AbortController + `__pkProgress` Hook + Console 進度條。
  6. **G-06** 分類 Chips + 搜尋：`ScriptCategory` Chips + 關鍵字即時過濾。
  7. **G-07** 結果 Diff 比較：`diffResult.ts` + Console「與上次比較」按鈕。
  8. **G-09** 腳本參數化：`ScriptParam[]` 型別 + 執行前參數填寫對話框。
  9. **G-11** Console 輸出持久化：最後 N 次結果序列化至 Storage，重開還原。
- **邊界與假設**：G-08 (Alarms 排程) 與 G-10 (GDrive 同步) 因跨模組改動，獨立另立任務。G-04 採 Prism.js overlay（不引入 Monaco），避免 bundle 爆增。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `.agents/skills/pk-core/SKILL.md`、`task-protocol/SKILL.md`、`token-saver/SKILL.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `code_skeleton.py` / `repo_radar.py` | `code_skeleton.py types.ts` → 42行骨架；`repo_radar.py outline ScriptRunner.tsx` → 256行結構定位；`ScriptRunner.tsx` L1-256 完整讀取 | `[節省 ~90% Context]` |
  | **Gate 2: 執行** | `compact_log.py` / `rtk` | `npm run build 2>&1 \| py compact_log.py` | `[待執行]` |
  | **Gate 3: 驗收** | `audit_suite.py --compact` | `[待執行]` | `[待執行]` |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`0.doc_mg/tasks/tmp/tmp_probe_scriptrunner.md` (types.ts 骨架)
- **影響範圍地圖 (Entity Map)**：
  - `chrome_pk/src/features/toolbox/tools/script-runner/types.ts` (新增 version/changelog/params/history 型別)
  - `chrome_pk/src/features/toolbox/tools/script-runner/presets.ts` (新增 version/changelog)
  - `chrome_pk/src/features/toolbox/tools/script-runner/services/scriptExecutionService.ts` (新增多分頁/AbortController)
  - `chrome_pk/src/features/toolbox/tools/script-runner/components/ScriptEditor.tsx` (新增分類+搜尋+Prism高亮+參數化UI)
  - `chrome_pk/src/features/toolbox/tools/script-runner/components/ScriptConsole.tsx` (新增歷史Tab+進度條+Diff比較+持久化)
  - `chrome_pk/src/features/toolbox/tools/script-runner/ScriptRunner.tsx` (新增 AbortController+多分頁+歷史持久化)
  - `chrome_pk/src/features/toolbox/tools/script-runner/utils/diffResult.ts` (新增)
- **前置條件 (Prerequisites)**：`chrome_pk` 現有 `scripting`, `activeTab`, `<all_urls>` 權限已齊備；Prism.js 需 npm install

## 3. 策略與架構防護 (Strategy & Guardrails)

- **DRY 檢查**：複用現有 `ScriptItem`/`ScriptRunResult` 型別，擴充而非重建；`ScriptEditor` 現有 Props 介面逐步擴充。
- **架構策略**：
  - G-04 Prism.js 採 textarea + pre overlay 技術（不修改 MV3 CSP，無動態 eval）。
  - G-05 進度條透過 `AbortController` signal + Storage polling（腳本 `__pkProgress(n)` 寫入 storage，UI 定時讀取）。
  - G-09 參數化採 `{{PARAM_NAME}}` 模板替換語法，執行前字串注入（靜態，合規 MV3）。
  - G-01/G-11 歷史佇列共用 `pk_script_runner_history` Storage key，環形佇列 cap=20。
- **硬性禁止動作 (Guardrails)**：嚴禁動 `image-scraper`/`activity-monitor` 等其他工具；嚴禁引入 Monaco（bundle 太大）；嚴禁 `new Function` / `eval`。

### 鎖定檔案 (Target Files)

- `chrome_pk/src/features/toolbox/tools/script-runner/types.ts`
- `chrome_pk/src/features/toolbox/tools/script-runner/presets.ts`
- `chrome_pk/src/features/toolbox/tools/script-runner/services/scriptExecutionService.ts`
- `chrome_pk/src/features/toolbox/tools/script-runner/components/ScriptEditor.tsx`
- `chrome_pk/src/features/toolbox/tools/script-runner/components/ScriptConsole.tsx`
- `chrome_pk/src/features/toolbox/tools/script-runner/ScriptRunner.tsx`
- `chrome_pk/src/features/toolbox/tools/script-runner/utils/diffResult.ts` (新增)

### 鎖定工具鏈 (Target Devtools)

- [x] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py` & `repo_radar.py` (已執行)
- [ ] 終端日誌脫水: `npm run build 2>&1 | py 1.devtools/tools/compact_log.py`
- [ ] 結案整合審計: `py 1.devtools/tools/audit_suite.py --compact`
- [ ] 2-Strike 熔斷立案: `py 1.devtools/tools/log_issue.py log`

### 鎖定 SSOT 回寫清單 (Target SSOTs)

- [ ] L1 專家技能：`.agents/skills/pk-core/SKILL.md` (Storage key 補充)
- [ ] L2 插件導航：`chrome_pk/overview-pk.md` (ScriptRunner 功能矩陣更新)
- [ ] [N/A] L3 業務規格：無獨立規格文件
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/` (task_cli.py archive)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 型別擴充 + 工具函式 + presets 版本化 狀態：`[已完成]`

> 🏁 types.ts 擴充 ScriptParam/ScriptHistoryEntry/ScriptRunProgress/DiffNode；utils/diffResult.ts 新建；presets.ts 4 個腳本加 version/changelog；scriptExecutionService.ts 新增 getWindowTabs/executeScriptOnTabs/AbortSignal。Build Exit 0 ✅

### Phase 2: ScriptEditor 增強（G-04/G-06/G-09） 狀態：`[已完成]`

> 🏁 Prism.js overlay 語法高亮（textarea + pre 同步）、分類 Chips + 關鍵字搜尋、腳本參數化 UI（{{KEY}} split/join 替換）、G-03 版本/changelog 顯示。Build Exit 0 ✅

### Phase 3: ScriptConsole 增強 + ScriptRunner 整合 狀態：`[已完成]`

> 🏁 ScriptConsole.tsx：History Tab (G-01)、進度條+⏹中斷 (G-05)、JSON Diff 比較視圖 (G-07)。ScriptRunner.tsx：AbortController + 多分頁模式 UI (G-02) + 歷史環形佇列持久化 (G-11)。修復 replaceAll→split/join TS 相容性。Build Exit 0 ✅

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: audit_suite.py --compact (無 CRITICAL，Exit 0) + audit_manifests.py (MV3 Exit 0)
- [x] 任務 F.2: generate_symbol_index.py (364 符號 Exit 0)；pk-core/SKILL.md 回寫；overview-pk.md ScriptRunner 行 + Storage keys 更新
- [x] 任務 F.3: 任務歸檔執行

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景**: Prism.js overlay scroll sync 在 textarea resize 時跑版；`AbortController` 在已注入 executeScript 無法真正中斷遠端執行。
- **降級方案**: G-04 Prism 失敗則降級為純語法預檢 banner（保持現狀）；G-05 中斷失敗則 UI 僅標記「已請求停止」並顯示 timeout 結果。
- **熔斷**：單一問題重試上限 2 次，失敗即刻熔斷開新 Session。

## 6. 驗收標準 (Acceptance Criteria)

- [x] **技術指標**: MV3 CSP 合規，無 eval/new Function；Prism overlay 無 XSS；split/join 替代 replaceAll 兼容 ES2019。
- [x] **核心規範**: Chrome Extension MV3 規範符合（audit_manifests Exit 0）。
- [x] **工具鏈合規審查 (Devtools Audit)**:
  - [x] **探勘階段**: 已調用骨架/雷達工具，無全檔盲讀。
  - [x] **建置與終端**: 長篇輸出已串接 compact_log.py（節省 97.4%）。
  - [x] **合規與合約審計**: audit_suite.py + audit_manifests.py Exit 0。
- [x] **四層 SSOT 閉環 (90/10 分級)**:
  - [x] 重大架構同步完成（pk-core/SKILL.md + overview-pk.md + Storage keys 更新）
  - [x] L4 任務生命週期: task_cli.py archive 歸檔
- [x] **除錯清理**: 無測試用 console.log 殘留。
- [x] **檔案編碼**: UTF-8 無 BOM。
- [x] **強制收尾**: 最後工具呼叫為 task 檔更新。
- [x] **插件驗證**: npm run build Exit 0（僅 chunkSizeWarning 非錯誤）。

## 7. 狀態收斂歷程 (Condensed History)

- [2026-10-30] Gate 1 藍圖建立，探勘完成（types.ts骨架、ScriptRunner.tsx L1-256全讀），Phase 1~3+Final 任務拆解完成 (Session 1)
- [2026-10-30] Phase 1 完成：types.ts/diffResult.ts/presets.ts/scriptExecutionService.ts 全部擴充，Build Exit 0 (Session 1)
- [2026-10-30] Phase 2 完成：ScriptEditor.tsx 完整重寫（Prism高亮/分類搜尋/參數化），Build Exit 0 (Session 1)
- [2026-10-30] Phase 3 完成：ScriptConsole.tsx/ScriptRunner.tsx 整合 G-01/G-02/G-05/G-07/G-11，Build Exit 0 (Session 1)
- [2026-10-30] Phase Final 完成：audit_suite/audit_manifests Exit 0，generate_symbol_index 364符號，SSOT 回寫，任務歸檔 (Session 1)

## 8. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> [x] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾（節省 97.4%）。
> [x] 結案前已執行 `audit_suite.py` 完成自動化驗證。
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**:
> - `code_skeleton.py`: 提煉 types.ts 骨架，節省 ~90% Token
> - `repo_radar.py outline`: 定位 ScriptRunner.tsx 256行結構
> - `compact_log.py`: 建置日誌脫水 3 次，節省 97.4% 終端字元
> - `audit_manifests.py` / `audit_suite.py`: Gate 3 全自動多維合規審計 (Exit 0)
> - `generate_symbol_index.py`: 符號索引重建 364 符號
> **參與對話 ID 紀錄**:
> - [2026-10-30] ID: 4c3d2d34-2674-4b17-acc7-dfa6b7e9a67f (Gate 1 藍圖 + Phase 1~3 + Final 全程完成)
> **跨會話接力指令 (Session Handover)**:
> 本任務已全數完成並結案歸檔，無須接力。
