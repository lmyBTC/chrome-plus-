# 任務：GEMINI.md 最高憲法精簡優化與規格下沉

> 任務檔名：`task_20261020_03_global_simplify_and_sink_gemini_md.md`  
> 建立日期：2026-10-20  
> 責任插件/範圍：全域規範 (Global SSOT)  
> 當前狀態：已完成 (Completed)

---

## 1. 目標與背景 (Goal & Context)
- **核心目標**：徹底純化 `GEMINI.md`，消除長篇括號雜訊與微觀數值規範，回歸最簡潔的「最高憲法與原則指引」。
- **下沉治理**：確認所有執行層面細節（如讀取視窗 80~150 行、局部替換 ≤ 50~80 行、10 份滾動歸檔、90/10 閉環分級等）已完整下沉並留存在 `.agents/rules.md` 與專屬技能中，達成 SSOT 單一真理源與 Token 最佳化。

---

## 2. 策略與下沉分工 (Strategy & SSOT Mapping)
- **GEMINI.md 骨幹化**：
  - 核心底線保留：語言偏好、路徑雙軌制（專案相對/對話 file://）、4-Gate 守門門禁（骨架定義）、多插件隔離、SSOT 分級總綱。
  - 剔除微觀細節：移除具體行數限制、歷史歸檔滾動演算法、工具腳本調用指令等次級規則，直接指針導航至 `.agents/rules.md`。
- **Target SSOTs**：
  - `GEMINI.md` (主修改對象)
  - `.agents/rules.md` (頂層索引樞紐)
  - `.agents/skills/task-protocol/SKILL.md` (微觀執行條文下沉真理源)
  - `.agents/skills/token-saver/SKILL.md` (Token 優化與工具調用下沉真理源)

---

## 3. 執行階段 (Phases)

### Phase 1: 精簡純化 GEMINI.md 憲法條文並注入三大核心思維
- [x] 注入「三大核心思維 (Core Mindset)」：簡潔與最小改動、系統思維與第一性原理、目標驅動與前置思考。
- [x] 移除 `GEMINI.md` 中 4-Gate 各門禁的微觀執行數值與冗餘描述，提煉為純粹的原則骨架。
- [x] 移除 SSOT 閉環與雙軌制的繁複贅述，保持精準一句話原則。
- [x] 強化指向 `.agents/rules.md` 的單一真理源指針導航。
- [x] 驗證精簡後篇幅與 Token 節省效益。

### Phase 2: rules.md 頂層索引化與微觀規格下沉專屬技能
- [x] 檢視並確保各專屬技能（如 `task-protocol`、`token-saver`）已完整包含所有執行規格。
- [x] 純化 `.agents/rules.md`：保留技能導航表，將 Gate 門禁、Token 優化、雙軌制條文提煉為高階指針與原則，去除冗餘微觀細節。
- [x] 驗證 `rules.md` 精簡成果與指針正確性。

### Phase 3: 自動化審計校驗、SSOT 驗證與結案歸檔 (Gate 3)
- [x] 運行 `python 1.devtools/tools/doc_cross_ref.py` 確保文檔交叉引用無斷鏈。
- [x] 任務檔標記完成並移入 `0.doc_mg/tasks/archive/`。
- [x] 輸出結案報告。

---

## 4. 驗證標準 (Verification)
- [x] `GEMINI.md` 與 `rules.md` 雙層純化，無微觀執行雜訊，骨幹與指針職責分明。
- [x] 專屬技能（`task-protocol`、`token-saver`）完整承接所有微觀執行條文。
- [x] 自動化文檔審計通過 (`doc_cross_ref.py` 返回 Exit 0)。

---

## 5. 狀態收斂歷程
- [2026-10-20] [Phase 1] 完成 GEMINI.md 注入三大思維與憲法條文純化。
- [2026-10-20] [Phase 2] 完成 rules.md 頂層索引化，微觀規格下沉至 task-protocol 與 token-saver。
- [2026-10-20] [Phase 3] 自動化審計 Exit 0 通過，全域 SSOT 閉環收斂結案。
