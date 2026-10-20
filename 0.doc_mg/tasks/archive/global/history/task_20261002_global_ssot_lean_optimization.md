---
title: "SSOT 閉環協議與 RULES/SKILLS 輕量化瘦身方案"
plugin: "global"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-03"
---

# 任務規劃：SSOT 閉環協議與 RULES/SKILLS 輕量化瘦身方案

## 1. 痛點剖析 (Root Causes of Token Waste)
審查 `0.doc_mg/tasks/archive/global/task_20261002_global_ssot_closed_loop_protocol.md` 與現行配置後，確認導致 Token 膨脹與認知過載的主因如下：

1. **「全量無差別」閉環門檻過低**：
   - 任何小修補、CSS 顏色調整、單一文字修改，若強制走完 L1~L4 審核與比對，每輪會話會額外呼叫 3~4 次 `view_file`，多耗費 3,000~6,000 Tokens。
2. **Rules 頂層條文缺乏分級說明**：
   - `.agents/rules.md` 與 `GEMINI.md` 的閉環字眼看似「每次結案皆必做」，使 Agent 產生每步都要比對的強迫症。
3. **SKILL.md 寫入過多「血肉」**：
   - 現有 `scrumclock-core/SKILL.md` 等字典記載了過多非必要的行數（如 412 行、194 行等易過時資訊）與重複敘述，失去了純粹「索引（Index）」的乾淨度。

---

## 2. 瘦身方案核心策略 (Lean Architecture)

### 策略 A：按需分級觸發 (Tiered Trigger - 90/10 法則)
- **90% 輕量任務（豁免閉環）**：
  - 單純 UI 樣式、CSS 微調、文案修改、Bugfix 修復、內部私有邏輯重構。
  - **處置**：L1/L2/L3 標註 `[N/A]`，結案時只做 L4（搬移 task.md 歸檔），零讀取零回寫。
- **10% 重大架構任務（強制精準閉環）**：
  - 僅當「新增/刪除元件檔案」、「修改 Storage Schema / 資料模型」、「新增/改動跨插件通訊接口」時，才觸發回寫。

### 策略 B：SKILL.md 轉型為「純骨架索引 (Thin Skeleton Index)」
- 刪除過度具體的實現細節（例如程式碼行數 `(412 行)`、內部臨時變數）。
- 嚴格控制各插件 `SKILL.md` 總行數在 **100 行以內**。
- 只保留三項核心資產：
  1. **進入點與路由清單**
  2. **元件索引 (路徑 + 一句話職責)**
  3. **資料模型與 Storage Key 命名**

### 策略 C：模板與規範精簡化 (Template & Rules Pruning)
- **修改 `task_template_v2.md`**：明確標註「若無變更直接勾選 [N/A]」，結案無需強行讀取所有 SSOT 比對。
- **修改 `.agents/rules.md` 與 `GEMINI.md`**：明確定義「重大變更門檻」，加入「免閉環豁免條件」。

---

## 3. 預期效益 (ROI)
- **常駐 System/Rules Token**：無額外膨脹，維持在 50 行以內的極簡架構。
- **單一任務結案 Token 開銷**：
  - 輕量任務：結案消耗從原本 4,000+ Tokens 降至 **< 200 Tokens**（直接打勾封存）。
  - 重大任務：維持在約 1,000 Tokens（精準定位替換）。
- **後續開發收益**：後續會話依然享有最新元件導航，徹底避免盲目掃描原始碼（每次省 5,000~10,000 Tokens）。

---

## 4. 任務拆解 (Phases)

### Phase 1: 憲法與規範瘦身（明確劃分 90/10 門檻） 狀態：`[已完成]`
- [x] 任務 1.1: 更新 `GEMINI.md` 核心憲法底線，明確載明「輕量改動豁免閉環，僅重大結構變更觸發」。
- [x] 任務 1.2: 更新 `.agents/rules.md` 中的「四層 SSOT 閉環義務」，加入「90% 輕量任務豁免原則」。

### Phase 2: 模板調優（簡化驗收與前置宣告負擔） 狀態：`[已完成]`
- [x] 任務 2.1: 更新 `0.doc_mg/task_template_v2.md`，允許 `[N/A] 輕量變更豁免`，避免每次被強制比對。
- [x] 任務 2.2: 同步更新 `.agents/skills/task-protocol/SKILL.md`。

### Phase 3: 技能字典純骨架化（去除冗餘血肉資訊） 狀態：`[已完成]`
- [x] 任務 3.1: 盤點並瘦身 `scrumclock-core/SKILL.md`，移除易過時行數資訊，只保留核心索引（壓在 100 行以內）。

---

## 5. 驗收標準
- [x] `rules.md` 條文不增反減，邏輯清晰界定重大與輕量邊界。
- [x] `task_template_v2.md` 讓輕量任務能以最少步驟結案。
- [x] `SKILL.md` 轉為乾淨的骨架索引，載入 Token 損耗降低 30%~50%。
- [x] **SSOT 閉環**:
  - [x] 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/global/`。
