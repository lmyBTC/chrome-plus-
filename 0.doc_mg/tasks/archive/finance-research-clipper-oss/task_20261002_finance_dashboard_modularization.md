---
title: "FinanceClipper 儀表板架構解耦與大檔模組化分拆"
plugin: "finance-research-clipper-oss"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-03"
---

## 1. 目標
針對 `finance-research-clipper-oss` 儀表板三大巨石檔（`dashboard-actions.js` 1,156行、`dashboard-render.js` 1,929行、`dashboard.css` 2,840行）進行依領域解耦分拆。將「同業矩陣 (Peer Matrix)」與「估值沙盒 (Valuation Sandbox)」獨立為子模組，使各單檔規模降至 400~800 行健康區間，大幅降低後續維護與 AI 讀寫 Token 成本，並保持 100% 向後相容。

## 2. 策略與鎖定檔案
採用「領域驅動子模組 + 原型/命名空間無縫相容」策略：
1. **樣式分拆 (CSS)**：以 `<link>` 獨立載入 `dashboard-peer-matrix.css` 與 `dashboard-valuation.css`，`dashboard.css` 回歸核心儀表板樣式。
2. **動作分拆 (Actions)**：將同業矩陣與估值動作拆為 `dashboard-peer-actions.js` 與 `dashboard-valuation-actions.js`，並透過 `Object.assign(window.DashboardActions, ...)` 保持對外介面完全一致。
3. **渲染分拆 (Render)**：將 `renderPeerMatrix` 與 `renderValuationSandbox` 拆為 `dashboard-peer-render.js` 與 `dashboard-valuation-render.js`，掛載至 `window.DashboardRender`。
4. **載入協議 (HTML)**：在 `dashboard.html` 依序引入新模組檔案，無構建打包負擔，純原生 MV3 相容。

### 鎖定檔案 (Target Files)
- `./finance-research-clipper-oss/dashboard.html`
- `./finance-research-clipper-oss/dashboard.css`
- `./finance-research-clipper-oss/dashboard-peer-matrix.css` (新增)
- `./finance-research-clipper-oss/dashboard-valuation.css` (新增)
- `./finance-research-clipper-oss/dashboard-actions.js`
- `./finance-research-clipper-oss/dashboard-peer-actions.js` (新增)
- `./finance-research-clipper-oss/dashboard-valuation-actions.js` (新增)
- `./finance-research-clipper-oss/dashboard-render.js`
- `./finance-research-clipper-oss/dashboard-peer-render.js` (新增)
- `./finance-research-clipper-oss/dashboard-valuation-render.js` (新增)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/finance-clipper-core/SKILL.md` (更新頁面架構與模組字典)
- [x] L2 插件導航：`./finance-research-clipper-oss/FINANCE_CLIPPER_README.md` (更新模組速查清單與檔案索引)
- [x] [N/A] L3 業務規格：`./finance-research-clipper-oss/docs/peer-matrix-and-valuation-spec.md` (業務邏輯不變，免修改)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/finance-research-clipper-oss/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: CSS 樣式解耦分拆 狀態：`[已完成]`
- [x] 任務 1.1: 萃取 `dashboard-peer-matrix.css` (自 `dashboard.css` 抽離 Line 1466-2229 矩陣相關樣式)
- [x] 任務 1.2: 萃取 `dashboard-valuation.css` (自 `dashboard.css` 抽離 Line 2230-2841 估值沙盒樣式)
- [x] 任務 1.3: 淨化 `dashboard.css` 並於 `dashboard.html` 引入新樣式檔，驗證視覺無跑版

### Phase 2: Actions 動作邏輯解耦分拆 狀態：`[已完成]`
- [x] 任務 2.1: 建立 `dashboard-peer-actions.js` (聚合矩陣資料、Markdown 複製、GAS 同步等方法)
- [x] 任務 2.2: 建立 `dashboard-valuation-actions.js` (情境估值運算、模型產出、GAS 同步、ScrumClock 轉入等方法)
- [x] 任務 2.3: 淨化 `dashboard-actions.js` 並透過命名空間平滑擴充，確保既有呼叫點零中斷

### Phase 3: Render 渲染視圖解耦分拆 狀態：`[已完成]`
- [x] 任務 3.1: 建立 `dashboard-peer-render.js` (包含 `renderPeerMatrix` 及其附屬子元件視圖)
- [x] 任務 3.2: 建立 `dashboard-valuation-render.js` (包含 `renderValuationSandbox` 及其圖表/表格視圖)
- [x] 任務 3.3: 淨化 `dashboard-render.js`，在 `dashboard.html` 註冊腳本引用，驗證功能閉環

### Phase 4: SSOT 閉環與驗收歸檔 狀態：`[已完成]`
- [x] 任務 4.1: 更新 L1 專家技能與 L2 插件導航之模組清單
- [x] 任務 4.2: 依封存協議歸檔至 `0.doc_mg/tasks/archive/finance-research-clipper-oss/`


## 4. 影響評估
- **執行效能**：拆分為多個原生 `<script>` 和 `<link>` 後，瀏覽器能平行解析，首屏解析負載大幅減輕。
- **向後相容**：全域掛載之 `window.DashboardActions` 與 `window.DashboardRender` 介面保持 100% 不變，`dashboard.js` 完全不需變更呼叫方式。
- **維護風險**：無跨插件相依性風險，無 Chrome API 權限異動。

## 5. 驗收標準
- [x] **技術指標**: 分拆後的各個子檔案（actions / render / css）單檔行數皆在 300~900 行健康區間，無單檔破千行狀況。
- [x] **核心規範**: 保持原生純 JS (IIFE 命名空間)，符合 Chrome Extension Manifest V3 規範，無全域變數洩漏或命名衝突。
- [x] **功能完整性**: 股票個股檢視、同業矩陣切換與匯出、估值沙盒敏感度試算及轉入 ScrumClock 等功能均運作正常。
- [x] **除錯清理**: 已確認移除或註解所有測試用的除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: L1 專家技能、L2 導航 README 皆已同步完成。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/finance-research-clipper-oss/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: 08356356-95b2-4e87-a7aa-cadc3bd06511 (初始化)
> - 2026-10-02 ID: 973aada8-cc0d-40e1-a0d9-886a4c78bcd2 (Phase 1 執行完成)
> - 2026-10-02 ID: f146a24e-d0e6-4f2c-946d-5ee2d943d1f7 (Phase 2 執行完成)
> - 2026-10-02 ID: 75c119f6-25e0-469f-8587-7f67587ea265 (Phase 3 執行完成)
> - 2026-10-02 ID: fce48a9d-8d8b-41c2-8554-6eeab675f303 (Phase 4 驗收結案與歸檔)


