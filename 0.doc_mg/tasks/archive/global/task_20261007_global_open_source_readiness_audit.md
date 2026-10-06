---
title: "專案轉公開 (Public Repo) 安全性與本機檔案排除審查"
plugin: "global"
status: "已完成"
created: "2026-10-07"
deadline: "2026-10-07"
---

## 1. 目標
清查專案轉為公開儲存庫 (Public Repo，便於其他 Agent 讀取與協作修改，非對外開源發布) 前的所有安全性風險、敏感資訊外洩隱患、本機殘留檔案排除，建立完善的 `.gitignore` 與公開規範，確保發布後無任何個人隱私、金鑰憑證或本地垃圾檔案外洩。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./.gitignore`
- `./README.md`
- `./package.json`
- `./0.doc_mg/tasks/archive/global/task_20261007_global_open_source_readiness_audit.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/token-saver/SKILL.md` (僅骨架：無變動)
- [ ] L2 插件導航：`./README.md` (模組速查矩陣、無變動)
- [ ] L3 業務規格：`./0.doc_mg/docs/cross_plugin_contract.md` (無變動)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 防禦清單強化與本機檔案排除 狀態：`[已完成]`
- [x] 任務 1.1: 強化全域 `.gitignore`
    - [x] 加入根目錄 `scratch/`、`.pytest_cache/`、`*.crx`、`*.zip`、`*.log` 排除清單
    - [x] 補充敏感環境與憑證防禦（如 `*.pem`、`*.key`、`id_rsa*`、`*.pfx`、`*.keystore`）
    - [x] 補充 IDE 與本機 OS 排除項目（`*.code-workspace`、`Desktop.ini`、快取與環境檔）

### Phase 2: 公開安全性核實與 Agent 導引聲明 狀態：`[已完成]`
- [x] 任務 2.1: 專案公開聲明與權利定義 (非開源發行，明確載明供 Agent 協作之規範/聲明)
- [x] 任務 2.2: 執行 Manifest V3 與代碼安全性審計
    - [x] 執行 `py 0.doc_mg/tools/audit_manifests.py` 確認所有子插件合規且無高風險 CSP 設定

### Phase 3: Git 狀態清理與結案封存 狀態：`[已完成]`
- [x] 任務 3.1: 驗證未追蹤狀態與歷史整潔度
    - [x] 執行 `git status` 與 `git diff` 確保無意外檔案被追蹤
- [x] 任務 3.2: 任務封存歸檔
    - [x] 移動本任務檔至 `0.doc_mg/tasks/archive/global/`

## 4. 影響評估
- 本任務僅調整 `.gitignore`、`README.md` 及安全核實，不改動任何插件功能程式碼。
- 完全向後相容，不影響各插件獨立編譯與運行。

## 5. 驗收標準
- [x] **技術指標**: `.gitignore` 完整防禦所有本機暫存目錄（`scratch/`、`.pytest_cache/`）、打包產物（`.crx`、`.zip`）及敏感憑證。
- [x] **核心規範**: 全專案通過 Manifest V3 審計腳本（`audit_manifests.py`）。
- [x] **除錯清理**: 確保無殘留真實 API Key、私人 Apps Script 部署網址或個人路徑。
- [x] **檔案編碼**: 確認所有修改與新增檔案皆為 UTF-8 (無 BOM)。
- [x] **SSOT 閉環（二選一）**:
  - [x] [N/A] 輕量任務豁免（無結構變動，L1~L3 免比對免回寫）
  - [ ] 重大架構同步完成
- [x] **L4 任務封存歸檔**: 任務完成後移動至 `0.doc_mg/tasks/archive/global/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-10-07] ID: 06b0c752-07ce-4c6a-80c8-17960eb84cf9 (初始化)
> - [2026-10-07] ID: c40bca29-3977-4ca6-80d9-7fd288464577 (Phase 1 執行)
> - [2026-10-07] ID: 307c92bb-01e8-4bae-91b8-9469e3ae357a (Phase 2 執行)
> - [2026-10-07] ID: 9930df17-a5fc-4ddd-b6ea-1f099f28adec (Phase 3 結案歸檔)
>
> **跨會話接力指令 (Session Handover)**:
> 任務已全部結案封存完畢。
