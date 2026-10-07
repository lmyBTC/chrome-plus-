---
title: "Activity Monitor 側欄滾動修復與 Management 控制台 Dashboard 總覽看板同步"
plugin: "browser-activity-monitor"
status: "已完成"
created: "2026-10-07"
deadline: "2026-10-07"
---

## 1. 目標
1. 修復 Activity Monitor Side Panel (側欄) 因容器高度與 `overflow` 限制造成無法上下捲動、畫面卡死之 UI/UX 問題。
2. 於 Management 管理控制台（Dashboard）首頁新增與側邊欄完全一致的「有效停留時間看板」核心基本資訊顯示（包含專注度得分、今日四分類時長 KPI、多色佔比進度條與 Top 5 活躍停留網站列表），並串接背景資料達成雙向同步。

## 2. 策略與鎖定檔案

### 實作策略
1. **側欄滾動流暢化**：重構 `sidepanel/sidepanel.css` 中的 `body` 與 `.app-container` 佈局模式，移除阻斷捲動的限制，配置標準且具科技感的捲軸樣式（Custom Scrollbar），確保所有卡片（停留時間、快速健檢、原生權限、深度探針、分頁攔截）可順暢上下滑動。
2. **Dashboard 總覽模組整合**：
   - 擴充 `management/index.html` 側邊導航與主要工作區，新增「總覽儀表板 (Dashboard)」首頁視圖。
   - 移植並適應側欄的「有效停留時間看板」HTML 結構與 CSS 視覺風格至 Management 控制台。
   - 擴充 `management/js/dashboard.js` 與 `management/js/main.js`，透過 `monitor-stream` Port 連線向 `background.js` 請求 `GET_TIME_STATS` 與 `GET_ACTIVE_TAB_TIME`，保持數據即時更新。

### 鎖定檔案 (Target Files)
- `./browser-activity-monitor/sidepanel/sidepanel.css`
- `./browser-activity-monitor/management/index.html`
- `./browser-activity-monitor/management/css/style.css`
- `./browser-activity-monitor/management/js/dashboard.js` (新增)
- `./browser-activity-monitor/management/js/main.js`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/activity-monitor-core/SKILL.md` (更新 Management 入口與 Dashboard 模組說明)
- [x] L2 插件導航：`./browser-activity-monitor/ACTIVITY_MONITOR_README.md` (更新 Management 控制台儀表板架構)
- [x] [N/A] L3 業務規格：無新增獨立規格文件
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/browser-activity-monitor/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 側邊欄捲動修復與響應式優化 狀態：`[已完成]`
- [x] 任務 1.1: 修復容器滾動 CSS
  - [x] 調整 `sidepanel.css` 中 `body` 與 `.app-container` 的 `overflow` 與高度定義。
  - [x] 新增精簡客製化捲軸樣式，確保滾輪與拖曳正常運作。

### Phase 2: Management 首頁 Dashboard 結構與樣式建置 狀態：`[已完成]`
- [x] 任務 2.1: 在管理控制台加入 Dashboard 頁面區塊
  - [x] 在 `management/index.html` 側邊欄新增「儀表板首頁」分頁導航。
  - [x] 於主內容區加入與側欄鏡像之「有效停留時間看板」DOM（KPI 四宮格、多色進度條、Top 5 網站列表與刷新按鈕）。
  - [x] 在 `management/css/style.css` 補齊看板在寬螢幕 Dashboard 下之響應式網格與配色樣式。

### Phase 3: Dashboard 資料串接與即時同步 狀態：`[已完成]`
- [x] 任務 3.1: 實作 Dashboard 數據讀取與渲染
  - [x] 建立 `management/js/dashboard.js`，建立與 `background.js` 之 Port (`monitor-stream`) 通訊。
  - [x] 實作 `TIME_STATS_RESULT` 資料解析、分類時長計算、進度條比率與 Top 5 網域渲染。
  - [x] 整合至 `management/js/main.js` 生命週期與分頁切換邏輯。

### Phase 4: 驗收驗證與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 4.1: Chrome 插件手動載入與完整性審查
  - [x] 驗證 Side Panel 捲動順暢度。
  - [x] 驗證 Management Dashboard 與 Side Panel 資料顯示一致性。
  - [x] 執行 L1、L2 SSOT 回寫完成。

## 4. 影響評估
- 側欄 CSS 調整僅影響 Side Panel 視圖滾動容器，不影響底層監控與 Content Script 注入。
- Management 控制台新增 Dashboard 透過既有 `monitor-stream` Port 讀取資料，為唯讀請求，零副作用且不更動任何 Chrome API 權限宣告。

## 5. 驗收標準
- [x] **技術指標**: Side Panel 側欄在任何高度下均可正常滾動，內容不再被截斷或卡死。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無 `eval`、無內聯事件、動態文字皆以安全方式渲染。
- [x] **除錯清理**: 已確認移除或註解所有測試用的除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增檔案皆以 UTF-8 (無 BOM) 保存。
- [x] **SSOT 閉環**: 完成 Target SSOTs 骨架回寫。
- [ ] **L4 任務封存歸檔**: 待使用者驗收確認後移動至 `0.doc_mg/tasks/archive/browser-activity-monitor/`。
- [x] **插件驗證**: Chrome 中重新載入插件，側欄滑動與 Management Dashboard 功能皆正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-07 ID: 86eff269-78f5-429c-b016-c29bed4942dc (初始化)
> - 2026-10-07 ID: 52bc0883-d2bd-4f51-8f1b-757ba98c70db (Phase 2 & Phase 3 & SSOT 實作完成)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261007_activity_monitor_scroll_and_dashboard_sync.md，進行最後驗收與封存
> ```

