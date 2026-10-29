# 🎬 YouTube Speed Plus (Video Speed Plus)

> 專為影音研報與 YouTube 播放控制打造的極速倍速控制器與 A-B 循環插件 (Manifest V3)

---

## 🛠️ 技術棧與架構原則 (Tech Stack & Principles)
* **核心技術**: 純原生 Vanilla JS + Shadow DOM 物理隔離（零打包、零依賴）
* **擴充規範**: Chrome Extension Manifest V3 (`storage`, `activeTab`, `scripting`, `content_scripts`)
* **執行模式**: 無構建直接載入（直接於 Chrome 擴充功能頁面載入未封裝項目）

---

## 🧭 核心架構入口 (Extension Entrypoints)
* `manifest.json`: Manifest V3 擴充配置宣告
* `content.js`: 核心控制器，DOM 探測 `<video>`、掛載 Shadow DOM 懸浮控制條、快捷鍵攔截與跨插件通訊
* `popup.html` / `popup.js`: 點擊圖示面板，速度選擇、A-B 循環控制與 ScrumClock 連線設定

---

## 📖 完整規格與 SSOT 導航 (Deep SSOT Reference)
本插件所有詳細資料模型 (Storage Schema)、Shadow DOM 隔離技術細節、全域鍵盤快捷鍵映射、法說會打點與跨插件通訊協定，請查閱：
👉 **`VIDEOSPEED_README.md`** (本插件 Single Source of Truth)