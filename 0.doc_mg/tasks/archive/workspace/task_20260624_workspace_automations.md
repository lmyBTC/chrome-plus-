---
title: "多插件開發區自動化與規範優化"
plugin: "workspace"
status: "已完成"
created: "2026-06-24"
deadline: "2026-06-24"
---

## 1. 目標
實作「多插件開發區」的自動化與規範優化項目，包含任務管理 CLI (`task_cli.py`)、Manifest MV3 審計工具 (`audit_manifests.py`)、根目錄 package.json 配置以及 dev_standards.md 的安全政策補充。

## 2. 策略與鎖定檔案
- 使用 Python 標準庫實作 CLI 腳本與審計工具，以確保輕量無依賴。
- 根目錄配置 package.json 方便調用子插件的指令。
- 補充 Chrome Web Store 關於 CSP 與 eval 禁令的 SSOT 指引。

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\0.doc_mg\tools\task_cli.py`
- `c:\Users\G1\00.coding workspace\chrome plus project\0.doc_mg\tools\audit_manifests.py`
- `c:\Users\G1\00.coding workspace\chrome plus project\package.json`
- `c:\Users\G1\00.coding workspace\chrome plus project\0.doc_mg\dev_standards.md`

## 3. 任務拆解

### Phase 1: 自動化與審計工具實作 狀態：`[已完成]`
- [x] 任務 1.1: 建立 `0.doc_mg/tools/task_cli.py` 實作任務初始化與自動封存功能。
- [x] 任務 1.2: 建立 `0.doc_mg/tools/audit_manifests.py` 實作 MV3 靜態合規與資源檔案路徑存在性審計。

### Phase 2: 配置與規範文件優化 狀態：`[已完成]`
- [x] 任務 2.1: 建立根目錄 `package.json`，配置快捷 NPM 指令映射。
- [x] 任務 2.2: 修改 `0.doc_mg/dev_standards.md`，追加 CSP 與 eval 等核心安全防範要求。

### Phase 3: 測試與驗收 狀態：`[已完成]`
- [x] 任務 3.1: 執行自動化測試與手動檢查。
- [x] 任務 3.2: 清理測試檔案，完成簽到與狀態收斂。

## 4. 影響評估
- 本工作主要增加開發輔助工具，不破壞各子插件本身的程式碼結構。

## 5. 驗收標準
- [x] 任務 CLI 可正常完成任務的 `init` 與 `archive` 操作，檔案路徑與狀態切換正確。
- [x] 審計工具可正確檢測三個插件的 `manifest.json`。
- [x] 根目錄 `npm run build:scrumclock` 可成功執行。
- [x] 沒有引入任何帶 BOM 的 UTF-8 編碼錯誤。

## 6. AI 簽到區
- [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
- **參與對話 ID 紀錄**:
  - [2026-06-24] ID: fe975795-4d88-49dd-b5f5-07deb3b2e614 (初始化與執行)
