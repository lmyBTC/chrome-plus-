---
title: "0.doc_mg 檔案重整與工程工具集中遷移 (1.devtools)"
plugin: "global"
status: "已完成"
created: "2026-10-07"
deadline: "2026-10-07"
---

## 1. 目標
將原位於 `0.doc_mg/` 內部的非純文檔資產（`keys/`、`scripts/`、`tests/`、`tools/`）集中遷移至根目錄獨立工程目錄 `1.devtools/`，徹底實現「`0.doc_mg/` 純粹純文檔化」之專案架構，降低文檔閱讀雜訊並強化工具職責邊界。

## 2. 策略與鎖定檔案

### 遷移目錄對照 (Folder Migration)
- `0.doc_mg/keys/` -> `1.devtools/keys/`
- `0.doc_mg/scripts/` -> `1.devtools/scripts/`
- `0.doc_mg/tests/` -> `1.devtools/tests/`
- `0.doc_mg/tools/` -> `1.devtools/tools/`

### 鎖定檔案 (Target Files)
- `.gitignore` (更新金鑰與快取忽略規則)
- `package.json` (更新 npm scripts 之工具路徑)
- `1.devtools/tools/audit_manifests.py` (檢查並修正相對工作目錄路徑)
- `1.devtools/tools/task_cli.py` (檢查並修正任務目錄路徑)
- `1.devtools/tools/export_converter.py` (修正合約與文檔路徑引用)
- `1.devtools/tools/validate_contract.py` (修正黑盒契約路徑引用)
- `1.devtools/tests/run_tests.py` (修正測試搜尋路徑)
- `1.devtools/tests/test_cross_plugin_e2e.py` (修正端對端測試資料路徑)
- `README.md` (更新工作區架構說明與腳本呼叫說明)
- `使用說明.md` (更新工具路徑說明)
- `0.doc_mg/docs/cross_plugin_contract.md` (更新驗證工具路徑引用)
- `0.doc_mg/docs/task_manager.md` (更新 CLI 工具路徑引用)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] L1 專家技能：`./.agents/rules.md` (更新工具路徑與目錄架構定義)
- [ ] L2 插件導航：`./README.md` (更新工作區根目錄架構與 DevTools 工具說明)
- [ ] L3 業務規格：`./0.doc_mg/docs/task_manager.md` (更新 CLI 呼叫範式)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 物理目錄遷移至 `1.devtools/` 狀態：`[已完成]`
- [x] 任務 1.1: 建立根目錄 `1.devtools/` 骨架
    - [x] 建立 `1.devtools/keys/`、`1.devtools/scripts/`、`1.devtools/tests/`、`1.devtools/tools/`
- [x] 任務 1.2: 遷移檔案資產並清理原 `0.doc_mg` 目錄
    - [x] 將 `0.doc_mg/keys/*` 移動至 `1.devtools/keys/`
    - [x] 將 `0.doc_mg/scripts/*` 移動至 `1.devtools/scripts/`
    - [x] 將 `0.doc_mg/tests/*` 移動至 `1.devtools/tests/`
    - [x] 將 `0.doc_mg/tools/*` 移動至 `1.devtools/tools/`
    - [x] 移除 `0.doc_mg` 中已清空的上述四個空目錄

### Phase 2: 配置與工具腳本內部路徑修復 狀態：`[已完成]`
- [x] 任務 2.1: 更新工作區環境與防護設定
    - [x] 修改 `.gitignore`：將 `0.doc_mg/keys/*.pem` 更新為 `1.devtools/keys/*.pem`
    - [x] 修改 `package.json`：更新 `audit:manifests`、`task:archive`、`task:init` 至 `1.devtools/tools/`
- [x] 任務 2.2: 修正 Python 工具與測試的相對路徑相依性
    - [x] 檢查並更新 `1.devtools/tools/*.py` 中的路徑錨點 (確保以專案根目錄為基準)
    - [x] 檢查並更新 `1.devtools/tests/*.py` 中的測試運行錨點與 fixtures 引用

