# 歷史任務檔案管理指南 (Task Manager Guide)

本文件說明如何在這個「多插件開發區」中，建立、管理與歸檔日常開發任務檔案，以維持專案目錄的整潔與對話 Token 的最大化節省。

---

## 1. 任務生命週期管理

本專案所有的開發與維護工作均透過物理任務檔案 (`.md`) 進行追蹤，其生命週期包含以下四個階段：

### 1.1. 啟動與初始化 (Initialization)
- **路徑**: 任務檔案一律存放在 [`0.doc_mg/tasks/`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/tasks/) 目錄下。
- **命名規範**: `task_YYYYMMDD_[plugin]_[topic].md`
  - 範例：`task_20260624_chrome_scrumclock_add_timer.md`
- **範本使用**: 必須複製 [`0.doc_mg/task_template_v2.md`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/task_template_v2.md) 作為基準，並填入 `plugin` 與相關 metadata。

### 1.2. 開發與進度更新 (Execution & Update)
- AI Agent 開始執行任務時，必須在「AI 簽到區」打勾，並記錄當前對話 ID。
- 每完成一個原子任務，AI **必須立即**在實體任務檔案中打勾 `[x]`。
- 當階段任務 (Phase) 完成時，更新 frontmatter 中的 `status` (如變更為 `開發中` -> `待審核`)。

### 1.3. 狀態收斂 (Dynamic Condensation)
- 為了節省 LLM Token，當某個 Phase 裡的所有原子任務皆已打勾完成，且準備進入下一階段前，AI **必須刪除該 Phase 內已完成的細節**，僅保留：
  ```markdown
  ### Phase X: [階段名稱] 狀態：`[已完成]`
  ```
- 如此可避免冗長且已完成的步驟不斷被載入對話脈絡中。

### 1.4. 封存 (Archiving)
- **手動移轉**: 當任務完全結束（`status: "已完成"`）後，開發者或 AI 可以將任務檔案從 `0.doc_mg/tasks/` 移動到封存目錄。
- **封存結構**: 為了方便檢索，封存目錄依據 **插件名稱** 進行分類：
  - `0.doc_mg/tasks/archive/chrome_scrumclock/`
  - `0.doc_mg/tasks/archive/chrome_video_speed_plus/`
  - `0.doc_mg/tasks/archive/finance-research-clipper-oss/`
- 這能確保 active 任務區 `0.doc_mg/tasks/` 只保留當前正在進行的任務，極大化維持目錄整潔。

---

## 2. 工具與自動化展望

雖然目前專案以手動封存與管理為主，但未來可視需求在 `0.doc_mg/tools/` 目錄下建立輕量 Python 腳本（例如 `archive_manager.py`），自動識別 `status: "已完成"` 的任務並將其歸檔至對應插件的封存目錄中。
