---
title: "修復 Google 帳號授權登入與雙向同步失敗問題"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-28"
deadline: "2026-07-29"
---

## 1. 目標
修復使用者在「全域系統設定 -> AI 與雲端同步」分頁中點擊「使用 Google 帳號登入」時，無法彈出 Google 官方登入頁面並回傳「登入取消或未取得 Token」的問題。確保 OAuth 2.0 Client ID 配置與 `chrome.identity` 授權流程正常運作。

## 2. 策略與鎖定檔案

### 診斷發現
1. `public/manifest.json` 中的 `oauth2.client_id` 目前為佔位符 `"YOUR_CLIENT_ID_HERE.apps.googleusercontent.com"`，且缺少對應 Extension ID 的 `key` 欄位。
2. 缺乏對 `chrome.identity.getAuthToken` 錯誤日誌的詳細捕捉與使用者提示（如提示 Client ID 未設定或授權配置無效）。

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\public\manifest.json`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\core\chrome\auth.ts`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\components\SettingsPanel.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\docs\google-oauth-setup.md`

## 3. 任務拆解

### Phase 1: 診斷與 OAuth 認證架構修復 狀態：`[已完成]`
- [x] 任務 1.1: 診斷並改善 `auth.ts` 錯誤處理與日誌
    - [x] 在 `auth.ts` 的 `login()` 中記錄 `chrome.runtime.lastError` 的具體錯誤訊息，並向呼叫方回傳具體錯誤原因而非單純回傳 `null`。
- [x] 任務 1.2: 檢查與完善 `manifest.json` 的 OAuth 2.0 配置
    - [x] 提供指引與文件 `google-oauth-setup.md` 協助說明如何在 Google Cloud Console 設定 Client ID 與 Extension Key。
    - [x] 在設定面板 (`SettingsPanel.tsx`) 中，若未配置有效 Client ID 時提供友善提示與說明連結。
- [x] 任務 1.3: 測試與驗證 OAuth 登入跳轉流程
    - [x] 驗證點擊登入時能正確捕捉並於介面顯示詳細錯誤訊息。

## 4. 影響評估
- 涉及 `chrome.identity` 權限與 `manifest.json` 的 `oauth2` 區塊，修改僅影響 Google 雲端同步功能，不影響本地單機模式。

## 5. 驗收標準
- [x] **技術指標**: 點擊登入時正確觸發授權或於 Client ID 未配置時顯示明確警告。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 `identity` 規範。
- [x] **除錯清理**: 移除非必要的測試 `console.log()`。
- [x] **檔案編碼**: 所有檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: 執行 `npm run build` 通過且在 Chrome 擴充套件中測試正常。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-28] ID: 4e70676c-540e-4460-91a4-11c5cd103adc (初始化)
