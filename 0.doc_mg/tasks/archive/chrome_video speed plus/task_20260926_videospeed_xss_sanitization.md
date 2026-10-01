---
title: "VideoSpeedPlus innerHTML 與 XSS 安全防護優化"
plugin: "chrome_video speed plus"
status: "已完成"
created: "2026-09-26"
deadline: "2026-09-30"
---

## 1. 目標
針對 Manifest 審計工具所標記之 `chrome_video speed plus` 程式碼安全性警告進行修復：
1. 替換或消毒 `chrome_video speed plus/content.js`（行 489, 583, 981, 1127, 1129, 1137, 1140, 1144, 1147, 1153, 1156）之 `.innerHTML` 賦值。
2. 替換或消毒 `chrome_video speed plus/popup.js`（行 229, 230, 236, 239, 243）之 `.innerHTML` 賦值。
3. 採用 `.textContent` 或安全的 DOM 節點建立方式，消除 XSS 潛在風險並符合 Chrome Extension 安全審查。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./chrome_video speed plus/content.js`
- `./chrome_video speed plus/popup.js`

## 3. 任務拆解

### Phase 1: content.js 安全性重構 狀態：`[已完成]`
- [x] 任務 1.1: 重構快捷鍵提示與指示器 DOM 建立
    - [x] 將字串拼接 innerHTML 改為 `createElement` 與 `textContent`。

### Phase 2: popup.js 安全性重構與驗證 狀態：`[已完成]`
- [x] 任務 2.1: 重構彈出選單 DOM 建立
    - [x] 清理 popup 內部動態產生的 DOM 元素。
- [x] 任務 2.2: 審計工具驗證
    - [x] 執行 `python 0.doc_mg/tools/audit_manifests.py` 確認 `chrome_video speed plus` 警告歸零。

## 4. 影響評估
- 本修改僅調整 DOM 操作方式，確保倍速控制器懸浮層與 Shadow DOM 內元件渲染正常。
- 不影響按鍵監聽與影片倍速控制核心功能。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 文件同步**: 若架構、模組清單或接口有變動，已同步回寫並更新該插件專屬 SSOT 文件。
- [x] **插件驗證**: `python 0.doc_mg/tools/audit_manifests.py` 審計無警告，倍速控制器功能運作正常。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: c615df2f-4854-48bd-a4dc-ac1684699c4d (建立專項藍圖)
> - 2026-09-26 ID: 0cfb3b3c-6001-46b5-9582-745e30a8c5e3 (執行 Phase 1 與 Phase 2 重構並全數通過審計)
>
> **結案狀態**:
> 所有 innerHTML 警告已全數消除，四大插件 Manifest V3 與程式碼安全性審計 100% 通過。
