---
title: "優化 chrome_scrumclock 命名名稱為 Power Kit (PK+)"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-16"
deadline: "2026-07-16"
---

## 1. 目標
優化 chrome_scrumclock 的 UI 名稱，將主要名稱改為 Power Kit，頁面縮寫改為 PK+，以提升品牌感。

## 2. 策略與鎖定檔案
- 修改 manifest.json 及安裝腳本中的主要名稱。
- 修改各頁面的 Title 為頁面縮寫。
- 修改側欄左上角與 AI 助理、說明文檔中的 ScrumClock / 每日循環儀表板為 PK+ 或 Power Kit。
- 保持資料庫 key 與 DOM ID 不變，以維持相容性。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/public/manifest.json`
- `./chrome_scrumclock/install.bat`
- `./chrome_scrumclock/src/core/layout/Sidebar.tsx`
- `./chrome_scrumclock/src/entries/newtab/index.html`
- `./chrome_scrumclock/src/entries/options/index.html`
- `./chrome_scrumclock/src/entries/popup/index.html`
- `./chrome_scrumclock/src/entries/sidebar/index.html`
- `./chrome_scrumclock/src/entries/popup/main.tsx`
- `./chrome_scrumclock/src/background.ts`
- `./chrome_scrumclock/src/geminiContent.ts`
- `./chrome_scrumclock/src/entries/sidebar/main.tsx`
- `./chrome_scrumclock/src/components/InstallDocs.tsx`
- `./chrome_scrumclock/src/features/project-management/components/ProjectManagementDemo.tsx`
- `./chrome_scrumclock/src/features/analytics/components/AnalyticsDashboard.tsx`
- `./chrome_scrumclock/src/features/ai-sidebar/components/AISidebar.tsx`
- `./chrome_scrumclock/public/blocked.html`
- `./chrome_scrumclock/src/core/api/adapters/GoogleTaskAdapter.ts`

## 3. 任務拆解

### Phase 1: 基礎配置與安裝名稱優化 狀態：`[已完成]`

### Phase 2: UI 頁面標題與佈局優化 狀態：`[已完成]`

### Phase 3: 背景服務與注入助理優化 狀態：`[已完成]`

### Phase 4: 文件與示範模組優化 狀態：`[已完成]`

### Phase 5: 建置與合規審計驗證 狀態：`[已完成]`

## 4. 影響評估
- 本次更改僅涉及 UI 與文字的呈現優化，不影響 Chrome 權限或底層 storage 架構，不具破壞性。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-16] ID: f4b42899-205b-43d1-a6bb-126a9cb4261d (初始化)
