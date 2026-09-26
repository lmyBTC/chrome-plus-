# 🌐 Chrome Plus Workspace (Chrome 插件多專案工作區)

本工作區採用 Monorepo 結構管理多款現代化 Chrome 瀏覽器擴充功能（Manifest V3）。為大幅**降低 AI 輔助開發時的 Token 消耗**並**提高程式碼定位準確度**，本文件提供整個工作區與各專案之快速索引地圖。

---

## 🧭 工作區子專案快速導航

| 專案目錄 | 插件名稱 | 核心技術棧 | 核心功能概述 | 專屬手冊 (README) | 專屬 SSOT 技能 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chrome_scrumclock/` | **ScrumClock (Power Kit)** | React 18, TS, Vite, TailwindCSS | 敏捷番茄鐘、每日任務規劃、AI 側邊欄、實用工具箱整合（活動監控分頁、研報/字幕採集適配層）、自選股即時小工具 | 👉 `chrome_scrumclock/SCRUMCLOCK_README.md` | 🧠 `scrumclock-core` (`.agents/skills/scrumclock-core/`) |
| `browser-activity-monitor/` | **Browser Activity Monitor** | 原生 JS, Manifest V3 (零依賴) | 80% 原生常駐監控（網路流量/下載行為/原生權限審查）、20% 隨選深入探針、Side Panel 即時面板 | 👉 `browser-activity-monitor/ACTIVITY_MONITOR_README.md` | 🧠 `activity-monitor-core` (`.agents/skills/activity-monitor-core/`) |
| `chrome_video speed plus/` | **Video Speed Plus** | 原生 JS, Manifest V3, Shadow DOM | 全網 HTML5 影片播放倍速調整 (0.1x~16x)、快捷鍵與 A-B 循環 | 👉 `chrome_video speed plus/VIDEOSPEED_README.md` | 🧠 `video-speed-core` (`.agents/skills/video-speed-core/`) |
| `finance-research-clipper-oss/` | **Finance Research Clipper** | 原生 JS, Manifest V3 (零依賴) | Google/Yahoo/Goodinfo 多合一深度爬蟲、分析師目標價、財報矩陣、AI 研報採集 | 👉 `finance-research-clipper-oss/FINANCE_CLIPPER_README.md` | 🧠 `finance-clipper-core` (`.agents/skills/finance-clipper-core/`) |
| `0.doc_mg/` | **專案管理與契約協定** | Python 3 | MV3 自動審計工具、任務協議管理 (Task Protocol)、跨插件黑盒通訊契約 | 👉 跨插件通訊契約 (`0.doc_mg/docs/cross_plugin_contract.md`) | 🧠 `task-protocol` (`.agents/skills/task-protocol/`) |

---

## ⚡ 常用指令速查 (CLI Cheat Sheet)

```bash
# 1. 全專案 Manifest V3 安全與合規審計 (必跑)
py 0.doc_mg/tools/audit_manifests.py

# 2. ScrumClock 專案建置與型別校驗
cd chrome_scrumclock
npm run build          # 執行 tsc && vite build
npx tsc --noEmit       # 純型別校驗 (超快速，不產出檔案)
```

---

## 🛡️ AI 防上下文污染與多插件邊界隔離規範 (Hard Rules)

1. **AI 視野邊界隔離（禁止跨目錄讀取無關代碼）**：
   - 當前開發特定插件（如 `finance-research-clipper-oss`）時，AI 只能讀寫該插件目錄之檔案，**嚴禁跨專案檢索或讀取其他無關插件的源碼**，避免 Token 浪費、上下文污染與邏輯混淆。
2. **黑盒契約驅動（Contract-First）**：
   - 跨插件協同僅透過 `0.doc_mg/docs/cross_plugin_contract.md` 定義的純資料通信協定進行，將對端視為獨立黑盒子，嚴禁跨專案直接 `import / require` 或存取內部實作。
3. **資料與儲存實體隔離（Zero Cross-Pollution）**：
   - 各插件專屬 `chrome.storage.local` 或 `IndexedDB` 保持 100% 獨立，嚴禁共享或跨插件寫入對端資料庫。跨插件資料一律採防禦性單向只讀快照（Defensive Copy）。
4. **零依賴與優雅降級（Graceful Degradation）**：
   - 各插件必須保持 100% 獨立編譯、獨立發布。若對端插件未安裝或當機，核心功能不受任何影響，跨插件模組自動安全降級。
5. **防誤讀專屬前綴機制**：
   - 所有子插件核心架構說明一律冠上專屬前綴（如 `SCRUMCLOCK_README.md`、`ACTIVITY_MONITOR_README.md`、`VIDEOSPEED_README.md`、`FINANCE_CLIPPER_README.md`），子目錄下 `README.md` 僅保留極簡導航存根。
6. **查表與技能優先，嚴禁盲目目錄遍歷**：
   - 開發特定功能時，先載入對應專屬 Skill 或查閱專屬前綴手冊，直接以 `view_file` (指定 `StartLine`/`EndLine`) 讀取目標檔案，切勿使用全域 grep 或重複列出目錄。

