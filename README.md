# 🌐 Chrome Plus Workspace (Chrome 插件多專案工作區)

本工作區採用 Monorepo 結構管理多款現代化 Chrome 瀏覽器擴充功能（Manifest V3）。為大幅**降低 AI 輔助開發時的 Token 消耗**並**提高程式碼定位準確度**，本文件提供整個工作區與各專案之快速索引地圖。

---

## 🧭 工作區子專案快速導航

| 專案目錄 | 插件名稱 | 核心技術棧 | 核心功能概述 | 精準索引指針 (防污染唯一命名) |
| :--- | :--- | :--- | :--- | :--- |
| [`chrome_scrumclock/`](chrome_scrumclock/) | **ScrumClock (Power Kit)** | React 18, TypeScript, Vite, TailwindCSS | 敏捷番茄鐘、每日任務規劃、AI 側邊欄、工具箱 (圖片下載)、Gemini 對話匯出等 8 大模組 | 👉 [**`SCRUMCLOCK_README.md`**](chrome_scrumclock/SCRUMCLOCK_README.md) |
| [`chrome_video speed plus/`](chrome_video%20speed%20plus/) | **Video Speed Plus** | 原生 JavaScript, Manifest V3 | 網頁影片播放倍速調整 (0.1x~16x) 與 A-B 區間循環控制 | 👉 [**`VIDEOSPEED_README.md`**](chrome_video%20speed%20plus/VIDEOSPEED_README.md) |
| [`finance-research-clipper-oss/`](finance-research-clipper-oss/) | **Finance Research Clipper** | 原生 JavaScript, Manifest V3 | Google Finance 4合1 SPA 深度走訪、分析師目標價、財報矩陣、AI 研報採集與 GAS 雲端/本地導出 | 👉 [**`FINANCE_CLIPPER_README.md`**](finance-research-clipper-oss/FINANCE_CLIPPER_README.md) |
| [`0.doc_mg/`](0.doc_mg/) | **專案管理與自動化工具** | Python 3 | Manifest V3 自動審計工具、任務協議管理 (Task Protocol) | 👉 [審計工具說明](0.doc_mg/tools/audit_manifests.py) |

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

## 🛡️ AI 防上下文污染與 Token 節約原則 (必讀)

1. **防誤讀專屬前綴機制**：
   - 為杜絕 AI 檢索時將不同插件之說明文件搞混，所有子插件核心架構說明一律冠上專屬前綴（如 `SCRUMCLOCK_README.md`、`VIDEOSPEED_README.md`、`FINANCE_CLIPPER_README.md`）。
   - 各子目錄下的 `README.md` 僅保留極簡導航存根，避免任何上下文污染。
2. **查表優先，嚴禁盲目目錄遍歷**：
   - 開發特定功能時，先查閱上述專屬前綴手冊與速查表，直接以 `view_file` (指定 `StartLine`/`EndLine`) 讀取目標檔案，切勿使用全域 grep 或重複列出目錄。
3. **門面匯出規範 (Barrel Pattern)**：
   - 跨模組調用元件或型別時，一律透過 `@/features/[module]` 匯入，禁止引用模組內部私有子路徑。
4. **無損重構規範**：
   - 嚴禁刪除任何歷史程式碼或測試腳本，所有整理檔案一律收整至該模組之 `dev-tools/` 或 `types.ts`。
