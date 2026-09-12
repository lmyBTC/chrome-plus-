# 網頁圖片爬取與批量下載器 (Image Scraper) 功能規格說明書

> **文件路徑**: `chrome_scrumclock/docs/image-scraper-spec.md`  
> **維護指南**: [`src/features/toolbox/tools/image-scraper/功能說明.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/tools/image-scraper/功能說明.md)  
> **最後更新**: 2026-09-12 (新增：Instagram 影片與 DASH 串流解析攻克、官方 1080p MP4 直採與擴充套件原生串流下載)

---

## 1. 模組架構與檔案地圖 (File Map)

- **所在模組**: `chrome_scrumclock` -> `Toolbox` (`src/features/toolbox/`)
- **入口元件**: [`ImageScraper.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/tools/image-scraper/ImageScraper.tsx)
- **核心服務**:
  - **採集解析引擎**: [`imageExtractor.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/services/imageExtractor.ts)
    - 支援指定 URL 直接爬取 (Fetch HTML + DOMParser)
    - 支援當前活躍分頁 DOM 採集 (`fast` 快速快照、`deep-scroll` 平滑滾動懶加載、`carousel-traverse` 相簿劇院輪巡)
    - 支援 Flickr CDN 高清規則 (`_m`/`_z` -> `_b` 1024px) 與 Facebook 縮圖去除 (`stp` 清除、高清直連)
  - **下載與匯出引擎**: [`downloader.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/services/downloader.ts)
    - 支援 File System Access API (`showDirectoryPicker`) 原生資料夾直存模式（一次選取，免重複彈窗確認）
    - 支援 Chrome Downloads API 子目錄歸檔與平滑併發隊列控制 (Concurrency: 3~5)
    - 支援已選 URL 複製至剪貼簿與匯出 `.txt` 清單
  - **型別定義**: [`types.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/types.ts)

---

## 2. 格式篩選與選取狀態連動規範 (Format Filter & Selection Sync)

### 2.1 核心連動原則 (Core Invariant)
**「凡不在當前格式篩選啟用範圍內的圖片，絕對不能處於勾選 (selected) 狀態。」**

1. **排除格式時自動取消勾選**：
   - 當使用者點擊關閉特定格式（例如關閉 PNG/WEBP/GIF/SVG，僅保留 JPG）時，程式會自動巡檢圖片清單，將所有非目標格式的圖片**立即取消勾選 (`selected = false`)**。
2. **Solo (僅選此格式) 模式**：
   - 使用者按住 `Alt` 鍵點擊任一格式標籤（或執行特定單選操作），可一鍵將篩選限縮為該單一格式，並自動取消其他所有格式圖片的勾選狀態。
3. **統計數量與下載防禦雙重一致**：
   - 頂部選取計數器（`selectedCount`）與批量儲存按鈕上的數量，嚴格計算**「符合當前格式篩選且被勾選之有效圖片」**。
   - 點擊「批量下載」、「複製 URL」、「匯出 TXT」時，底層執行過濾，確保被隱藏或非篩選格式之圖片絕不會被錯誤下載或匯出。
4. **爬取初始同步**：
   - 新爬取完成時，若使用者當前已限制格式（例如已切換為僅 JPG），新加入的圖片中不符合格式者預設為未勾選 (`selected = false`)。
5. **重新勾回格式**：
   - 若使用者重新點選開啟某格式標籤（例如重新開啟 PNG），該格式圖片會重新呈現於畫面中，並維持使用者未勾選狀態，避免未經確認即下載。
   - 提供「全部格式」快捷捷徑，可一鍵重設所有格式篩選為啟用。

---

## 3. 圖片操作與選取快捷功能

- **全選 / 取消全選 / 反向選取**：
  - 僅針對當前篩選可見（Visible & Filtered）之圖片進行狀態變更，不干擾已隱藏項目。
- **Shift + Click 連續範圍選取**：
  - 點擊圖片 A 的勾選框後，按住 `Shift` 點擊圖片 B，即可連續勾選或取消 A 到 B 之間的所有圖片。
- **預覽大圖燈箱**：
  - 點擊卡片縮圖可喚起 HD 大圖燈箱，支援鍵盤 `Esc` 關閉、高畫質圖源檢視與即時單張下載。

---

## 4. Instagram 多圖輪播貼文 (Carousel) 與 DASH 串流影片採集規範

### 4.1 痛點與根因分析
- **DOM 虛擬化延遲載入**：Instagram 貼文輪播（如 14 張貼文，`?img_index=1` ~ `14`）初始僅渲染首張圖片，其餘圖片在未切換前不在 DOM 中。
- **切換按鈕語系與標籤多樣性**：繁中環境下下一頁標籤常為「下一頁」或「下一張」，且該屬性常位於內部 `<svg>`。原生 `.click()` 必須向上穿透至父層 `<button>`。
- **等尺寸 Stable Sort 盲點**：輪播圖片尺寸相同時，傳統面積排序會固定選中排在前端的舊圖，導致過早判斷重複中斷。
- **DASH / MSE 分塊串流與偽裝 Blob**：Instagram 影片在 DOM `<video>` 標籤中使用 `blob:https://...` 虛擬協議，網路請求全部為極小二進位分塊（帶有 `bytestart=` 與 `byteend=` 參數）。若抓取這些分塊會因缺少 `moov atom` 索引頭部而變成 0:00 的損毀影片。此外全域正則掃描會抓到 200+ 個 SPA 背景預載的無效推薦分塊。

### 4.2 雙軌自動採集架構 (Dual-Track Extraction)
1. **快軌 (Direct Path) - 原生資料秒級直出**：
   - 於分頁 Context 偵測到 Instagram 貼文時，優先嘗試利用分頁已登入之同源請求讀取貼文端點資料。
   - 若獲取 `carousel_media` 資料結構，瞬間完整直出全量 14 張最高畫質大圖（含寬高與無裁切直連），耗時 < 1 秒。
2. **智慧輪巡 (Smart Carousel Traversal) - 多維穿透輪巡**：
   - **貼文容器全量池**：每次步進時掃描貼文 `<article>` 內所有可見圖片（寬高 > 120px 且排除靜態資源），增量收入收集池。
   - **多語言按鈕精準定位**：涵蓋繁中「下一頁」、「下一張」、「下一步」、英文「Next」及包含該特徵之 `<svg>` 向上 `.closest('button')`。
   - **全事件派發**：同時觸發 `mousedown`、`mouseup`、`click` 與 `ArrowRight` 鍵盤備援。
   - **天然終止信號**：以貼文「下一頁按鈕消失/卸載」作為最後一張之判斷標準，連續無新圖時自動平滑收斂完成。
3. **CDN 高畫質升級 (HD Upgrade)**：
   - 對 `*.fbcdn.net` 與 `*.cdninstagram.com` 之圖片，自動過濾清除 URL 中包含之 `stp` 縮圖與裁切指令（如 `c0.120.1080.1080a`、`s640x640` 等），全量還原為 1080px+ 原始高畫質原圖。

### 4.3 Instagram 串流影片破解與下載架構
1. **官方原生高畫質單檔挖掘 (`browser_native_hd_url`)**：
   - 繞過動態分塊，直接深度掃描頁面內聯 `<script>` 標籤，匹配官方留給純 HTML5 播放器的原生 1080p MP4 單檔直鏈。
   - 自動還原 JSON 轉義字符（`\u0026` -> `&`，`\/` -> `/`）。
2. **Shortcode 嚴格作用域綁定**：
   - 鎖定當前 URL 的 Post Shortcode（例如 `DbPu-KzvdnG`），嚴格只獲取該貼文所屬區塊之影音資源，完全阻斷全頁 200+ 快取分塊污染。
3. **DASH Range 分塊自動剔除**：
   - 全面攔截並丟棄任何包含 `bytestart=` 或 `byteend=` 之 Range 請求網址。
4. **React Fiber 節點穿透備援**：
   - 探測貼文節點的 `__reactFiber$` 樹狀鏈路，提取 memoizedProps 中的 `video_versions` 與 `playback_url`。
5. **擴充套件原生串流下載 (`downloader.ts`)**：
   - 針對 `.mp4` 影片，優先使用擴充套件 Context 原生 `fetch()` 串流轉換為 Blob，避免經由 `executeScript` 序列化 Base64 Data URL 造成瀏覽器分頁記憶體溢出。

---

## 5. PK+ 助理右側欄 (Side Panel) 同屏採集整合規範

### 5.1 解決情境與核心價值
- **跨分頁焦點遺失之徹底根治**：以往圖片採集器位於獨立新分頁（New Tab），使用者切換至目標網頁（如 Instagram 貼文）時，無法點擊採集按鈕；若回採集分頁按按鈕，當前活躍分頁又誤鎖定為儀表板自身。
- **Side Panel 天然同屏架構**：Chrome Side Panel 常駐於主視窗右側，使用者左側瀏覽目標網頁（如 Instagram / Facebook），右側可直接操作採集控制台。

### 5.2 側邊欄專屬優化與互動模式
1. **頂部雙頁籤無縫切換**：
   - 「🤖 PK+ 助理」與「🖼️ 圖片採集器」雙模式平滑切換，AI 對話紀錄與番茄鐘狀態完全常駐保留。
2. **智慧預選與即時分頁嗅探**：
   - 側邊欄中預設鎖定「📑 抓取當前分頁」模式。
   - 自動即時讀取左側主分頁之標題與網址，若偵測為 Instagram / Facebook，自動預選「🔄 相簿劇院輪巡」模式。
3. **同屏即時視覺回饋**：
   - 點擊「開始爬取圖片」後，使用者可直接親眼目睹左側 Instagram 貼文逐張自動切換（index 1 ~ 14），右側即時展示進度與縮圖卡片。
4. **雙向檢視彈性**：
   - 側邊欄頂部提供「🖥️ 全螢幕」捷徑按鈕，使用者隨時可於新分頁展開大畫面進行更寬廣之瀏覽。
5. **雙核心主控列與極致緊湊 UI/UX (Dual Action Bar)**：
   - 將「🔄 開始自動輪巡相簿」與「⬇️ 立即下載」同屏並列於頂部主控列，消除過往外框層疊散亂問題，使用者無需滑動滾輪，即可 0 延遲在同一畫面完成相簿輪巡與一鍵下載。
   - 分頁模式切換優化為現代感 Segmented Tabs，篩選器與進階設定（子資料夾、自訂命名）收斂為折疊面板，最大化保留圖片預覽視野。



