---
title: "ScrumClock 本機 Gemini Nano 專案管理與進度更新助理"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-17"
deadline: "2026-07-17"
---

## 1. 目標
1. 在週任務 (WeeklyMission) 資料結構中引入 progressPercent 進度百分比屬性。
2. 升級側欄助理 (Sidebar App) 的本機 Gemini Nano 模組，使其能夠識別並解析使用者的口語進度報告 (新增/更新專案與進度)，並自動將結構化資料儲存至本機的 chrome.storage。
3. 優化專案管理儀表板 (ProjectManagementDemo) 的 UI，使其支持顯示進度百分比與進度條，並能實時響應來自側欄 storage 的變更。

## 2. 策略與鎖定檔案
1. 擴展 `src/types/index.ts` 中的 `WeeklyMission` 類型定義，新增 `progressPercent?: number`。
2. 在 `src/entries/sidebar/main.tsx` 中：
   - 當使用者發送對話時，先呼叫本機 AI 判斷是否為「專案新增或進度更新」意圖。
   - 若為專案意圖，利用 Prompt 引導本機 AI 提取專案名稱、進度與狀態，以 JSON 回傳。
   - 解析該 JSON 並透過 `storage` 更新/建立任務池任務，且在側欄對話中即時給予成功反馈。
   - 若非專案意圖，則照舊呼叫一般敏捷助理對話。
3. 在 `src/features/project-management/components/ProjectManagementDemo.tsx` 中：
   - 增加 `chrome.storage.onChanged` 監聽器，當 `weeklyMissions` 被修改時，自動觸發數據加載 `loadData()`。
   - 在任務池表格中新增進度顯示：在標題下方或獨立區塊，以進度條與百分比精美呈現。

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\types\index.ts`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\entries\sidebar\main.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\project-management\components\ProjectManagementDemo.tsx`

## 3. 任務拆解

### Phase 1: 規劃與設計 狀態：`[已完成]`
### Phase 2: 代碼實作 狀態：`[已完成]`
### Phase 3: 驗證與編譯 狀態：`[已完成]`

## 4. 影響評估
- 本次修改使用 Chrome 擴充功能中既有的 storage 權限與 aiLanguageModel 權限，無須新增權限。
- 更新將實時連動儀表板與側欄，且不影響原有的會議防禦、番茄鐘等功能。

## 5. 驗收標準
- [x] **技術指標**: 專案進度條能隨側欄語意對話實時變更，無須手動重整頁面。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: 執行 `npm run build` 並在 `chrome://extensions/` 重新載入，確認功能正常。

## 6. AI 簽到區
- [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
**參與對話 ID 紀錄**:
- [2026-07-17] ID: 811984ed-3c7e-4d7d-9338-95f28f40c1e5 (任務已完成且已收斂)
