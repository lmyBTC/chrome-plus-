# Chrome Plus × 24小時人生重啟系統：Google 服務整合與系統設計方案

**產品願景：** 將「24 小時人生重啟 SOP」植入用戶的日常瀏覽器環境，透過 Google Calendar 與 Google Tasks 的 API 雙向同步，建立一個不依賴意志力、自動化防護且能持續給予大腦「我贏了」正向反饋的數位工作空間。

## 一、 核心概念與 Google API 映射機制

本系統不重新造輪子，而是作為 Google 生態系的微型指揮中心（Control Center）：

| 重啟系統階段 | Chrome 插件介入點 | Google Tasks 映射 | Google Calendar 映射 |
| --- | --- | --- | --- |
| **Phase 1: 前夜清障** | 晚間 22:00 彈出「決策引導」與網頁防護設置 | 建立/標記明日唯一 MIT 任務，填寫可見交付標準 | 自動生成明日 3 個核心時間塊（晨間、深度區段、復盤） |
| **Phase 2: 晨間開局** | New Tab 頁面接管（強迫呈現 MIT，屏蔽新聞與社群） | 讀取並放大顯示當日 MIT | 顯示今日時間區塊排程與倒數 |
| **Phase 3: 深度執行** | 一鍵開啟「Focus Shield」（黑名單/白名單網頁攔截 + 番茄鐘） | 完成任務時勾選，觸發 API 狀態同步 | 將日曆區段更新為「進行中/已完成」，鎖定專注時段 |
| **Phase 4: 中段重置** | 午休後引導彈窗：填寫 3 行「復位卡」 | 更新下午推進子任務 | 自動微調下午日曆行程 |
| **Phase 5: 晚間復盤** | 15 分鐘系統升級引導，記錄反饋 | 歸檔已完成 Tasks | 將復盤紀錄寫入 Google Calendar Event Description（或專屬 Log 日曆） |

## 二、 系統三大核心功能模組

### 1. New Tab / Side Panel「主動模式」面板 (Active Dashboard)
- **單一 MIT 焦點模式：** 每次開啟新分頁，不顯示繁雜書籤，僅顯示今日唯一的 MIT 與其「可見交付目標」（如：寫完方案草稿 300 字）。
- **卡頓降級按鈕 (Action Downgrade)：** 當用戶在深度執行期感到阻力時，點擊「卡住了？」，插件自動引導將當前 Task 拆解為 10 分鐘微縮版本並更新至 Google Tasks。
- **物理/數位防禦線 (Focus Shield)：** 在「深度執行時間塊」內，自動攔截 YouTube、社交媒體與新聞網站，替換為「當前 MIT 交付提示」。

### 2. Google Calendar & Tasks 自動時間塊同步引擎 (Auto Block Engine)
- **一鍵推播時間塊 (One-Click Time Blocking)：** 用戶在前夜設定好 MIT 後，插件透過 API 自動在 Google Calendar 上劃分出：
  - 08:00 - 08:30 [晨間開局]
  - 09:00 - 11:00 [MIT 深度執行 90m]
  - 13:30 - 14:00 [午間重置]
  - 21:30 - 22:00 [前夜清障與復盤]
- **Tasks 雙向同步：** 在 Chrome 插件內勾選完成，立即同步 Google Tasks API 的 `status = completed`。
- 自動統計當天「閉環次數」，觸發正向反饋視覺動畫。

### 3. 「10 分鐘崩盤救援」極限模式 (Emergency Rescue Button)
當用戶當天節奏被突發狀況打亂，點擊懸浮的「崩盤救援」按鈕：
- **動作 1：** 插件自動將今日未完成的 Google Tasks 清單全部歸檔或移至明日，僅保留一個「10 分鐘微縮 Task」。
- **動作 2：** 日曆自動將後續行程清除或標示為「Rest/Reset Mode」，消除用戶的罪惡感。
- **動作 3：** 完成 10 分鐘任務後，強制送出「今日閉環成功，系統並未斷線！」的反饋通知。

