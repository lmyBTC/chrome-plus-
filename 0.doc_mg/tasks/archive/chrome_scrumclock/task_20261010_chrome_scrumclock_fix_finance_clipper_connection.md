---
title: "修復投研自選看板跨插件 FinanceClipper 連線與採集失敗問題"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-10"
deadline: "2026-10-10"
---

## 1. 目標
修復「實用工具箱 - 📈 投研自選看板」在執行個股採集時出現「採集失敗: 未連接 FinanceClipper」的跨插件通訊中斷問題。確保在使用者未手動輸入 Extension ID 的情況下，看板能自動套用跨插件合約規範之恆定 ID (`imnnkgiglcbjknfbkdfocdhoookkipji`)，並提供直觀的連線檢測與引導機制。

## 2. 策略與鎖定檔案

### 核心問題分析
1. **預設 ID 缺漏**：`chrome_scrumclock/src/features/finance-integration/financeClient.ts` 之 `getExtensionId()` 僅讀取使用者設定與 local storage，若未設定則回傳空字串 `''`，未如 `externalService.ts` 兜底回退至 `DEFAULT_FINANCE_CLIPPER_ID`。
2. **通訊中斷連鎖反應**：ID 為空導致 `ping()` 傳回 false、`crawlStock()` 直接短路報錯 `{ success: false, error: '未連接 FinanceClipper' }`，進而觸發 UI 彈出「採集失敗」提示。
3. **缺少快速排查入口**：`WatchListWidget.tsx` 未提供目前使用的 Extension ID 檢視或快速重試/設定入口，導致使用者無法得知連線狀態異常原因。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/features/finance-integration/financeClient.ts`
- `chrome_scrumclock/src/features/finance-integration/WatchListWidget.tsx`
- `chrome_scrumclock/src/components/SettingsPanel.tsx`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊協議破壞性變更)
- [ ] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md`
- [ ] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md`
- [ ] L3 業務規格：`./chrome_scrumclock/docs/finance-spec.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/`

## 3. 任務拆解

### Phase 1: financeClient 預設恆定 ID 注入與防禦強化 狀態：`[已完成]`

### Phase 2: 看板 UI 連線診斷引導與設定整合 狀態：`[已完成]`

### Phase 3: 編譯驗證與跨插件合約驗證 狀態：`[已完成]`

## 4. 影響評估
- 本次修復為向前相容之防禦性修復，不變更跨插件通訊 Payload 結構（維持 protocolVersion 2）。
- 若使用者本機自行指定過自訂 ID，既有設定優先權最高，不影響個別自訂設定。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環（二選一）**:
  - [x] [N/A] 輕量任務豁免（無結構變動，L1~L3 免比對免回寫）
  - [ ] 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - [2026-10-10] ID: 38ded75a-9188-40a0-82bf-706036d45419 (初始化)
> - [2026-10-10] ID: 6014f69a-c8da-41a2-b3e0-f6bd7f9a42c2 (Phase 1 執行)
> - [2026-10-10] ID: 9e6033a3-20cf-4863-8808-89ec5d9c35b0 (Phase 2 執行與驗證)
> - [2026-10-10] ID: 37ed92f1-e274-4a35-b4ff-a32fc1e8641b (Phase 3 驗收與 L4 歸檔結案)

