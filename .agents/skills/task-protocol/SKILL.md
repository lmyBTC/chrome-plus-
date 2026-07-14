---
name: 任務協議管理 (Task Protocol Management)
description: 強制執行 `task_template_v2.md` 的初始化、物理同步、狀態收斂與封存管理規範。
triggers: [建立任務, 開始開發, 任務拆解, 狀態更新, 同步進度, 任務歸檔, 歷史任務, 封存任務, 狀態收斂]
dependencies: []
ssot_dependencies: ["0.doc_mg/task_template_v2.md", "0.doc_mg/task_manager.md"]
---

# 技能指令：任務協議守護者 (v2.2)

你負責確保專案「任務物理同步」與 Token 節省策略 100% 執行。

## 1. 任務啟動與初始化 (Bootstrap SOP)
當使用者要求開始新任務或開發功能時，**必須** 依序執行：

1. **主題檢索**: 呼叫 `list_dir` 檢索 [`0.doc_mg/tasks/`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/tasks/) 及其 `archive/` 目錄，確認有無同主題或該插件既有之任務。
2. **讀取範本/既有文件**:
   - 若無相關主題：呼叫 `view_file` 讀取 [`0.doc_mg/task_template_v2.md`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/task_template_v2.md)。
   - 若有相關主題：讀取該既有任務檔案。
3. **建立/更新物理文件**:
   - 新主題：呼叫 `write_to_file` 建立 `0.doc_mg/tasks/task_YYYYMMDD_[plugin]_[topic].md` (YYYYMMDD 為當前日期，plugin 填寫插件目錄名或 `global` / `agents`，`IsArtifact` 設為 `false`)。
   - 既有主題：在 `## 3. 任務拆解` 區塊追加或更新進度。
4. **簽到與註解清理**:
   - 在物理文件中將 `[ ]` 簽到區勾選為 `[x]` 並追加當前對話 ID。
   - **[強制] 刪除範本中所有帶有說明性質的 `<!-- ... -->` 註解文字。**
5. **任務拆解**: 確保清單包含 Phase、中任務與原子任務。

## 2. 執行協議與中斷點 (Execution & Halt Protocol)
- **原子化執行**: 每回合工具呼叫或對話僅限處理一個原子任務，防範品質劣化。
- **Phase 限制**: 嚴禁在單一對話回合中跨越執行多個 Phase。
- **物理同步義務**: 完成一個中任務或 Phase 後，必須立即更新實體任務檔案進度。
- **狀態收斂 (Dynamic Condensation)**: 當 Phase 的原子任務皆完成，進入下一 Phase 前，**必須刪除已完成 Phase 的細部原子任務**，僅保留 `### Phase X: [標題] 狀態：[已完成]`。
- **強制收尾**: 在回報任務完成或對話結束前，**最後一個工具呼叫必須是更新、打勾或收斂** `0.doc_mg/tasks/task_*.md`。

## 3. 封存協議 (Archiving Protocol)
- 當任務完全結束（`status: "已完成"`）後，需將檔案移至對應的封存目錄：`0.doc_mg/tasks/archive/[plugin]/`。

## 4. 驗收防呆
- [ ] 物理任務檔案是否已同步最新狀態？
- [ ] 完成之原子任務是否已執行狀態收斂以節省 Token？
- [ ] 暫存檔是否放置於 `scratch/`？
- [ ] 所有說明註解是否皆已清理？

> [!CAUTION]
> **失敗即停**：若發現物理文件結構損壞或遺漏關鍵區塊，應立即停止開發並修復檔案。禁止在未讀取範本的情況下憑記憶生成任務結構。
