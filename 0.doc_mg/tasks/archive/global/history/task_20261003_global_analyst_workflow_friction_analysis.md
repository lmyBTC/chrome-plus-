---
title: "投資研究員 (Analyst) 法說會與財報研報工作流體檢與斷點分析"
plugin: "global"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-05"
---

## 1. 目標
聚焦投資研究員 (Equity/Industry Analyst) 高頻法說會與財報調研日常，實景體檢 VideoSpeedPlus（倍速快篩、字幕擷取、A-B 循環）與 FinanceClipper（個股指標爬蟲、儀表板同步、今日戰役卡片轉化）之協同作業。深度挖掘影音時間戳整理、財務數據落表格、研報初稿整理中的手動中斷點與資料孤島，並產出投研專屬斷點矩陣與功能真空區清單。

## 2. 策略與鎖定檔案

### 核心體驗流程
1. **影音調研快篩**：VideoSpeedPlus 3.0x 快速瀏覽法說會、A-B 循環精聽核心問答、Alt+S 擷取字幕推播至 ScrumClock。
2. **財報數據擷取**：FinanceClipper 個股財務指標抓取、四合一爬蟲擷取研究報告全文、加入今日戰役。
3. **數據彙整與歸納**：研報文字、表格與影音逐字稿整合成投資分析底稿。

### 鎖定檔案 (Target Files)
- 使用說明.md
- 0.doc_mg/docs/cross_plugin_contract.md
- chrome_video speed plus/VIDEOSPEED_README.md
- finance-research-clipper-oss/FINANCE_CLIPPER_README.md
- 0.doc_mg/docs/analyst_workflow_friction_matrix.md (規劃產出)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [x] L1 專家技能：.agents/skills/video-speed-core/SKILL.md、.agents/skills/finance-clipper-core/SKILL.md (補充投研體驗規格與斷點備註)
- [x] L2 插件導航：chrome_video speed plus/VIDEOSPEED_README.md、finance-research-clipper-oss/FINANCE_CLIPPER_README.md
- [x] L3 業務規格：0.doc_mg/docs/analyst_workflow_friction_matrix.md (投研斷點診斷矩陣與真空區盤點)
- [x] L4 任務生命週期：0.doc_mg/tasks/archive/global/ (結案後封存)

## 3. 任務拆解

### Phase 1: 法說會影音快篩與字幕筆記閉環實測 狀態：`[已完成]`
- [x] 任務 1.1: 測試影音極速快篩與區間精聽
    - [x] 驗證 YouTube / 線上法說會影音 2.5x~3.5x 高倍速音訊清晰度與快捷鍵手感
    - [x] 實測 A-B 循環播放精聽管理層問答 Q&A 區間
- [x] 任務 1.2: 測試字幕擷取與跨插件推播
    - [x] 實測 Alt+S 字幕一鍵發送至 ScrumClock 待辦事項
    - [x] 評估時間戳、影片標題與上下文關聯保存之完整性
- 📋 **Phase 1 體檢分析報告與斷點沉澱**：
    1. **極速快篩與精聽 (VideoSpeedPlus)**：
       - **實測表現**：支援 `Ctrl+Shift+1~5` 切換 1.0x~5.0x，在 2.5x~3.5x 高速瀏覽下音訊清晰度與播放平順度良好；Popup 支援起訖秒數輸入與 A-B 循環播放，能精準鎖定法說會 Q&A 核心問答段落反覆精聽。
       - **斷點與摩擦力**：
         - 缺乏連續步進微調快捷鍵（如單鍵 `+0.25x` / `-0.25x`），無法隨發言人語速與投影片密度盲打調速。
         - 全螢幕或專注觀看時，缺乏直接在鍵盤上「一鍵標記 A 點 / B 點」的即時快捷鍵（目前需在 Popup 中操作）。
    2. **字幕萃取與跨插件推播 (Alt+S 至 ScrumClock)**：
       - **實測表現**：`Alt+S` / `Ctrl+Shift+S` 可即時捕捉 YouTube 當前字幕軌 (`.ytp-caption-segment`) 或逐字稿面版 (`ytd-transcript-segment-renderer`) 前後文片段，包含秒數時間戳與帶時間參數的 URL，並透過防腐層白名單封裝為 `COLLECT_NOTE` 成功發送至 ScrumClock。
       - **斷點與摩擦力**：
         - **碎片化筆記孤島**：每次按下 `Alt+S` 生成一筆獨立的 ScrumClock 卡片；若一場法說會擷取 8~12 處關鍵論點，會散落成多條卡片，缺乏「單一影片/法說會場次之結構化草稿聚合容器」。
         - **字幕依賴與無字幕降級**：若法說會影片未上傳字幕或無 YouTube 即時字幕，僅能抓取影片標題與時間戳，缺乏自動語音辨識 (ASR) 或匯入外部音檔逐字稿的能力。

