# 歷史任務檔案管理指南 (Task Manager Guide)

本文件說明如何在這個「多插件開發區」中，建立、管理與歸檔日常開發任務檔案，以維持專案目錄的整潔與對話 Token 的最大化節省。

---

## 1. 任務生命週期管理 (The 3-Gate Protocol)

本專案所有的開發與維護工作均透過「三階段守門門禁」與物理任務檔案 (`.md`) 嚴格推進，其生命週期包含以下核心門禁與封存階段：

### 1.1. Gate 0: 概念對齊與方案探詢 (Zero-Tool, Zero-Scan)
- **原則**: 收到新需求時，**嚴禁呼叫任何掃描工具或建立實體檔案**。
- **產出**: AI 僅憑直覺與既有脈絡，輸出 100~200 字的高階架構方案（包含 1~2 種作法與權衡）。
- **中斷點**: 明確提問並交出控制權，等待開發者核准方向。若方向被否決，節省 80% 以上無謂探索 Token。

### 1.2. Gate 1: 物理勘查與建檔 (Grounding & Task Blueprint)
- **跨環境相對路徑**: 任務文件與所有參考連結一律使用專案相對路徑（如 `./0.doc_mg/...` 或 `./[plugin]/...`），嚴禁寫入本機絕對路徑。
- **建檔路徑**: 一律存放在 `0.doc_mg/tasks/` 目錄下。
- **命名規範**: `task_YYYYMMDD_[plugin]_[topic].md`（範例：`task_20260624_chrome_scrumclock_add_timer.md`）。
- **範本使用**: 必須複製 `0.doc_mg/task_template_v2.md` 作為基準，並填入目標、Phase 拆解、驗收標準與 AI 簽到（同時**徹底刪除範本中所有 `<!-- ... -->` 註解說明**）。
- **中斷點**: 輸出 `task.md` 綱要後**強制停步**，**嚴禁在此時修改原始碼**，等待開發者下達「開始執行」或「approved」指令。

### 1.3. Gate 2: 分段原子執行與狀態收斂 (Atomic Execution & Condensation)
- **原子執行**: 每次僅執行一個原子任務，單一回合嚴禁跨越多個 Phase。
- **物理同步**: 每完成一個原子任務，AI **必須立即**在實體任務檔案中打勾 `[x]`。
- **狀態收斂 (Dynamic Condensation)**: 當某個 Phase 裡的所有原子任務皆完成，進入下一 Phase 前，AI **必須刪除該 Phase 內已完成的細節**，僅保留：
  ```markdown
  ### Phase X: [階段名稱] 狀態：`[已完成]`
  ```
  避免冗長歷史步驟塞滿對話 context。

### 1.4. 封存 (Archiving Protocol)
- **手動移轉**: 當任務完全結束（`status: "已完成"`）後，將任務檔案移動到對應插件的封存目錄：
  - `0.doc_mg/tasks/archive/chrome_scrumclock/`
  - `0.doc_mg/tasks/archive/chrome_video_speed_plus/`
  - `0.doc_mg/tasks/archive/finance-research-clipper-oss/`
- 確保 active 任務區 `0.doc_mg/tasks/` 僅保留進行中任務，維持目錄清爽。

---

## 2. 工具與自動化展望

雖然目前專案以手動封存與管理為主，但未來可視需求在 `0.doc_mg/tools/` 目錄下建立輕量 Python 腳本（例如 `archive_manager.py`），自動識別 `status: "已完成"` 的任務並將其歸檔至對應插件的封存目錄中。
