# 專案經理 (PM) 敏捷工作流摩擦力診斷矩陣 (PM Workflow Friction Matrix)

> **文件狀態**：回寫精簡與去蕪存菁版 (SSOT)  
> **更新日期**：2026-10-03  
> **適用角色**：專案經理 (PM)、敏捷開發者  
> **涉及插件**：`chrome_scrumclock` (任務與衝刺)、`browser-activity-monitor` (活動與資源軌跡)  
> **架構原則**：單插件自洽、嚴格邊界防禦、拒絕過度工程化、雲端生態系遠程儲備  

---

## 1. 執行摘要 (Executive Summary)

經實測與需求穿透評估，PM 在瀏覽器端進行敏捷管理時，痛點核心應聚焦於**「工具自身易用性」**與**「低摩擦的數據記錄與匯出」**，而非過早投入跨插件強耦合或重量級企業管理系統。

本文件已全面剔除「跨插件資料庫外鍵注入」等過度設計，並確立雙軌推進策略：
1. **近程（實體痛點・單插件自洽）**：優先改善 ActivityMonitor 的「分頁停留時間與網域統計」，以及 ScrumClock 的「右鍵快速捕獲與本地 Worklog 匯出」。
2. **遠程（未來儲備・Google 雲端生態系）**：將 Google Calendar 會議防衝突、Google Tasks 雙向排程與 Google Sheets 報工列為未來開發項目。

```mermaid
graph TD
    subgraph 近程核心：單插件可用性 (Local MVP)
        A1[ScrumClock: 右鍵捕獲 & 工時/P0輸入]
        A2[ScrumClock: 一鍵匯出 Markdown/CSV 週報]
        A3[ActivityMonitor: 分頁停留時長 tabs.onActivated]
        A4[ActivityMonitor: 生產力/休閒網域智慧分類]
    end

    subgraph 遠程儲備：Google 生態系 (Future Roadmap)
        B1[Google Calendar 衝突即時預警]
        B2[Google Tasks 今日待辦雙向排程]
        B3[Google Sheets / Drive 自動拋轉報工]
    end

    subgraph 已裁撤：過度設計 (Discarded)
        C1[跨插件 IndexedDB 即時外鍵注入 SF-03/EF-02]
        C2[重量級甘特圖與團隊燃盡圖 SC-V01/SC-V04]
    end

    style A1 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style A2 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style A3 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style A4 fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style B1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style B2 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style B3 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style C1 fill:#ffebee,stroke:#c62828,stroke-width:1px,stroke-dasharray: 5 5
    style C2 fill:#ffebee,stroke:#c62828,stroke-width:1px,stroke-dasharray: 5 5
```

---

## 2. 第一梯隊：核心實體痛點矩陣（近程・單插件自洽）

此區塊為目前真正值得投入開發的實體功能，遵循「單一插件 100% 獨立運行」原則。

### 2.1 ActivityMonitor 核心易用性改善

| 編號 | 痛點節點 | 現狀代償與問題本質 | 具體改善方案 (低成本高價值) | 優先級 |
| :--- | :--- | :--- | :--- | :--- |
| **AM-01** | **底層請求噪音 vs 語意化停留時長** | 目前僅記錄 `webRequest` 底層封包，PM 面對數千筆 JS/CSS/CDN 請求無法看出在特定分頁停留多久。 | 監聽 `chrome.tabs.onActivated` 與視窗焦點，統計網頁的前台實際有效停留時長（分鐘/秒）。 | **P0 (極高)** |
| **AM-02** | **缺乏網域智慧分類標籤** | 日誌僅有純 URL 網址，需人工逐條辨識工作或分心。 | 內建常見網域映射字典（如 GitHub/Figma/Docs 為「工作」，YouTube/FB 為「娛樂」），支援簡單彩色標籤與過濾。 | **P0 (高)** |
| **AM-03** | **日誌隱私脫敏匯出** | 欲截圖或匯出活動紀錄時，URL 常帶有私人 Token 或機密參數。 | 匯出時提供一鍵遮蔽 Query String 與私有 IP 的開關。 | **P1 (中)** |

### 2.2 ScrumClock 敏捷排程與報工改善

