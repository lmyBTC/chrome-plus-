# Chrome Plus 全局真理源總索引 (README_SSOT.md)

> [!IMPORTANT]
> **SSOT (Single Source of Truth) 單一真理源原則**：
> 本文檔為 Chrome Plus 專案的全域文檔、技術規範、插件手冊與架構契約之最高真理源總索引。
> 全專案遵循 **`README_<MODULE>[_<TOPIC>].md`** 統一命名標準，徹底消除孤立、同名與非規範之說明檔案。

---

## 1. 專案最高憲法與行為法規 (Constitutional SSOT)

| 規範名稱 | 檔案路徑 | 核心定位 |
| :--- | :--- | :--- |
| **專案最高行為憲法** | [GEMINI.md](../../GEMINI.md) | 工作區最高行為準則、4-Gate Protocol、多插件隔離防禦底線 |
| **Agent 核心規則庫** | [.agents/rules.md](../../.agents/rules.md) | 專家技能樹、TokenSaver 技術、MV3 安全底線與自動化審計法規 |
| **全域終端使用者操作手冊** | [README_USER_MANUAL.md](../../README_USER_MANUAL.md) | 終端使用者全功能導航、Cmd+K 路由、Nano 側邊欄調度與實戰指引 |

---

## 2. 全局架構與核心規範 (Global Architecture & Standards)

| 規範名稱 | 檔案路徑 | 核心範疇與定位 |
| :--- | :--- | :--- |
| **跨插件通訊黑盒契約** | [README_CROSS_PLUGIN_CONTRACT.md](./README_CROSS_PLUGIN_CONTRACT.md) | 跨插件鬆耦合事件總線、`UniversalGooglePayload` 與標準通訊協議 |
| **Chrome 插件技術標準** | [README_DEV_STANDARDS.md](./README_DEV_STANDARDS.md) | Manifest V3 規範、Shadow DOM 樣式隔離、CSP/XSS 資安防禦原則 |
| **Token 節省技術指南** | [README_TOKEN_OPTIMIZATION_GUIDE.md](./README_TOKEN_OPTIMIZATION_GUIDE.md) | RTK 命令包裝、代碼骨架提煉、終端日誌脫水與長對話動態收斂 |
| **任務協議管理規範** | [README_TASK_MANAGER.md](./README_TASK_MANAGER.md) | 4-Gate 門禁協議、會話隔絕、2-Strike 熔斷與任務生命週期管理 |
| **Google 生態整合架構** | [README_GOOGLE_ECOSYSTEM_SPEC.md](./README_GOOGLE_ECOSYSTEM_SPEC.md) | Google Workspace (Sheets/Docs/Tasks/Calendar) 雙軌串接藍圖 |
| **GAS Web App 部署指南** | [README_GAS_DEPLOYMENT_GUIDE.md](./README_GAS_DEPLOYMENT_GUIDE.md) | Google Apps Script 個人專屬同步中樞部署與 Secret 設定步驟 |
| **語意化版本與發布規範** | [README_VERSIONING_SPEC.md](./README_VERSIONING_SPEC.md) | 專案語意化版號 (SemVer) 推進原則與自動化版號更新規則 |
| **Repo Radar 提示詞指南** | [README_REPO_RADAR_PROMPTS.md](./README_REPO_RADAR_PROMPTS.md) | 專案符號秒查、拓撲輪廓提煉與超低 Token 探索規範 |
| **分析師工作流摩擦力矩陣** | [README_ANALYST_FRICTION_MATRIX.md](./README_ANALYST_FRICTION_MATRIX.md) | 投研員、研究助理日常高頻操作摩擦力與落地場景分析 |
| **專案經理工作流摩擦力矩陣** | [README_PM_FRICTION_MATRIX.md](./README_PM_FRICTION_MATRIX.md) | 專案經理與敏捷開發者衝刺規劃、任務池拋轉之摩擦力矩陣 |

---

## 3. 五大插件主體說明書體系 (Plugin Root Manuals)

各插件目錄一律以唯一之 **`README_<MODULE>.md`** 為入口導航，嚴禁裸名 `README.md`：

