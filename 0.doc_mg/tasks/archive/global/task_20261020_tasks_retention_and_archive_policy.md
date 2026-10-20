---
title: "調整任務歸檔治理策略：tasks 主目錄保留最近 10 個已完成 Task"
plugin: "global"
status: "已完成"
created: "2026-10-20"
deadline: "2026-10-20"
appetite: "1h"
complexity_budget: "Max 2 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 3 (Gate 3 驗收結案完成)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：
  `0.doc_mg\tasks\archive` 保留最近 10 個已完成 task 多餘的才丟進歸檔中，避免使用者找不到近期完成的 task。
- **核心目標**：
  1. **規範層**：更新 `GEMINI.md`、`.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md`，將「一結案即全部移至 archive」改為「在 `0.doc_mg/tasks/` 常態保留最近 10 個已完成 Task，超過 10 個之已完成 Task 才移入 `0.doc_mg/tasks/archive/[plugin]/`」。
  2. **工具層**：更新 `0.doc_mg/tools/archive_rotator.py`（或增加治理輔助模式），使其能掃描 `0.doc_mg/tasks/` 內 status 為已完成之任務，自動判斷保留最新 10 份，溢出任務自動搬移至對應插件 archive 目錄。
  3. **現狀還原層**：盤點目前 `archive` 中最近完成之任務，將最新的 10 份已完成 Task 移回 `0.doc_mg/tasks/`，讓使用者在工作區一眼即可追溯近期完成之脈絡。
- **邊界與假設**：
  - 「未完成（進行中/待處理）」任務不計入 10 個配額，始終保留於 `0.doc_mg/tasks/`。
  - 判定「已完成」依據 frontmatter 之 `status: "已完成"` 或檔名與內容。
  - 搬移至 archive 時，依然遵守各插件專屬目錄與 `history/` 雙層架構。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `GEMINI.md`、`.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md`。
- **影響範圍地圖 (Entity Map)**：
  - 核心規範：`GEMINI.md`, `.agents/rules.md`, `.agents/skills/task-protocol/SKILL.md`
  - 維護工具：`0.doc_mg/tools/archive_rotator.py`
  - 任務目錄：`0.doc_mg/tasks/`, `0.doc_mg/tasks/archive/`
- **前置條件 (Prerequisites)**：Git 狀態乾淨，無衝突。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：延用既有 `archive_rotator.py` 架構與正則解析器，不重複發明輪子。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（純規範說明，不改工具與檔案）：用戶日後手動管理，容易遺忘且現狀痛點無法立即緩解。
  - 方案 B（規範修訂 + 工具增強 + 現有檔案整理對齊，選定）：全面更新 SSOT 規則、賦予 rotator 自動識別 10 筆滑動窗口能力、並即刻將最近 10 篇已結案任務回補至 `0.doc_mg/tasks/`。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁刪除任何 task 檔案（No-Deletion Policy）。
  - 嚴禁整檔覆寫規範檔，一律採局部精確替換。
  - 嚴守 One Phase, One Session 原則。

### 鎖定檔案 (Target Files)
- `./GEMINI.md`
- `./.agents/rules.md`
- `./.agents/skills/task-protocol/SKILL.md`
- `./0.doc_mg/tools/archive_rotator.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/task-protocol/SKILL.md` (Gate 3 規範章節)
- [x] L2 憲法與規則：`./GEMINI.md`, `./.agents/rules.md` (Gate 3 歸檔條款)
- [ ] L3 業務規格：N/A
- [x] L4 任務生命週期：`0.doc_mg/tasks/` (最近 10 份保留)

## 4. 階段實施計畫 (Phased Implementation Plan)

### Phase 1: 規範體系全面對齊 (憲法、規則手冊與 Task-Protocol) [已完成]
- [x] **Step 1.1**: 更新 `GEMINI.md` 中 Gate 3 描述：由「實體任務檔打勾結案並移動歸檔至 `0.doc_mg/tasks/archive/`」調整為「實體任務檔打勾結案；`0.doc_mg/tasks/` 常態保留最近 10 個已完成 Task，溢出任務才移入 `0.doc_mg/tasks/archive/` 歸檔」。
- [x] **Step 1.2**: 更新 `.agents/rules.md` 中 Gate 3 與 L4 封存治理章節，明確 10 份滑動窗口機制。
- [x] **Step 1.3**: 更新 `.agents/skills/task-protocol/SKILL.md` 中的「雙層滾動歸檔架構」，將第一道關卡設定為「tasks 根層保留最近 10 份已完成任務」，超過才按插件分流歸檔。
- [x] **驗證條件**: `git diff` 審查文字，確認語意清晰無歧義。

### Phase 2: 工具增強與現存近期完成任務回補對齊 [已完成]
- [x] **Step 2.1**: 強化 `0.doc_mg/tools/archive_rotator.py`，新增對 `0.doc_mg/tasks/` 根目錄已完成任務的計數與維護邏輯（若完成數 > 10，依建立/完成日期排序，舊者建議或執行移動至對應插件 archive）。
- [x] **Step 2.2**: 執行乾洗盤點，將目前在 `0.doc_mg/tasks/archive/` 中最近完成之 10 份 Task 移動回 `0.doc_mg/tasks/`。
- [x] **Step 2.3**: 執行 `python 0.doc_mg/tools/archive_rotator.py --dry-run` 驗證，確認工作區結構與工具邏輯 100% 吻合。
- [x] **驗證條件**: `0.doc_mg/tasks/` 目錄下恰好包含目前進行中任務與最近 10 份已完成任務；`archive_rotator.py` 運作正常無報錯。

---

## 5. 執行驗證紀錄 (Verification Log)
- Phase 1 驗證結果: 通過。`GEMINI.md`、`.agents/rules.md` 與 `task-protocol/SKILL.md` 規範全數修訂完成，`git diff` 驗證語意精確且無衝突。
- Phase 2 驗證結果: 通過。`0.doc_mg/tools/archive_rotator.py` 雙層治理增強完成，已完成任務上限設定為 10 筆並具備溢出歸檔與插件目錄映射能力；成功將 10 份最近完成任務自 archive 遷移回 `0.doc_mg/tasks/`；`--dry-run` 驗證 tasks 根目錄包含 3 筆進行中任務及 10 筆已完成任務，全數通過驗收。
- Gate 3 (Phase 3) 審計結果: 通過。
  - `python 1.devtools/tools/audit_manifests.py --compact` 執行通過，5 款插件 Manifest V3 完全合規 (Exit 0)。
  - `python 1.devtools/tools/audit_suite.py` 執行通過，全站門禁審計通過 (Exit 0)。
  - `python 0.doc_mg/tools/archive_rotator.py --apply` 執行通過，維持 tasks 主目錄常態保留最新 10 筆已完成 Task，溢出任務自動歸檔至 `archive/global/`。

---

## 6. AI 簽到區與狀態收斂
- 當前會話簽到: Session 3 (Gate 3 審計結案完成，狀態收斂為已完成)
