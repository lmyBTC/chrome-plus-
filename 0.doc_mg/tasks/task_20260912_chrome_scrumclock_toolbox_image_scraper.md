---
title: "新增實用工具箱與網頁圖片爬取下載器"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-09-12"
deadline: "2026-09-12"
---

## 1. 目標
在 `chrome_scrumclock` (Power Kit) 左側導覽列新增「實用工具箱 (Toolbox)」頁面，並在 `src/features/toolbox/` 實作模組化架構與首發核心工具——「網頁圖片爬取與批量下載器」。支援貼上任意指定網頁網址（如 Flickr 相簿）或直接讀取當前瀏覽分頁，解析出所有圖片資源，提供即時預覽、尺寸/格式篩選、勾選/全選、以及自動化併發平滑下載至專屬子資料夾。

## 2. 策略與鎖定檔案
以 Feature-based 結構於 `src/features/toolbox/` 建立高內聚、低耦合的工具箱架構。爬取機制採「雙模態引擎」：URL 直接 Fetch + 解析（支援 Flickr 高清大圖規則）與當前分頁 DOM 即時提取；下載引擎使用 `chrome.downloads` API 搭配併發隊列控制與檔名安全過濾。

### 鎖定檔案 (Target Files)
- `c:\Users\烈日千陽\vide-coding-workspace\chrome-plus\chrome_scrumclock\src\core\layout\Sidebar.tsx`
- `c:\Users\烈日千陽\vide-coding-workspace\chrome-plus\chrome_scrumclock\src\core\layout\CommandPalette.tsx`
- `c:\Users\烈日千陽\vide-coding-workspace\chrome-plus\chrome_scrumclock\src\App.tsx`
- `c:\Users\烈日千陽\vide-coding-workspace\chrome-plus\chrome_scrumclock\src\features\toolbox\types.ts`
- `c:\Users\烈日千陽\vide-coding-workspace\chrome-plus\chrome_scrumclock\src\features\toolbox\services\imageExtractor.ts`
- `c:\Users\烈日千陽\vide-coding-workspace\chrome-plus\chrome_scrumclock\src\features\toolbox\services\downloader.ts`
- `c:\Users\烈日千陽\vide-coding-workspace\chrome-plus\chrome_scrumclock\src\features\toolbox\tools\image-scraper\ImageScraper.tsx`
- `c:\Users\烈日千陽\vide-coding-workspace\chrome-plus\chrome_scrumclock\src\features\toolbox\tools\image-scraper\功能說明.md`
- `c:\Users\烈日千陽\vide-coding-workspace\chrome-plus\chrome_scrumclock\src\features\toolbox\ToolboxHub.tsx`
- `c:\Users\烈日千陽\vide-coding-workspace\chrome-plus\chrome_scrumclock\src\features\toolbox\index.ts`

## 3. 任務拆解

### Phase 1: 導覽串接與工具箱骨幹 狀態：`[已完成]`

### Phase 2: 圖片爬取與解析核心引擎 狀態：`[已完成]`

### Phase 3: 圖片瀏覽、篩選與併發下載器 狀態：`[已完成]`

### Phase 4: 整合驗證與 Build 檢查 狀態：`[已完成]`

### Phase 5: 體驗升級與範圍選取 狀態：`[已完成]`

### Phase 6: 相簿劇院自動輪巡與深度滾動加載引擎 狀態：`[已完成]`
- [x] 定義 `ActiveTabScrapeMode` 與輪巡進度型別 (`types.ts`)
- [x] 實作 Facebook 圖片 URL 升級、`extractWithDeepScroll` 與 `extractWithCarouselTraverse` (`imageExtractor.ts`)
- [x] 在 `ImageScraper.tsx` 整合採集模式切換、輪巡進度回饋與即時中斷控制
- [x] 執行 build 驗證並完成測試

### Phase 7: 格式篩選連動取消勾選與 Solo 模式 狀態：`[已完成]`
- [x] 實作排除特定格式時自動取消勾選非目標圖片 (`ImageScraper.tsx`)
- [x] 支援 Alt+點擊 快速 Solo 篩選單一格式，並提供全部格式重設按鈕
- [x] 修正選取統計、批量下載、複製 URL 與 TXT 匯出雙重防禦機制
- [x] 更新 `image-scraper-spec.md` 與 `功能說明.md` 規格文件
- [x] `npm run build` 構建驗證通過

### Phase 8: Instagram 多圖輪播 (Carousel) 深度採集優化 狀態：`[已完成]`
- [x] 強化 `imageExtractor.ts` 之 `extractCarouselFromActiveTab`，支援 Instagram 貼文多圖自動輪播採集
- [x] 實作 Instagram 專屬按鈕識別（包含「下一頁」、「下一張」、「Next」與 SVG 向上定位 closest button）
- [x] 實作貼文輪播容器內圖片全量收集與視窗中心焦點加權判斷
- [x] 實作分頁同源 Context 貼文原生資料快軌提取 (Direct Path)
- [x] 於 `ImageScraper.tsx` 增強 Instagram 貼文採集導引與輪巡進度反饋
- [x] 同步更新 `image-scraper-spec.md` 與 `功能說明.md`
- [x] 執行 `npm run build` 構建驗證通過

### Phase 9: PK+ 助理右側欄 (Side Panel) 整合圖片採集器 狀態：`[已完成]`
- [x] 於 `ImageScraper.tsx` 支援側邊欄自適應佈局與 `defaultMode` / 智慧輪播預選
- [x] 於 `src/entries/sidebar/main.tsx` 頂部導航整合「PK+ 助理」與「圖片採集器」雙分頁 Tabs
- [x] 支援在側邊欄直接對左側當前活躍分頁發起相簿輪巡、深度滾動與快速採集
- [x] 同步更新 `image-scraper-spec.md` 規範文檔
- [x] 執行 `npm run build` 構建驗證通過

## 4. 影響評估
- **權限需求**: 現有 `manifest.json` 已具備 `"downloads"`, `"scripting"`, `"tabs"`, `"<all_urls>"`，無需變更 manifest 權限。
- **副作用防範**: 新功能純粹模組化隔離在 `src/features/toolbox/`，不改動既有番茄鐘、傳送門與 Gemini 匯出器之狀態邏輯。

## 5. 驗收標準
- [x] **技術指標**: 所有新元件遵循 TypeScript 嚴格型別，樣式使用 TailwindCSS 與 Dark Mode 配色維持一致性。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，下載任務具備錯誤處理。
- [x] **除錯清理**: 移除或註解測試用無意義 `console.log`。
- [x] **檔案編碼**: 確認所有新增與修改檔案皆以 UTF-8 (無 BOM) 編碼。
- [x] **插件驗證**: `npm run build` 成功構建，無 TS 或 CSS 報錯。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-12 ID: 2a000dc8-0377-4bf5-88d4-2a8654b3eb41 (初始化)
> - 2026-09-12 ID: 7e2db966-c515-4c2c-8430-28fa9891cdc7 (Phase 5 體驗加強)
> - 2026-09-12 ID: 4270c5f2-be63-499a-986f-6f496f04ca63 (Phase 6 相簿輪巡與深度採集)
> - 2026-09-12 ID: 23360b55-b53a-44ee-81cd-5b9ef95e0383 (Phase 7 格式篩選連動取消勾選)
> - 2026-09-12 ID: 92b0b10d-3612-444c-b742-f6bd021d7930 (Phase 8 Instagram 多圖輪播深度採集優化)

