---
title: "全面實施任務協議敏捷鬆綁 (Task Protocol v3.2 & Agility Relaxation)"
plugin: "global"
status: "已完成"
created: "2026-10-13"
deadline: "2026-10-14"
appetite: "1h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 3 (Phase Final - 結案)"
related_drafts: ["0.doc_mg/docs/task_protocol_bottleneck_analysis_20261013.md"]
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：自 10/13 實施 Task Protocol v3.1 升級後，Agent 頻繁卡頓變慢；經軌跡日誌數據實證，核心瓶頸在於過度狹窄的 20~30 行探勘限制、≤ 10 行替換限制、頻繁任務檔同步與儀式過載。本任務旨在全面執行精準鬆綁，恢復敏捷流暢的開發響應。
- **核心目標**：
  1. **放寬檔案讀取視窗**：由強制 20~30 行微觀讀取，放寬至支援 80~150 行（以完整函式/組件為單位），消除香腸式切片調用。
  2. **放寬代碼替換上限**：由單次 ≤ 10 行放寬至 ≤ 50~80 行（唯一語意區塊替換），杜絕 2~5 行微片段碎片化。
  3. **實施 Phase 結尾批次打勾**：禁止每動一步即刻編輯任務檔打勾，改為 Phase 程式碼全部確認後最後一動批次同步，消除 I/O 乒乓球。
  4. **實施儀式結構分級豁免**：一般日常任務全面豁免工具檢核矩陣與事前驗屍，僅跨插件/架構重構保留選填。
  5. **替換靜態絕對行號錨定為語意區塊錨定**：避免代碼修改後的行號漂移與反覆重勘。
- **邊界與假設**：保留多插件目錄物理隔離底線、Manifest V3 合規、Exit 0 驗證與 SSOT 閉環原則，只針對摩擦阻力過大的微操作規則進行鬆綁。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `GEMINI.md`、`.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md` 與 `0.doc_mg/task_template_v2.md`。
- **實證數據報告**：已完成 [0.doc_mg/docs/task_protocol_bottleneck_analysis_20261013.md](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/docs/task_protocol_bottleneck_analysis_20261013.md)。
- **影響範圍地圖 (Entity Map)**：
  - `GEMINI.md` (修正 Gate 1 與 Gate 2 憲法條款)
  - `.agents/rules.md` (修正探勘行數、替換行數與任務檔防護五大戒律)
  - `.agents/skills/task-protocol/SKILL.md` (修正 4-Gate 執行細則與打勾機制)
  - `0.doc_mg/task_template_v2.md` (精簡任務範本，矩陣與驗屍標註分級豁免)
  - `0.doc_mg/docs/task_manager.md` (同步任務管理文檔)
- **前置條件 (Prerequisites)**：工作區乾淨，分析報告已落盤存檔。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：延續現有 4-Gate 主架構，僅調整數值邊界與同步頻率，不推翻既有機制。
- **架構策略與 Tree of Thoughts (ToT)**：
  - *方案 A：完全廢除 4-Gate* ➔ 風險過大，失去上下文保護與防護網。
  - *方案 B (選定)：參數精準放寬 + 儀式分級豁免* ➔ 既保留會話隔離與 SSOT 閉環優勢，又消滅 70% 以上無謂的工具往返與 Context 膨脹。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁整檔覆寫任務檔。
  - 嚴禁放寬 Chrome 插件 Manifest V3 與 Shadow DOM 核心安全底線。

