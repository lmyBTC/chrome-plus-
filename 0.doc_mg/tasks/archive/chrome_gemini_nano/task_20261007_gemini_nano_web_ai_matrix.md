---
title: "Chrome 130+ 專用 Web AI API 矩陣並行實裝與整合"
plugin: "chrome_gemini_nano"
status: "已結案"
created: "2026-10-07"
deadline: "2026-10-08"
---

## 1. 目標
解耦通用 `ai.languageModel`（Prompt API）單點過載與 Markdown 雜訊問題，全面接入 Chrome 130+ 原生專屬蒸餾小模型 API（`ai.summarizer`、`ai.writer`、`ai.rewriter`、`translation`），構建多 API 路由閘道（Web AI Gateway），降低延遲 50%+ 並減少顯存佔用；同時升級 `ToneShifter` 與 `SocialDispatcher`，對齊跨插件通訊契約。

## 2. 策略與鎖定檔案

### 策略概述
1. **專用優先 (Specialized First)**：優先調度專用小模型 API，原生掌控 tone、format、length 與語言配對。
2. **透明降級 (Prompt API Fallback)**：當專用 API 狀態為 `'no'` 或不支援時，自動 Fallback 回 `NanoService`（Prompt API），外部零感知。
3. **會話生命週期防護**：各 Adapter 實體獨立緩存，提供統一釋放機制防止 VRAM 洩漏。
4. **模組解耦與黑盒契約**：核心落於 `chrome_gemini_nano`，跨插件協同遵循 `cross_plugin_contract.md`。

### 鎖定檔案 (Target Files)
- `chrome_gemini_nano/src/services/webAIGateway.ts`
- `chrome_gemini_nano/src/services/adapters/summarizerAdapter.ts`
- `chrome_gemini_nano/src/services/adapters/writerAdapter.ts`
- `chrome_gemini_nano/src/services/adapters/rewriterAdapter.ts`
- `chrome_gemini_nano/src/services/adapters/translatorAdapter.ts`
- `chrome_gemini_nano/src/services/toneShifter.ts`
- `chrome_gemini_nano/src/components/SocialDispatcher.tsx`
- `chrome_gemini_nano/src/index.ts`
- `0.doc_mg/docs/cross_plugin_contract.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`.agents/skills/gemini-nano-core/SKILL.md` (增補 WebAIGateway、專用 Adapters 與能力矩陣架構索引)
- [x] L2 插件導航：`chrome_gemini_nano/chrome_gemini_nano_README.md` (更新專用 Web AI 模組矩陣與入口導覽)
- [x] L3 業務規格：`0.doc_mg/docs/cross_plugin_contract.md` (更新 v2.2 Web AI 矩陣跨插件調度協議)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/gemini-nano/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 基礎適配層與能力檢測 (Gateway & Core Architecture) 狀態：`[已完成]`
- [x] 任務 1.1: 建立專用 Adapter 目錄與型別定義
    - [x] 建立 `chrome_gemini_nano/src/services/adapters/` 目錄
    - [x] 定義 `WebAIMatrixCapabilities`、`WebAIAvailability` 與各 Adapter Options 共通型別
- [x] 任務 1.2: 實作 `WebAIGateway` 中樞路由閘道
    - [x] 整合單例模式與 `capabilities()` 動態探測（探測 `ai.languageModel`, `ai.summarizer`, `ai.writer`, `ai.rewriter`, `translation`）
    - [x] 提供 `destroyAll()` 統一記憶體釋放方法
- [x] 任務 1.3: 更新 `chrome_gemini_nano/src/index.ts` 匯出 Gateway 與型別

### Phase 2: 專用模型適配器實作 (Adapter Implementations) 狀態：`[已完成]`
- [x] 任務 2.1: 實作 `summarizerAdapter.ts`
    - [x] 封裝 `ai.summarizer` 原生能力，支援 key-points、tl;dr、teaser、headline
    - [x] 實作 `NanoService` Prompt Fallback 降級分支
- [x] 任務 2.2: 實作 `writerAdapter.ts`
    - [x] 封裝 `ai.writer` 原生能力，支援 formal/neutral/casual、format 與 length
    - [x] 實作 `NanoService` Prompt Fallback 降級分支
- [x] 任務 2.3: 實作 `rewriterAdapter.ts`
    - [x] 封裝 `ai.rewriter` 原生能力，支援 tone、format、length 與 sharedContext
    - [x] 實作 `NanoService` Prompt Fallback 降級分支
- [x] 任務 2.4: 實作 `translatorAdapter.ts`
    - [x] 封裝 `translation.createTranslator` 神經離線翻譯
    - [x] 支援語言對動態切換與 `NanoService` 降級翻譯

### Phase 3: 既有業務模組升級與通訊契約對齊 (Feature Integration & SSOT) 狀態：`[已完成]`
- [x] 任務 3.1: 升級 `toneShifter.ts`
    - [x] 引入 `RewriterAdapter`，重構 4 大算子（觀點銳化、壓線 280、在地去油、金句提煉），移除冗長手寫 Prompt
- [x] 任務 3.2: 升級 `SocialDispatcher.tsx`
    - [x] 引入 `WebAIGateway`，將貼文初稿與摘要分流至專用小模型
- [x] 任務 3.3: 對齊跨插件通訊契約 `cross_plugin_contract.md`
    - [x] 註記 Web AI 矩陣並行調度與 Fallback 規則
- [x] 任務 3.4: 執行四層 SSOT 閉環與結案歸檔
    - [x] 回寫 L1 `gemini-nano-core/SKILL.md`
    - [x] 回寫 L2 `chrome_gemini_nano/chrome_gemini_nano_README.md`
    - [x] 回寫 L3 `0.doc_mg/docs/cross_plugin_contract.md`
    - [x] 歸檔 L4 移至 `0.doc_mg/tasks/archive/gemini-nano/`

## 4. 影響評估
- **模型可用性安全**: 原生 API 僅在支援環境 (Chrome 130+) 具備，若環境未就緒自動回退 Prompt API，確保完全向後相容。
- **記憶體與效能**: 專屬小模型延遲較低、消耗顯存較少；統一 Gateway 提供 `destroyAll()` 保證會話不會遺留洩漏。
- **跨插件相容性**: 不破壞既有 `chrome.runtime.sendMessage` 資料結構與協定。

## 5. 驗收標準
- [x] **技術指標**: 所有專用 API 具備完整可用性探測與 `NanoService` Fallback 保障。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範與 TypeScript 型別安全檢查無報錯。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 完成 L1~L3 骨架回寫，且不含冗餘代碼。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/gemini-nano/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-07 ID: 89c48b64-bf1c-4684-a61b-1ec4f09189e5 (初始化)
> - 2026-10-07 ID: c9e7d635-c1bf-451c-9639-d2d6791776ab (Phase 1 執行完成)
> - 2026-10-07 ID: 53e4de0d-69fc-4a45-916a-206dc5df8e7e (Phase 2 執行完成)
> - 2026-10-07 ID: 283af153-db83-490f-a0fe-f642dc437dc1 (Phase 3 執行完成與結案歸檔)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261007_gemini_nano_web_ai_matrix.md，開始執行 Phase 3
> ```
