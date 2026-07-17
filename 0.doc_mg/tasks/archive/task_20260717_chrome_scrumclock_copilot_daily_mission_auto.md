---
title: "ScrumClock Copilot 本地 AI 每日任務自動化更新與 Bug 修復"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-17"
deadline: "2026-07-17"
---

## 1. 目標
1. 升級側欄助理 (Copilot) 的 Gemini Nano 語意解析功能，使其能夠精準辨識並背景執行每日任務（今日核心戰役）的新增、標記完成與刪除口語指令。
2. 修復 `handleAddToDailyMissions` 的資料庫儲存 Bug，防範核心戰役列表產生找不到任務主體的「未知任務」情況。

## 2. 策略與鎖定檔案
1. 擴展 `src/entries/sidebar/main.tsx` 中的 AI 意圖分析 Prompt，支援 `daily_mission` 意圖判定與欄位提取。
2. 實作 `handleDailyMissionActionUpdate` 函式，用於處理口語化的每日任務 Storage 修改（`weeklyMissions` 與 `dailyLogs` 同步）。
3. 修正 `handleAddToDailyMissions` 中一鍵寫入儀表板的 Storage 結構，使其正確關聯 `weeklyMissions`。

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\entries\sidebar\main.tsx`

## 3. 任務拆解

### Phase 1: 設計與計畫 狀態：`[已完成]`
### Phase 2: 代碼實作 狀態：`[已完成]`
### Phase 3: 驗證與收尾 狀態：`[已完成]`

## 4. 影響評估
- 本次更新僅變更 `main.tsx` 側欄助理的處理邏輯與 Storage 寫入方式，不涉及權限變更，對現有功能無破壞性影響。
- 修復了現有「一鍵寫入今日戰役」按鈕導致 UI 出現「未知任務」的隱藏 Bug。

## 5. 驗收標準
- [x] 側欄輸入口語命令可直接新增、完成或移除儀表板今日戰役，無須按按鈕。
- [x] 點擊「一鍵寫入今日戰役」後，儀表板顯示正確的任務名稱，而非「未知任務」。

## 6. AI 簽到區
- [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
**參與對話 ID 紀錄**:
- [2026-07-17] ID: 232e49cb-4a63-4f8c-840b-a71f2093f321
- [2026-07-17] ID: 91d66493-6abd-430e-aa1e-7498c2de2801 (修復匯入任務之 weeklyMissions 關聯遺漏 Bug，完成代碼狀態確認與收斂)
