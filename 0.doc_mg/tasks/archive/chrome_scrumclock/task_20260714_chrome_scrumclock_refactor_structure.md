---
title: "優化 chrome_scrumclock 資料夾檔案結構"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-14"
deadline: "2026-07-15"
---

## 1. 目標
本任務的核心目標是優化 `chrome_scrumclock` 插件的資料夾結構與模組組織，解決 HTML 檔案散落根目錄、部分頁面（Popup/Options）使用 Vanilla TS 與 React 混用導致的技術分裂與重複程式碼，以及清空/理順空資料夾（如 `src/utils`）等問題。

## 2. 策略與鎖定檔案
1. **多入口物理聚合 (Co-location)**：將散落於根目錄的頁面 HTML（`index.html`、`options.html`、`popup.html`）搬移至各自的 entry 資料夾中。
2. **重構入口結構**：
   - `index.html` 移至 `src/entries/newtab/index.html`，對應 React 入口 `src/entries/newtab/main.tsx`。
   - `popup.html` 移至 `src/entries/popup/index.html`，對應 React 入口 `src/entries/popup/main.tsx`。
   - `options.html` 移至 `src/entries/options/index.html`，對應 React 入口 `src/entries/options/main.tsx`。
3. **技術棧統一**：將 Popup 與 Options 頁面改用 React 重構，與 New Tab 共享同一個 TailwindCSS 設定與 UI 設計系統。
4. **清理與優化 Vite 設定**：更新 `vite.config.ts` 以符合新的多頁面路徑設定。

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\vite.config.ts`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\index.html`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\popup.html`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\options.html`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\entries\newtab.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\entries\popup.ts`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\entries\options.ts`

## 3. 任務拆解

### Phase 1: 結構優化方案規劃 狀態：`[已完成]`

### Phase 2: 檔案遷移與建置設定更新 狀態：`[已完成]`

### Phase 3: 統一 React 化重構（可選或分步） 狀態：`[已完成]`

## 4. 影響評估
- **Vite 建置設定**：Vite 的輸入路徑會發生改變，需要仔細修改並驗證 `npm run build`。
- **Manifest.json**：`manifest.json` 中配置的 `chrome_url_overrides.newtab`、`options_page`、`browser_action.default_popup` 必須對應到 build 出來的路徑（如果是 Vite 打包，outDir 為 `dist`，且 output.entryFileNames 為 `[name].js`，這部分需要確認 Vite 如何處理多頁面的 HTML 生成）。
  * 註：當 Vite build 多入口 HTML 時，HTML 會在 outDir 下根據原路徑生成（例如 `dist/src/entries/newtab/index.html`，這會導致 Manifest 路徑變得很長。解決方案是將 HTML 保持在根目錄，或者利用 Vite 插件或特殊的 `rollupOptions` 配置。這需要在實作計畫中詳細評估）。

## 5. 驗收標準
- [x] **技術指標**: 所有頁面（New Tab、Popup、Options）的 HTML 被移出根目錄，根目錄保持乾淨。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，Manifest 內的各入口 HTML 路徑配置正確。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: 執行 `npm run build` 後能成功產出 `dist`，且載入 Chrome 後能正常開啟 New Tab、Popup、Options。

## 6. AI 簽到區
- [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-14] ID: 04705001-6d97-4470-9087-bf3cddfec770 (初始化)