| 插件名稱 | 模組代碼 | 主說明書路徑 | 核心定位與架構 |
| :--- | :--- | :--- | :--- |
| **Chrome PK (Power Kit)** | `pk` | [README_CHROME_PK.md](../../chrome_pk/README_CHROME_PK.md) | 敏捷 Kanban 看板、實用工具箱 (Toolbox)、Google Tasks 同步中樞 |
| **Finance Clipper** | `clipper` | [README_FINANCE_CLIPPER.md](../../finance-research-clipper-oss/README_FINANCE_CLIPPER.md) | 投研採集器、同業估值矩陣、財務數據清洗與 GSheets 直連 |
| **Activity Monitor** | `actmon` | [README_ACTIVITY_MONITOR.md](../../browser-activity-monitor/README_ACTIVITY_MONITOR.md) | 零干擾常駐監聽 + 20% 隨選雙層探針、瀏覽隱私與權限審計 |
| **Gemini Nano Hub** | `nano` | [README_GEMINI_NANO.md](../../chrome_gemini_nano/README_GEMINI_NANO.md) | 邊緣端 Chrome Web AI (Prompt API) 本地推論與跨插件意圖分發中樞 |
| **Video Speed Plus** | `vidspeed` | [README_VIDEO_SPEED.md](../../chrome_video speed plus/README_VIDEO_SPEED.md) | 影音倍速微調、字幕時間戳筆記擷取、Shadow DOM 樣式嚴格隔離 |
| **DevTools 工具箱** | `devtools` | [README_DEVTOOLS.md](../../1.devtools/README_DEVTOOLS.md) | 純粹全域治理、合規審計、跨插件契約驗證與 Token 節省檢索工具庫 |

---

## 4. 插件專屬技術規格書體系 (Plugin Technical Specs)

各模組業務規格一律遵循 **`README_<MODULE>_<TOPIC>.md`** 規範：

### Chrome PK 模組
- [README_PK_GTD_KANBAN_SPEC.md](../../chrome_pk/docs/README_PK_GTD_KANBAN_SPEC.md)：GTD 敏捷看板與戰役任務規格
- [README_PK_ACTIVITY_MONITOR_SPEC.md](../../chrome_pk/docs/README_PK_ACTIVITY_MONITOR_SPEC.md)：活動監控整合模組技術規格
- [README_PK_DARK_THEME_SPEC.md](../../chrome_pk/docs/README_PK_DARK_THEME_SPEC.md)：深色主題色彩變數與設計系統
- [README_PK_IMAGE_SCRAPER_SPEC.md](../../chrome_pk/docs/README_PK_IMAGE_SCRAPER_SPEC.md)：網頁圖片爬取與批量下載器規格
- [README_PK_GAS_SYNC_SPEC.md](../../chrome_pk/docs/README_PK_GAS_SYNC_SPEC.md)：Google Apps Script Tasks/Logs 表格同步欄位規格
- [README_PK_GEMINI_CONTENT_SPEC.md](../../chrome_pk/docs/README_PK_GEMINI_CONTENT_SPEC.md)：Gemini 內容解析與側邊欄規格
- [README_PK_WEB_AI_GUARD_SPEC.md](../../chrome_pk/docs/README_PK_WEB_AI_GUARD_SPEC.md)：Web AI 防禦與降級機制規格
- [README_PK_GEMINI_NANO_TOOL_SPEC.md](../../chrome_pk/docs/README_PK_GEMINI_NANO_TOOL_SPEC.md)：Nano 工具代理規格
- [README_PK_AI_UPDATE_GUIDE.md](../../chrome_pk/docs/README_PK_AI_UPDATE_GUIDE.md)：AI 輔助代碼更新規範
- [README_PK_FEATURES_ARCH_GUIDE.md](../../chrome_pk/docs/README_PK_FEATURES_ARCH_GUIDE.md)：功能模組架構導航
- [README_PK_PRODUCTIVITY_WORKFLOW_GUIDE.md](../../chrome_pk/docs/README_PK_PRODUCTIVITY_WORKFLOW_GUIDE.md)：高階生產力工作流規格
- [README_PK_USER_STORY_SPEC.md](../../chrome_pk/docs/README_PK_USER_STORY_SPEC.md)：用戶故事與使用情境規格
- [README_PK_WORKFLOW_FLOWCHART.md](../../chrome_pk/docs/README_PK_WORKFLOW_FLOWCHART.md)：GTD 狀態流轉與泳道圖
- [README_PK_TOOL_ACTIVITY_MONITOR.md](../../chrome_pk/src/features/toolbox/tools/activity-monitor/README_PK_TOOL_ACTIVITY_MONITOR.md)：Toolbox 活動監控小工具說明
- [README_PK_TOOL_IMAGE_SCRAPER.md](../../chrome_pk/src/features/toolbox/tools/image-scraper/README_PK_TOOL_IMAGE_SCRAPER.md)：Toolbox 圖片擷取小工具說明
- [README_PK_TOOL_SUBTITLE_COLLECTOR.md](../../chrome_pk/src/features/toolbox/tools/subtitle-collector/README_PK_TOOL_SUBTITLE_COLLECTOR.md)：Toolbox 字幕收集小工具說明

### DevTools 工具箱模組
- [README_GAS_SETUP.md](../../1.devtools/scripts/README_GAS_SETUP.md)：GAS 快速部署腳本指南

