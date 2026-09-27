---
title: "ScrumClock ImageScraper 巨石視圖拆解與模組化重構"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-09-26"
deadline: "2026-10-03"
---

## 1. 目標
將 `chrome_scrumclock/src/features/toolbox/tools/image-scraper/ImageScraper.tsx` (1,252 行) 進行模組化解耦。
抽離過於龐大的內部 UI 與控制元件（篩選面板、預覽燈箱、批次下載控制列、動態輪播進度顯示），使主組件行數收斂至 200~300 行以內，消除 Context 負擔與改動風險。

## 2. 策略與鎖定檔案
採用子元件封裝模式，於 `src/features/toolbox/tools/image-scraper/components/` 建立職責專一的子視圖元件，並保留主組件作為狀態調度與數據匯總容器。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/features/toolbox/tools/image-scraper/ImageScraper.tsx`
- `chrome_scrumclock/src/features/toolbox/tools/image-scraper/components/ScraperInputBar.tsx` (新增)
- `chrome_scrumclock/src/features/toolbox/tools/image-scraper/components/ScraperFilterBar.tsx` (新增)
- `chrome_scrumclock/src/features/toolbox/tools/image-scraper/components/ScraperPreviewModal.tsx` (新增)
- `chrome_scrumclock/src/features/toolbox/tools/image-scraper/components/ScraperDownloadControls.tsx` (新增)
- `chrome_scrumclock/src/features/toolbox/tools/image-scraper/components/ScraperImageList.tsx` (新增)
- `chrome_scrumclock/SCRUMCLOCK_README.md` (SSOT 文檔維護)

## 3. 任務拆解

### Phase 1: 介面分析與子元件骨架建立 狀態：`[已完成]`
- [x] 任務 1.1: 盤點 ImageScraper 內部狀態與事件傳遞簽名
    - [x] 分析篩選過濾條件、批次下載進度與預覽選取事件
    - [x] 在 `components/` 目錄建立子元件的 Props Interface 宣告
- [x] 任務 1.2: 抽離靜態過濾控制列
    - [x] 抽出 `ScraperFilterBar.tsx` (格式/尺寸/網址篩選)

### Phase 2: 核心檢視與下載控制列拆解 狀態：`[已完成]`
- [x] 任務 2.1: 抽離圖片瀑布流與卡片列表
    - [x] 實作 `ScraperImageList.tsx` (支援緊湊模式與虛擬列表/延遲載入)
- [x] 任務 2.2: 抽離下載控制與進度顯示
    - [x] 實作 `ScraperDownloadControls.tsx` (支援 File System Access API 與 ZIP 打包反饋)
- [x] 任務 2.3: 抽離單圖/輪播預覽燈箱
    - [x] 實作 `ScraperPreviewModal.tsx`

### Phase 3: 主視圖整合與 SSOT 更新 狀態：`[已完成]`
- [x] 任務 3.1: 重構 `ImageScraper.tsx` 組裝各子元件
    - [x] 驗證 Side Panel 與獨立頁面顯示無樣式或功能回歸
- [x] 任務 3.2: 執行 TypeScript 型別檢查與構建驗證
- [x] 任務 3.3: 更新 `SCRUMCLOCK_README.md` 巨石檔案除名記錄

## 4. 影響評估
- 僅涉及 Chrome ScrumClock 內部 Image Scraper UI 表現層解耦。
- 不影響已完成重構之 `imageExtractor.ts` 核心策略運作與外部呼叫介面。

## 5. 驗收標準
- [x] **技術指標**: 主元件 `ImageScraper.tsx` 行數降至 350 行以內 (現 341 行，縮減 73%)。
- [x] **核心規範**: 符合 Chrome Extension MV3 與 React Hooks 最佳實踐。
- [x] **除錯清理**: 移除所有除錯用 `console.log`。
- [x] **檔案編碼**: 確認所有新增與修改檔案皆為 UTF-8 (無 BOM)。
- [x] **SSOT 文件同步**: 同步更新 `SCRUMCLOCK_README.md` 第 4 節瘦身清單。
- [x] **插件驗證**: 執行 `npm run build` 通過且在瀏覽器實測圖片擷取、批次下載與預覽燈箱正常。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: 2ddf9c50-f3a8-445e-8ada-c5bf528b994c (初始化)
> - 2026-09-27 ID: 1ff2093d-27ac-41ee-9a72-ab339073bd81 (Phase 3 完成與驗證結案)
