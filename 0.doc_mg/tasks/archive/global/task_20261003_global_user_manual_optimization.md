---
title: "優化 Chrome Plus 完整使用說明書 (User Manual)"
plugin: "global"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-03"
---

## 1. 目標
針對《使用說明.md》進行使用體驗與入門引導優化，徹底消除初次使用的 4 大卡點與操作摩擦力：
1. **通訊配對前移**：將跨插件必備之「Extension ID 配對指引」從後方 FAQ 提前至「快速上手」核心章節。
2. **UI 入口可視化**：補齊 FinanceClipper 獨立儀表板 (`dashboard.html`) 與各插件 Sidepanel 的具體點擊進入路徑。
3. **AI 側邊欄前置說明**：補充 Chrome 內建 Gemini Nano 實驗旗標與外接 Gemini API Key 的設定方式。
4. **模組角色與關係定位**：釐清「Activity Monitor 獨立插件」與「ScrumClock 內建工具箱子模組」的適用場景與差異。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./使用說明.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (本任務為全域使用說明文件文字優化，無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 快速上手與通訊配對前移 狀態：`[已完成]`
- [x] 任務 1.1: 快速上手章節優化
    - [x] 於第 2 節新增「2.3 核心設定：一鍵通訊配對（填入 Extension ID）」步驟，附清楚之三步驟教學。
    - [x] 調整第 2.1 節 ScrumClock 建置門檻提示，備註預編譯/本地開發環境說明。

### Phase 2: UI 入口指引與操作細節完善 狀態：`[已完成]`
- [x] 任務 2.1: 補齊 FinanceClipper 入口路徑
    - [x] 於第 4.1 節補齊點擊瀏覽器工具列圖示開啟 Popup、點擊「開啟獨立儀表板」與右鍵開啟方式。
    - [x] 於第 5.3 節標註「一鍵收集字幕至 ScrumClock」需要先完成 2.3 節 Extension ID 設定之防呆提醒。

### Phase 3: AI 設定與模組架構釐清 狀態：`[已完成]`
- [x] 任務 3.1: 完善 AI 側邊欄與模組定位
    - [x] 於第 3.3 節補充 Gemini Nano 與 API Key 設定說明。
    - [x] 於第 1 節與第 6 節補充 Activity Monitor 獨立版（系統全域/流量監控）與 ScrumClock 工具箱子模組（單頁權限審查）之選用建議。

## 4. 影響評估
- 本任務僅針對 `./使用說明.md` 進行文字與章節指引強化，不改動任何插件程式碼，無 Chrome API 權限或擴充功能通訊衝擊。

## 5. 驗收標準
- [x] **技術指標**: 不涉及代碼改動，維持 Markdown 語法結構標準且超連結完整有效。
- [x] **核心規範**: 跨插件通訊設定、入口指引、AI 配置與架構定位皆準確無誤。
- [x] **檔案編碼**: 確認 `./使用說明.md` 儲存為 UTF-8 (無 BOM) 編碼。
- [x] **SSOT 閉環**: [x] [N/A] 輕量任務豁免（文檔純文字優化，L1~L3 免比對免回寫）。
- [ ] **L4 任務封存歸檔**: 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/global/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: 203b5c4a-a9a5-45b8-b4d0-73b28f291197 (初始化 Gate 1 Blueprint)
> - 2026-10-03 ID: 84467623-154f-458f-84e5-307b1bdd6b51 (完成 Phase 1 快速上手、校準 Zero-Config 與完成 Phase 2 入口指引)
> - 2026-10-03 ID: 01ff3127-93f2-410b-8957-739d7e48f818 (完成 Phase 3 AI 雙軌設定與 Activity Monitor 模組定位)
>
> **狀態摘要**:
> 全階段（Phase 1 ~ Phase 3）已全數執行完畢，所有說明書優化目標皆已落地。待使用者審閱確認後可進行 L4 封存歸檔。
