---
title: "ScrumClock 黑暗模式設計系統重構與落地實作"
plugin: "chrome_scrumclock"
status: "開發中"
created: "2026-07-14"
deadline: "2026-07-14"
---

## 1. 目標
將 `chrome_scrumclock/docs/dark_theme_design_system.md` 規定的黑暗模式設計系統配色與規範，全面重構並落實到 ScrumClock 專案中。消除現有 `src/index.css` 中的臨時暴力覆寫（`!important`），改為使用 Tailwind 擴充主題、CSS 自定義變數，並重構所有主要 React 元件的樣式類別，以建立具備精緻視覺層級與高度可維護性的全夜晚黑暗模式。

## 2. 策略與鎖定檔案
1. **基礎配置擴充**：
   - 於 `chrome_scrumclock/src/index.css` 中定義 CSS 自定義變數（`:root`）。
   - 修改 `chrome_scrumclock/tailwind.config.js`，將 CSS 自定義變數對應至語意化 Tailwind 類別（如 `bg-dark-base`, `text-dark-primary`, `border-dark-default` 等）。
2. **React 元件逐一重構**：
   - 分階段局部讀取與替換以下組件中的淺色、硬編碼樣式類別（例如 `bg-white` 替換為 `bg-dark-card`，`text-gray-900` 替換為 `text-dark-primary`），使其完全符合設計系統規範。
3. **優化 index.css 暴力覆寫**：
   - 在所有組件重構完成後，逐步清除 `src/index.css` 中針對全域 `.bg-white`、`.border-gray-*`、`.text-gray-*` 的 `!important` 規則，僅保留全域基礎控制（如 body 背景、自定義輸入框樣式、以及 canvas 圖表反色濾鏡）。

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\tailwind.config.js`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\index.css`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\App.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\components\SettingsPanel.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\scrumclock\components\DailyMissionBriefing.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\scrumclock\components\SprintPomodoro.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\scrumclock\components\EndOfDayReview.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\scrumclock\components\QuickCapture.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\project-management\components\ProjectManagementDemo.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\ai-sidebar\components\AISidebar.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\analytics\components\AnalyticsDashboard.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\bookmarks\components\BookmarksHub.tsx`

## 3. 任務拆解

### Phase 1: 基礎環境與主題設定 狀態：`[已完成]`

### Phase 2: 核心容器與配置元件重構 狀態：`[已完成]`

### Phase 3: 敏捷番茄鐘核心功能重構 狀態：`[已完成]`

### Phase 4: 看板、分析與輔助元件重構 狀態：`[已完成]`

### Phase 5: 樣式清理與最終驗證 狀態：`[已完成]`
- [x] 任務 5.1: 清理 `src/index.css` 中已無必要的全域 `!important` 淺色覆寫。
- [x] 任務 5.2: 執行合規審計與專案編譯，進行最終驗證。黑暗模式效果與功能運作。

## 4. 影響評估
本重構為純樣式與色彩系統調整，不改變原有 React 元件之業務邏輯，亦無涉與外部腳本通訊、API 權限或安全政策（CSP）的變動。

## 5. 驗收標準
- [ ] **技術指標**: 所有主要元件皆使用 `bg-dark-*`、`text-dark-*`、`border-dark-*` 等新設 Token，並移除了全域 `!important` 暴力樣式覆寫。
- [ ] **核心規範**: 符合 Chrome Extension Manifest V3 規範。
- [ ] **除錯清理**: 確保無臨時的 `console.log()` 與測試代碼。
- [ ] **檔案編碼**: 確認所有修改的檔案皆為 UTF-8 (無 BOM)。
- [ ] **插件驗證**: 執行 `npm run build` 並在 Chrome 擴充功能中重新載入 `dist/`，驗證 UI 渲染精緻無白底，且功能無任何報錯。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-14] ID: 8d22471a-390e-426a-9b74-c8c1c25f2da7 (初始化)
