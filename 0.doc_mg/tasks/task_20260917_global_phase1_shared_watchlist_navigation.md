---
title: "Phase 1: New Tab 共享標的監控與快速導航 (零耦合數據層)"
plugin: "global"
status: "已完成"
created: "2026-09-17"
deadline: "2026-09-17"
---

## 1. 目標
在 `chrome_scrumclock` (New Tab / 側邊欄) 與 `finance-research-clipper-oss` 之間建立第一階段「零耦合」數據互通層。
讓使用者在日常番茄鐘與任務看板中，能即時掌握 FinanceClipper 的自選監控標的行情（股價、漲跌幅、本益比），並支援一鍵發起背景 SPA 深度爬蟲與直達全螢幕研報儀表板。

## 2. 策略與鎖定檔案
1. **跨插件服務接口開放**：在 FinanceClipper `manifest.json` 開啟 `externally_connectable`，於 `background.js` 新增 `onMessageExternal` 監聽器，提供 `PING`、`GET_WATCHLIST`、`OPEN_DASHBOARD`、`CRAWL_STOCK` 等安全 API。
2. **垂直切片模組實作**：在 ScrumClock `src/features/finance-integration/` 建立專屬模組，封裝 `financeClient`、`WatchListWidget` 與型別定義，維持代碼高內聚與零副作用。
3. **UI 入口整合**：於 ScrumClock 的 `Sidebar.tsx` 加入「📈 財務自選監控」按鈕，並於 `App.tsx` 建立切換視圖；在 `SettingsPanel.tsx` 提供擴充功能 ID 自訂與連線狀態指示燈。

### 鎖定檔案 (Target Files)
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/manifest.json`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/background.js`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/types/index.ts`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/finance-integration/types.ts`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/finance-integration/financeClient.ts`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/finance-integration/WatchListWidget.tsx`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/finance-integration/index.ts`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/core/layout/Sidebar.tsx`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/App.tsx`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/components/SettingsPanel.tsx`

## 3. 任務拆解

### Phase 1: New Tab 共享標的監控與快速導航 (零耦合數據層) 狀態：`[已完成]`
- [x] 已於 FinanceClipper 配置 externally_connectable 與 onMessageExternal 服務接口 (GET_WATCHLIST, OPEN_DASHBOARD, CRAWL_STOCK, PING)。
- [x] 已於 ScrumClock 建立符合垂直切片規範之 finance-integration 模組，提供 WatchListWidget、financeClient 與型別定義。
- [x] 已於 ScrumClock 側邊選單與 New Tab 儀表板整合「📈 財務自選監控」視圖與連線設定，支援即時價格預覽、快速背景爬取與一鍵直達大螢幕儀表板。
- [x] 專案打包建置 npm run build 通過無報錯，Manifest V3 自動化審計完全合規。

## 4. 影響評估
- 權限影響：僅在 FinanceClipper `manifest.json` 加入 `externally_connectable`，其餘均維持既有權限。
- 效能考量：非同步通訊與快取機制，未安裝或未連線時自動優雅降級，完全不阻塞 ScrumClock 與 FinanceClipper 主線程。

## 5. 驗收標準
- [x] **技術指標**: 雙向跨插件呼叫正常，未安裝或 Extension ID 錯誤時提供完整降級提示。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範（非持續性 background service worker）。
- [x] **除錯清理**: 程式碼乾淨且無遺留偵錯代碼。
- [x] **檔案編碼**: 所有檔案皆為 UTF-8 (無 BOM) 編碼。
- [x] **插件驗證**: `npm run build` 通過，Manifest 合規審計無警示。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-17 ID: 0fb0a759-d1eb-4b1f-bc01-fccf89431599 (實作與驗收完成)
> - 2026-09-17 ID: 62b94652-be5e-4dd8-8a35-f8216a8f824c (自總任務拆分獨立封存檔)
