---
title: "更新專案根目錄 README.md 與使用說明.md"
plugin: "global"
status: "已完成"
created: "2026-10-20"
deadline: "2026-10-20"
appetite: "45m"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 4 (Phase 3 全域交叉審計與結案封存 Gate 3 完成)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：
  分析並更新專案根目錄 `README.md` 與 `使用說明.md`，使文檔與當前 Monorepo 的 5 大插件生態系、最新 `1.devtools/` 自動化工具鏈及各項合規審計機制完全同步。
- **核心目標**：
  1. `README.md`：校準拓撲目錄、補齊 5 大插件矩陣（補入 `chrome_gemini_nano` 獨立插件）、更新工具鏈表格（納入 `audit_suite.py`、`audit_plugin_isolation.py` 等新工具與 `package.json` 指令）。
  2. `使用說明.md`：校準擴充套件載入指引（補齊 5 款插件）、增補 `chrome_gemini_nano` 專屬操作教學、更新開發者常用腳本與審計指令。
- **邊界與假設**：
  保持極致精簡導航風格（方案 A），專案文檔內部路徑維持最簡潔純字串相對路徑，杜絕陳舊或無效連結。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `.agents/rules.md`、`GEMINI.md` 之 4-Gate 規範與雙軌路徑原則。
- **影響範圍地圖 (Entity Map)**：
  - `README.md`
  - `使用說明.md`
  - `0.doc_mg/tasks/task_20261020_update_readme_and_usage_guide.md`
- **前置條件 (Prerequisites)**：
  - 各插件實體目錄及 `1.devtools/` 工具皆已在工作區穩定運行。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 與 SSOT 檢查**：
  - 統一 5 大插件命名：`chrome_scrumclock`、`finance-research-clipper-oss`、`chrome_video speed plus`、`browser-activity-monitor`、`chrome_gemini_nano`。
  - 對話框以 `file:///` 格式呈報，專案內部 Markdown 嚴格維持純文字相對路徑。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁整檔盲目覆寫，採用語意區塊局部替換。
  - 嚴禁跨目錄污染或修改非文檔之插件原始碼。

### 鎖定檔案 (Target Files)
- `README.md`
- `使用說明.md`
- `0.doc_mg/tasks/task_20261020_update_readme_and_usage_guide.md`

### 鎖定工具鏈 (Target Devtools)
- [x] 結案自動審計: `py 1.devtools/tools/audit_suite.py` / `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量文檔維護任務豁免 (無 Storage 模型、通訊契約變更)
- [x] L4 任務生命週期: `0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 專案總覽 README.md 全景校準 狀態：`[已完成]`
- [x] 任務 1.1: 校準實體目錄樹與拓撲結構
    - **動作**: 在 `README.md` 目錄樹中補入 `chrome_gemini_nano/` 獨立模組及 `1.devtools/tools/` 擴展工具。
    - **驗證**: 目錄樹路徑與磁碟實際結構 100% 一致。
- [x] 任務 1.2: 補齊「五大擴充模組生態系矩陣」
    - **動作**: 在生態系表格補齊 `Gemini Nano` 獨立擴充套件，說明其邊緣推論、調音中樞與自動化角色。
    - **驗證**: 表格涵蓋完整 5 款插件且職責與契約分明。
- [x] 任務 1.3: 更新開發者工具鏈與快速啟動腳本
    - **動作**: 補齊 `audit_suite.py`、`audit_plugin_isolation.py` 及最新 npm scripts 指令。
    - **驗證**: 標記之終端指令均可在工作區正常執行。

### Phase 2: 使用說明手冊 使用說明.md 實戰操作更新 狀態：`[已完成]`
- [x] 任務 2.1: 補齊五大擴充功能安裝指引
    - **動作**: 在第三章擴充功能安裝步驟中，補齊全部 5 款插件之加載目錄與對應前置步驟。
    - **驗證**: 安裝清單涵蓋 BAM、Gemini Nano、ScrumClock、FinanceClipper、VideoSpeed。
- [x] 任務 2.2: 增補 Gemini Nano 側邊欄調音與端側推論操作篇章
    - **動作**: 說明 `chrome_gemini_nano` 側邊欄介面功能與本地後端連動。
    - **驗證**: 條列清晰步驟與預期效果。
- [x] 任務 2.3: 更新開發工具與日常自動化指令
    - **動作**: 第八章開發工具章節同步更新 `1.devtools/` 工具鏈與 npm 快捷指令。
    - **驗證**: 確保無失效指令。

### Phase 3: 全域交叉審計與結案封存 (Gate 3) 狀態：`[已完成]`
- [x] 任務 3.1: 執行文檔交叉引用與合規審計
    - **動作**: 執行 `py 1.devtools/tools/audit_suite.py` 與 `py 1.devtools/tools/doc_cross_ref.py`。
    - **驗證 (Exit 0)**: 審計全數通過，無斷鏈或孤島文檔。
- [x] 任務 3.2: 任務檔打勾結案並封存
    - **動作**: 批次同步打勾任務檔，將任務檔移動至 `0.doc_mg/tasks/archive/global/`。
    - **驗證**: 工作區 git status 乾淨。
