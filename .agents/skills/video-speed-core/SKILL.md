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
3. `vsp_shortcuts`: `Record<string, string>` (快捷鍵映射表，如加速、減速、重置為 1.0、隱藏 OSD)
4. `vsp_site_overrides`: `Record<domain, { speed: number, disabled: boolean }>` (特定網域專屬倍速記憶)

---

## 4. 邊界與隔離防護準則 (Isolation Hard Rules)
1. **單一插件專注**: 開發 VideoSpeedPlus 時，禁止讀寫 ScrumClock 或 FinanceClipper 之代碼與資料。
2. **純淨原生約束**: 維持無打包純 JS 結構，避免依賴外部函式庫，確保在各大影音平台毫秒級載入。
