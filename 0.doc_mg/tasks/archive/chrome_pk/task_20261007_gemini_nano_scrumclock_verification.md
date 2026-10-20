---
title: "測試驗證 chrome_gemini_nano 在 chrome_scrumclock 的整合調用"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-07"
deadline: "2026-10-07"
---

## 1. 目標
建立完整測試驗證計畫與自動化/手動驗證流程，確保 `chrome_gemini_nano` 的功能（包含本地 Prompt API 推論管線與跨插件訊息契約）在 `chrome_scrumclock` 整合中被正確調用、具有嚴密的防禦性降級（Fallback）機制，並確保呼叫完成後釋放 Session 資源。

## 2. 策略與鎖定檔案
採「分層驗證策略」：
1. **單元與 Mock 測試層**：隔離真實 Chrome 環境，驗證 `ai-helper.ts`、`DailyMissionBriefing.tsx`、`TaskDetailDrawer.tsx` 在不同 Nano 狀態（可用、下載中、未支援、超時）下的調用參數與降級處理。
2. **跨插件契約層 (Black-box Contract)**：依據 `cross_plugin_contract.md` 規範，驗證發送至 `chrome_gemini_nano` 的 Message Action 與 Payload 符合規格，且未知欄位與通訊異常被妥善攔截。
3. **實機 E2E 聯調層**：載入解包擴充套件，在具備 Chrome 內建 AI (Optimization Guide) 的環境下執行真實推論與生命週期檢查（`session.destroy()`）。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/utils/ai-helper.ts`
- `./chrome_scrumclock/src/shared/messaging/outboxQueue.ts`
- `./chrome_scrumclock/src/background/externalService.ts`
- `./chrome_scrumclock/tests/nano-mock-eval.ts`
- `./chrome_scrumclock/tests/contract-cross-plugin-eval.ts`
- `./chrome_scrumclock/tests/e2e-nano-live-eval.ts`
- `./chrome_gemini_nano/src/services/nanoService.ts`
- `./0.doc_mg/docs/cross_plugin_contract.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/gemini-nano-core/SKILL.md` (整合調用規範)
- [x] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md` (新增 Gemini Nano 驗證指引)
- [x] L3 業務規格：`./chrome_gemini_nano/docs/gemini_nano_spec.md` (通訊協議與測試驗證說明)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 測試規範制定與 Mock 測試工模建立 狀態：`[已完成]`

### Phase 2: 跨插件訊息通訊與容錯驗證 狀態：`[已完成]`

### Phase 3: 真機 Chrome 雙插件聯調與資源生命週期驗證 狀態：`[已完成]`

## 4. 影響評估
- 本規劃主要針對測試與驗證體系，不破壞既有 ScrumClock 的計時器與專注工作區核心功能。
- 需確保測試 Mock 不會打包進入正式生產環境的 `dist/`。
- 跨插件訊息通訊完全符合黑盒契約，維持兩插件 100% 獨立編譯與獨立運行。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼（通訊除錯日誌嚴格受 `isDevMode()` 保護，Production 靜默）。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環（二選一）**:
  - [ ] [N/A] 輕量任務豁免（無結構變動，L1~L3 免比對免回寫）
  - [x] 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-07 ID: 53cb106b-c3e1-4d93-bd4e-e3866384fddb (初始化)
> - 2026-10-07 ID: f63a6af8-cd05-4bc0-b2e9-fc022ebbf640 (Phase 1 執行完成)
> - 2026-10-07 ID: 2150cb58-e8bd-42a9-86c7-2b0dd9cb91d4 (Phase 2 執行完成)
> - 2026-10-07 ID: 21dda6bb-b739-4f2b-b8a3-b9ceecac0097 (Phase 3 執行完成並結案歸檔)
>
> **任務結案歸檔 (Task Completed)**:
> 本任務所有 Phase 與 SSOT 回寫已全數驗收完成，任務文件已依歸檔協議移至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
