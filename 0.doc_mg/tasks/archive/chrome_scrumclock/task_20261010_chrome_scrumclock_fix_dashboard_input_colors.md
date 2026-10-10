---
title: "修復專案管理儀表板輸入框白底刺眼與深色 UI/UX 調優"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-10"
deadline: "2026-10-10"
---

## 1. 目標
修復專案管理儀表板（TaskPoolTab 與 BoardView）在暗色主題下，快速新增任務輸入框、看板搜尋框、收件匣快記想法輸入框出現不協調的白底刺眼問題。透過全域表單樣式深色基底防禦與元件層 Tailwind 樣式調優，使輸入框與周邊下拉選單完美融入深色玻璃擬態介面。

## 2. 策略與鎖定檔案

### 實作策略
1. **全域深色基底防禦 (`src/index.css`)**：
   - 針對 `input, select, textarea` 加入全域深色主題預設重設，設定背景為深色半透明（如 `rgba(30, 41, 59, 0.85)` / `var(--color-bg-card)`）與文字顏色，杜絕瀏覽器 user agent stylesheet 純白底預設。
2. **元件樣式精準修正**：
   - `TaskPoolTab.tsx`：修正快速新增任務輸入框及優先級下拉選單之背景色與文字色彩，使用有效 Tailwind 深色類別（如 `bg-slate-800/90`）及細緻聚焦環（focus ring）。
   - `BoardView.tsx`：修正頂部看板搜尋輸入框及收件匣欄位之「快記想法」輸入框，消除白底眩光，增添玻璃擬態聚焦微光與細邊框質感。
3. **驗證與合規**：
   - 確認 Vite 建置通過，無 TypeScript 錯誤，深色對比度符合 WCAG AA 易讀標準。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/index.css`
- `./chrome_scrumclock/src/features/project-management/components/tabs/TaskPoolTab.tsx`
- `./chrome_scrumclock/src/dashboard/components/BoardView.tsx`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (純樣式與 UI/UX 局部調優，無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md` (豁免)
- [ ] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md` (豁免)
- [ ] L3 業務規格：`./chrome_scrumclock/docs/` (豁免)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 全域表單深色防禦與元件輸入框 UI/UX 調優 狀態：`[已完成]`
- [x] 任務 1.1: 在 `chrome_scrumclock/src/index.css` 補齊全域表單控制元件 (`input`, `select`, `textarea`) 的深色預設樣式與文字色彩防禦
- [x] 任務 1.2: 修正 `chrome_scrumclock/src/features/project-management/components/tabs/TaskPoolTab.tsx` 中快速新增任務輸入框與優先級選單樣式
- [x] 任務 1.3: 修正 `chrome_scrumclock/src/dashboard/components/BoardView.tsx` 中看板搜尋輸入框與收件匣快記想法輸入框樣式
- [x] 任務 1.4: 執行 `npm run build` 驗證編譯無誤，確認樣式無報錯

## 4. 影響評估
- 本修改僅涵蓋 CSS 樣式與 React 元件視覺呈現，不影響任何 Chrome Extension API 權限、Storage 資料結構或跨插件通訊契約。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環（二選一）**:
  - [x] [N/A] 輕量任務豁免（無結構變動，L1~L3 免比對免回寫）
  - [ ] 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）
- [x] **L4 任務封存歸檔**: 任務完成後已寫入封存檔案於 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: 已執行 Vite `npm run build` 確認建置正常無報錯，輸入框在暗黑模式下無白底刺眼，對比度與層次良好。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - 2026-10-10 ID: 0ed4f737-f590-4a69-9907-8c7e11c026b2 (初始化)
> - 2026-10-10 ID: 97dafd1f-dfb7-4313-a761-bc3ede41aef0 (執行 Phase 1)
