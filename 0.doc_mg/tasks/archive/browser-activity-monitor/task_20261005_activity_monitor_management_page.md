---
title: "建立 Browser Activity Monitor 管理頁面與黑名單管理模組"
plugin: "browser-activity-monitor"
status: "已完成"
created: "2026-10-05"
deadline: "2026-10-06"
---

## 1. 目標
為 `browser-activity-monitor` 擴充功能打造專屬管理控制台（Options / Management Page），提供直覺、現代感（深色漸層、Glassmorphism、微互動）且可擴充的管理架構。首期優先實作分頁攔截之「黑名單管理」核心功能，支援規則 CRUD、啟用開關、網域比對模式切換、搜尋過濾、即時儲存同步與匯入匯出。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./browser-activity-monitor/manifest.json`
- `./browser-activity-monitor/management/index.html`
- `./browser-activity-monitor/management/css/style.css`
- `./browser-activity-monitor/management/js/main.js`
- `./browser-activity-monitor/management/js/blacklist.js`
- `./browser-activity-monitor/sidepanel/sidepanel.html`
- `./browser-activity-monitor/sidepanel/sidepanel.js`
- `./browser-activity-monitor/sidepanel/sidepanel.css`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/activity-monitor-core/SKILL.md` (更新 Management UI 元件字典與入口)
- [x] L2 插件導航：`./browser-activity-monitor/ACTIVITY_MONITOR_README.md` (更新模組速查矩陣、管理頁入口索引)
- [x] L3 業務規格：`./browser-activity-monitor/docs/tab-interceptor-spec.md` (更新管理介面規格與同步流程)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/browser-activity-monitor/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 基礎架構建置與 Manifest 註冊 狀態：`[已完成]`
- [x] 任務 1.1: 註冊 `options_ui` / `options_page` 至 `manifest.json`，支援在新分頁開啟管理主頁
- [x] 任務 1.2: 建立 `management/index.html` 基礎佈局（側邊功能導航區 + 主工作區，預留未來模組分頁擴充）
- [x] 任務 1.3: 建立 `management/css/style.css` 核心設計系統（深色主題、CSS Tokens、Glassmorphism 卡片、按鈕與微互動）

### Phase 2: 黑名單管理互動邏輯與 Chrome Storage 同步 狀態：`[已完成]`
- [x] 任務 2.1: 實作 `management/js/blacklist.js` 模組，讀取與監聽 `bam_tab_blacklist_rules` 與 `bam_tab_interceptor_config`
- [x] 任務 2.2: 實作黑名單 CRUD 互動（新增網域/萬用字元規則、編輯備註與比對模式、啟用/停用切換、刪除與清空）
- [x] 任務 2.3: 實作搜尋篩選與統計展示（即時過濾網域、規則總數統計、攔截狀態連動）
- [x] 任務 2.4: 實作規則匯入/匯出 JSON 功能，提升設定維護與備份彈性

### Phase 3: Sidepanel 快捷跳轉入口整合與全面驗收 狀態：`[已完成]`
- [x] 任務 3.1: 在 Sidepanel 面板新增「開啟管理中心」捷徑按鈕，調用 `chrome.runtime.openOptionsPage()`
- [x] 任務 3.2: 執行合規審計與無報錯驗證（檢查 CSP、XSS、Storage 事件響應無死鎖、無 BOM、清理 console 偵錯代碼）
- [x] 任務 3.3: 執行 SSOT 閉環回寫（L1 專家技能、L2 插件導航 README、L3 業務規格）並移動任務檔案至封存目錄 (L4)

## 4. 影響評估
- **權限無變動**：已具備 `storage` 與 `tabs` 權限，無須額外擴充權限。
- **背景通訊穩定**：管理頁面與背景 `tab-interceptor.js` 透過 `chrome.storage.onChanged` 自動雙向同步，無須建立脆弱的長連線。
- **無侵入性**：獨立 Options 分頁執行，不污染宿主網頁環境。

## 5. 驗收標準
- [x] **技術指標**: 管理頁面視覺採用現代深色設計與 Glassmorphism，排版自適應且響應迅速。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，透過 `chrome.runtime.openOptionsPage()` 正確開啟。
- [x] **資料同步**: 在管理頁面新增/刪除/切換規則後，`chrome.storage.local` 即時寫入，背景 `tab-interceptor.js` 零延遲生效。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 完成 Target SSOTs (L1/L2/L3/L4) 骨架同步回寫。
- [x] **插件驗證**: 已在 Chrome 中載入插件並驗證管理頁面所有功能正常運作無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-05 ID: 012901c3-3fd7-496d-9be7-948d99077583 (初始化)
> - 2026-10-05 ID: 87884b8a-8e83-4a05-845f-dd16e14f9896 (執行 Phase 1 完工)
> - 2026-10-05 ID: 16f0364a-f2f2-4db2-8cfd-21a4665835f8 (執行 Phase 2 完工)
> - 2026-10-05 ID: 295bfe82-3c46-4209-bec7-5cafb4cf9cb2 (執行 Phase 3 完工驗收與封存)