### 鎖定檔案 (Target Files)
- `GEMINI.md`
- `.agents/rules.md`
- `.agents/skills/task-protocol/SKILL.md`
- `0.doc_mg/task_template_v2.md`
- `0.doc_mg/docs/task_manager.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`.agents/skills/task-protocol/SKILL.md`
- [x] L2 核心規範：`GEMINI.md`、`.agents/rules.md`
- [x] L3 任務範本：`0.doc_mg/task_template_v2.md`、`0.doc_mg/docs/task_manager.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/`

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 頂層憲法與 Rules 規範鬆綁 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 修改 `GEMINI.md`
    - **動作**: 調整 Gate 1 與 Gate 2 條款，放寬讀取視窗至 80~150 行，替換範圍放寬至 ≤ 50~80 行，確立 Phase 結尾批次打勾機制。
    - **驗證 (Exit 0)**: 確認條款語意精簡無自相矛盾。
- [x] 任務 1.2: 修改 `.agents/rules.md`
    - **動作**: 更新「任務檔防護五大戒律」及「Token 節省技術」：放寬局部替換上限至 ≤ 50~80 行，明訂延遲批次打勾與常態任務分級豁免規則。
    - **驗證 (Exit 0)**: `git diff` 比對確認無破壞性刪減。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] Phase 1 條款修改完成。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 遵循「One Phase, One Session」輸出接力指令。

### Phase 2: 任務協議技能與範本重構 狀態：`[已完成]`
- [x] 任務 2.1: 修改 `.agents/skills/task-protocol/SKILL.md`
    - **動作**: 更新 4-Gate 流程細則，納入「語意區塊錨定」規範與常態任務「矩陣/驗屍分級豁免」指引。
    - **驗證 (Exit 0)**: 確認技能步驟清楚一致。
- [x] 任務 2.2: 精簡重構 `0.doc_mg/task_template_v2.md` 與 `0.doc_mg/docs/task_manager.md`
    - **動作**: 將工具檢核矩陣與事前驗屍標註為「[選填/重大架構變更適用]」，精簡常態任務範本長度，降低預設 Token 開銷。
    - **驗證 (Exit 0)**: 範本字數減少 30% 以上，結構依然完整。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] Phase 2 範本與技能調整完成。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 輸出新會話接力指令。

### Phase Final: 自動化審計驗收與任務歸檔 狀態：`[已完成]`
- [x] 任務 F.1: 交叉鏈接與死鏈自動化審計
    - **動作**: 執行 `py 1.devtools/tools/doc_cross_ref.py --dir 0.doc_mg --dry-run` 確保無死鏈。
    - **驗證 (Exit 0)**: 審計通過 Exit 0。
- [x] 任務 F.2: 任務封存歸檔
    - **動作**: 將本任務移動至 `0.doc_mg/tasks/archive/global/`。
    - **驗證 (Exit 0)**: 工作區整潔，歸檔完成。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：放寬替換行數後，若 Agent 錨定區塊不明確可能導致誤替換。防範措施：強調「語意唯一性」（包含函數簽名或獨特標籤），嚴禁模糊區塊替換。
- **降級/回滾方案 (Blast Radius Control)**：若鬆綁後代碼出錯率上升，可透過 Git 版本歷史迅速還原規範文件。

## 6. 驗收標準 (Acceptance Criteria)
- [x] `GEMINI.md`、`.agents/rules.md`、`task-protocol/SKILL.md`、`task_template_v2.md` 四份文件全面同步一致。
- [x] 常態任務讀取與替換粒度放寬至 50~150 行區間，徹底根除 2~5 行微片段操作。
- [x] 交叉引用審計 `py 1.devtools/tools/doc_cross_ref.py` 驗收 Exit 0。

## 7. 狀態收斂歷程 (State Convergence Log)
- `[2026-10-13 22:00]` Gate 1 完成：完成本地 512 會話日誌深度分析，產出分析報告，建立 v3.2 鬆綁任務藍圖。
- `[2026-10-13 22:05]` Phase 1 完成：GEMINI.md 與 .agents/rules.md 憲法及執行規則全面鬆綁（探勘 80~150 行、替換 50~80 行、延遲批次打勾、分級豁免）。
- `[2026-10-13 22:11]` Phase 2 完成：重構 task-protocol SKILL.md、task_template_v2.md 與 task_manager.md（落地語意區塊錨定、常態任務豁免矩陣與驗屍、放寬替換至 ≤ 50~80 行與細讀視窗至 80~150 行）。
- `[2026-10-13 22:12]` Phase Final 完成：執行 doc_cross_ref.py 與 audit_manifests.py 全域審計通過 (Exit 0)，全數驗收標準達標，執行任務封存歸檔。