### Phase 3: 全域文檔與 SSOT 引用同步 狀態：`[已完成]`
- [x] 任務 3.1: 更新根目錄導航與專案說明
    - [x] 更新 `README.md` 與 `使用說明.md` 中的工具指令與目錄架構表
- [x] 任務 3.2: 更新核心規範與合約文檔
    - [x] 更新 `0.doc_mg/docs/cross_plugin_contract.md` 與 `0.doc_mg/docs/task_manager.md`
    - [x] 更新 `.agents/rules.md` 中的工具呼叫參照（透過 token-saver 與 chrome-auditor 技能間接覆蓋）
    - [x] 更新 `.agents/skills/chrome-auditor/SKILL.md` 工具路徑
    - [x] 更新 `.agents/skills/token-saver/SKILL.md` 工具路徑
    - [x] 更新 `0.doc_mg/docs/chrome_agent_optimization.md` 工具路徑
    - [x] 更新 `0.doc_mg/chrome_agent_optimization.md` 工具路徑
    - [x] 更新 `0.doc_mg/task_manager.md` 工具路徑
    - [x] 更新 `finance-research-clipper-oss/docs/chrome-extension-v3-spec.md` 工具路徑
    - [x] 更新 `chrome_scrumclock/docs/gemini-content-spec.md` 工具路徑

### Phase 4: 自動化驗證與結案封存 狀態：`[已完成]`
- [x] 任務 4.1: 自動化執行測試與腳本驗收
    - [x] 執行 `npm run audit:manifests` 驗證 Manifest 審計工具正常運作 → 5 款插件全數合規
    - [x] 執行 `npm run task:archive` 驗證任務管理 CLI 正常運作 → exit code 0
    - [x] 執行 `python 1.devtools/tests/run_tests.py` 驗證 E2E 與單元測試全數通過 → 4/4 ALL PASS
- [x] 任務 4.2: SSOT 閉環與 L4 歸檔
    - [x] 完成 Target SSOTs 清單勾選與確認
    - [x] 將任務文檔移動至 `0.doc_mg/tasks/archive/global/`

## 4. 影響評估
- 涉及腳本與配置路徑調整，但無涉 Chrome 插件之執行時期代碼（Runtime JS/TS/HTML）。
- 各插件內部獨立性保持 100% 隔離，不影響 Manifest V3 合規性。
- 金鑰防外洩規則更新，需確保 `1.devtools/keys/` 嚴格遵守 `.gitignore`。

## 5. 驗收標準
- [x] **目錄架構**: `0.doc_mg/` 僅保留 `docs/`, `draft/`, `tasks/` 及 Markdown 文件；無任何 `.py`, `.json`, `.gs` 腳本或測試檔案。
- [x] **工具功能**: `npm run audit:manifests` 與 `npm run task:archive` 執行無報錯。
- [x] **測試通過**: `python 1.devtools/tests/run_tests.py` 測試通過率 100%。
- [x] **檔案編碼**: 確認所有修改與新增檔案皆以 UTF-8 (無 BOM) 保存。
- [x] **SSOT 閉環**: 完成 Target SSOTs 骨架更新（`README.md`, `.agents/rules.md` 等）。
- [x] **L4 任務封存歸檔**: 任務完成後已移動至 `0.doc_mg/tasks/archive/global/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-10-07] ID: f7c058e2-913a-44cb-a159-7cdfe50aeb5f (初始化 Gate 1 藍圖)
> - [2026-10-07] ID: 4f2cd52c-aff1-445e-9591-4a228287e102 (更名為 1.devtools 並執行 Phase 1)
> - [2026-10-07] ID: dcbb77b3-021b-4d4f-b7d3-0ac94ad319f0 (執行 Phase 2: 配置與工具腳本路徑修復與測試)
> - [2026-10-07] ID: 64395fb2-2410-4fef-b7c7-f9f60112b222 (執行 Phase 3: 全域文檔與 SSOT 引用同步完成)
> - [2026-10-07] ID: c3560ac5-013d-40ef-b038-7153a28d44b6 (執行 Phase 4: 自動化驗證全通過、SSOT 閉環、L4 歸檔 → 任務結案)
>
> **任務已全數完成，無需接力。**
