---
title: "優化與精簡 Skills 規範並下沉內容至 Docs 文檔"
plugin: "global"
status: "已完成"
created: "2026-10-21"
deadline: "2026-10-21"
appetite: "2h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 4 (Phase 3 Completed)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：用戶提出「分析與優化 skills 文件 下沉內容到 docs 的文件中詳細記載 減輕 skills 指引負擔」，本質是為了解決 Agent 載入各 Skills 時因 `SKILL.md` 內容過於臃腫造成之 Context 泛洪、注意力稀釋 (Lost in the middle) 與 Token 成本浪費，落實 Skill 作為「輕量導航指針」與 Docs 作為「完整 SSOT 知識庫」的架構分層。
- **核心目標**：
  1. 將 `.agents/skills/task-protocol/SKILL.md`（現 124 行 / 16.6 KB）深度精簡至 45~55 行，將詳細封存目錄對照、雙層滾動演進、五大戒律詳解完整沉澱至 `0.doc_mg/docs/task_manager.md`。
  2. 將 `.agents/skills/token-saver/SKILL.md`（現 71 行 / 5.8 KB）深度精簡至 30~40 行，移除重複的工具調用矩陣，詳細原理下沉至 `0.doc_mg/docs/token_optimization_guide.md`。
  3. 檢視並規範其餘各插件 Core Spec（如 `pk-core`, `activity-monitor-core` 等），移除微觀程式碼與細節條列，確保 Skill 聚焦於「核心定位、硬性底線、深層 SSOT 跳轉指標」。
  4. 執行自動化交叉參照審計工具 (`doc_cross_ref.py`) 確保全站文檔與 SSOT 零死鏈。
- **邊界與假設**：
  - 本次任務僅改動 `.agents/skills/` 與 `0.doc_mg/docs/` 文檔，嚴禁改動任何插件功能程式碼。
  - 所有下沉內容必須在 `0.doc_mg/docs/` 內有清晰章節承接，絕不遺失任何既有管理政策與工具指令。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `GEMINI.md`、`.agents/rules.md`、`0.doc_mg/docs/task_manager.md`、`0.doc_mg/docs/token_optimization_guide.md`。
- **影響範圍地圖 (Entity Map)**：
  - `.agents/skills/task-protocol/SKILL.md`
  - `.agents/skills/token-saver/SKILL.md`
  - `.agents/skills/pk-core/SKILL.md`
  - `.agents/skills/activity-monitor-core/SKILL.md`
  - `0.doc_mg/docs/task_manager.md`
  - `0.doc_mg/docs/token_optimization_guide.md`
- **前置條件 (Prerequisites)**：
  - 工作區 Git 狀態無未提交髒代碼。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：消除 `task-protocol/SKILL.md`、`token-saver/SKILL.md` 與 `task_manager.md` 之間大量重複的「生命週期工具鏈調用矩陣」與「封存目錄對照表」。
- **架構策略 (30/70 分割)**：
  - Skill (30%)：保留 Triggers, Hard Constraints (硬性底線), Standard Handover Format (接力代碼塊) 與 SSOT 導航指針。
  - Docs (70%)：沉澱 Detailed SOP, Comprehensive Tables, Architecture Philosophy, Edge Cases & Scripts Manual。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁改動各插件業務源碼 (`chrome_pk`, `finance-research-clipper-oss`, `browser-activity-monitor` 等)。
  - 更新任務檔必須使用原生局部替換工具 (`replace_file_content`)，單次替換範圍 ≤ 50~80 行。
  - 嚴禁對 workspace 專案檔案寫入時傳遞 `ArtifactMetadata`。
  - 單一 Phase 嚴格落實「One Phase, One Session」物理隔絕。

### 鎖定檔案 (Target Files)
- `./.agents/skills/task-protocol/SKILL.md`
- `./.agents/skills/token-saver/SKILL.md`
- `./.agents/skills/pk-core/SKILL.md`
- `./.agents/skills/activity-monitor-core/SKILL.md`
- `./0.doc_mg/docs/task_manager.md`
- `./0.doc_mg/docs/token_optimization_guide.md`

