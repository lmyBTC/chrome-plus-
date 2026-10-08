# 📋 Chrome Plus 擴充功能套件：生態系優化與進階規格書 (PRD)

> **版本**：v2.3.0-RFC (Google Workspace Native Edition)
>
> **目標對象**：專案經理 (Project Managers, PjM / Delivery Leads)、投資/產業研究員 (Investment Researchers)、核心研發團隊
>
> **狀態**：規劃中 (Draft for Review)
>
> **基礎架構**：Chrome Extension Manifest V3 + Google Workspace APIs

---

## 1. 文件背景與核心目標

目前 Chrome Plus 具備良好的模組化架構（ScrumClock、FinanceClipper、VideoSpeed、ActivityMonitor），但在跨模組通訊體驗、專案推進的自動化閉環、投研深度資料（PDF/同業對比）以及工作時程管理上仍有斷點。

本優化方案旨在達成三大目標：

1. **底層管線現代化**：消除手動複製 Extension ID 的斷層，建立具備自動重試與握手機制的內部通訊總線。
2. **賦能專案經理 (Project Manager - Google 原生生態系閉環)**：以 Google Workspace 原生服務為核心骨幹，建構「多源任務秒級捕捉 ➔ GTD 情境與時間箱規劃 ➔ **Google 原生套件 (Tasks / Calendar / Sheets / Docs) 深度雙向同步** ➔ 行事曆時間箱回填、Sheets 敏捷看板與工時燃盡追蹤」的全流程交付自動化。
3. **賦能投資研究員 (Analyst)**：建構「券商 PDF 研報解析 ➔ 同業族群橫向指標對比 ➔ 估值敏感度試算」的深度研報工作流。

---

## 2. 系統架構升級：通訊與生態底座 (Infrastructure Upgrade)

### 2.1 零配置跨插件通訊 (Zero-Config Handshake & Static Extension ID)

* **問題**：現有方案需使用者手動至 `chrome://extensions/` 複製 Extension ID 貼入各插件。
* **解法**：在所有插件的 `manifest.json` 中配置固定公開金鑰（Public Key），使本地開發與發布環境的 Extension ID 恆定不變。
  ```json
  {
    "manifest_version": 3,
    "name": "Chrome Plus - Core Module",
    "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
  }
  ```
* **通訊握手標準 (Discovery Bus)**：
  * 各模組啟動時，向預設的 `ScrumClock Extension ID` 發送 `PING_HUB`。
  * ScrumClock 回傳自身支援的 Capability 清單，完成自動配對。

### 2.2 防丟單訊息佇列 (Outbox Queue & Dead-Letter Handling)

* **問題**：Service Worker 處於休眠狀態（Inactive）時，外部 `sendMessage` 容易發生逾時與資料丟失。
* **機制**：
  1. 發送端在調用 `chrome.runtime.sendMessage` 時，若 catch 到錯誤，立即將 Payload 寫入本地 `chrome.storage.local` 的 `outbox_queue`。
  2. 監聽 `chrome.tabs.onActivated` 或使用 `chrome.alarms` 每 30 秒觸發 `retryPendingQueue()`。
  3. 接收端收到訊息後回傳 `ACK`，發送端才將該項目自佇列移除，確保 100% 不掉單。

---

## 3. 專案經理 (PjM) 專用功能模組規格：Google 原生生態系敏捷交付

```
[專案經理 Google 原生交付工作流]
多端任務捕捉/郵件/會議 ➔ GTD 捕捉與情境標記 ➔ 多視角看板排程
         ▲                                   │
         │ (雙向同步 / OAuth2)                ▼
┌────────┴───────────────────────────────────────────────────────┐
│ Google Tasks    : 任務代辦清單、子項目、完成度雙向聯動           │
│ Google Calendar : 時間箱 (Timeboxing)、番茄鐘衝刺事件回填      │
│ Google Sheets   : 團隊敏捷交付看板、燃盡統計、工時 Log Master   │
│ Google Docs     : 每日站會 (Daily Standup) 簡報與衝刺回顧自動產出│
└────────────────────────────────────────────────────────────────┘
```

### 3.1 模組 A：全域 GTD 智慧捕捉與情境分類器 (GTD Omni-Capture & Context Orchestrator)

