---
name: VideoSpeedPlus 影片倍速規格與樣式隔離字典 (VideoSpeedPlus Core Spec)
description: 定義 chrome_video speed plus 插件之核心定位、Shadow DOM 樣式隔離底線、架構入口與深層 SSOT 導航。
triggers: [video speed, 影片倍速, youtube倍速, videospeedplus, 倍速播放, 影片控制器]
dependencies: []
ssot_dependencies: ["chrome_video speed plus/VIDEOSPEED_README.md", "0.doc_mg/docs/cross_plugin_contract.md"]
---

# 專家技能：VideoSpeedPlus 影片倍速規格與樣式隔離字典 (VideoSpeedPlus Core Spec)

本技能為 `chrome_video speed plus` 插件之輕量調用索引。所有詳細資料模型 (Storage Schema)、Shadow DOM 懸浮元件、快捷鍵字典與通訊細節已沉澱至專屬 SSOT 文檔。

## 1. 核心定位與技術棧 (Tech Stack)
* **目錄路徑**: `chrome_video speed plus/`
* **架構風格**: 純原生 Vanilla JS + Shadow DOM 實體隔離（零依賴、無打包建置、MV3）
* **執行模式**: 直接載入未封裝項目

## 2. 關鍵入口架構 (Key Entrypoints)
* `manifest.json`: Manifest V3 宣告，配置全域 `<all_urls>` / YouTube content scripts
* `content.js`: 核心控制器，DOM `<video>` 探測、掛載 Shadow DOM 懸浮控制條、快捷鍵攔截與跨插件通訊
* `popup.html` / `popup.js`: 彈出微型設定面板（速度、步進、A-B 循環與 ScrumClock 整合）

## 3. 邊界防禦與隔離禁忌 (Hard Rules)
1. **Shadow DOM 絕對隔離**: 控制器懸浮面板與輸入視窗必須建立在獨立 `ShadowRoot` 內，嚴禁 CSS 全域污染宿主網頁。
2. **純淨原生約束**: 維持無打包純 Vanilla JS 結構，禁止引入重量級打包工具或龐大第三方函式庫。
3. **黑盒契約通訊**: 跨插件協同僅透過 `0.doc_mg/docs/cross_plugin_contract.md` 規範傳遞純資料（`COLLECT_NOTE`），禁止跨目錄讀寫外部插件源碼或私有儲存。

## 4. 深層 SSOT 導航 (Deep Reference)
* **完整規格、快捷鍵映射、Storage Schema 與通訊細節**: 詳見 `chrome_video speed plus/VIDEOSPEED_README.md`
