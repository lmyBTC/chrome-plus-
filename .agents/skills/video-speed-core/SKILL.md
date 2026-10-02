---
name: VideoSpeedPlus 影片倍速規格與樣式隔離字典 (VideoSpeedPlus Core Spec)
description: 定義 chrome_video speed plus 插件之倍速控制核心、Shadow DOM 樣式隔離、快捷鍵監聽與 Storage 配置 SSOT。
triggers: [video speed, 影片倍速, youtube倍速, videospeedplus, 倍速播放, 影片控制器]
dependencies: []
ssot_dependencies: ["chrome_video speed plus/VIDEOSPEED_README.md"]
---

# 專家技能：VideoSpeedPlus 影片倍速規格與樣式隔離字典 (VideoSpeedPlus Core Spec)

本技能為 `chrome_video speed plus` 插件的 Single Source of Truth (SSOT)，規範其全網 HTML5 影片控制器注入、Shadow DOM 樣式隔離技術、快捷鍵配置與獨立儲存模型。

---

## 1. 專案技術規格 (Tech Stack & Architecture)
* **目錄位置**: `./chrome_video speed plus/`
* **架構風格**: 純原生 Vanilla JS + Shadow DOM 實體隔離（零依賴、無構建打包）
* **擴充功能入口 (Extension Entrypoints)**:
  * `manifest.json`: Manifest V3，宣告 `storage`, `activeTab`, `scripting`，並配置全域 `<all_urls>` content script。
  * `content.js`: 核心控制器，負責 DOM 探測 `<video>`、動態掛載 OSD 控制條與快捷鍵攔截。
  * `popup.html` / `popup.js`: 點擊插件圖示之微型調整面版，設定預設倍速、步進單位與自訂快捷鍵。

---

## 2. 核心技術與 DOM 樣式隔離機制 (Shadow DOM Isolation)
* **宿主樣式污染防護**:
  - OSD (On-Screen Display) 控制懸浮面板必須建立在獨立的 `ShadowRoot` (例如 `element.attachShadow({ mode: 'open' })`) 內部。
  - 所有控制器 CSS 樣式必須內嵌於 Shadow DOM，**嚴禁**全域污染宿主網頁（如 YouTube, Bilibili, Netflix）的 CSS。
* **動態 Video 探測與生命週期監聽**:
  - 透過 `MutationObserver` 自動監聽網頁非同步載入之 `<video>` 標籤（包含 SPA 單頁應用、動態廣告切換、動態換集）。
  - 對 `<video>` 進行事件代理（`play`, `ratechange`, `loadedmetadata`），保證倍速狀態持續生效。

---

## 3. 資料模型與儲存 SSOT (Storage Schema)
所有數據儲存於獨立之 `chrome.storage.local` 或 `chrome.storage.sync`：

### 主要儲存鍵值 (Storage Keys)
1. `vsp_default_speed`: `number` (預設播放倍速，如 `1.0`, `1.25`, `1.5`, `2.0`)
2. `vsp_speed_step`: `number` (快捷鍵每次微調步進值，如 `0.1` 或 `0.25`)
3. `vsp_shortcuts`: `Record<string, string>` (快捷鍵映射表，如加速、減速、重置為 1.0、隱藏 OSD、收集字幕)
4. `vsp_site_overrides`: `Record<domain, { speed: number, disabled: boolean }>` (特定網域專屬倍速記憶)
5. `vsp_bookmarks`: `Array<{ id, videoId, videoTitle, url, timeSeconds, timeFormatted, note, createdAt }>` (法說會與影音時間標記儲存清單)
6. `scrumclockExtensionId`: `string` (選填，快取指定之 ScrumClock Extension ID，供跨插件通訊使用)

---

## 4. 跨插件筆記收集協定 (Cross-Plugin COLLECT_NOTE Spec)
遵循工作區黑盒通訊契約（`0.doc_mg/docs/cross_plugin_contract.md`），對 `chrome_scrumclock` 進行純資料傳遞：
* **發送機制**: `chrome.runtime.sendMessage(targetExtId, { protocolVersion: 1, type: 'COLLECT_NOTE', payload: {...} })`
* **防腐層 (Sanitizer)**:
  - 欄位白名單：`source`, `title`, `url`, `currentTime`, `text`, `tags`, `type`
  - 嚴格長度限制截斷（標題 <= 200 字，URL <= 500 字，文本 <= 20,000 字），防止惡意載荷或溢位。
* **字幕與內容萃取優先序**:
  1. YouTube 逐字稿面板 (`ytd-transcript-segment-renderer`)：依播放秒數自動擷取鄰近上下文。
  2. 即時畫面字幕 (`.ytp-caption-segment`)：擷取當前播放畫面呈現之文字。
  3. 標準 HTML5 `<track>` 兜底：讀取 `activeCues` 文本。
  4. 兜底回退：若無字幕則自動輸出帶有當前播放秒數與時間戳 URL 之精簡影片註記。
* **快捷鍵規格**: `Alt + S` 或 `Ctrl + Shift + S`（輸入欄位中自動避讓）。

---

## 5. 邊界與隔離防護準則 (Isolation Hard Rules)
1. **單一插件專注**: 開發 VideoSpeedPlus 時，禁止直接讀寫 ScrumClock 之內部代碼與私有資料庫，所有互動僅限於標準跨插件通訊契約。
2. **純淨原生約束**: 維持無打包純 JS 結構，避免依賴外部龐大函式庫，確保在各大影音平台毫秒級載入。
3. **優雅降級**: 當目標插件離線或未安裝時，必須有 6 秒超時保護與非阻塞 Notification 提示，嚴禁阻斷主播放功能。