* **核心價值**：解決專案經理在瀏覽器多工環境下，碎片資訊（Gmail 郵件、Google Meet 討論、Google Docs 評論）無法及時歸整入庫的痛點。
* **觸發方式**：全域快捷鍵 `Alt + Q` 或反白右鍵「快速收集為待辦任務」。
* **功能規格**：
  1. **GTD 五步法深度適配**：
     * **Capture (捕捉)**：一鍵抓取當前頁面標題、選取文字、來源 URL，並支援一鍵截圖貼上。
     * **Clarify (釐清)**：AI 輔助評估該事項是否能在 2 分鐘內解決；若否，自動推薦歸入「專案待辦池」或「委派追蹤清單」。
     * **Organize (整理 - 情境標籤 Contexts)**：支援多重情境標記：
       * 空間/模式：`@Focus`（需番茄衝刺）、`@Meeting`（會議討論）、`@Review`（驗收覆核）。
       * 狀態與依賴：`@Waiting-For`（等待外部回應）、`@Blocked`（遭遇專案阻礙）。
     * **Engage (執行)**：將任務指派至當日焦點戰役或排定時間箱 (Timebox)。
  2. **艾森豪矩陣 (Eisenhower Matrix) 自動建議**：
     * AI 根據任務描述中的截止期限與關鍵字，預判「重要/緊急」象限，協助專案經理梳理排期優先順序。

### 3.2 模組 B：多視角敏捷看板與工時燃盡 (Agile Delivery Kanban & Timebox)

* **位置**：`chrome_scrumclock` 獨立新分頁儀表板與側邊欄。
* **介面規格**：
  1. **多視角看板切換 (View Modes)**：
     * **標準 Kanban 視圖**：Backlog ➔ Sprint Focus ➔ In Progress ➔ In Review ➔ Done。
     * **GTD 流程視圖**：Inbox (待整理) ➔ Next Actions ➔ Waiting-For ➔ Someday/Maybe。
     * **時間箱行事曆視圖**：與 Google Calendar 即時聯動，以 25 分鐘為顆粒度將任務拖放至行事曆工作時段。
  2. **WIP 限制與瓶頸預警 (Work-In-Progress Limits)**：
     * 限制「In Progress」欄位最大任務上限（例如上限 3 項），超額時看板變更為黃色警示，提醒專案經理避免多工分心。
     * **停滯任務偵測 (Stale Task Warning)**：當任務處於「進行中」狀態超過 48 小時未有番茄鐘或進度更新，自動標註「潛在風險」標記。
  3. **番茄衝刺工時自動結算**：
     * 每一輪 25 分鐘衝刺結束，自動記錄耗費時間至該任務的 `spent_time` 欄位，產出日/週衝刺燃盡圖（Burndown Chart）。

### 3.3 模組 C：Google 原生生態系雙向同步與自動化引擎 (Google Workspace Sync & Automation)

* **認證方式**：採用 Chrome 擴充功能原生 `chrome.identity.getAuthToken` (OAuth2)，免除第三方連線密鑰外洩風險。
* **支援 Google 原生服務矩陣**：

```
[ScrumClock 敏捷專注中樞]
    │
    ├── 1. Google Tasks API (v1)
    │      ├── 雙向同步：建立/修改任務、完成狀態即時勾選
    │      └── 清單映射：ScrumClock 的情境標籤映射至 Google Tasks 清單
    │
    ├── 2. Google Calendar API (v3)
    │      ├── 時間箱排程：任務拖拉即在行事曆生成事件區塊
    │      └── 工時實績回填：番茄鐘衝刺結束，自動在日曆寫入「[Focus] 任務名稱 (25m)」
    │
    ├── 3. Google Sheets API (v4)
    │      ├── 交付看板主表：雙向同步團隊專案總表（作為輕量化看板資料庫）
    │      └── 工時與燃盡統計：自動 append 每日衝刺明細與阻礙日誌
    │
    └── 4. Google Docs API (v1)
           └── 自動化文檔產出：每日站會簡報、週會報告、會議 Action Items 寫入指定 Docs
```

