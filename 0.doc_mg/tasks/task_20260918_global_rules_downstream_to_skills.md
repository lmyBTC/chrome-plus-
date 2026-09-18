---
title: "優化 .agents/rules.md 保持精簡與功能下沉至 Skills"
plugin: "global"
status: "已完成"
created: "2026-09-18"
deadline: "2026-09-18"
---

## 1. 目標
將專案執行規則索引 `.agents/rules.md` 大幅瘦身精簡為「架構與守門指針」，將繁重的具體操作手冊、Gate 協議細節、Token 節省操作、審計工作流與邊界技術全面下沉至 `.agents/skills/` 各專屬技能中維護，以降低每輪對話的 Context 基礎載入負擔，達成極簡最短。

## 2. 策略與鎖定檔案

### 策略
1. **.agents/rules.md 瘦身為精準指針**：
   - 保留緊湊版「專家技能索引表 (Skill Tree)」，作為 Agent 技能動態調度的唯一入口。
   - 保留三階段守門 (3-Gate Protocol) 高階定義與門禁邊界，具體操作細則下沉至 `task-protocol` 技能。
   - 保留多插件隔離與邊界防禦的核心原則（視野隔離、黑盒契約），細節交由各插件 Core Spec 技能與契約文檔承接。
   - 移除在 rules.md 內重複贅述的具體 CLI 指令、細部代碼範例與審計步驟，改以超連結指向技能文件。
2. **功能型技能承接與補充 (Skills SSOT Enhancement)**：
   - 確保 `task-protocol/SKILL.md` 包含完整的 3-Gate 細則、會話接力、探勘硬窄化與動態收斂規範。
   - 確保 `token-saver/SKILL.md` 涵蓋局部讀取、精準寫入與終端 RTK 規範。
   - 確保 `chrome-auditor/SKILL.md` 與 `dev-standards/SKILL.md` 涵蓋自動化審計與 MV3/CSP 防禦步驟。
3. **無縫兼容性與工作區相對路徑**：
   - 所有 Markdown 超連結一律維持 `./.agents/...` 與 `./0.doc_mg/...`，嚴禁本機絕對路徑。

### 鎖定檔案 (Target Files)
- `./.agents/rules.md`
- `./.agents/skills/task-protocol/SKILL.md`
- `./.agents/skills/token-saver/SKILL.md`

## 3. 任務拆解

### Phase 1: 盤點與技能承接補充 狀態：`[已完成]`

### Phase 2: rules.md 結構重組與精簡瘦身 狀態：`[已完成]`

### Phase 3: 驗證與相對路徑審查 狀態：`[已完成]`

## 4. 影響評估
- 本改動專注於 Agent 規範與技能配置層面，完全不改動各 Chrome 插件源碼與執行邏輯。
- 將顯著減輕對話載入 `rules.md` 時所消耗的 Token 數量，並提升功能型任務的模組化維護效率。

## 5. 驗收標準
- [x] **極簡性**: `.agents/rules.md` 行數顯著下降，僅保留核心架構與導航指針。
- [x] **完整性**: 所有原先的功能性細則（3-Gate 細則、RTK 終端優化、審計流程、局部讀寫）皆有專屬 Skill 承接，無規範丟失。
- [x] **路徑合規**: 全檔無任何本機絕對路徑，100% 採用工作區相對路徑。
- [x] **無殘留註解**: 任務文件無任何說明性 HTML 註解。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-18 ID: 718d3c64-e29d-49f0-8fad-e70cbc3f8393 (Gate 1 藍圖建立)
> - 2026-09-18 ID: 70f151b7-36b4-4d6a-8af3-0c2a5b2e1be6 (Phase 1~3 執行與驗證完成)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20260918_global_rules_downstream_to_skills.md，開始執行 Phase 1
> ```
