# 🍅 Scrumclock 瑞士刀：高效工作者的 AI 敏捷專注助理

Scrumclock 是一款專為「頂尖高效工作者 (Hyper-Productive Worker / 10x Developer)」量身打造的 Chrome 擴充功能。它將**敏捷管理 (Scrum)**、**時間箱防禦 (Time-Boxing)**、**24 小時人生重啟系統 (MIT 焦點模式)** 與 **本地 AI 專案助理** 融為一體，完全在 Client 端安全運行。

---

## 📚 專案文件導覽 (Documentation)

為減輕認知負荷並便於維護，本專案的詳細規格與功能說明已拆分至以下文件：

*   **[🧑‍💻 使用者故事與未來藍圖 (user-story-spec.md)](user-story-spec.md)**
    *   記載核心人物誌 (Persona)、10 大已實現之核心功能模組、以及未來發展路徑 (Roadmap)。
*   **[🏗️ 系統架構與工作流設計 (workflow-flowchart.md)](workflow-flowchart.md)** 
    *   (視覺化網頁版：[workflow-flowchart.html](workflow-flowchart.html))
    *   記載系統架構與資料流向圖、番茄鐘狀態生命週期、以及專案目錄與元件通訊。
*   **[🤖 AI 專案更新說明手冊 (ai-feature-update-guide.md)](ai-feature-update-guide.md)**
    *   記載開發與更新功能時的標準檢查清單，確保多個文件間的狀態同步。
*   **[💬 Gemini 網頁對話監聽規格 (gemini-content-spec.md)](gemini-content-spec.md)**
    *   記載 `geminiContent.ts` 擷取對話與懸浮 Widget 的技術實作及安全防護。
*   **[🧠 Gemini Nano 工具指南 (gemini-nano-tool.md)](gemini-nano-tool.md)**
    *   記載本地 Prompt API 呼叫、狀態管理與多版本 Chrome 的相容處理方案。
*   **[📅 Google Apps Script 整合規格 (google-apps-script.md)](google-apps-script.md)**
    *   記載 Google 日曆「會議防禦陣地」的排程防禦技術。
*   **[🎨 深色主題設計系統 (dark_theme_design_system.md)](dark_theme_design_system.md)**
    *   記載 Tailwind CSS 全域樣式、Glassmorphism 美學與設計規範。

---

## 🚀 快速開始 (Quick Start)

### 1. 建置與安裝
1. 進入 `chrome_scrumclock` 目錄，執行 `npm install` 安裝依賴。
2. 執行 `npm run build` 編譯專案，產出 `dist/` 目錄。
3. 於 Chrome 網址列輸入 `chrome://extensions/` 開啟擴充功能管理，啟用「開發者模式」。
4. 點擊「載入未封裝擴充功能」，選擇本專案的 **`dist`** 資料夾即可安裝啟用。

### 2. 配置 Google 帳號與 AI 助理
*   **Google 帳號雙向同步**：系統預設為本地單機模式，開啟新分頁直接載入儀表板。如需啟用 Google Tasks / Calendar 雙向同步，請至「⚙️ 全域系統設定」點選「🤖 AI 與雲端同步」頁籤進行自主登入或登出。
*   **內建 Gemini Nano**：支援最新 Chrome 內建的 Prompt API，請至 `chrome://flags` 啟用 `Optimization Guide On Device Model` 與 `Prompt API for Gemini Nano`。
*   **自備 Gemini API Key**：若不支援內建 AI，可於設定面板填入免費的 Gemini API Key。

---

## 📁 目錄與檔案結構 (Project Structure)

本專案採用現代化多入口 Chrome 擴充功能物理聚合 (Co-location) 架構：

```text
chrome_scrumclock/
├── dist/                # 編譯產出目錄 (載入 Chrome 的目標)
├── docs/                # 技術與規格文件 (細節已拆分至各 markdown)
├── public/              # 靜態資源 (manifest.json, blocked.html 與圖示)
├── src/
    │   ├── entries/         # 多入口頁面物理聚合區
    │   │   ├── newtab/      # 新分頁 MIT 焦點模式儀表板 (React)
    │   │   ├── popup/       # 瀏覽器圖示點擊彈窗 (React)
    │   │   ├── sidebar/     # 側欄助理 (React)
    │   │   └── options/     # 獨立全域系統設定頁 (React)
    │   ├── components/      # 跨頁面共享 React UI 元件
    │   ├── core/            # 核心系統層 (Chrome API 封裝、同步服務、API 配接器)
    │   ├── App.tsx          # 共享入口的 React 主根元件
    │   ├── background.ts    # Background Service Worker (背景計時核心與安全分發)
    │   ├── content.ts       # 網頁通用內容注入腳本
    │   ├── geminiContent.ts # Gemini 官方網頁專屬對話抓取與 Widget
    │   └── index.css        # 全域 TailwindCSS 樣式
├── vite.config.ts       # Vite 多入口編譯配置
└── tsconfig.json        # TypeScript 配置
```