* **核心自動化規則 (Event-Action Automation Rules)**：
  1. **Google Tasks 雙向聯動**：
     * 本地建立任務 ➔ 自動在 Google Tasks 的對應清單（如 `Sprint 2026-Q4`）新增 Task。
     * 手機端 Google Tasks 勾選完成 ➔ 背景同步將 ScrumClock 本地任務推至 `Done`。
  2. **Google Calendar 時間箱與工時回報 (Timebox & Actual Log)**：
     * 在看板中將任務排入特定時段 ➔ 自動建立 Google Calendar 事件（設為預定專注塊）。
     * 在 ScrumClock 累積完成番茄鐘 ➔ 自動在 Google 日曆建立實績區塊（例如綠色標記 `[Completed 🍅x3] 系統架構重構`），免除手動記工時的負擔。
  3. **Google Sheets 敏捷主表同步 (Spreadsheet as a Kanban Database)**：
     * 支援將指定的 Google Sheet 作為「團隊交付追蹤總表」。
     * 本地看板拖曳卡片變更狀態（如 `In Progress` ➔ `Done`）➔ 自動更新 Sheet 對應 Row 的欄位資料，方便向團隊或主管呈現最新進度。
  4. **阻礙升級自動化 (Blocker Escalation)**：
     * 當本地任務標籤變更為 `@Blocked` 並填寫阻礙原因時 ➔ 自動在 Google Sheet 阻礙清單中標紅，並於 Google Calendar 當日排定一筆「⚠️ 阻礙排查提醒事件」。

### 3.4 模組 D：每日站立會議與週報生成器 (Standup & Docs Copilot)

* **適用情境**：每日 Scrum Standup、週會報告、衝刺回顧 (Retrospective)。
* **規格**：
  1. **一鍵萃取 Standup 報告並推播至 Google Docs**：
     * 點擊「產生站會簡報」，AI 自動遍歷前一日完成的任務、當日排定的焦點戰役與標記 `@Blocked` 的項目：
       ```markdown
       ### 📢 Daily Standup (2026-10-02)
       - **Yesterday Completed**: 
         - [Task-102] 完成結帳模組 API 測試 (3 🍅) [Google Tasks 同步]
       - **Today Focus**: 
         - [Task-108] 支付網關異常排查與重構 (預估 4 🍅) [Calendar 時間箱已排定]
       - **Blockers & Dependencies**:
         - ⚠️ 等待 DevOps 團隊更新 Staging 權限 (@Waiting-For)
       ```
     * 支援一鍵將 Markdown 結構化格式直接寫入團隊共用的 **Google Docs 衝刺日誌專案文件** 結尾。
  2. **Google Meet 會議字幕行動項目提取**：
     * 在 Google Meet 網頁版會議中，監聽即時字幕，點擊「提取行動清單」➔ AI 自動歸納帶有負責人與截止日的待辦項，直接批量轉入 Google Tasks 或 ScrumClock 收件匣。

---

## 4. 投資研究員 (Analyst) 專用功能模組規格

```
[投研分析工作流]
券商 PDF / SEC 10-K ➔ PDF Copilot 提取表格 ➔ 標的加入同業對比矩陣 ➔ 估值敏感度試算 ➔ 匯出至 Google Sheets
```

### 4.1 模組 E：PDF 研報與財報智能解析器 (PDF Research Copilot)

* **規格**：
  1. **PDF 攔截與解析引擎**：
     * 整合輕量版 `pdf.js`，支援解析 `file:///` 本地 PDF 與網頁 PDF 檢視器。
     * 提供文字層提取、表格邊界偵測（Table Detection）。
  2. **AI 側邊欄 PDF 專屬視圖**：
     * **一鍵提取財務摘要**：自動定位財報中的「Consolidated Statements of Operations」並提取營收、營業利益與 EPS。
     * **圖表數據轉 Markdown / Google Sheets**：反白框選 PDF 任意表格，秒轉結構化資料，支援一鍵直接寫入 Google Sheets 投資底稿。

### 4.2 模組 F：跨標的同業橫向對比矩陣 (Peer Comparison Matrix)

* **位置**：`Finance Research Clipper` 獨立儀表板 (`dashboard.html`) 新增「同業橫向對比」分頁。
* **核心指標矩陣表**：
  | 指標類別 | 關鍵欄位 (Columns) | 視覺化效果 |
  | :--- | :--- | :--- |
  | **估值維度** | 現價、市值、動態 P/E、Forward P/E、P/S、PEG | 最小值標綠、最大值標紅 |
  | **獲利能力** | 毛利率 (Gross Margin)、營業利益率、ROE | 水平長條圖比較 |
  | **成長趨勢** | 營收年增率 (YoY)、淨利年增率 (YoY) | 趨勢上升/下降箭頭 |
  | **分析師共識** | 上漲空間 (Upside %)、強烈買進/買進比例 | 階梯儀表板橫向疊加 |

### 4.3 模組 G：輕量化估值情境試算工具 (Valuation Sensitivity Sandbox)

* **即時連動公式**：
  $$
  \text{Target Price} = \frac{\text{Forward EPS} \times (1 + \text{Growth Rate}) \times \text{Target P/E}}{(1 + \text{Discount Rate})}
  $$
