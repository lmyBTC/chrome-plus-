---
title: "ScrumClock 升級 launchWebAuthFlow Google 登入與動態 Client ID 配置"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-13"
deadline: "2026-10-13"
---

## 1. 目標
將 `chrome_scrumclock` 擴充套件的 Google OAuth2 身分驗證機制從靜態宣告的 `chrome.identity.getAuthToken` 重構為 `chrome.identity.launchWebAuthFlow`（標準 OAuth2 Web Redirect 流程）。在全域系統設定頁 (`SettingsPanel.tsx`) 提供 Google OAuth2 Client ID 輸入與 Chrome 重新導向網址（Redirect URI）一鍵複製功能，讓開源使用者可自主配置專屬 GCP 憑證，並享受標準 Google 網頁授權登入彈窗體驗，杜絕開源代碼洩漏憑證與配額風險。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/shared/google/googleAuthClient.ts`
- `chrome_scrumclock/src/shared/google/googleTypes.ts`
- `chrome_scrumclock/src/types/index.ts`
- `chrome_scrumclock/src/components/SettingsPanel.tsx`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [ ] L1 專家技能：`.agents/skills/scrumclock-core/SKILL.md`
- [x] L2 插件導航：`chrome_scrumclock/SCRUMCLOCK_README.md`
- [ ] L3 業務規格：`chrome_scrumclock/docs/`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/`

## 3. 任務拆解

### Phase 1: 升級 GoogleAuthClient 支援 launchWebAuthFlow 狀態：`[已完成]`
- [x] 任務 1.1: 擴充 `googleTypes.ts` 與 Storage 模型，支援自訂 `googleClientId` 與 Token 過期時間管理
- [x] 任務 1.2: 在 `googleAuthClient.ts` 實作基於 `chrome.identity.launchWebAuthFlow` 的授權 URL 構造與 Token 解析
- [x] 任務 1.3: 實作自動 Token 驗證、Email 取得與登出清除機制

### Phase 2: 全域設定介面整合與 Redirect URI 輔助 狀態：`[已完成]`
- [x] 任務 2.1: 在 `SettingsPanel.tsx` 擴充 Google Tasks 模組，新增「Google OAuth2 Client ID」輸入儲存欄位
- [x] 任務 2.2: 提供「Redirect URI」一鍵複製功能（格式為 `https://<extension-id>.chromiumapp.org/`）並附上設定提示
- [x] 任務 2.3: 增加 Google 帳號「登入 / 重新授權」與「解除綁定」操作按鈕及即時狀態反饋

### Phase 3: 建置驗證與端對端相容性審計 狀態：`[已完成]`
- [x] 任務 3.1: 執行 TypeScript 型別檢查與 `npm run build` 確認編譯零警告
- [x] 任務 3.2: 驗證 Google Tasks 與日終戰報同步服務在動態 Token 下的相容性
- [x] 任務 3.3: 完成 SSOT 回寫與任務歸檔

## 4. 驗收標準 (Acceptance Criteria)
- [x] 1. 程式碼完全移除對 `manifest.json` 靜態 `oauth2.client_id` 的硬性依賴。
- [x] 2. 使用者可在設定頁輸入自訂 Client ID 並一鍵複製 Redirect URI 到 GCP Console 配置。
- [x] 3. 點擊授權時能彈出標準 Google 登入授權視窗，授權成功後自動取得 Token 並顯示使用者 Email。
- [x] 4. 原有的 Google Tasks 雙向同步服務能無縫使用新機制取得的 Access Token 進行同步。
- [x] 5. TypeScript 與 Vite 建置打包 100% 通過。

## 5. AI 簽到區與結案確認
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。  
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。  
> **參與對話 ID 紀錄**:  
> - 2026-10-13 ID: 34e9af6b-317c-4e12-bd0f-0850e6e6813d (Gate 0 探詢與 Gate 1 藍圖初始化)  
> - 2026-10-13 ID: 4024d0eb-95f3-4bb4-9436-fc187e622462 (Phase 1 執行完成)  
> - 2026-10-13 ID: ec31ee8f-21c6-47a1-b4e5-efc28a767cc1 (Phase 2 執行完成)  
> - 2026-10-13 ID: 4f081ab6-dfca-47d2-b4e7-af35badb3353 (Phase 3 驗收構建、相容性強化與 SSOT 結案)  
>  
> **結案狀態**: 本任務所有 Phase 均已成功交付，`npm run build` 通過零警告，L2 SSOT 文件已完成同步回寫。
