---
title: "ScrumClock 雲端同步與插件內同步之設定面板與說明書雙區塊分工更新"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-10"
deadline: "2026-10-11"
---

## 1. 目標
將近期上限的新功能（Google Tasks 雙向同步、Google Workspace / GAS 備份、跨插件 Finance Clipper / Activity Monitor 聯動、本機 Local Hub Fallback）之接口控制與狀態觀測整合至「全域系統設定 (`SettingsPanel.tsx`)」，並在「安裝與說明書 (`InstallDocs.tsx`)」中建立對應的標準作業流程 (SOP) 與自我排錯指南，實現前端快速設定、即時連線健康檢查與故障精準定位。

## 2. 策略與鎖定檔案

### 職責分工策略
1. **全域系統設定 (`SettingsPanel.tsx`)**：
   - **實體接口管理**：收攏 Google Tasks 雙向同步開關、GAS 雲端備份、Webhook 自動化、跨插件（Finance Clipper / Activity Monitor）連線參數。
   - **健康觀測與除錯器**：新增「跨插件連線健檢 (Ping/Pong)」、「Google Tasks 立即雙向同步」、「最後同步狀態與錯誤代碼」觀測視窗，方便前端直接除錯。
2. **安裝與說明書 (`InstallDocs.tsx`)**：
   - **操作指南 (SOP)**：提供 Google Tasks API / GAS 雲端雙向同步配置步驟、跨插件通訊權限與 ID 取得指引。
   - **除錯排錯庫 (Troubleshooting)**：建立連線失敗、Extension ID 錯誤、跨插件未回應、權限遺失等常見問題診斷樹與 Checklist。
3. **雙向跳轉機制**：
   - 在全域系統設定中提供「📖 查看此功能說明書與排錯指南」直達對應 Tab/錨點。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/components/SettingsPanel.tsx`
- `./chrome_scrumclock/src/components/InstallDocs.tsx`
- `./chrome_scrumclock/src/features/finance-integration/financeClient.ts`
- `./chrome_scrumclock/src/shared/google/googleTasksSync.ts`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [x] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md` (SettingsPanel / InstallDocs 規格)
- [x] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md` (頂層通用元件與同步接口說明)
- [ ] L3 業務規格：`[N/A]`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 「全域系統設定」區塊升級 (SettingsPanel.tsx) 狀態：`[已完成]`
- [x] 任務 1.1: 補齊雲端同步（Google Tasks & GAS）控制與狀態指示
    - [x] 新增 Google Tasks 雙向同步開關與「立即同步 Tasks」手動觸發按鈕
    - [x] 顯示最後同步時間戳記、成功任務數與失敗狀態指示燈
- [x] 任務 1.2: 補齊插件內/跨插件（Finance Clipper & Activity Monitor）連線與除錯介面
    - [x] 新增跨插件連線測試按鈕（一鍵 Ping Finance Clipper / Activity Monitor）
    - [x] 呈現即時連線狀態（在線/離線/版本相容性/錯誤代碼）
    - [x] 新增直達「安裝與說明書」的對應排錯指引連結按鈕

### Phase 2: 「安裝與說明書」區塊更新 (InstallDocs.tsx) 狀態：`[已完成]`
- [x] 任務 2.1: 擴充「雲端同步與 Google Tasks 配置指南」
    - [x] 撰寫 Google Tasks 雙向同步啟用與欄位對齊說明
    - [x] 補充 GAS Webhook 與跨裝置 AppData 備份常見錯誤排查
- [x] 任務 2.2: 新增「插件內通訊與跨插件聯動排錯手冊」
    - [x] 撰寫 Finance Clipper 與 Activity Monitor 跨插件 Extension ID 配置與權限確認 SOP
    - [x] 整理常見錯誤代碼對照表（ERR_EXTENSION_NOT_FOUND, TIMEOUT, PERMISSION_DENIED）與逐步自我修復流程

### Phase 3: 雙區塊聯動整合驗收與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 3.1: 聯動驗收與構建檢查
    - [x] 驗證從 SettingsPanel 點擊排錯連結能精準開啟 InstallDocs 相對應分頁
    - [x] 執行 TypeScript 型別檢查與 Vite build 構建確認無報錯
- [x] 任務 3.2: SSOT 閉環與結案歸檔
    - [x] 更新 `.agents/skills/scrumclock-core/SKILL.md` 與 `chrome_scrumclock/SCRUMCLOCK_README.md`
    - [x] 結案並移動任務文檔至歸檔目錄

## 4. 影響評估
- 僅修改 React UI 視窗元件與排錯引導展示，不更動底層 Storage 資料格式與通訊協議核心。
- 透過既有 `financeClient.ts` 與 `googleTasksSync.ts` 的公開介面進行健康檢查，不引入新外部依賴。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。  
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。  
> **參與對話 ID 紀錄**:  
> - 2026-10-10 ID: df6b20f3-625d-4c01-b687-1ab451ce31ef (Gate 1 藍圖初始化)  
> - 2026-10-10 ID: e7a015d3-1207-4e10-88a8-e0957b5aacb5 (Phase 1 執行完成)  
> - 2026-10-10 ID: da019091-0e1e-4b29-b319-be3a4ec11426 (Phase 2 執行完成)  
> - 2026-10-10 ID: 9e9b655e-0d65-48f4-a3d4-2978f7bfedab (Phase 3 驗收構建與 SSOT 閉環結案)  
>  
> **結案狀態**: 本任務所有 Phase 均已成功交付，代碼已成功通過 `npm run build` 打包。
