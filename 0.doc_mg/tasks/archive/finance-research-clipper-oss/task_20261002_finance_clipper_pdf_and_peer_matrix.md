---
title: "FinanceClipper V2：同業橫向對比矩陣與敏感度估值沙盒 (純原生 JS 輕量架構)"
plugin: "finance-research-clipper-oss"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-15"
---

## 1. 目標
升級 Finance Research Clipper 儀表板，將擷取的歷史標的數據升級為橫向比較與決策工具：
1. **同業橫向對比矩陣 (Peer Comparison Matrix)**：支援從歷史庫勾選多檔標的（2~5 檔），以表格與視覺化長條圖即時橫向對比市值、現價、P/E、P/S、EPS、52週區間與關鍵財務比率，並提供極值標色。
2. **估值情境敏感度沙盒 (Valuation Sandbox)**：以選定標的為基礎，提供即時互動滑桿（預估營收/EPS 成長率、目標 P/E 倍數、折現率），動態計算 Bear / Base / Bull 三種情境目標價與潛在上漲空間。
3. **無縫整合現有生態**：維持純原生 Vanilla JS 架構（零打包依賴），支援一鍵匯出對比/估值結果至 Markdown、Google Sheets (GAS) 以及推播至 ScrumClock 今日作戰戰役。

## 2. 策略與鎖定檔案
- 遵循專案輕量原則，全面採用原生 Vanilla JS + CSS Grid 實作，不引入外部龐大函式庫或 React/TS 編譯鏈。
- 深度複用 `crawler.js` 已儲存至 `chrome.storage.local` 的豐富股票資料（含財務表、歷史價格、估值數據），無需額外爬蟲成本。

### 鎖定檔案 (Target Files)
- `finance-research-clipper-oss/dashboard.html` (新增分頁導航標籤、同業對比視圖容器、估值沙盒視圖容器)
- `finance-research-clipper-oss/dashboard.css` (矩陣表格、條形對比長條、紅綠極值標籤、沙盒滑桿與情境卡片樣式)
- `finance-research-clipper-oss/dashboard-render.js` (實作 `renderPeerMatrix()` 與 `renderValuationSandbox()`)
- `finance-research-clipper-oss/dashboard-actions.js` (實作標的多選聯動、估值公式計算、ScrumClock 跨插件推播與 Sheets 匯出)
- `finance-research-clipper-oss/dashboard.js` (綁定 Tab 切換事件與全域狀態初始化)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`.agents/skills/finance-clipper-core/SKILL.md` (新增同業對比矩陣與估值沙盒模型職責)
- [x] L2 插件導航：`finance-research-clipper-oss/FINANCE_CLIPPER_README.md` (更新 Dashboard 模組速查矩陣與功能入口)
- [x] L3 業務規格：`finance-research-clipper-oss/docs/peer-matrix-and-valuation-spec.md` (定義同業指標算法與估值公式規格)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/finance-research-clipper-oss/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 儀表板視圖切換與同業多選資料聚合 狀態：`[已完成]`

### Phase 2: 同業橫向對比矩陣視覺化介面 (Peer Matrix View) 狀態：`[已完成]`

### Phase 3: 敏感度估值沙盒與跨插件協同 (Valuation Sandbox) 狀態：`[已完成]`

## 4. 影響評估
- 本地運算：所有矩陣排序與敏感度公式均於客戶端即時計算，不增加額外 API 請求，保證極致流暢與隱私。
- 零破壞性升級：既有個股單檔研究功能完全不受影響，切換 Tab 即可平滑回到個股詳情。

## 5. 驗收標準
- [x] **功能指標**: 同業矩陣支援 2~5 檔標的橫向即時對比，極值高亮正確無延遲；估值沙盒滑桿拖曳時目標價能即時響應連動。
- [x] **跨插件聯動**: 點擊「推播至 ScrumClock」可成功產生結構化戰役任務。
- [x] **架構純淨**: 維持純 Vanilla JS，無新增外部未授權依賴，符合 Manifest V3 安全規範。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 重大架構同步完成，已精準回寫 Target SSOTs 骨架（L1~L4）。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/finance-research-clipper-oss/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: 08a60e13-1999-4d46-a391-f89aba15f67d (完成精簡重構：剔除 PDF 泥淖，收斂為純原生 JS 同業矩陣與估值沙盒藍圖)
> - 2026-10-02 ID: 9991d8eb-d024-450c-9d36-8f28ac21f3c7 (承接執行 Phase 1：建立 View Switcher、多選標的選取器與資料聚合狀態)
> - 2026-10-02 ID: e1fc16a8-1ea9-498d-8f90-667b77f9351f (承接執行 Phase 2：實作同業對比橫向表格、極值標色、三項長條視覺化比對與 Markdown/GAS 匯出)
> - 2026-10-02 ID: 19b073a7-d002-45f1-951c-9bf563f1b2bb (承接執行 Phase 3：實作敏感度估值沙盒試算引擎、動態滑桿、Bear/Base/Bull 情境卡片、5x5 敏感度二維熱力矩陣與 ScrumClock/GAS 跨插件整合)
> - 2026-10-02 ID: 8fb6f8d5-651e-4310-8baf-a8a9ec2e63b8 (完成 L1~L4 四層 SSOT 閉環與封存歸檔驗收結案)
>
> **結案狀態**: 任務已全數完成並通過驗收，已封存至 `0.doc_mg/tasks/archive/finance-research-clipper-oss/`。