### Finance Clipper 模組
- [README_CLIPPER_MV3_SPEC.md](../../finance-research-clipper-oss/docs/README_CLIPPER_MV3_SPEC.md)：MV3 安全標準與注入架構
- [README_CLIPPER_PEER_VALUATION_SPEC.md](../../finance-research-clipper-oss/docs/README_CLIPPER_PEER_VALUATION_SPEC.md)：同行估值比較矩陣規格
- [README_CLIPPER_GOOGLE_FINANCE_SPEC.md](../../finance-research-clipper-oss/docs/README_CLIPPER_GOOGLE_FINANCE_SPEC.md)：Google Finance 測試版數據流規格
- [README_CLIPPER_AI_CONSOLE_SPEC.md](../../finance-research-clipper-oss/docs/README_CLIPPER_AI_CONSOLE_SPEC.md)：投研 AI 控制台輸出規格
- [README_CLIPPER_GAS_SYNC_SPEC.md](../../finance-research-clipper-oss/docs/README_CLIPPER_GAS_SYNC_SPEC.md)：Clipper 專屬 Sheets 試算表結構

### Gemini Nano & Activity Monitor 模組
- [README_NANO_SPEC.md](../../chrome_gemini_nano/docs/README_NANO_SPEC.md)：Gemini Nano 邊緣模型規格
- [README_ACTMON_TAB_INTERCEPTOR_SPEC.md](../../browser-activity-monitor/docs/README_ACTMON_TAB_INTERCEPTOR_SPEC.md)：分頁攔截器與監聽規格

---

## 5. Agent 專家技能字典體系 (Agent Skills SSOT)

依據平台標準維持 `SKILL.md`，作為 Agent 調用專家知識之真理源：

| 技能名稱 | 核心定位與範疇 | 檔案路徑 |
| :--- | :--- | :--- |
| **PK+ 核心規格** | Chrome PK 敏捷看板、Toolbox 工具架構 | [.agents/skills/pk-core/SKILL.md](../../.agents/skills/pk-core/SKILL.md) |
| **FinanceClipper 核心** | 研報採集、財務估值矩陣與跨插件契約 | [.agents/skills/finance-clipper-core/SKILL.md](../../.agents/skills/finance-clipper-core/SKILL.md) |
| **ActivityMonitor 核心** | 隨選健檢、80/20 探針與權限審計 | [.agents/skills/activity-monitor-core/SKILL.md](../../.agents/skills/activity-monitor-core/SKILL.md) |
| **GeminiNano 核心** | Prompt API 邊緣推論、本地工具代理架構 | [.agents/skills/gemini-nano-core/SKILL.md](../../.agents/skills/gemini-nano-core/SKILL.md) |
| **VideoSpeedPlus 核心** | 影片倍速微調、Shadow DOM 樣式隔離 | [.agents/skills/video-speed-core/SKILL.md](../../.agents/skills/video-speed-core/SKILL.md) |
| **Token 節省器** | RTK 命令包裝、日誌脫水、代碼骨架提煉 | [.agents/skills/token-saver/SKILL.md](../../.agents/skills/token-saver/SKILL.md) |
| **任務協議管理** | 4-Gate 門禁協議、會話隔絕與封存標準 | [.agents/skills/task-protocol/SKILL.md](../../.agents/skills/task-protocol/SKILL.md) |
| **專案情報雷達** | 低 Token 拓撲、大綱切片與全域符號秒查 | [.agents/skills/repo-radar/SKILL.md](../../.agents/skills/repo-radar/SKILL.md) |
| **Chrome 合規審計** | Manifest V3 審計、CSP/XSS 資安漏洞巡檢 | [.agents/skills/chrome-auditor/SKILL.md](../../.agents/skills/chrome-auditor/SKILL.md) |
| **網頁技術標準** | 前端元件規範、Shadow DOM 與資安底線 | [.agents/skills/dev-standards/SKILL.md](../../.agents/skills/dev-standards/SKILL.md) |

---

## 6. 文檔治理與命名規則 (Documentation Governance)

1. **統一前綴原則**：所有模組指引與業務規格文件，一律採用 **`README_<MODULE>[_<TOPIC>].md`** 格式，嚴禁子目錄出現孤立之裸名 `README.md`。
2. **單一真理源原則 (DRY)**：任何架構變更僅維護單一真理源，衍生文檔一律以指針引用，杜絕重複複製貼上。
3. **拒絕孤兒文檔**：所有具持久價值的 Markdown 檔案，必須登錄於本文檔之矩陣中。
4. **任務檔案生命週期**：`0.doc_mg/tasks/` 下的階段性工作檔案，結案後依模組移入 `0.doc_mg/tasks/archive/[plugin]/` 封存。
