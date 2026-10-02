---
title: "投研數據引擎升級、跨插件工作流與 0.doc_mg 自動化管線"
plugin: "global"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-10"
---

## 1. 目標
將現有前端 Chrome 插件群（FinanceClipper、VideoSpeedPlus、ScrumClock）與 0.doc_mg 工具鏈深度整合，打造端到端的專業投研自動化工作流：
1. 強化 FinanceClipper 資料引擎：前端即時運算目標價共識度（均值、中位數、上漲空間、標準差）與一鍵結構化 AI 投研 Prompt 匯出。
2. 建立 0.doc_mg 核心自動化管線：開發 Python 合約驗證器 (`validate_contract.py`) 與多格式轉譯器 (`export_converter.py`)，實現快照自動轉為 Obsidian/Markdown 投研筆記與量化分析 CSV。
3. 擴充 VideoSpeedPlus 聽打與標記：支援法說會/財經影音快捷鍵時間戳記打點，並可導出標準 Markdown 筆記。
4. 升級 ScrumClock 投研看板：接收/載入 Clipper 產出之結構化快照，提供自選股價位偏離檢視與專注研究番茄鐘聯動。

## 2. 策略與鎖定檔案
以 `0.doc_mg/docs/cross_plugin_contract.md` 為唯一真理源 (SSOT)，各插件嚴格保持 100% 獨立編譯與運行隔離。資料交換以標準 JSON 快照及無依賴 Python 管線完成。

### 鎖定檔案 (Target Files)
- `finance-research-clipper-oss/popup-scraper.js`
- `finance-research-clipper-oss/popup-export.js`
- `finance-research-clipper-oss/aiClient.js`
- `finance-research-clipper-oss/popup.html`
- `finance-research-clipper-oss/popup.js`
- `0.doc_mg/tools/validate_contract.py`
- `0.doc_mg/tools/export_converter.py`
- `0.doc_mg/docs/cross_plugin_contract.md`
- `chrome_video speed plus/content.js`
- `chrome_video speed plus/options.html`
- `chrome_scrumclock/src/components/WatchlistWidget.tsx`

## 3. 任務拆解

### Phase 1: FinanceClipper 數據引擎強化（目標價運算與 AI Prompt 注入）狀態：`[已完成]`
- [x] 任務 1.1: 目標價統計計算函式庫
    - [x] 於 `popup-scraper.js` / `popup-export.js` 實現目標價陣列解析、中位數、平均值、現價上漲空間（Upside %）與標準差/離散係數計算
    - [x] 將統計量注入 `sanitizeToMinerSchema` 及快照 Payload 結構
- [x] 任務 1.2: AI 投研摘要 Prompt 範本注入與一鍵複製
    - [x] 於 `aiClient.js` 擴充結構化 Prompt 產生器（涵蓋多空論點、催化劑、風險與財務矩陣）
    - [x] 於 `popup.html` / `popup.js` 提供「複製 AI 投研 Prompt」按鈕與剪貼簿操作回饋

### Phase 2: 0.doc_mg 自動化合約校驗與多格式轉譯管線 狀態：`[已完成]`
- [x] 任務 2.1: JSON Schema 合約自動校驗器 (`validate_contract.py`)
    - [x] 實作驗證腳本，依據 `cross_plugin_contract.md` 定義檢查快照 JSON 結構完整性與欄位型別
    - [x] 支援 CLI 批次檢核檔案或目錄
- [x] 任務 2.2: 多格式匯出轉譯器 (`export_converter.py`)
    - [x] 實作 JSON 轉譯為 Obsidian Markdown 投研筆記（含 YAML Frontmatter、Dataview 相容標籤）
    - [x] 實作 JSON 轉量化分析專用 CSV 攤平輸出

### Phase 3: VideoSpeedPlus 法說會影音打點與 Markdown 導出 狀態：`[已完成]`
- [x] 任務 3.1: 影片時間標記核心（Timestamp Bookmarking）
    - [x] 於 Content Script 加入快捷鍵監聽，抓取 HTML5 `<video>` 當前 `currentTime` 與影片標題
    - [x] 支援彈出輕量輸入框記錄 Key Takeaway 並儲存至 `chrome.storage.local`
- [x] 任務 3.2: 影音筆記 Markdown 格式化匯出
    - [x] 格式化輸出包含跳轉連結或秒數標記的 Markdown 摘要筆記

### Phase 4: ScrumClock 投研看板與番茄鐘研究聯動 狀態：`[已完成]`
- [x] 任務 4.1: 自選股看板快照載入器
    - [x] 支援匯入 Clipper 快照 JSON 並於側邊欄展示標的、現價 vs 共識目標價偏離程度
- [x] 任務 4.2: 深度研究番茄鐘聯動
    - [x] 點選標的自動綁定研究清單 (Checklist)，番茄鐘倒數結束產出該次專注紀錄

## 4. 影響評估
- 各插件繼續維持 100% 獨立編譯與運行，不增加跨擴充套件的直接代碼依賴。
- 0.doc_mg Python 腳本為離線工具，不影響 Chrome MV3 擴充套件之執行效能與上架合規。
- 前端新增之數學運算與 Prompt 生成均為純函式，無宿主網頁 CSS/JS 污染風險。

## 5. 驗收標準
- [x] **技術指標**: 目標價計算結果精確（中位數、均值、標準差），能安全處理缺漏值與非數值輸入。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無跨域或非法權限注入。
- [x] **工具檢驗**: `0.doc_mg/tools/validate_contract.py` 能成功校驗合格與不合格的測試快照 JSON。
- [x] **轉譯驗證**: `0.doc_mg/tools/export_converter.py` 產出之 Markdown 筆記在 Obsidian 中能正確讀取 YAML Frontmatter。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 文件同步**: 完成後同步更新 `0.doc_mg/docs/cross_plugin_contract.md` 與相關插件之 README。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: f45b09f9-b76e-4da0-96c9-0dbaae108983 (初始化)
> - 2026-10-02 ID: a5380e6a-b59e-44d8-b552-e33cfa03cdb8 (Phase 1 執行完成)
> - 2026-10-02 ID: 83b6b649-90c9-4822-aaab-a899596aff94 (Phase 2 執行完成)
> - 2026-10-02 ID: 6142686d-c341-442b-b227-5b4c3e7d9bb3 (Phase 3 執行完成)
> - 2026-10-02 ID: a8d3de17-3639-4f91-a670-2e2662482296 (Phase 4 執行完成，全案結案)
>
> **專案結案狀態**:
> 所有 Phase (Phase 1 至 Phase 4) 均已 100% 成功交付並完成回歸驗證。