### 鎖定工具鏈 (Target Devtools)
- [x] 結案自動審計: `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/task-protocol/SKILL.md`, `./.agents/skills/token-saver/SKILL.md`, `./.agents/skills/pk-core/SKILL.md`, `./.agents/skills/activity-monitor-core/SKILL.md`
- [ ] L2 插件導航：`[N/A]`
- [x] L3 業務規格：`./0.doc_mg/docs/task_manager.md`, `./0.doc_mg/docs/token_optimization_guide.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/`

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 完善 Docs SSOT 文件，下沉承接完整細節 [已完成]
- **目標**：在精簡 Skills 之前，先行確保 `0.doc_mg/docs/` 具備完整規格承接所有下沉內容。
- **成果**：已於 `0.doc_mg/docs/task_manager.md` 完整補充「安全守護五大戒律」、「4-Gate 總覽矩陣」與「雙層滾動歸檔架構及插件目錄對照表」；於 `0.doc_mg/docs/token_optimization_guide.md` 完整整合「任務流程工具鏈調用矩陣」與 RTK 規範。
- **離開標準 (Exit Criteria)**：Docs 文件完善就緒，無內容脫節。

### Phase 2: 精簡核心 Skills (task-protocol, token-saver, plugin specs) [已完成]
- **成果**：完成 `task-protocol/SKILL.md`（4.3 KB，瘦身 73.8%）、`token-saver/SKILL.md`（2.4 KB，瘦身 59%）、`pk-core/SKILL.md`（2.4 KB）與 `activity-monitor-core/SKILL.md`（3.1 KB）精簡，移除冗長次級元件細節與重複工具矩陣，指針導向 Docs SSOT。

### Phase 3: 全站鏈接審計與結案封存 (Gate 3) [已完成]
- **目標**：自動化驗證所有文檔跳轉與語意完整性，完成任務收斂。
- **成果**：執行 `audit_suite.py --only cross_ref` 通過 Exit 0，執行 `audit_markdown_links.py` 針對 Skills 與 Docs 範疇驗證 0 死鏈；完成雙層滾動歸檔收斂。
- **離開標準 (Exit Criteria)**：審計全數通過，實體任務移入 `0.doc_mg/tasks/archive/`。

## 5. 實體檔案清單 (Physical Artifacts)
- `.agents/skills/task-protocol/SKILL.md`
- `.agents/skills/token-saver/SKILL.md`
- `.agents/skills/pk-core/SKILL.md`
- `.agents/skills/activity-monitor-core/SKILL.md`
- `0.doc_mg/docs/task_manager.md`
- `0.doc_mg/docs/token_optimization_guide.md`
- `0.doc_mg/tasks/archive/task_1021_05_global_lean_skills_content_offloading.md`

## 6. 驗收標準清單 (Acceptance Criteria)
- [x] `task-protocol/SKILL.md` 瘦身幅度達 50% 以上（體積從 16.6 KB 降至 4.3 KB，降幅 73.8%），且核心門禁守則完整保留。
- [x] `token-saver/SKILL.md` 移除重複之工具鏈矩陣，指針明確導向 SSOT（體積降至 2.4 KB，降幅 59%）。
- [x] `0.doc_mg/docs/task_manager.md` 完整承接五大戒律、雙層滾動歸檔對照與 2-Strike 熔斷詳解。
- [x] `0.doc_mg/docs/token_optimization_guide.md` 完整承接生命週期工具鏈調用矩陣。
- [x] 執行 `py 1.devtools/tools/doc_cross_ref.py` 回傳 Exit 0，全站無死鏈。

## 7. 狀態收斂歷程 (Condensed History)
- [2026-10-21] [Gate 1] 完成現狀盤點與下沉藍圖規劃，建立任務檔並納入 Git 暫存區 (Session 1)。
- [2026-10-21] [Phase 1] 完善 Docs SSOT 文件，完成五大戒律、雙層滾動歸檔與生命週期矩陣下沉 (Session 2)。
- [2026-10-21] [Phase 2] 精簡核心 Skills (task-protocol 降 74%、token-saver 降 59%、pk-core、activity-monitor-core)，通過 cross_ref 審計 (Session 3)。
- [2026-10-21] [Phase 3] 全站鏈接審計通過 (Exit 0)，無死鏈，依據雙層滾動架構將任務檔平鋪封存至 `0.doc_mg/tasks/archive/` 結案 (Session 4)。

## 8. AI 簽到區 (AI Sign-off)
- **對話 ID**: b5be841a-cac8-47ec-b0a4-f31ad55438c8
- **門禁簽核**: Gate 3 結案驗證通過，自動化審計 Exit 0，任務檔已移入歸檔目錄封存。
