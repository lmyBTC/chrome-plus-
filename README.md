# 🌐 Chrome Plus Workspace (Chrome 插件多專案工作區)

本工作區採用 Monorepo 結構管理多款現代化 Chrome 瀏覽器擴充功能（Manifest V3）。為大幅**降低 AI 輔助開發時的 Token 消耗**並**提高程式碼定位準確度**，本文件提供整個工作區與各專案之快速索引地圖。

---

## 🧭 工作區子專案快速導航

| 專案目錄 | 插件名稱 | 核心技術棧 | 核心功能概述 | 精準索引指針 |
| :--- | :--- | :--- | :--- | :--- |
| [`chrome_scrumclock/`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/) | **ScrumClock (Power Kit)** | React 18, TypeScript, Vite, TailwindCSS | 敏捷番茄鐘、每日任務規劃、AI 側邊欄、工具箱 (圖片下載)、Gemini 對話匯出等 8 大模組 | 👉 [ScrumClock 完整索引](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/README.md) |
| [`chrome_video speed plus/`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_video%20speed%20plus/) | **Video Speed Plus** | 原生 JavaScript, Manifest V3 | 網頁影片播放倍速調整與快速鍵控制 | 👉 [manifest.json](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_video%20speed%20plus/manifest.json) |
| [`finance-research-clipper-oss/`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/) | **Finance Research Clipper** | 原生 JavaScript, Manifest V3 | 財經研報剪報、重點標註與資料擷取 | 👉 [manifest.json](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/manifest.json) |
| [`0.doc_mg/`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/) | **專案管理與自動化工具** | Python 3 | Manifest V3 自動審計工具、任務協議管理 (Task Protocol) | 👉 [審計工具說明](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/tools/audit_manifests.py) |

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

## 🎯 AI 開發 Token 節約原則 (必讀)

1. **查表優先，嚴禁盲目目錄遍歷**：
   - 開發特定功能時，先查閱各子目錄之 `README.md` 與速查表，直接以 `view_file` (指定 `StartLine`/`EndLine`) 讀取目標檔案，切勿使用全域 grep 或重複列出目錄。
2. **門面匯出規範 (Barrel Pattern)**：
   - 跨模組調用元件或型別時，一律透過 `@/features/[module]` 匯入，禁止引用模組內部私有子路徑。
3. **無損重構規範**：
   - 嚴禁刪除任何歷史程式碼或測試腳本，所有整理檔案一律收整至該模組之 `dev-tools/` 或 `types.ts`。