## 三、 技術架構設計 (Technical Architecture)

```text
┌──────────────────────────────────────────────────────────────┐
│                    Chrome Plus Extension                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ New Tab Override │  │ Chrome SidePanel │  │ Focus Shield│ │
│  └─────────┬────────┘  └────────┬─────────┘  └──────┬──────┘ │
└────────────┼────────────────────┼───────────────────┼────────┘
             │                    │                   │
             ▼                    ▼                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    Chrome Background Service                 │
│              (State Machine & Notification Manager)          │
└──────────────────────────────┬───────────────────────────────┘
                               │
                OAuth 2.0 Auth │ (Chrome Identity API)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                      Google REST APIs                        │
│     ┌────────────────────────┐  ┌────────────────────────┐   │
│     │   Google Calendar API  │  │    Google Tasks API    │   │
│     │ (Events & Free/Busy)   │  │ (Tasklists & Subtasks) │   │
│     └────────────────────────┘  └────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**1. 核心元件說明：**
- **Manifest V3 規範：** 採用 Service Worker 處理背景狀態輪詢與定時提醒（Alarm API）。
- **OAuth 2.0 (Chrome Identity API)：** 使用 `chrome.identity.getAuthToken` 免密碼無縫串接用戶的 Google 帳號授權。
- **Declarative Net Request API：** 實現高效且低耗電的「專注模式網頁攔截/封鎖」。
- **Google Tasks API (`/tasks/v1/users/@me/lists`)：** 自動創建專屬清單 [24h Reset System]，專門管理 MIT 與微縮任務，不干擾用戶原本的其他雜務清單。
- **Google Calendar API (`/calendar/v3/calendars/primary/events`)：** 自動打上色彩標記（ColorId）：例如黃色代表 MIT 專注時間，綠色代表復盤與重置，確保行事曆一目瞭然。

## 四、 用戶 24 小時自動化互動流程 (Workflow Example)

```text
[21:30 前夜] ──> Chrome 彈窗引導寫下 MIT ──> 同步至 Google Tasks ──> 於 Calendar 自動排入明日 Focus Block
                                                                             │
[08:00 晨間] <── New Tab 顯示 MIT 啟動卡片 <── 阻斷社群網站入口 <────────────────┘
       │
[09:00 深度區段] ──> 開啟 Focus Shield 網頁屏蔽 ──> 25/45m 倒數計時 ──> 完成交付
                                                                             │
[13:30 午間] <── 彈窗 3 行復位卡 <── 引導下午方向不切換 <─────────────────────┘
       │
[21:00 晚間] ──> 5 題問答復盤 ──> 記錄於 Calendar Event Description ──> 觸發「今日已贏」獎勵畫面
```

## 五、 MVP（最小可行性產品）開發階段規劃

- **Phase 1: Google OAuth 與 API 整合**
  - 通路完成 Chrome Identity 授權。
  - 實現與 Google Tasks / Calendar 的基礎讀寫（建立任務、劃分時間塊）。
- **Phase 2: 核心 UI 與「主動開局」New Tab**
  - 開發 Chrome New Tab 覆蓋頁面，實現 MIT 強力展示與任務勾選。
  - 整合基礎 Pomodoro 計時器與簡單的 Web Request 網頁屏蔽。
- **Phase 3: 重啟系統閉環邏輯與崩盤救援**
  - 加入「卡頓降級」與「10 分鐘崩盤救援」彈窗邏輯。
  - 導入晚間復盤引導與大腦正向反饋（如：連續不斷線天數統計與獎勵視覺）。

## 六、 總結與價值
這套系統將原本需要手動紀錄與高度意志力的 24 小時重啟 SOP，變成了隨瀏覽器啟動的自動化護欄。用戶無需隨時提醒自己「該自律了」，而是由 Chrome 插件搭配 Google 服務，主動在正確的時間點提供正確的引導，幫助用戶累積每一次「我贏了」的真實反饋。