* **輸出結論**：自動計算悲觀情境（Bear）、基準情境（Base）、樂觀情境（Bull）之目標價，並支援一鍵同步推播至 Google Sheets 與 ScrumClock 專注戰役。

---

## 5. 資料結構與跨插件傳輸協議 (API Contracts)

### 5.1 統一專案任務封裝物件 (Universal Task Object - Google Workspace 擴充)

```typescript
interface UniversalTaskPayload {
  version: "2.3";
  sourcePlugin: "CHROME_SNIFFER" | "FINANCE_CLIPPER" | "VIDEO_SPEED" | "MEETING_COPILOT";
  category: "PROJECT_DELIVERY" | "RESEARCH" | "LEARNING";
  
  // 專案管理與 GTD 核心屬性
  task: {
    id: string;
    title: string;
    description: string;
    gtdContext: "@Focus" | "@Meeting" | "@Review" | "@Waiting-For" | "@Blocked";
    eisenhower: "URGENT_IMPORTANT" | "IMPORTANT_NOT_URGENT" | "URGENT_NOT_IMPORTANT" | "NEITHER";
    estimatedPomodoros: number; // 預估番茄鐘數
    spentPomodoros?: number;    // 已消耗番茄鐘數
    dueDate?: string;           // ISO 8601
    sourceUrl?: string;
  };

  // Google 原生生態系同步元數據 (Google Workspace Metadata)
  googleWorkspaceSync?: {
    // Google Tasks
    tasksListId?: string;
    googleTaskId?: string;
    
    // Google Calendar (時間箱與實績)
    calendarEventId?: string;
    timeboxStartTime?: string;  // ISO 8601
    timeboxEndTime?: string;    // ISO 8601
    
    // Google Sheets (看板資料庫與工時總表)
    spreadsheetId?: string;
    sheetName?: string;
    rowIndex?: number;
    
    // Google Docs (文件紀錄)
    targetDocId?: string;
    blockerReason?: string;
  };

  // 投研專用擴充屬性 (Optional)
  researchContext?: {
    ticker?: string;
    peRatio?: number;
    targetPrice?: number;
  };
}
```

---

## 6. 模組可插拔設計 (Modular Architecture)

系統採取 **「主幹帶核心，其餘做外掛 (Hub-and-Spoke with Feature Flags)」** 的策略：

1. **ScrumClock 作為旗艦 Host**：
   * 預設包含：番茄鐘、GTD 捕捉工具、多視角看板、AI 側邊欄與 Google 原生同步引擎。
2. **功能開關面板 (Options Page)**：
   * 使用者可在設定頁依據角色啟用所需套件：
     * `[✓]` 啟用 **Google 原生生態系同步** (Google Tasks, Calendar, Sheets, Docs)
     * `[✓]` 啟用 **Google Meet 會議決策與字幕萃取** (Meeting Copilot)
     * `[ ]` 啟用 投資研報深度採集 (Finance Suite - 可自由啟用/停用)
     * `[✓]` 啟用 影音倍速與字幕採集 (Video Suite)
     * `[ ]` 啟用 瀏覽器網路與資安審查 (Security Suite)

---

## 7. 實施階段與驗收標準 (Milestones & Roadmap)

| 階段 (Phase) | 核心產出 | 驗收標準 (Acceptance Criteria) |
| :--- | :--- | :--- |
| **Phase 1: 底座重構 (Week 1-2)** | 固定 Extension Key、握手協議、Outbox 重試佇列 | 1. 移除手動輸入 ID 步驟<br>2. 跨插件發送任務成功率達 100% (含重試) |
| **Phase 2: Google Workspace 整合 (Week 3-4)** | `chrome.identity` OAuth2 授權、Google Tasks/Calendar 雙向同步 | 1. ScrumClock 任務可一鍵推播/同步至 Google Tasks<br>2. 番茄鐘結束自動於 Google 日曆回填工時區塊 |
| **Phase 3: Sheets 看板與 Docs 站會 (Week 5-6)** | Google Sheets 敏捷總表聯動、Google Docs 站會簡報自動產生 | 1. 看板狀態拖曳可即時更新 Sheets 對應 Row<br>2. 點擊按鈕可將昨日成果、今日焦點輸出至 Google Docs |
| **Phase 4: 投研 PDF 與同業矩陣 (Week 7-8)** | PDF 研報表格提取、同業估值矩陣、試算結果推至 Sheets | 1. 支援本地/線上 PDF 財報數據秒轉 Sheets<br>2. 支援 3 標的以上橫向指標長條圖對比 |