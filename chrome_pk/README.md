# 🍅 ScrumClock (ScrumClock Power Kit)

> 專為高效專注與敏捷交付打造的 Chrome 側邊欄番茄鐘與看板系統 (Manifest V3)

---

## 🛠️ 技術棧與建置 (Tech Stack & Build)
* **核心框架**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide React
* **擴充規範**: Chrome Extension Manifest V3 (SidePanel, Alarms, Storage, WebRequest, Scripting)
* **建置指令**:
  * 開發熱重載: `npm run dev`
  * 正式打包: `npm run build` (產出至 `dist/`)

---

## 🧭 核心架構入口 (Extension Entrypoints)
* `src/background.ts`: Service Worker 入口，事件路由、Alarms、跨插件訊息分流
* `src/entries/sidebar/`: 側邊欄主視圖 (SidePanel API)，支援工具箱 (`ToolboxHub`) 與 PK+ 助理 (`AIAssistantView`)
* `src/entries/newtab/`: 新分頁儀表板視圖
* `src/dashboard/components/BoardView.tsx`: 極簡 4 欄流轉 GTD 敏捷看板
* `src/features/scrumclock/components/SprintPomodoro.tsx`: 25 分鐘衝刺計時面板與焦點戰役

---

## 📖 完整規格與 SSOT 導航 (Deep SSOT Reference)
本插件所有詳細資料模型 (Storage Schema)、8 大垂直切片元件速查矩陣、跨插件通訊中樞協議與巨石檔案熱區警示，請查閱：
👉 **`SCRUMCLOCK_README.md`** (本插件 Single Source of Truth)

