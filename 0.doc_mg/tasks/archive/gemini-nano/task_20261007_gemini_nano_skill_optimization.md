---
title: "優化 GeminiNano 專家技能與跨插件 AI 規格字典"
plugin: "chrome_gemini_nano"
status: "已完成"
created: "2026-10-07"
deadline: "2026-10-07"
---

## 1. 目標

優化 `.agents/skills/gemini-nano-core/SKILL.md`，使其精準對齊近期完成之 Web AI 矩陣能力（`WebAIGateway`、Prompt API、專用模型適配器）與跨插件契約（Task AI / Social Dispatcher），並維持 ≤ 50 行之極致精簡 Token 骨架字典。

核心指標：
- **觸發詞完善**：補齊 `web ai`、`ai.writer`、`ai.summarizer`、`ai.rewriter` 等關鍵字，提升專家技能自動命中率。
- **雙軌 API 規範化**：明確記錄 Chrome 131+ / 138+ 命名演進 (`window.ai` vs `ai.languageModel`)。
- **跨插件契約對齊**：補充與 `chrome_scrumclock` 及跨插件契約（`cross_plugin_contract.md`）之任務分析/社群廣播能力標記。
- **VRAM 併發與生命週期底線**：收斂 Single-Flight 隊列與 `session.destroy()` 強制釋放規則。
- **Token 瘦身守則**：嚴格維持純索引骨架，絕不貼入長篇代碼或易變行數。

## 2. 策略與鎖定檔案

採用精準骨架增強策略，在不增加過多上下文 Token 負擔的前提下，對 `.agents/skills/gemini-nano-core/SKILL.md` 進行局部內容修訂與校準。

### 鎖定檔案 (Target Files)
- `./.agents/skills/gemini-nano-core/SKILL.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [x] L1 專家技能：`./.agents/skills/gemini-nano-core/SKILL.md` (已完成精準校準)
- [ ] L2 插件導航：`./chrome_gemini_nano/chrome_gemini_nano_README.md` (架構維持一致)
- [ ] L3 業務規格：`./chrome_gemini_nano/docs/gemini_nano_spec.md` (規格維持一致)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/gemini-nano/` (已完成封存歸檔)

## 3. 任務拆解

### Phase 1: 技能檔規格精準優化與校準 狀態：`[已完成]`

## 4. 影響評估
- 本任務僅調整 AI Agent 專家技能設定檔（`.agents/skills/gemini-nano-core/SKILL.md`），不修改任何插件前端或後端原始碼。
- 零執行期副作用，無擴充功能相容性風險。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 與 Web AI API 規範。
- [x] **除錯清理**: 無任何測試除錯註解或冗餘文本。
- [x] **檔案編碼**: 確認以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: L1 專家技能更新完畢，全檔 39 行符合 ≤ 50 行骨架標準。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/gemini-nano/`。
- [x] **插件驗證**: 外掛運行零風險。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-10-07] ID: 286faf14-4262-4780-b2c1-0893bf16b93e (初始化與結案)