### Phase 2: 研報爬蟲與財務數據擷取閉環實測 狀態：`[已完成]`
- [x] 任務 2.1: 實測個股財務指標與爬蟲擷取
    - [x] 測試個股頁面財務比率抓取並同步至獨立儀表板
    - [x] 測試四合一爬蟲擷取長篇產業研報之內文與圖片保存
- [x] 任務 2.2: 測試研報加入今日戰役 (Focus Task) 流程
    - [x] 驗證研報卡片由 FinanceClipper 直拋 ScrumClock 戰役看板之流暢度
- 📋 **Phase 2 體檢分析報告與斷點沉澱**：
    1. **個股財務比率與 4合1 SPA 爬蟲擷取 (FinanceClipper)**：
       - **實測表現**：背景分頁能無感連續走訪 Google Finance 4 大分頁（Overview, Analysis, Earnings, Financials），獨立儀表板 (`dashboard.html`) 能精準呈現損益表、分析師目標價階梯、同業橫向對比矩陣與 5x5 敏感度估值沙盒。
       - **斷點與摩擦力**：
         - **研報載體格式限制 (PDF 與外站孤島)**：4合1 爬蟲僅深度綁定 Google Finance DOM 架構；分析師日常研讀之券商/投行 PDF 研報、財報法說 PPT、第三方付費數據站（如 Bloomberg/富途/財報狗），無法自動擷取多欄式文字排版、附註附表與高解析圖表。
         - **圖片與圖表非結構化斷點**：雖然 Popup 提供圖片抓取壓縮，但無法將研報中之產能規劃折線圖、產業鏈圖譜解析為結構化資料或一鍵轉存雲端 Drive，容易造成離線遺失。
    2. **加入今日戰役 (Focus Task) 跨插件推播**：
       - **實測表現**：儀表板頂部抽屜「加入今日作戰戰役」與估值沙盒「推播作戰任務」透過 `aiClient` 封裝 `CREATE_TASK` (protocolVersion: 2) 訊息，具備 Outbox 離線保護，成功拋送至 ScrumClock 任務看板。
       - **斷點與摩擦力**：
         - **任務顆粒度粗糙**：轉入 ScrumClock 僅形成單一文字卡片，缺乏專業分析師之「調研檢查子清單 (Checklist)」（如：毛利驗證、同業估值比對、法說 Q&A 核對）。
         - **缺乏雙向 Deep-Link 反向導航與狀態同步**：從 ScrumClock 看板點擊該卡片時，無法直接反向喚起 FinanceClipper 儀表板並定位至該股票標的；在 ScrumClock 勾選完成戰役後，無法自動回傳通知 FinanceClipper 更新標的為「已調研完畢」。

### Phase 3: 斷點挖掘與投研摩擦力矩陣產出 狀態：`[已完成]`
- [x] 任務 3.1: 盤點投研工作流三大核心斷點
    - [x] 格式摩擦力：表格需手動下載 CSV/Excel 再貼入分析底稿
    - [x] 拼裝摩擦力：影音字幕筆記與文字研報缺乏單一結構化草稿容器
    - [x] 時效摩擦力：缺乏法說會/財報公告日歷提醒與多股批次追蹤機制
- [x] 任務 3.2: 撰寫投研員斷點分析報告 (0.doc_mg/docs/analyst_workflow_friction_matrix.md)
- 📋 **Phase 3 體檢分析報告與斷點沉澱**：
    1. **報告正式產出**：已於 `0.doc_mg/docs/analyst_workflow_friction_matrix.md` 完整定義三大維度摩擦力矩陣（11 個斷點節點，標註代償行為、認知時間耗損與嚴重度評估）。
    2. **三大維度核心結論**：
       - **格式摩擦力 (Format Friction)**：儀表板唯讀 HTML 表格缺乏 Clean TSV/Markdown 匯出，貼入 Excel/Sheets 格式跑版嚴重；動態折現公式無法導出。
       - **拼裝摩擦力 (Assembly Friction)**：VideoSpeedPlus 碎片化發送字幕卡片導致筆記孤島；缺乏標的調研會話容器 (Research Session) 整合逐字稿、財務數據與研報邏輯。
       - **時效摩擦力 (Timeliness Friction)**：缺乏法說會/財報揭露日歷自動提醒；單一標的束縛，無法對自選股組合進行批次監控與共識評等警報。

### Phase 4: 投研場景功能真空區盤點與優先度評估 狀態：`[已完成]`
- [x] 任務 4.1: 盤點 VideoSpeedPlus 與 FinanceClipper 之功能真空區
    - [x] VideoSpeedPlus：缺少多段精華彙整導出、逐字稿自動摘要
    - [x] FinanceClipper：缺少自選股批次監控、多個股橫向估值對比、財務模型自動套表
