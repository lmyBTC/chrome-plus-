---
title: "FinanceClipper V2：PDF 研報解析、同業橫向對比矩陣與敏感度估值沙盒"
plugin: "finance-research-clipper-oss"
status: "規劃中"
created: "2026-10-02"
deadline: "2026-11-20"
---

## 1. 目標
升級 Finance Research Clipper 投研採集套件，建構深度研報工作流：支援券商 PDF/SEC 財報表格提取、跨標的同業橫向指標對比矩陣 (Peer Comparison Matrix)，以及輕量化估值情境敏感度試算工具 (Valuation Sensitivity Sandbox)，並支援一鍵同步推播至 Google Sheets 與 ScrumClock。

## 2. 策略與鎖定檔案
1. 整合輕量版 `pdf.js`，支援本地 `file:///` 與網頁 PDF 閱讀器之文字層提取與表格邊界偵測（Table Detection）。
2. 在 AI 側邊欄與儀表板提供財報摘要（營收、營業利益、EPS）秒轉 Markdown 與 Google Sheets。
3. 在 `dashboard.html` 新增「同業橫向對比」分頁：呈現現價、市值、動態 P/E、Forward P/E、P/S、PEG、毛利率、ROE 等指標，並以視覺化長條圖與紅綠極值呈現。
4. 實作敏感度估值沙盒：提供目標價連動公式，自動試算 Bear / Base / Bull 情境目標價，支援推播至 Google Sheets 與 ScrumClock 專注戰役。

### 鎖定檔案 (Target Files)
- `./finance-research-clipper-oss/manifest.json`
- `./finance-research-clipper-oss/src/pdf/pdfParser.ts`
- `./finance-research-clipper-oss/src/pdf/tableExtractor.ts`
- `./finance-research-clipper-oss/src/dashboard/components/PeerMatrixView.tsx`
- `./finance-research-clipper-oss/src/dashboard/components/ValuationSandbox.tsx`
- `./finance-research-clipper-oss/src/shared/types/financeTypes.ts`
- `./finance-research-clipper-oss/src/shared/export/sheetsExporter.ts`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] L1 專家技能：`./.agents/skills/finance-clipper-core/SKILL.md` (新增 PDF 解析引擎規格、同業對比與估值模型)
- [ ] L2 插件導航：`./finance-research-clipper-oss/README.md` (新增 PDF Copilot 與對比矩陣使用說明)
- [ ] L3 業務規格：`./finance-research-clipper-oss/docs/peer-matrix-and-valuation-spec.md` (同業指標算法與估值公式規格)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/finance-research-clipper-oss/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: PDF 研報與財報智能解析器 (PDF Research Copilot) 狀態：`[待辦]`
- [ ] 任務 1.1: 整合 pdf.js 與文字/表格提取引擎
    - [ ] 整合輕量版 pdf.js，支援本地 file:/// 與線上 PDF 頁面注入
    - [ ] 實作表格邊界偵測與框選表格轉結構化資料
- [ ] 任務 1.2: 財務摘要提取與匯出 Google Sheets
    - [ ] 自動定位財報三大表關鍵數值（營收、營業利益、EPS）
    - [ ] 支援一鍵將提取表格寫入 Google Sheets 投資底稿

### Phase 2: 跨標的同業橫向對比矩陣 (Peer Comparison Matrix) 狀態：`[待辦]`
- [ ] 任務 2.1: 擴充同業指標資料模型與聚合層
    - [ ] 建立同業指標定義（估值維度、獲利能力、成長趨勢、分析師共識）
    - [ ] 實作本地多標的指標快取與計算器
- [ ] 任務 2.2: 打造 Dashboard 同業矩陣視覺化介面
    - [ ] 在 dashboard 實作「同業橫向對比」分頁
    - [ ] 支援水平長條圖比較、最小值標綠/最大值標紅之視覺化效果

### Phase 3: 輕量化估值情境試算與跨插件推播 (Valuation Sandbox) 狀態：`[待辦]`
- [ ] 任務 3.1: 敏感度試算公式與動態沙盒 UI
    - [ ] 實作目標價即時連動公式：Forward EPS × (1 + Growth) × P/E / (1 + Discount)
    - [ ] 輸出 Bear / Base / Bull 三種情境目標價與敏感度調整滑桿
- [ ] 任務 3.2: 一鍵同步推播至 Google Sheets 與 ScrumClock
    - [ ] 支援一鍵匯出估值結論至 Google Sheets
    - [ ] 支援將選定標的之估值研究任務打包發送至 ScrumClock 專注待辦

## 4. 影響評估
- 涉及 PDF 檔案讀取權限，需宣告相應之 CSP 與 host_permissions（包含 `file://*` 選擇性權限支援）。
- 矩陣運算均在客戶端進行，確保分析數據本地隱私安全。

## 5. 驗收標準
- [ ] **技術指標**: 支援解析本地與線上常見券商 PDF 財報，表格辨識轉換準確率達 90% 以上；支援 3 個以上標的橫向對比渲染。
- [ ] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無外部未授權 CDN 注入腳本。
- [ ] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [ ] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [ ] **SSOT 閉環**: 重大架構同步完成，已精準回寫 Target SSOTs 骨架。
- [ ] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/finance-research-clipper-oss/`。
- [ ] **插件驗證**: 已在 Chrome 中重新載入插件，驗證 PDF 提取、同業矩陣與估值沙盒操作順暢無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: 406e4174-4fdd-4fce-990b-20db5c66e328 (初始化任務拆解)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261002_finance_clipper_pdf_and_peer_matrix.md，開始執行 Phase 1
> ```
