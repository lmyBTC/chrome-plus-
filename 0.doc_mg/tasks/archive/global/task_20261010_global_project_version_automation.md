---
title: "全專案版本號自動化管理工具與流程建設"
plugin: "global"
status: "已完成"
created: "2026-10-10"
deadline: "2026-10-10"
---

## 1. 目標
為 Chrome Plus 工作區建立全專案自動化版本號管理體系。
支援自動偵測工作區內所有插件（包含純原生型零構建插件與 Vite 構建型插件），提供檢視、統一/單獨版號遞增（SemVer: patch, minor, major 或自訂版號）、Manifest V3 與 package.json 雙向同步驗證，並符合 Chrome Web Store 發布合規標準。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./1.devtools/tools/version_manager.py` (新增：核心版本號管理 CLI 工具)
- `./package.json` (更新：新增根目錄 npm version 指令入口)
- `./README.md` (更新：補充版本管理工具操作指令)
- `./0.doc_mg/docs/versioning_spec.md` (新增：版本管理規範與 Chrome 相容性規格)
- `./0.doc_mg/docs/dev_standards.md` (更新：關聯版本管理規範章節)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/dev-standards/SKILL.md` (關聯 SSOT 與技術標準)
- [x] L2 插件導航：`./README.md` (工作區整體說明、工具矩陣與快速啟動指引)
- [x] L3 業務規格：`./0.doc_mg/docs/versioning_spec.md` (版本管理規範與 Chrome 相容性規格)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 設計與實作 version_manager.py 核心工具 狀態：`[已完成]`
- [x] 任務 1.1: 插件發現與版號讀取機制
    - [x] 複用 `audit_manifests.py` 之插件發現邏輯，解析各插件的 `manifest.json` 與 `package.json`（若存在）。
    - [x] 解析與校驗 Chrome 擴充功能合規版本號（1~4 組整數）以及可選的 `version_name`。
- [x] 任務 1.2: 實作 list / status 檢視指令
    - [x] 格式化輸出各插件名稱、當前 manifest 版本、package.json 版本、狀態是否一致。
- [x] 任務 1.3: 實作 bump 遞增與 set 設定指令
    - [x] 支援 `patch`、`minor`、`major` 或指定具體版本號（如 `1.0.1`）。
    - [x] 支援指定單一插件 `--plugin [name]` 或全專案批次 `--all`。
    - [x] 自動安全回寫 `manifest.json`（格式化縮排 2 格）與 `package.json`。

### Phase 2: 根目錄 package.json 整合與驗證測試 狀態：`[已完成]`
- [x] 任務 2.1: 註冊 npm scripts 入口
    - [x] 在根目錄 `package.json` 新增 `version:list`、`version:bump` 等快捷指令。
- [x] 任務 2.2: 完整 CLI 功能測試
    - [x] 執行 `python 1.devtools/tools/version_manager.py list` 驗證輸出正確性。
    - [x] 針對特定插件進行 dry-run 或 patch bump 驗證，確認檔案修改無損且符合 UTF-8 編碼。

### Phase 3: 文檔閉環與結案封存 狀態：`[已完成]`
- [x] 任務 3.1: 更新全專案 README.md 與規範文檔
    - [x] 在 `README.md` 與 `0.doc_mg/docs/versioning_spec.md` 記載版號更新 SOP。
    - [x] 在 `0.doc_mg/docs/dev_standards.md` 連動版本號合規規範。
- [x] 任務 3.2: 驗收、狀態收斂與任務歸檔
    - [x] 執行驗收清單檢查，將任務檔案移動至 `0.doc_mg/tasks/archive/global/`。

## 4. 影響評估
- 本工具專注於全專案工具鏈層級 (`1.devtools/`)，不修改任何插件內部的業務程式碼或執行期邏輯。
- 修改 `manifest.json` 時保持原有 JSON 鍵值結構與縮排，避免破壞 Chrome Extension 載入格式。

## 5. 驗收標準
- [x] **技術指標**: `version_manager.py` 執行無錯誤，相容 Windows 環境與 Python 3.x UTF-8 編碼。
- [x] **核心規範**: 版號遞增規則嚴格符合 Chrome Web Store MV3 要求（小數點間僅允許 0~65535 整數）。
- [x] **除錯清理**: 工具腳本內無殘留測試 hardcode 路徑或除錯用冗餘列印。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環（二選一）**:
  - [x] 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/global/`。
- [x] **插件驗證**: 執行 `npm run audit:manifests` 驗證全體插件 manifest.json 語法及版本結構正常。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - 2026-10-10 ID: 1c8938c5-0eed-4547-9fba-8ba5b1a513c9 (初始化 Gate 1 藍圖)
> - 2026-10-10 ID: de9a73c5-a89e-4ee8-8947-e0f4ed86346a (執行 Phase 1 完成：實作 version_manager.py 核心工具並完成測試)
> - 2026-10-10 ID: d52ff26b-6bad-40c0-8fd4-99c3d0304aa0 (執行 Phase 2 完成：package.json 註冊 scripts 與完整 CLI 驗證測試)
> - 2026-10-10 ID: d5b8ded1-85b8-497c-b0d1-cb9682da7480 (執行 Phase 3 完成：更新 README.md、versioning_spec.md、dev_standards.md 並封存任務)

