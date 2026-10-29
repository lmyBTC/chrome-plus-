---
title: "FinanceClipper 投研分析功能全面升級（共識離散度標籤、逆向 AI Prompt 與 Google Sheets 動態公式）"
plugin: "finance-research-clipper-oss"
status: "已完成"
created: "2026-10-21"
deadline: "2026-10-25"
appetite: "2h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 5 (Phase Final - Audit & Closeout)"
related_drafts: []
---

> - [ ] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：提升 FinanceClipper 投研深度與可用性，使投資人一眼識別機構共識分歧度（高波動警示）、獲得非共識/反常識 AI 洞察，並使匯出至 Google Sheets 的個股清單具備動態公式活力。
- **核心目標**：
  1. 前端看板整合 `targetPriceStats.cv`，顯示「分析師共識分歧度（低分歧/適中/高分歧警告）」與統計卡片。
  2. 升級本地 AI 投研 Prompt 產生器，新增「反常識 / 逆向 Pre-Mortem 分析」模板（包含黑天鵝情境與隱形催化劑）。
  3. 升級 `googleSheetsExporter.js`，支援注入 Google Sheets 動態公式（`=GOOGLEFINANCE(...)`），讓試算表隨盤動態更新。
- **邊界與假設**：維持純原生 Vanilla JS 零構建、跨插件黑盒防腐與 5~6 秒超時熔斷保護。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `finance-research-clipper-oss/FINANCE_CLIPPER_README.md`、`0.doc_mg/docs/cross_plugin_contract.md` 與 `0.doc_mg/docs/google_ecosystem_integration_spec.md`。
- **影響範圍地圖 (Entity Map)**：
  - `finance-research-clipper-oss/dashboard-render.js` (看板共識指標渲染)
  - `finance-research-clipper-oss/dashboard-components.css` (分歧度標籤色階與樣式)
  - `finance-research-clipper-oss/dashboard.html` (目標價卡片結構相容)
  - `finance-research-clipper-oss/aiClient.js` (反常識 Prompt 樣板生成)
  - `finance-research-clipper-oss/popup-export.js` (一鍵複製與匯出 Prompt 支援)
  - `finance-research-clipper-oss/googleSheetsExporter.js` (動態公式選擇與寫入)
- **前置條件 (Prerequisites)**：Git status 乾淨，既有代碼合約驗證通過。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：完全復用 `crawler-sanitizer.js` 既有的 `calculateTargetPriceStats` 與 `sanitizeToMinerSchema` 產出的 `cv`, `stdDev`, `upsidePercent` 數據，不重複運算。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（全靜態死值）：現狀，匯出後無法隨盤跳動。
  - 方案 B（混合式智能公式注入）：基本行情欄位（價格、漲跌幅）注入 `=GOOGLEFINANCE`，無法由公式取得的高階分析師目標價、離散度與 AI 摘要維持純數值寫入。選定方案 B。
- **硬性禁止動作 (Guardrails)**：嚴禁整檔覆寫任務檔、對專案檔案寫入嚴禁傳遞 ArtifactMetadata、嚴禁更動非關插件代碼、2-Strike 熔斷上限重試 2 次。

### 鎖定檔案 (Target Files)
- `finance-research-clipper-oss/dashboard-render.js`
- `finance-research-clipper-oss/dashboard-components.css`
- `finance-research-clipper-oss/dashboard.html`
- `finance-research-clipper-oss/aiClient.js`
- `finance-research-clipper-oss/popup-export.js`
- `finance-research-clipper-oss/googleSheetsExporter.js`

### 鎖定工具鏈 (Target Devtools)
- [x] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py <目標檔案>`
- [ ] 結案自動審計: `py 1.devtools/tools/validate_contract.py` / `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L2 插件導航：`./finance-research-clipper-oss/FINANCE_CLIPPER_README.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/finance-research-clipper-oss/`

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 目標價共識離散度 (CV) 視覺化與風險標籤 狀態：`[已完成]`
- [x] 任務 1.1: 於 `dashboard-render.js` 擴充目標價分析師卡片渲染
    - **動作**: 讀取 `minerMetrics.targetPriceStats` 或 `stats.targetCv`，當分析師樣本數 $\ge 2$ 時計算共識離散度等級（低分歧 $CV < 0.12$ / 適中 $0.12 \le CV \le 0.25$ / 高分歧 $CV > 0.25$），並顯示標準差與變異係數標籤。
    - **驗證 (Exit 0)**: 瀏覽器載入或靜態檢查渲染邏輯，無語法錯誤。
- [x] 任務 1.2: 於 `dashboard-components.css` 新增分歧度徽章樣式
    - **動作**: 增加 `.badge-dispersion-low` (綠)、`.badge-dispersion-mid` (藍)、`.badge-dispersion-high` (琥珀橘/警示) 樣式。
    - **驗證 (Exit 0)**: 樣式符合深色/淺色主題規範。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔（作為本輪最後工具呼叫）。
> - [x] 強制輸出開立新 Session 接力提示詞代碼塊，停步交出控制權。

### Phase 2: 本地 AI 逆向思考與反常識 (Pre-Mortem) 投研 Prompt 升級 狀態：`[已完成]`
- [x] 任務 2.1: 於 `aiClient.js` 擴充結構化 Prompt 生成函式
    - **動作**: 新增 `generateContrarianPrompt(stock)`，注入事前驗屍（Pre-Mortem 30% 下跌情境推演）與非共識催化劑（Hidden Catalysts）結構。
    - **驗證 (Exit 0)**: Node 測試執行 prompt 生成函式，回傳包含完整 Markdown 結構。
