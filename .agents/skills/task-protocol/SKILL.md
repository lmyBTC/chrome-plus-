---
name: 任務協議管理 (Task Protocol Management)
description: 強制執行 `task_template_v2.md` 的初始化、物理同步、狀態收斂與封存管理規範。
triggers: [建立任務, 開始開發, 任務拆解, 狀態更新, 同步進度, 任務歸檔, 歷史任務, 封存任務, 狀態收斂]
dependencies: []
ssot_dependencies: ["0.doc_mg/task_template_v2.md", "0.doc_mg/task_manager.md"]
---

# 技能指令：任務協議守護者 (v3.0 - 3-Gate Protocol)

你負責確保專案「任務物理同步」、「三階段守門門禁」與 Token 節省策略 100% 執行。

## 1. 任務啟動三階段門禁 (The 3-Gate Bootstrap Protocol)

### Gate 0: 方案探詢與方向確認 (Zero-Tool, Zero-Scan)
當使用者提出新需求、架構變更或功能規劃時，**嚴禁呼叫任何檔案掃描工具（如 glob/grep/list_dir/view_file）或建立實體文件**：
1. **零工具思考**：僅憑現有問題脈絡與常識直覺，輸出 100~200 字的高階架構思考（包含 1~2 種可能作法與權衡取捨）。
2. **尋求方向授權**：明確詢問：「是否同意此方向？確認後我將開始掃描相關模組並產出 task.md。」
3. **強制交出控制權**：**停止呼叫任何工具並直接輸出回覆**，等待使用者明確授權（如「同意」、「可行」或提出調整意見）。

### Gate 1: 脈絡勘查與任務藍圖 (Grounding & Task Blueprint)
獲得使用者對 Gate 0 方向的明確確認後，始得進入深度勘查與建檔：
1. **Step -1: 主題檢索**：呼叫 `list_dir` 檢索 [`0.doc_mg/tasks/`](./0.doc_mg/tasks/) 及其 `archive/` 目錄，確認有無同主題或既有任務。
2. **Step 0: 讀取範本/既有文件**：
   - 若無相關主題：呼叫 `view_file` 讀取 [`0.doc_mg/task_template_v2.md`](./0.doc_mg/task_template_v2.md)。
   - 若有相關主題：讀取該既有任務檔案。
3. **Step 1: 精準唯讀掃描**：僅針對目標插件或相依檔案進行最小化上下文探索（嚴禁全盤無效掃描或跨插件污染）。
4. **Step 2: 建立/更新實體文件**：
   - 建立 `0.doc_mg/tasks/task_YYYYMMDD_[plugin]_[topic].md`（`plugin` 填寫插件名稱或 `global`/`agents`）。
   - 填寫目標、鎖定檔案、具體 Phase 與驗收標準。
   - 在 AI 簽到區勾選並記錄對話 ID。
   - **[強制] 刪除範本中所有帶有說明性質的 `<!-- ... -->` 註解文字。**
5. **強制停步 (Blueprint Halt)**：輸出 `task.md` 的路徑與綱要，**嚴禁在此步驟直接修改任何原始碼**，明確等待使用者下達「開始執行」或「approved」指令。

### Gate 2: 分段原子執行 (Atomic Execution)
使用者核准 `task.md` 後，始可進入實體程式碼執行階段：
- **原子化執行**: 每回合對話/工具呼叫僅限處理一個原子任務，防範品質劣化與幻覺。
- **Phase 嚴格限制**: 嚴禁在單一對話回合中跨越執行多個 Phase。
- **物理同步義務**: 每完成一個原子任務或 Phase，必須立即在實體 `task.md` 中打勾 `[x]`。
- **狀態收斂 (Dynamic Condensation)**: 當 Phase 內所有原子任務完成，進入下一 Phase 前，**必須刪除已完成 Phase 的細部原子任務**，僅保留：
  ```markdown
  ### Phase X: [標題] 狀態：`[已完成]`
  ```
- **強制收尾**: 在回報任務完成或對話結束前，**最後一個工具呼叫必須是更新、打勾或收斂** `0.doc_mg/tasks/task_*.md`。

## 2. 封存協議 (Archiving Protocol)
- 當任務完全結束（`status: "已完成"`）後，需將檔案移至對應的封存目錄：`0.doc_mg/tasks/archive/[plugin]/`。

## 3. 驗收防呆
- [ ] **Gate 0 守門**: 是否在未呼叫任何掃描工具前先取得方向授權？
- [ ] **Gate 1 守門**: 是否在修改程式碼前已建立實體 `task.md` 並獲得使用者執行授權？
- [ ] **說明註解清理**: `task.md` 中所有 `<!-- ... -->` 範本提示是否已徹底刪除？
- [ ] **狀態收斂**: 完成之 Phase 是否已執行細節收斂以最大化節省 Token？
- [ ] **物理同步**: 實體任務檔案是否已同步最新狀態？

> [!CAUTION]
> **失敗即停**：若發現物理文件結構損壞或遺漏關鍵區塊，應立即停止開發並修復檔案。禁止在未讀取範本的情況下憑記憶生成任務結構。嚴禁跳過 Gate 0 或 Gate 1 直接改動程式碼。
