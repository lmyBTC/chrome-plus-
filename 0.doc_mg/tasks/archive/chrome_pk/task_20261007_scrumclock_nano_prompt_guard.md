---
title: "ScrumClock 端側小模型預定路線防崩潰腳本引擎整合 (NanoPromptGuard)"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-07"
deadline: "2026-10-07"
---

## 1. 目標
針對端側小模型 (Gemini Nano 1.8B~3B) 在極短輸入（< 20 字元）下容易出現機率坍縮、只回傳單一標點（如「。」）或 Emoji（如「🥰」）等退化現象，將 `0.doc_mg/draft/` 下的預定路線防崩潰腳本引擎整合至 `chrome_scrumclock`。透過四層防禦體系（饑餓偵測層、Few-shot 錨定路線、輸出退化審查防線、瞬時 Fallback 兜底），徹底保障專案管理各 AI 場景（收件匣分類、任務原子拆解、日終戰報彙總、心流 WIP 衝突審查）的高品質與零崩潰體驗。

## 2. 策略與鎖定檔案
- **四層防禦中介化**：於 `chrome_scrumclock/src/core/ai/` 建立 `nanoPromptGuard.ts` 單例服務，實現字數長度快篩、英文骨架 + 繁中 Few-shot 注入、正則退化檢測與瞬時 Fallback。
- **無縫掛載調度**：重構 `chrome_scrumclock/src/features/project-management/services/taskAIEngine.ts`，全面對接 `NanoPromptGuard`，並擴充 `analyzeWIPConflict` 心流衝突審查能力。
- **自治隔離原則**：完全恪守跨插件黑盒防禦契約，在 ScrumClock 獨立閉環編譯，零跨目錄依賴。

### 鎖定檔案 (Target Files)
- `./0.doc_mg/draft/archive/Gemini Nano 預定路線防崩潰腳本引擎/nanoPromptGuard.ts` (來源草稿)
- `./0.doc_mg/draft/archive/Gemini Nano 預定路線防崩潰腳本引擎/整合防崩潰腳本至專案管理AI引擎.ts` (來源草稿)
- `./chrome_scrumclock/src/core/ai/nanoPromptGuard.ts` (新建防崩潰核心元件)
- `./chrome_scrumclock/src/features/project-management/services/taskAIEngine.ts` (整合與防護重構)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md` (登錄 NanoPromptGuard 元件職責與 taskAIEngine 防退化協議)
- [x] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md` (更新 core/ai 模組速查與防崩潰機制架構)
- [x] L3 業務規格：`./chrome_scrumclock/docs/web-ai-guard-spec.md` (四層防禦協議與 Fallback 規則規格)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 移植並建立 NanoPromptGuard 核心服務 狀態：`[已完成]`
- [x] 任務 1.1: 建立防崩潰引擎型別與骨架
    - [x] 建立 `./chrome_scrumclock/src/core/ai/nanoPromptGuard.ts`
    - [x] 定義 `TaskScenario` (含 TASK_DECOMPOSITION, PROGRESS_SUMMARY, INBOX_TRIAGE, WIP_CONFLICT_CHECK 等) 與路由介面
- [x] 任務 1.2: 實現四層防護核心邏輯
    - [x] 實作饑餓偵測器 `isInputStarved`（閾值 20 字元，自動注入工程引導指引）
    - [x] 實作英文 System Prompt + 繁體中文 Few-shot 錨定路線構造器
    - [x] 實作輸出退化審查器 `isOutputDegraded`（正則檢查長度 <= 3 或純標點/Emoji）與瞬時 Fallback 生成

### Phase 2: 升級 TaskAIEngine 整合防護層與 WIP 審查 狀態：`[已完成]`
- [x] 任務 2.1: 整合 NanoPromptGuard 至既有業務方法
    - [x] 更新 `triageInboxItems` 引入防崩潰路線與 Fallback 兜底
    - [x] 更新 `decomposeTask` 引入防崩潰路線與 Fallback 兜底
    - [x] 更新 `generateDailyReviewSummary` 引入防退化過濾
- [x] 任務 2.2: 擴充心流衝突審查功能
    - [x] 於 `taskAIEngine.ts` 新增 `analyzeWIPConflict(currentTask, candidateTask)`
    - [x] 導出 `WIPConflictAnalysis` 型別供 UI 與 Kanban 呼叫

### Phase 3: 編譯驗證與四層 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 3.1: 專案編譯與型別檢查
    - [x] 於 `chrome_scrumclock` 執行 Vite build / tsc 驗證 0 型別報錯
- [x] 任務 3.2: 4-Tier SSOT 閉環回寫
    - [x] 回寫 L1: `./.agents/skills/scrumclock-core/SKILL.md`
    - [x] 回寫 L2: `./chrome_scrumclock/SCRUMCLOCK_README.md`
    - [x] 回寫 L3: `./chrome_scrumclock/docs/web-ai-guard-spec.md`
    - [x] 執行 L4: 移動任務檔案至 `0.doc_mg/tasks/archive/chrome_scrumclock/`

## 4. 影響評估
- **架構相容性**：NanoPromptGuard 為前端純運算與 Prompt 組裝服務，不更動 WebAIGateway 之底層 API 呼叫介面，向下相容原有介面。
- **容錯韌性**：當端側 Gemini Nano 回應異常或模型坍縮時，UI 將直接獲得三段式結構化 Fallback 資料，大幅降低使用者操作中斷率。
- **儲存與權限**：無新增 Chrome API 權限或 Storage Schema 破壞性變更。

## 5. 驗收標準
- [x] **技術指標**: NanoPromptGuard 正確攔截小於 20 字元的飢餓輸入，且在輸出異常時 0 延遲返回 Fallback。
- [x] **核心規範**: 符合 Chrome MV3 安全規範與專案獨立自治原則，無跨插件引用。
- [x] **除錯清理**: 已確認移除所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 完成 L1~L3 骨架回寫，並於結案時將任務歸檔至 L4 目錄。
- [x] **插件驗證**: 執行 `npm run build` 確認打包成功無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-07 ID: 5df3abb6-5a13-417d-ae0d-2e3b7d2983fb (Gate 1 初始化)
> - 2026-10-07 ID: 70a8bfbd-c625-4f1a-9430-5d4f6c028e21 (Phase 1 核心實作完成)
> - 2026-10-07 ID: 8c9db253-7b3a-46a6-a56a-9eefeb26e219 (Phase 2 TaskAIEngine 整合與防退化完成)
> - 2026-10-07 ID: 626509e6-e236-4f38-b9cf-29ca1041734f (Phase 3 驗證與四層 SSOT 閉環完成)
>
> **任務狀態**: 全案已結案封存。