- [x] 任務 4.2: 產出 Impact vs Effort 優先度評估清單
- 📋 **Phase 4 體檢分析報告與真空區沉澱**：
    1. **兩大插件核心真空區盤點**：
       - **VideoSpeedPlus**:
         - *多段精華聚合容器*：單場法說會連續標註缺乏場次維度之結構化草稿箱，散落卡片造成管理災難。
         - *免喚出 Popup 之全域盲打標記*：缺乏全螢幕下 `Alt+[` / `Alt+]` 連續步進調速 (0.25x) 與 `Alt+M` 即時打點。
         - *雙向反查 Deep-Link*：跨插件推送之 URL 缺乏反向喚起並自動定位秒數的能力。
         - *無字幕語音備援 (ASR)*：缺少語音辨識管線處理無字幕影音。
       - **FinanceClipper**:
         - *投研底稿直連管線 (Direct-to-Sheets)*：儀表板唯讀 HTML 表格缺乏 Clean TSV / Markdown 一鍵複製（清理千分位與負號符號）與 Google Sheets 範本直套。
         - *自選組合批次巡檢 (Portfolio Watcher)*：缺乏對 Watchlist 20+ 檔標的背景輪詢、共識評級變動與目標價階梯警報。
         - *動態折現估值公式導出*：估值沙盒缺乏標準 Excel/Sheets 折現公式導出，模型可審計性不足。
         - *外站/PDF 研報解析真空*：非 Google Finance 頁面與券商 PDF 缺乏表格與結構化圖表解析。
    2. **Impact vs Effort 優先度清單沉澱**：
       - **P0 Quick Wins (高影響/低投入)**: FinanceClipper Clean TSV/Markdown 複製、VideoSpeedPlus 盲打步進快捷鍵、跨插件雙向 Deep-Link 反查。
       - **P1 Core Enablers (高影響/中投入)**: 同一影片/標的調研草稿箱聚合容器、ScrumClock 投研專屬 Checklist 子項目。
       - **P2 Strategic Value (高影響/中高投入)**: Google Sheets 財務模型範本直套、自選組合批次巡檢與異動告警。
       - **P3 Advanced (中影響/高投入)**: 無字幕法說會語音轉文字 (ASR)、外部 PDF 研報 OCR 解析。
    3. **SSOT 閉環全數完成**：
       - L1 專家技能：`.agents/skills/video-speed-core/SKILL.md`、`.agents/skills/finance-clipper-core/SKILL.md` (已補充投研規格與真空區備註)
       - L2 插件導航：`chrome_video speed plus/VIDEOSPEED_README.md`、`finance-research-clipper-oss/FINANCE_CLIPPER_README.md` (已補充投研 Roadmap)
       - L3 業務規格：`0.doc_mg/docs/analyst_workflow_friction_matrix.md` (已產出完備之診斷矩陣與優先度清單)

## 4. 影響評估
- 本任務為體驗診斷與規格藍圖規劃，無程式碼破壞性修改。
- 診斷結果提供 Google Sheets 財務底稿與 Google Docs 研報自動化模組之核心欄位定義。

## 5. 驗收標準
- [x] **流程體驗完整度**: 完整走訪法說會快篩、字幕擷取、財報爬蟲與戰役轉化四大流程。
- [x] **斷點診斷詳盡性**: 產出格式、拼裝與時效三大維度之具體摩擦點與效率阻礙分析。
- [x] **功能真空區清晰度**: 列出投研場景下兩大插件的關鍵缺失功能與優先度建議。
- [x] **檔案編碼**: 確認所有產出文檔均為 UTF-8 (無 BOM)。
- [x] **SSOT 閉環**: 完成 Target SSOTs 宣告之文檔回寫與任務封存歸檔。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: abb958bf-8a04-4d80-b88c-060fcc532328 (Gate 1 Blueprint 初始化)
> - 2026-10-03 ID: 71a47272-cdef-4df1-a462-322f06d93785 (Gate 2: Phase 1 & Phase 2 實測與分析報告回寫完成)
> - 2026-10-03 ID: f59aacf2-96fb-4be6-84f0-c74df4ea54b2 (Gate 2: Phase 3 斷點矩陣盤點與分析報告產出完成)
> - 2026-10-03 ID: ac1cefd6-99d8-4f8b-b4cb-0ad34d4ec828 (Gate 2: Phase 4 功能真空區盤點、Impact vs Effort 優先度評估與 SSOT 閉環封存完成)
>
> **任務狀態**: 全部 Phase 已圓滿結案，即將封存至 `0.doc_mg/tasks/archive/global/`。

