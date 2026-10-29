---
name: 任務協議管理 (Task Protocol Management)
description: 強制執行 `task_template_v2.md` 的初始化、同步、3-Gate 門禁、會話隔離與封存管理規範。
triggers: [建立任務, 開始開發, 任務拆解, 狀態更新, 同步進度, 任務歸檔, 歷史任務, 封存任務, 狀態收斂, 接力會話]
dependencies: []
ssot_dependencies: ["0.doc_mg/task_template_v2.md", "0.doc_mg/docs/task_manager.md"]
---

# 技能指令：任務協議守護者 (v3.3 - 3-Gate Agility Protocol)

專案推行「實體任務真理源」、「3-Gate 門禁體系 (停止使用 Gate 0，直接由 Gate 1 勘查藍圖展開)」與「One Phase, One Session」會話隔離。任務範本為 `0.doc_mg/task_template_v2.md`，完整制度與封存細則詳見 `0.doc_mg/docs/task_manager.md`。

## 1. 前置思維底線 (Think Before Coding)
- **拒絕盲猜**：規格有歧義主動列出權衡詢問，嚴禁默認猜測。
- **歷史產物非規格**：探索一律查閱專屬 SSOT/README，**嚴禁抄襲歷史已結案任務檔**。
- **探勘硬窄化**：>100 行代碼**強制以 `code_skeleton.py` 或 `repo-radar` 提煉骨架，嚴禁全檔 `view_file`**；細讀視窗放寬至 80~150 行。

## 2. 三階段門禁 (The 3-Gate Protocol)
- **Gate 1: 脈絡藍圖 (Session 1)**：嚴禁改動源碼；以 `task_template_v2.md` 建立 `task_MMDD_01_[plugin]_[topic].md`；**第一時間 `git add <task-file>` 暫存防護**；輸出接力代碼塊後**強制停步交權**。
- **Gate 2: 原子執行 (One Phase, One Session)**：以 `task.md` 為唯一真理源；單輪專注當前 Phase；大量終端輸出串接 `compact_log.py` 或 `rtk`；Phase 完成後於結尾批次打勾同步，**強制停步交權並產出接力代碼塊**。
- **Gate 3: 知識收斂與自動化審計**：執行 `doc_cross_ref.py` / `audit_manifests.py` 確保 Exit 0；落實 SSOT 閉環；實體任務移入 `0.doc_mg/tasks/archive/` 根目錄，更新即停步。

## 3. 安全守護五大戒律 (Safety Guards)
1. **精準局部替換鐵律**：更新任務檔**嚴格限制 `replace_file_content` ≤ 50~80 行**；嚴禁整檔覆寫；寫入專案檔嚴禁傳遞 `ArtifactMetadata`；嚴禁臨時腳本更新任務檔；落實 Phase 結尾批次打勾。
2. **建檔即 Git Add 防護**：新建 `task_*.md` 必須第一時間 `git add` 納入暫存區防護。
3. **更新即停步與清理前置**：暫存產物清理必須前置；更新任務檔必須是本輪最後一個工具調用，更新後立即停步。
4. **驗證正則合併與單次收尾**：驗收正則合併避免多輪 Grep；結案收尾打勾與歷程單次原子更新。
5. **工具檢核矩陣分級豁免**：常態任務全面豁免工具矩陣填寫；僅重大架構重構選填且須附真實實證。

## 4. SSOT 閉環與 2-Strike 熔斷
- **90/10 SSOT 分級**：90% 輕量任務 L1~L3 全面豁免標記 `[N/A]`；10% 重大變更（元件增刪、Storage 模型、跨插件通訊）結案前純骨架回寫。
- **2-Strike 熔斷**：單 Bug 最多 2 次重試。第 2 次失敗立即停止盲試，Git 還原乾淨，回寫 task 標記 `[BLOCKED]`，停步引導開新 Session 專注修復。

## 5. 多會話接力代碼塊 (Session Handover Blocks)
Phase 結束停步或遭遇阻礙中斷時，於回覆末尾附上接力代碼塊：
```markdown
載入 ./0.doc_mg/tasks/task_MMDD_01_[plugin]_[topic].md，開始執行 Phase X
```
```markdown
載入 ./0.doc_mg/tasks/task_MMDD_01_[plugin]_[topic].md，專注調查並修復 [BLOCKED: 錯誤摘要] 問題
```

## 6. 雙層滾動封存與驗收防呆
- **封存機制**：結案移入 `archive/` 根目錄（常態保留最近 10 份）；溢出任務分流至各插件目錄（詳見 `0.doc_mg/docs/task_manager.md`）。
- **驗收防呆清單**：
  - [ ] 物理任務文件已於 Phase 結尾批次打勾並同步最新進度與歷程？
  - [ ] 更新任務檔是否使用原生局部替換工具（≤ 50~80 行）且為本輪最後一個工具調用？
  - [ ] 是否嚴守 2-Strike 熔斷與 One Phase, One Session，停步交權並產出新會話接力代碼塊？
  - [ ] 結案時是否執行自動化審計工具 (`doc_cross_ref.py`) 確保 Exit 0 與 SSOT 閉環？

