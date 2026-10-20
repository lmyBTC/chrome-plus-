---
title: "AI 輔助開發極致 Token 節約工程機制與工具鏈安裝整合"
plugin: "global"
status: "已完成"
created: "2026-10-07"
deadline: "2026-10-07"
---

## 1. 目標
將草稿區之「極致 Token 節約工程指南」、「代碼骨架提煉器 (`code_skeleton.py`)」與「終端日誌脫水過濾器 (`compact_log.py`)」正式整合至專案全域開發者工具鏈 (`1.devtools/tools/`) 與 SSOT 專家技能體系中。透過確定性腳本掏空代碼實作與過濾終端報錯，杜絕上下文視窗膨脹（Context Bloat）與注意力退化（Context Rot）。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `1.devtools/tools/code_skeleton.py` (新增：代碼骨架與簽名提煉工具)
- `1.devtools/tools/compact_log.py` (新增：終端錯誤日誌脫水過濾器)
- `0.doc_mg/docs/token_optimization_guide.md` (新增：極致 Token 節約工程指南正式文檔)
- `1.devtools/README.md` (修改：登錄新工具至工具導航矩陣)
- `.agents/skills/token-saver/SKILL.md` (修改：擴充骨架提取與日誌脫水 SOP)
- `0.doc_mg/draft/code_skeleton.py` (來源草稿：已清理)
- `0.doc_mg/draft/compact_log.py` (來源草稿：已清理)
- `0.doc_mg/draft/AI 輔助開發極致 Token 節約工程指南與機制規範.md` (來源草稿：已清理)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`.agents/skills/token-saver/SKILL.md` (補充 code_skeleton 與 compact_log 職責指針)
- [x] L2 插件/模組導航：`1.devtools/README.md` (更新 tools 速查矩陣與範例)
- [x] L3 業務/工程規格：`0.doc_mg/docs/token_optimization_guide.md` (正式 Token 節約工程架構指南)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/task_20261007_global_token_saver_tools_integration.md` (結案移動歸檔)

## 3. 任務拆解

### Phase 1: 工具鏈標準化移植與 CLI 健全性提升 狀態：`[已完成]`

### Phase 2: SSOT 文檔體系沉澱與專家技能更新 狀態：`[已完成]`

### Phase 3: 驗收、草稿清理與 L4 歸檔 狀態：`[已完成]`

## 4. 影響評估
- 本任務純粹擴充開發輔助工具鏈 (`1.devtools/tools/`) 與文檔/技能指針，不修改任何 Chrome 插件之原始碼 (`chrome_scrumclock`, `chrome_video speed plus`, `finance-research-clipper-oss`, `browser-activity-monitor`)。
- 完全零第三方 Python 依賴，相容 Windows / Linux / macOS。

## 5. 驗收標準
- [x] **技術指標**: 新增工具均使用 Python 3 標準函式庫，支援 Windows UTF-8 編碼與管線操作。
- [x] **核心規範**: 符合專案路徑跳轉雙軌制（專案文檔內純字串相對路徑）。
- [x] **除錯清理**: 已確認腳本無多餘除錯 print 與未捕捉異常。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: L1 專家技能 (`token-saver`)、L2 工具導航 (`1.devtools/README.md`)、L3 工程規格 (`token_optimization_guide.md`) 全數同步。
- [x] **L4 任務封存歸檔**: 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/global/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-07 ID: 121655ca-330b-4f4c-85e3-b4725ae9e8b4 (初始化 Gate 1 任務藍圖)
> - 2026-10-07 ID: a8bb6238-89c2-49bd-8783-6a080fb947fe (執行 Phase 1 工具鏈移植與 CLI 驗證)
> - 2026-10-07 ID: 11a93e4c-efcc-4d56-850b-7f72c6460ca3 (執行 Phase 2 SSOT 文檔體系沉澱與專家技能更新)
> - 2026-10-07 ID: 8671c0d0-de20-4fb3-b073-b0ce68fbd1ac (執行 Phase 3 驗收、草稿清理與 L4 結案歸檔)
>
> **任務已順利圓滿結案並歸檔。**
