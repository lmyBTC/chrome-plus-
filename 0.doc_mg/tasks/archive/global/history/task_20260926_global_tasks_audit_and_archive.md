---
title: "盤點 0.doc_mg/tasks/ 既有任務並執行歷史歸檔"
plugin: "global"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-09-26"
deadline: "2026-09-26"
---

## 1. 目標
全面盤點 `0.doc_mg/tasks/` 根目錄下所有任務檔之執行進度與結案狀態，依據 `task-protocol` 封存規範（`0.doc_mg/tasks/archive/[plugin]/`），將 5 個已全數驗收完成的任務實體遷移至對應插件的歸檔目錄中，確保工作區任務根目錄保持極簡清晰。

## 2. 策略與鎖定檔案

### 核心策略
1. **盤點與狀態確認**：
   - 經 Gate 1 唯讀盤點，現存 5 個任務檔案皆已 100% 達成驗收標準並完成簽到結案。
2. **對應目錄歸檔**：
   - `task_20260919_finance_clipper_bg_connection_fix.md` -> `0.doc_mg/tasks/archive/finance-research-clipper-oss/`
   - `task_20260925_browser_activity_monitor_impl.md` -> `0.doc_mg/tasks/archive/browser-activity-monitor/`
   - `task_20260925_global_chrome_md_blueprint.md` -> `0.doc_mg/tasks/archive/global/`
   - `task_20260925_videospeedplus_subtitle_scrumclock_collector.md` -> `0.doc_mg/tasks/archive/chrome_video speed plus/`
   - `task_20260926_global_rules_skills_relative_paths.md` -> `0.doc_mg/tasks/archive/global/`
3. **目錄結構補全**：
   - 若 `archive/` 下缺少 `finance-research-clipper-oss` 或 `browser-activity-monitor` 子目錄，在遷移時一併建立。
4. **極致精簡與 SSOT 同步**：
   - 遷移後檢查 `0.doc_mg/tasks/` 根目錄，僅保留當前作業中的任務。

### 鎖定檔案 (Target Files)
- `0.doc_mg/tasks/task_20260919_finance_clipper_bg_connection_fix.md`
- `0.doc_mg/tasks/task_20260925_browser_activity_monitor_impl.md`
- `0.doc_mg/tasks/task_20260925_global_chrome_md_blueprint.md`
- `0.doc_mg/tasks/task_20260925_videospeedplus_subtitle_scrumclock_collector.md`
- `0.doc_mg/tasks/task_20260926_global_rules_skills_relative_paths.md`
- `0.doc_mg/tasks/archive/`

## 3. 任務拆解

### Phase 1: 建立歸檔目錄結構與遷移檔案 狀態：`[已完成]`
- [x] 任務 1.1: 建立缺失之封存子目錄
    - [x] 建立 `0.doc_mg/tasks/archive/finance-research-clipper-oss/`
    - [x] 建立 `0.doc_mg/tasks/archive/browser-activity-monitor/`
- [x] 任務 1.2: 依所屬插件遷移 5 個已結案任務檔案
    - [x] 遷移 `task_20260919_finance_clipper_bg_connection_fix.md`
    - [x] 遷移 `task_20260925_browser_activity_monitor_impl.md`
    - [x] 遷移 `task_20260925_global_chrome_md_blueprint.md`
    - [x] 遷移 `task_20260925_videospeedplus_subtitle_scrumclock_collector.md`
    - [x] 遷移 `task_20260926_global_rules_skills_relative_paths.md`

### Phase 2: 驗證目錄乾淨度與狀態結案 狀態：`[已完成]`
- [x] 任務 2.1: 檢視 `0.doc_mg/tasks/`，確認所有歷史任務均已安全封存。
- [x] 任務 2.2: 本任務檔案狀態收斂與實體結案打勾。

## 4. 影響評估
- 本次僅調整 Markdown 任務管理檔案的儲存位置，不影響任何插件原始碼、Manifest 設定或運作行為。

## 5. 驗收標準
- [x] **檔案完整性**: 5 個已結案任務檔案完整遷移至對應 `archive/` 目錄，無遺失或內容損壞。
- [x] **目錄極簡化**: `0.doc_mg/tasks/` 根目錄不再堆積歷史完成任務。
- [x] **純字串相對路徑**: 所有參照維持純字串相對路徑，無本機絕對路徑。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: 99ffce54-df65-4914-99b4-1d105bef5f28 (Gate 1 任務藍圖建立)
> - 2026-09-26 ID: e77349e7-3a13-4326-9182-ff869fef396a (Phase 1 封存目錄建立與檔案遷移完成；Phase 2 驗證結案)
>
> **跨會話接力指令 (Session Handover)**:
> 本任務已全數驗收完成結案，無需接力指令。
