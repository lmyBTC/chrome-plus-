---
title: "ScrumClock innerHTML 與 XSS 安全防護優化"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-09-26"
deadline: "2026-09-30"
---

## 1. 目標
針對 Manifest 審計工具所標記之 `chrome_scrumclock` 程式碼安全性警告進行修復：
1. 替換或消毒 `chrome_scrumclock/src/content.ts`（行 40）之 `.innerHTML` 賦值。
2. 替換或消毒 `chrome_scrumclock/src/geminiContent.ts`（行 66, 360）之 `.innerHTML` 賦值。
3. 採用 `.textContent`、原生 DOM 節點建立或安全消毒庫（如 DOMPurify），徹底杜絕 XSS 風險並符合 Web Store 安全上架規範。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/content.ts`
- `./chrome_scrumclock/src/geminiContent.ts`

## 3. 任務拆解

### Phase 1: 程式碼安全性重構與替換 狀態：`[已完成]`
- [x] 任務 1.1: 修復 `content.ts` 的 `.innerHTML` 調用
    - [x] 定位第 40 行之賦值邏輯，改用原生 DOM 節點建立，徹底杜絕 XSS 風險。
- [x] 任務 1.2: 修復 `geminiContent.ts` 的 `.innerHTML` 調用
    - [x] 定位第 66 與 360 行之賦值邏輯，加入 `getSanitizedHtml` 清理危險標籤與屬性，面板改用原生 DOM/SVG API 構建。
- [x] 任務 1.3: 重新建置與審計驗證
    - [x] 執行 `npm run build` 確認 TypeScript 型別與建置無誤。
    - [x] 執行 `python 0.doc_mg/tools/audit_manifests.py` 確認 `chrome_scrumclock` 警告歸零。

## 4. 影響評估
- 本修改僅調整 DOM 寫入安全性，不改變原有的 UI 排版與 Gemini 側邊欄互動行為。
- 不影響 Chrome Extension 權限與 Service Worker 通訊架構。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 文件同步**: 本次為純內部安全性重構，無架構與對外接口變動。
- [x] **插件驗證**: `python 0.doc_mg/tools/audit_manifests.py` 審計無警告，且建置測試通過。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: c615df2f-4854-48bd-a4dc-ac1684699c4d (建立專項藍圖)
> - 2026-09-26 ID: 5abaf9ec-b0ee-45c5-8a9e-02e1fa53b00f (執行 Phase 1 重構、建置與驗證結案)

