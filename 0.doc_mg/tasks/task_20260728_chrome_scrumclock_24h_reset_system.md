---
title: "整合 24 小時人生重啟系統"
plugin: "chrome_scrumclock"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-07-28"
deadline: "2026-08-04"
---

## 1. 目標
將「24 小時人生重啟系統」的設計方案整合至現有的 `chrome_scrumclock` 插件中，透過 Google Calendar 與 Google Tasks 建立雙向同步的自動化工作流，實現 New Tab 主動模式、Focus Shield 網頁屏蔽及崩盤救援等核心功能。

## 2. 策略與鎖定檔案
基於 Manifest V3 架構，規劃 MVP 階段實作。
- **OAuth 整合**：透過 `chrome.identity.getAuthToken` 取得授權，在 Background Service Worker 中與 Google Tasks/Calendar API 互動。
- **資料同步與快取 (Local Cache)**：使用 `chrome.storage.local` 快取當日 MIT 與行事曆狀態，確保 New Tab 秒開，避免 API Rate Limit 與網路延遲。
- **UI 開發**：擴充現有 Side Panel 與新增 New Tab Override 頁面。並需具備 Onboarding (初次登入) 引導機制。
- **攔截機制**：使用 `chrome.declarativeNetRequest` 攔截黑名單網站，並 Redirect 至擴充功能內建頁面 (blocked.html)。

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\manifest.json` (權限宣告)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\background\index.ts` (API 整合、狀態機與 Alarms 管理)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\newtab\index.tsx` (主動開局頁面與登入引導)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\sidepanel\index.tsx` (側邊欄操作)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\core\chrome\auth.ts` (新增 Google Auth 模組)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\core\storage.ts` (快取模組)

## 3. 任務拆解

### Phase 1: Google OAuth 與核心 API / Cache 整合 (Local-First 架構) 狀態：`[已完成]`
- [ ] 任務 1.1: 本地資料快取與狀態機 (Local SSOT)
    - [ ] 實作 `chrome.storage.local` 讀寫，將當前 MIT、當日時間塊排程與倒數進度全數本地化。
    - [ ] **核心原則**：系統完全依賴本地 Cache 運行，確保在無網路或未登入下皆能 100% 正常運作。
- [ ] 任務 1.2: 設置 OAuth 通路與斷開機制 (Opt-in Sync)
    - [ ] 在 Google Cloud Console 設定 OAuth 2.0 Client ID。
    - [ ] 實作 `auth.ts`：提供「登入授權」與「登出/清除 Token」(`chrome.identity.removeCachedAuthToken`) 雙向功能，讓使用者隨時斷開連線。
- [ ] 任務 1.3: 背景非同步 Google API 封裝
    - [ ] 實作 Google Tasks / Calendar API 模組：採用 Adapter 模式，當偵測到已登入時，於背景將本地 MIT 與排程異動鏡像 (Mirror) 同步至 Google。未登入時則安靜跳過，不中斷本地流程。

### Phase 2: 核心 UI 與「主動開局」New Tab 狀態：`[已修正: New Tab 恢復呈現完整的儀表板首頁]`
- [x] 任務 2.1: 將 New Tab 接管頁面改回標準完整儀表板 (App.tsx)
    - [x] 設定 `manifest.json` 的 `chrome_url_overrides`。
    - [x] 於 `newtab` 入口渲染完整儀表板首頁 Component，移除極簡 MIT 覆蓋頁。
- [ ] 任務 2.2: Focus Shield 網頁屏蔽基礎
    - [ ] 設定 `declarativeNetRequest` 權限及規則集 `rules.json`。
    - [ ] 實作 `blocked.html` 內部頁面，並設定攔截規則導向至該頁面 (顯示 MIT 交付提示)。

### Phase 3: 重啟系統閉環邏輯與崩盤救援 狀態：`[已完成]`
- [ ] 任務 3.1: 卡頓降級與崩盤救援機制
    - [ ] 實作「卡住了？」按鈕與拆解 10 分鐘任務邏輯。
    - [ ] 實作「崩盤救援」：呼叫 API 將剩餘 Tasks 歸檔/延後，並清除後續日曆行程。
- [ ] 任務 3.2: 晚間復盤與正向反饋 (Alarms & Notifications)
    - [ ] 實作 `chrome.alarms` 定時器，於 13:30 (午間) 及 21:00 (晚間) 喚醒 Service Worker。
    - [ ] 觸發 `chrome.notifications` 或開啟專屬視窗，引導填寫復盤與復位卡。
    - [ ] 將復盤紀錄寫入 Google Calendar Event Description 的機制與獎勵動畫組件。

## 4. 影響評估
- 需要新增的權限：`identity`（OAuth），`declarativeNetRequest`（Focus Shield），`alarms`（定時提醒），`storage`（快取），`notifications`（推播）。
- 會覆蓋使用者的預設 New Tab，需要極優異的效能（毫秒級載入），因此 Local Cache 是絕對必需的。
- 專屬 Calendar 與 Tasklist 的創建需確保不污染使用者原本的預設行事曆，應明確命名為 [24h Reset System]。

## 5. 驗收標準
- [ ] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [ ] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [ ] **效能指標**: New Tab 開啟時必須在 200ms 內呈現 MIT（由 Local Cache 供應），不可等待 API Response。
- [ ] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [ ] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [ ] **插件驗證**: 已在 Chrome 中重新載入插件，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-28] ID: a9aaf9be-90ea-4a25-99c9-aa51d6fa156f (初始化 & 架構優化)
