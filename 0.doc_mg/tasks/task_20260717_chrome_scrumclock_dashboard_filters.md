---
title: "ScrumClock 儀表板欄位篩選與備註欄暗黑配色優化"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-17"
deadline: "2026-07-17"
---

## 1. 目標
1. 修復 ScrumClock 專案管理儀表板中的備註欄 (Execution Notes) 輸入框在暗黑模式下顯示為白底的樣式問題，使其符合深色主題風格。
2. 在 Task Pool 表格上方加入「顯示欄位」篩選功能，允許使用者自由勾選/隱藏 Task ID、Created At 等欄位，並將篩選偏好持久化儲存。

## 2. 策略與鎖定檔案
1. 修改 `ProjectManagementDemo.tsx` 中備註欄 `<textarea>` 的背景 class，將可能導致解析失敗的 `bg-dark-surface/30` 和 `bg-dark-surface/60` 改為不帶透明度的 `bg-dark-base hover:bg-dark-surface`。
2. 引入 React `useState` 結合 `localStorage` 來記錄使用者對 Task ID、Title、Status、Priority、Notes、CreatedAt 欄位的顯示偏好，並透過 `useEffect` 自動儲存。
3. 新增欄位篩選 UI 控制列（膠囊複選框形式），並在 `<thead>` 與 `<tbody>` 中根據篩選狀態條件渲染。

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\project-management\components\ProjectManagementDemo.tsx`

## 3. 任務拆解

### Phase 1: 規劃與審查 狀態：`[已完成]`
- [x] 任務 1.1: 鎖定受影響的 React 元件與 CSS 樣式
    - [x] 確認 ProjectManagementDemo.tsx 的 `<textarea>` 使用了帶有透明度的 Tailwind 顏色，在變數中解析失效。
    - [x] 設計欄位篩選 UI 樣式與 localStorage 儲存鍵名。

### Phase 2: 代碼實作 狀態：`[已完成]`
- [x] 任務 2.1: 修正備註欄 textarea 暗黑樣式
    - [x] 將 textarea 的 Tailwind background classes 修改為 `bg-dark-base hover:bg-dark-surface`。
- [x] 任務 2.2: 實作欄位顯示控制狀態與持久化
    - [x] 在 `ProjectManagementDemo` 中定義 `visibleColumns` state，並在載入時從 `localStorage` 初始化。
    - [x] 加入 `useEffect` 監聽 `visibleColumns` 的變化，寫入 `localStorage`。
- [x] 任務 2.3: 實作欄位篩選 UI 與表格動態渲染
    - [x] 在新增任務列與任務列表之間，渲染欄位篩選的 checkbox 按鈕組。
    - [x] 根據 `visibleColumns` 顯示/隱藏 `<th>` 和 `<td>`。

### Phase 3: 驗證與構建 狀態：`[已完成]`
- [x] 任務 3.1: 專案編譯與除錯
    - [x] 執行 `npm run build` 確認 TypeScript 與 Vite 編譯無錯誤。
- [x] 任務 3.2: 樣式與功能手動測試
    - [x] 確認備註欄無白底，篩選能正確隱藏對應欄位，重新整理偏好保留。

## 4. 影響評估
- 本次修改為純前端 React UI 層級變更，完全不影響後台儲存 API 或 Chrome API 權限要求。

## 5. 驗收標準
- [x] **技術指標**: 表格與篩選器完全自適應，切換顯示/隱藏時不跑版。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: 執行 `npm run build` 並在 `chrome://extensions/` 重新載入，確認功能正常。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-17] ID: 8ad7e4f6-3b9d-4bbe-896f-ea373f040d69 (已完成)