| 編號 | 痛點節點 | 現狀代償與問題本質 | 具體改善方案 (低成本高價值) | 優先級 |
| :--- | :--- | :--- | :--- | :--- |
| **SC-01** | **缺乏右鍵外部快速捕獲** | 在 GitHub PR、Jira 或網頁看到待辦時，需手動切換分頁複製貼上。 | 透過 `chrome.contextMenus` 支援選取文字後右鍵「加入 ScrumClock 任務」。 | **P0 (高)** |
| **SC-02** | **關鍵屬性輸入介面缺失** | 抽屜面板 (`TaskDetailDrawer`) 缺少預估番茄數輸入框，且優先級缺少 `P0 (Blocker)`。 | 補齊預估工時與 P0 標籤選擇器，利於輕量工時預算。 | **P0 (高)** |
| **SC-03** | **本地結構化 Worklog 匯出** | 衝刺結束或每週報工時，需手動逐一翻查卡片記錄並抄寫。 | 提供「一鍵複製 Markdown 週報 / 匯出 CSV 工時」按鈕，格式化輸出任務與番茄鐘總數。 | **P0 (高)** |
| **SC-04** | **衝刺中斷記錄與原因** | 番茄鐘暫停時未記錄原因，衝刺專注數據失真。 | 暫停時提供簡易原因快選（如：會議插單、緊急通訊、個人休息）。 | **P1 (中)** |

---

## 3. 第二梯隊：未來願景儲備（遠程 Roadmap・Google 雲端生態系）

此區塊為具備實用潛力但架構較重之需求，列為**未來開發項目 (Future Backlog)**，暫不在當前週期展開。

| 編號 | 願景模組 | 業務價值 | 落地技術要點 (待排程) | 規劃期程 |
| :--- | :--- | :--- | :--- | :--- |
| **GG-01** | **Google Calendar 會議衝突預警** | 啟動 25~50 分鐘衝刺時，若接下來有行事曆會議，主動預警建議縮短時間，避免衝刺腰斬。 | 調用 Calendar API 或讀取近端快取 Event 清單進行時間重疊比對。 | 未來階段 (Roadmap) |
| **GG-02** | **Google Tasks 雙向排程聯動**(已完成) | 讀取 Google Tasks 今日待辦清單並雙向同步完成狀態。 | 整合 Google Tasks REST API 或 Chrome Identity 授權管線。 | 已完成 |
| **GG-03** | **Google Sheets / Drive 自動拋轉** | 一鍵將單週已完成 Worklog 自動追加拋轉至個人的 Google Sheets 工時總表。 | 提供 GAS Webhook 輕量對接或 OAuth2 寫入指定 Sheet ID。 | 未來階段 (Roadmap) |

---

## 4. 正式裁撤之過度設計清單 (Over-engineering Discarded)

以下項目經評估屬於違反專案憲法（邊界防禦與隔離）或過度複雜之偽需求，**全面終止開發與封存**：

1. **跨插件即時衝刺廣播與外鍵對帳 (SF-03 / EF-02)**：
   - *裁撤理由*：硬將 ScrumClock 的 `missionId` 跨插件寫入 ActivityMonitor 的 IndexedDB，嚴重破壞插件獨立性。PM 真正需要的是 ActivityMonitor 本身看得到「分頁停留時間」，而非兩套資料庫的實時聯結。
2. **重量級甘特圖與時序依賴視圖 (SC-V01)**：
   - *裁撤理由*：Chrome 插件應保持輕量敏捷，複雜甘特圖應交由 Jira/ClickUp/Notion 等專業外部 SaaS 處理。
3. **團隊容量與燃盡圖 (SC-V04)**：
   - *裁撤理由*：插件本質為個人瀏覽器端效能工具，引入團隊級容量預算大幅推高維護成本。

---

## 5. 總結與執行路線圖

* **當前重心**：
  1. `browser-activity-monitor`：補齊 `tabs.onActivated` 前台停留時長與網域分類 (AM-01, AM-02)。
  2. `chrome_scrumclock`：補齊抽屜輸入欄位與本地 Markdown/CSV 匯出 (SC-01, SC-02, SC-03)。
* **外部整合**：
  - 待單插件核心功能成熟穩固後，再行評估第 3 節之 Google 生態系對接 (GG-01 ~ GG-03)。
