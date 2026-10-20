---
title: "任務歸檔策略校正：tasks 根目錄保持純淨，archive 保留最近 10 份任務"
plugin: "global"
status: "已完成"
created: "2026-10-20"
deadline: "2026-10-20"
appetite: "1h"
complexity_budget: "Max 2 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 2 (Phase 2 與 Gate 3 結案完成)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：
  `0.doc_mg\tasks` 根目錄保持乾淨，完成後的 TASK 要移入 `0.doc_mg\tasks\archive`；`0.doc_mg\tasks\archive` 才是保留最近 10 的任務。
- **核心目標**：
  1. **工作區根目錄乾淨化 (Clean Tasks Root)**：
     - `0.doc_mg/tasks/` 根目錄僅允許存放進行中 (In-Progress) 任務與工作清單，嚴禁滯留已完成之 Task。
     - 一旦任務於 Gate 3 結案完成，立即移入 `0.doc_mg/tasks/archive/`。
  2. **封存區配額治理 (Archive Retention)**：
     - `0.doc_mg/tasks/archive/` 才是維持保留「最近 10 份任務」之活躍封存區。
     - 超過 10 份之歷史任務，自動移入各插件對應之 `history/` 子目錄歸檔。
  3. **規範與工具全面對齊**：
     - 憲法與規則修正：同步校正 `GEMINI.md`、`.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md`。
     - 維護工具調整：修正 `0.doc_mg/tools/archive_rotator.py`，將根目錄已完成任務全數自動歸檔，並由 archive 實施 10 份活躍任務保留滾動機制。
     - 現況任務回正：將目前散落在 `0.doc_mg/tasks/` 根目錄之 10 筆已完成 Task 移入對應之 `archive/`。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `GEMINI.md`、`.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md`。
- **影響範圍地圖 (Entity Map)**：
  - 核心規範：`GEMINI.md`, `.agents/rules.md`, `.agents/skills/task-protocol/SKILL.md`
  - 維護工具：`0.doc_mg/tools/archive_rotator.py`
  - 任務目錄：`0.doc_mg/tasks/`, `0.doc_mg/tasks/archive/`
- **前置條件 (Prerequisites)**：Git 狀態乾淨，無衝突。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：延用既有 `archive_rotator.py` 架構，僅調整治理閥值與搬移邏輯。
- **架構策略**：
  - 根目錄治理邏輯：凡 status 判定為已完成之任務，搬移至 `archive/[plugin]/`，根目錄已完成配額降為 0。
  - 封存區治理邏輯：`archive/` 各插件目錄第一層常態保留最新 10 份活躍任務，第 11 份起移入 `history/`。
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
- [ ] L4 任務生命週期：`0.doc_mg/tasks/` 與 `0.doc_mg/tasks/archive/`

## 4. 階段實施計畫 (Phased Implementation Plan)

### Phase 1: 規範體系與工具邏輯校正 (憲法、手冊與 archive_rotator.py) [已完成]
- [x] **Step 1.1**: 更新 `GEMINI.md` Gate 3 憲法條款：「實體任務檔打勾結案並立即移入 `0.doc_mg/tasks/archive/` 歸檔；`archive/` 目錄常態保留最近 10 個已完成 Task，溢出任務才移入 `history/` 歸檔」。
- [x] **Step 1.2**: 更新 `.agents/rules.md` 中 Gate 3 與 L4 封存治理章節，明確「tasks 根目錄保持純淨（0 結案滯留），archive 保留最近 10 筆已完成任務」之雙軌原則。
- [x] **Step 1.3**: 更新 `.agents/skills/task-protocol/SKILL.md` 雙層滾動架構說明。
- [x] **Step 1.4**: 調整 `0.doc_mg/tools/archive_rotator.py`：將 tasks 根目錄的已完成任務預設全數歸檔（max_completed 預設為 0），並調整 archive 目錄保留數量邏輯（保留最新 10 筆，超過 10 筆或逾期者滾動至 `history/`）。
- [x] **驗證條件**: `git diff` 審查規範語意無歧義；`archive_rotator.py --dry-run` 顯示正確搬移計數。

### Phase 2: 現存任務歸檔遷移與全站合規審計驗收 [已完成]
- [x] **Step 2.1**: 執行 `python 0.doc_mg/tools/archive_rotator.py --execute`，將 tasks 根目錄現存已完成之 10 筆任務全數安全移入對應之 `archive/[plugin]/`。
- [x] **Step 2.2**: 檢查 `0.doc_mg/tasks/` 根目錄，確認僅剩餘未完成之進行中任務，根目錄完全純淨。
- [x] **Step 2.3**: 執行 Gate 3 門禁審計（`audit_manifests.py`、`audit_suite.py`），確認通過。
- [x] **驗證條件**: `0.doc_mg/tasks/` 乾淨無已結案任務，`0.doc_mg/tasks/archive/` 妥善收納最新 10 筆任務，所有審計 Exit 0。

---

## 5. 執行驗證紀錄 (Verification Log)
- Phase 1 驗證結果: 通過。`GEMINI.md`、`.agents/rules.md`、`task-protocol/SKILL.md` 規範完成校正；`archive_rotator.py` 成功支援 `max_completed=0` 與 `archive_max_retained=10`；`--dry-run` 顯示 tasks 根目錄 10 筆已結案任務預計全數移入 archive，且 archive/ 超額 42 筆任務預計下沉至 history/。
- Phase 2 驗證結果: 通過。`archive_rotator.py --execute` 成功執行，tasks 根目錄已完成任務全數歸檔至 archive/，歷史任務下沉至 history/；`0.doc_mg/tasks/` 根目錄已達成純淨零滯留（僅剩 1 份進行中任務）；`audit_manifests.py` 與 `audit_suite.py` 門禁審計全數 Exit 0 通過。
- Gate 3 審計結果: 通過。合規審計全部通過，全專案無阻斷性錯誤。

---

## 6. AI 簽到區與狀態收斂
- 當前會話簽到: Session 2 (Phase 2 與 Gate 3 自動化審計驗收完成，任務打勾結案並移入 archive 歸檔)