- [x] 任務 2.2: 於 `popup-export.js` 與 `popup.html` / `popup.js` 增加複製逆向投研 Prompt 支援
    - **動作**: 介面新增按鈕或下拉選項，一鍵複製「逆向思考與黑天鵝探針 Prompt」。
    - **驗證 (Exit 0)**: 點擊按鈕正確觸發剪貼簿複製。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔。
> - [x] 強制輸出開立新 Session 接力提示詞代碼塊，停步交出控制權。

### Phase 3: Google Sheets 匯出動態公式注入 (Formula Injection) 狀態：`[已完成]`
- [x] 任務 3.1: 於 `googleSheetsExporter.js` 實現動態公式生成開關
    - **動作**: 支援 `options.useFormulas = true`，對 price 欄位注入 `=IFERROR(GOOGLEFINANCE(A{row}, "price"), {rawPrice})`，對 change 欄位注入 `=IFERROR(GOOGLEFINANCE(A{row}, "changepct")/100, {rawChange})`。
    - **驗證 (Exit 0)**: 驗證匯出 payload 結構正確，不破壞既有純數值匯出機制。

> 🏁 **Phase 3 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔。
> - [x] 強制輸出開立新 Session 接力提示詞代碼塊，停步交出控制權。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 合約與代碼審計
    - **動作**: 執行 `python 1.devtools/tools/validate_contract.py` 與 `audit_suite.py` 確保快照合約無異常。
    - **驗證 (Exit 0)**: 通過自我測試與合約驗證 (Exit 0)。
- [x] 任務 F.2: SSOT 回寫與任務歸檔
    - **動作**: 依封存協議將任務移動至 `0.doc_mg/tasks/archive/finance-research-clipper-oss/`。
    - **驗證 (Exit 0)**: 目錄整潔無滯留。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景**：
  1. Google Finance 某些美股代碼（如帶有交易所前綴 `NASDAQ:AAPL`）在 Google Sheets 函數中直接使用可能報錯 ➔ 降級方案：透過 `sanitizeToMinerSchema` 剝離交易所前綴或使用 `IFERROR` 兜底靜態數值。
  2. 某些個股只有 1 位分析師目標價，無法計算標準差與 CV ➔ 降級方案：樣本數 $< 2$ 時隱藏離散度標籤，不顯示誤導數值。
- **熔斷機制**：單一問題重試上限 2 次 (2-Strike 熔斷)。

## 6. 驗收標準 (Acceptance Criteria)
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 與 Vanilla JS 零構建規範。
- [x] **功能實測**:
  - [x] 看板目標價卡片成功顯示分析師樣本數與 CV 共識分歧度標籤。
  - [x] 可複製包含 Pre-Mortem 逆向分析架構的 AI Prompt。
  - [x] Google Sheets 匯出支援動態函數注入且具備防呆 fallback。
- [x] **合約審計**: `py 1.devtools/tools/validate_contract.py` 與 `audit_suite.py` 執行回報通過 (Exit 0)。
- [x] **檔案編碼**: 確認所有檔案皆以 UTF-8 (無 BOM) 保存。

## 7. 狀態收斂歷程 (Condensed History)
- [2026-10-21] 藍圖建立完成 (Session 1)
- [2026-10-21] [Phase 1] 完成目標價共識離散度 (CV) 視覺化、分歧度風險色階標籤與標準差統計卡片渲染 (Session 2)
- [2026-10-21] [Phase 2] 完成本地 AI 逆向反常識 (Pre-Mortem 30% 下跌推演與非共識黑天鵝探針) Prompt 產生器、popup 一鍵複製與匯出模組 (Session 3)
- [2026-10-21] [Phase 3] 完成 Google Sheets 動態公式注入 (GOOGLEFINANCE 價格與漲跌幅) 與數值 fallback 防呆、單元測試 5/5 全數通過 (Session 4)
- [2026-10-21] [Phase Final] 完成審計套件驗證 (Exit 0)、L2 SSOT (FINANCE_CLIPPER_README.md) 回寫與任務歸檔閉環 (Session 5)

## 8. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
>
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**:
> - `code_skeleton.py`: 提煉 dashboard-render.js 骨架，節省 85% Token
> - `code_skeleton.py`: 提煉 aiClient.js 骨架，節省 95% Token
> - `code_skeleton.py`: 提煉 googleSheetsExporter.js 骨架，節省 79% Token
> - `audit_suite.py`: 執行 Gate 3 整合自動化審計套件 (Exit 0)
> - `validate_contract.py`: 執行快照合約驗證 (Exit 0)
>
> **參與對話 ID 紀錄**:
> - [2026-10-21] ID: 32e05486-1c6f-434a-82f6-8d7b86364bf5 (Gate 1 Blueprint)
> - [2026-10-21] ID: b06cb721-f04b-44e4-bb55-3f5de75f79cb (Phase 1 Execution)
> - [2026-10-21] ID: 779da254-c2b3-461f-8435-9b5a2db68259 (Phase 2 Execution)
> - [2026-10-21] ID: cc8b2cfd-e29a-4a35-9c6d-989016c767f5 (Phase 3 Execution)
> - [2026-10-21] ID: a37bbfe8-53d6-4089-a7ed-bcd2cdc140d5 (Phase Final Audit & Closeout)
>
> **結案狀態**: 本任務所有階段已圓滿完成，SSOT 已同步回寫，已透過歸檔協議入庫。
