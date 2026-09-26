---
title: "ScrumClock 實用工具箱整合影片字幕與筆記收集器"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-09-26"
deadline: "2026-09-27"
---

## 1. 目標
在 `chrome_scrumclock` 的「實用工具箱」（Utility Toolbox）中，整合影片字幕與筆記收集器（Subtitle & Note Collector），直接讀取並視覺化管理由 `chrome_video speed plus` 跨插件傳送過來的字幕片段與筆記快照（`capturedNotes`），提供依標籤/關鍵字篩選、影片時間戳跳轉、一鍵複製 Markdown 筆記、轉入今日戰役任務及清空管理等功能，實現從影音學習到敏捷任務管理的完整閉環。

## 2. 策略與鎖定檔案
1. **資料層與型別定義**：
   - 定義 `SubtitleNote` 資料介面，對齊 `chrome_scrumclock/src/background/externalService.ts` 內 `capturedNotes` 儲存結構。
   - 封裝 Chrome Local Storage 的讀取、單筆刪除、批量導出與清空函式。
2. **UI 元件實作 (`SubtitleCollector.tsx`)**：
   - 遵照 Tailwind CSS 深色風格與現代卡片佈局。
   - 包含搜尋列、標籤過濾 Pills、計數統計徽章。
   - 支援單筆時間戳跳轉連結（YouTube 帶秒數 URL）、一鍵複製 Markdown、一鍵轉化為今日戰役任務（呼叫 `handleCreateTaskExternal` 或寫入 `weeklyMissions`）。
3. **工具箱中樞整合 (`ToolboxHub.tsx`)**：
   - 於 `AVAILABLE_TOOLS` 加入 `subtitle-collector`（影片字幕收集器，圖示 🎬 / 標籤「影音」）。
   - 掛載至工具箱分頁切換列與內容渲染區。
4. **SSOT 文檔閉環**：
   - 同步更新 `chrome_scrumclock/SCRUMCLOCK_README.md`。
   - 同步更新 `.agents/skills/scrumclock-core/SKILL.md`。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/features/toolbox/types.ts`
- `chrome_scrumclock/src/features/toolbox/ToolboxHub.tsx`
- `chrome_scrumclock/src/features/toolbox/tools/subtitle-collector/types.ts`
- `chrome_scrumclock/src/features/toolbox/tools/subtitle-collector/SubtitleCollector.tsx`
- `chrome_scrumclock/src/features/toolbox/tools/subtitle-collector/index.ts`
- `chrome_scrumclock/src/features/toolbox/tools/subtitle-collector/功能說明.md`
- `chrome_scrumclock/SCRUMCLOCK_README.md`
- `.agents/skills/scrumclock-core/SKILL.md`

## 3. 任務拆解

### Phase 1: 元件架構與資料適配層實作 狀態：`[已完成]`
- [x] 任務 1.1: 建立型別定義檔
    - 於 `chrome_scrumclock/src/features/toolbox/tools/subtitle-collector/types.ts` 定義 `CapturedSubtitleNote` 結構與篩選狀態。
- [x] 任務 1.2: 實作主元件 `SubtitleCollector.tsx`
    - 實作讀取 `chrome.storage.local` 的 `capturedNotes` 清單。
    - 實作關鍵字搜尋、影片標籤過濾。
    - 實作時間戳點擊跳轉、一鍵複製 Markdown 與刪除單筆紀錄功能。
    - 實作「轉為今日作戰任務」功能，與 `weeklyMissions` 或 `dailyLogs` 對齊。
- [x] 任務 1.3: 建立門面出口與功能說明
    - 建立 `chrome_scrumclock/src/features/toolbox/tools/subtitle-collector/index.ts`。
    - 建立 `chrome_scrumclock/src/features/toolbox/tools/subtitle-collector/功能說明.md`。

### Phase 2: 工具箱中樞整合與型別匯出 狀態：`[已完成]`
- [x] 任務 2.1: 擴充工具箱型別
    - 於 `chrome_scrumclock/src/features/toolbox/types.ts` 擴充 `ToolboxToolId = 'image-scraper' | 'activity-monitor' | 'subtitle-collector'`。
    - Re-export `subtitle-collector` 之專屬型別。
- [x] 任務 2.2: 整合 ToolboxHub 介面
    - 於 `chrome_scrumclock/src/features/toolbox/ToolboxHub.tsx` 將 `subtitle-collector` 註冊至 `AVAILABLE_TOOLS`。
    - 加入對應 Tab 標籤與渲染區塊。

### Phase 3: 驗證建置與 SSOT 文檔回寫 狀態：`[已完成]`
- [x] 任務 3.1: 執行 TypeScript 編譯與打包驗證
    - 於 `chrome_scrumclock` 目錄下執行 `npm run build`，確保無型別錯誤與打包異常。
- [x] 任務 3.2: 回寫 SSOT 索引與技能字典
    - 更新 `chrome_scrumclock/SCRUMCLOCK_README.md` 之工具箱子功能索引。
    - 更新 `.agents/skills/scrumclock-core/SKILL.md`。

## 4. 影響評估
- **非破壞性擴展**：此為在 `chrome_scrumclock` 工具箱新增獨立子功能模組，不修改任何現有番茄鐘或圖片爬取邏輯。
- **資料相容性**：直接無縫讀取 background `externalService.ts` 既有的 `capturedNotes` 欄位，跨插件發送的字幕立即於此介面顯現。
- **效能與記憶體**：採按需讀取 `chrome.storage.local`，無常駐輪詢，零效能損耗。

## 5. 驗收標準
- [x] **技術指標**: 新增之 React 元件符合 TypeScript Strict 檢查，無任何 `any` 繞過或型別報錯。
- [x] **核心規範**: 符合 Manifest V3 規範與 Vite 建置流程。
- [x] **除錯清理**: 程式碼內無殘留之 `console.log()` 或除錯測試代碼。
- [x] **檔案編碼**: 確認所有新增與修改的檔案皆為 UTF-8 (無 BOM) 編碼。
- [x] **SSOT 文件同步**: 完成回寫 `SCRUMCLOCK_README.md` 與 `scrumclock-core/SKILL.md`。
- [x] **插件驗證**: `npm run build` 成功完成，無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: 13bcbca8-fbd9-46e1-a9f9-48fbf661602e (Gate 0 評估與 Gate 1 任務藍圖擬定)
> - 2026-09-26 ID: 0df92fd4-db1c-432b-833e-3224c4868fef (Phase 1, 2, 3 全階段開發、驗證與 SSOT 回寫結案)
