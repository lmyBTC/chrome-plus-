---
title: "Phase 4: 統一 Google Apps Script (GAS) 雲端數據匯流與量化複盤"
plugin: "global"
status: "已完成"
created: "2026-09-17"
deadline: "2026-09-30"
---

## 1. 目標
將 `chrome_scrumclock` 的「專注時長與任務衝刺 Log」與 `finance-research-clipper-oss` 的「個股財務指標與研報筆記」匯流至同一個 Google Sheets 雲端戰情室。
透過統一的 Google Apps Script (GAS) Webhook 智慧路由，實現資料自動分流儲存，並建立「投資研究專注效益交叉分析週報」，清楚呈現各標的投入之專注番茄鐘數與投資研究產出。

## 2. 策略與鎖定檔案
1. **統一 Webhook 路由架構**：
   - 統一 Payload 規範：`{ action: 'scrum_sync' | 'finance_clip' | 'combined_log', secretToken: string, timestamp: number, data: object }`。
   - 編寫單一 GAS 腳本 (`0.doc_mg/scripts/unified_gas_router.gs`)，自動在試算表中建立 `Tasks_Log`、`Stocks_Research` 與 `Productivity_Cross_Analysis` 分頁並分類寫入。
2. **ScrumClock 端同步擴充**：
   - 於 `SettingsPanel.tsx` 支援輸入統一 Webhook URL 與 Secret Token。
   - 於專注完成或每日回顧時，將專注日誌附帶標籤 (`#投資研究`) 透過非同步 fetch 送出。
3. **FinanceClipper 端同步升級**：
   - 更新 `dashboard.js` 與 `sidepanel.js` 的 `btn-send-gas` 邏輯，調整為符合統一 Webhook 格式。
   - 支援「批次同步歷史追蹤清單」至 Google Sheets。
4. **Google Sheets 儀表板與公式設計**：
   - 提供交叉分析範本，結合 `QUERY`、`SUMIF` 公式，動態統計各標的累計研究時長與回報。

### 鎖定檔案 (Target Files)
- `./0.doc_mg/scripts/unified_gas_router.gs`
- `./chrome_scrumclock/src/components/SettingsPanel.tsx`
- `./chrome_scrumclock/src/background.ts`
- `./finance-research-clipper-oss/dashboard.js`
- `./finance-research-clipper-oss/sidepanel.js`
- `./finance-research-clipper-oss/dashboard.html`

## 3. 任務拆解

### Phase 4.1: 統一 GAS 路由協定與後端腳本編寫 狀態：`[已完成]`

### Phase 4.2: 雙插件 Webhook 客戶端同步機制升級 狀態：`[已完成]`

### Phase 4.3: 交叉生產力週報與視覺化範本 狀態：`[已完成]`

### Phase 4.4: 端到端測試與合規審計 狀態：`[已完成]`

## 4. 影響評估
- 外部相依：需使用使用者的 Google 帳號建立 Google Apps Script；插件本身僅依賴標準 fetch API。
- 資料安全：所有研報與任務資料僅在使用者自己的瀏覽器與 Google 試算表間傳輸，無任何第三方伺服器涉入。

## 5. 驗收標準
- [x] **技術指標**: ScrumClock 與 FinanceClipper 使用同一個 Webhook URL 均能成功上傳數據，試算表能精準分流並正確累計數據。
- [x] **核心規範**: 支援離線與重試機制，不因外部 API 延遲或失敗而中斷插件本體操作。
- [x] **除錯清理**: 程式碼乾淨無多餘偵錯輸出。
- [x] **檔案編碼**: UTF-8 (無 BOM) 編碼。
- [x] **插件驗證**: `npm run build` 通過，Manifest 合規審計無警示。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-17 ID: 62b94652-be5e-4dd8-8a35-f8216a8f824c (自總任務拆分並完成任務細分)
> - 2026-09-17 ID: 9c7d86cf-912d-4532-8dd5-ab90541569c1 (完成 Phase 4 實作執行規劃)
> - 2026-09-17 ID: 98b66ac0-81c3-4e0b-aba6-34163aa02148 (執行 Phase 4.3 交叉生產力週報與部署指南)
