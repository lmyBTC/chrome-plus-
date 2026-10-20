---
title: "Scrumclock Copilot 移轉至 Gemini Nano 本地模型"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-15"
deadline: "2026-07-15"
---

## 1. 目標
將 Scrumclock Copilot 側邊欄助理由使用遠端 Gemini 1.5 Flash API (需要 API Key) 改為使用完全本地端、免聯網、零延遲的 Chrome 內建 Gemini Nano (Prompt API)，同時更新 UI 文字與狀態指示。

## 2. 策略與鎖定檔案
- 移除 AISidebar 對 `geminiService` 的依賴。
- 引入對 `window.ai.languageModel` 的存取與會話管理（`aiSessionRef`）。
- 加入本地 AI 可用性狀態檢測，當本地無 Nano模型時，在側邊欄顯示引導使用者開啟 `chrome://flags` 的警告區塊。
- 更新 UI 的副標題，將其從 "Gemini 1.5 Flash 驅動" 改為 "Gemini Nano 驅動"。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/features/ai-sidebar/components/AISidebar.tsx`
- `./chrome_scrumclock/public/manifest.json`

## 3. 任務拆解

### Phase 1: 規劃與設計 狀態：`[已完成]`
### Phase 2: 程式碼實作與除錯 狀態：`[已完成]`
### Phase 3: 驗收與測試 狀態：`[已完成]`

## 4. 影響評估
- 本次修改會使側邊欄助理不再需要外部 API 金鑰，完全本地化運行。不影響其他 background 服務或 message passing。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。（本次無 Content Script 注入）
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件，確認各項功能正常無報錯。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-15] ID: 63490caf-f1e5-4bed-a243-819bc7170e90 (已完成)
