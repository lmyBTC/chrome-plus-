---
title: "新增實用工具箱與網頁圖片爬取下載器"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-09-12"
deadline: "2026-09-13"
---

## 1. 目標
在 `chrome_scrumclock` (Power Kit) 左側導覽列新增「實用工具箱 (Toolbox)」頁面，並在 `src/features/toolbox/` 實作模組化架構與首發核心工具——「網頁圖片爬取與批量下載器」。支援貼上任意指定網頁網址（如 Flickr 相簿）或直接讀取當前瀏覽分頁，解析出所有圖片資源，提供即時預覽、尺寸/格式篩選、勾選/全選、以及自動化併發平滑下載至專屬子資料夾。

## 2. 策略與鎖定檔案
以 Feature-based 結構於 `src/features/toolbox/` 建立高內聚、低耦合的工具箱架構。爬取機制採「雙模態引擎」：URL 直接 Fetch + 解析（支援 Flickr 高清大圖規則）與當前分頁 DOM 即時提取；下載引擎使用 `chrome.downloads` API 搭配併發隊列控制與檔名安全過濾。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/features/toolbox/types.ts`
- `chrome_scrumclock/src/features/toolbox/tools/image-scraper/services/imageExtractor.ts`
- `chrome_scrumclock/src/features/toolbox/tools/image-scraper/services/downloader.ts`
- `chrome_scrumclock/src/features/toolbox/tools/image-scraper/ImageScraper.tsx`

## 3. 任務拆解

### Phase 1: 導覽串接與工具箱骨幹 狀態：`[已完成]`
### Phase 2: 圖片爬取與解析核心引擎 狀態：`[已完成]`
### Phase 3: 圖片瀏覽、篩選與併發下載器 狀態：`[已完成]`
### Phase 4: 整合驗證與 Build 檢查 狀態：`[已完成]`
### Phase 5: 體驗升級與範圍選取 狀態：`[已完成]`
### Phase 6: 相簿劇院自動輪巡與深度滾動加載引擎 狀態：`[已完成]`
### Phase 7: 格式篩選連動取消勾選與 Solo 模式 狀態：`[已完成]`
### Phase 8: Instagram 多圖輪播 (Carousel) 深度採集優化 狀態：`[已完成]`
### Phase 9: PK+ 助理右側欄 (Side Panel) 整合圖片採集器 狀態：`[已完成]`
### Phase 10: 側邊欄圖片採集器 UI/UX 緊湊化重構 (輪巡與下載同屏操作) 狀態：`[已完成]`
### Phase 11: 智慧防重複下載機制 (跳過已存在與已下載狀態標記) 狀態：`[已完成]`

### Phase 12: Instagram 影片音訊保證修復 (官方 API 直鏈 + DASH 分離防禦) 狀態：`[已完成]`

### Phase 13: Instagram 圖片縮圖錯誤、重複顯示與低解析度修復 狀態：`[已完成]`
- [x] 隔離普通圖片與影片之 `posterUrl`：徹底杜絕普通圖片被 DOM 首圖覆蓋，並在 `ImageScraper.tsx` 嚴格限定圖片縮圖使用 `img.url`
- [x] 升級 Instagram 專屬提取器：維度 0 端點補齊單圖貼文與追加 `?__a=1&__d=dis`，命中時立即返回杜絕 DOM 縮圖重複注入
- [x] 強化維度 1 (Script JSON) 與維度 3 (React Fiber) 高解析度貼文圖片 (1080p+) 提取能力
- [x] 實作圖片 Media ID / CDN 去重與尺寸擇優過濾器（同圖只留最高解析度版本，剔除 240x300 等低清縮圖）
- [x] 修正 `extractImagesFromHtml` 中 `srcset` 候選提取（只取最大寬度版本，避免無效重複）
- [x] 執行 `npm run build` 與合規驗證

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
> - 2026-09-12 ID: 4fa8e6e5-f970-482a-91bc-47c6920ffa34 (Phase 10 側邊欄圖片採集器 UI/UX 緊湊化重構)
> - 2026-09-13 ID: 59a36e11-e290-401d-b6ba-bed77b391ecc (Phase 12 Instagram 影片音訊保證修復)
> - 2026-09-13 ID: e21a5fcf-84e9-480f-b77e-61c6b70a1aaf (Phase 13 圖片縮圖錯誤與高畫質原圖修復)



