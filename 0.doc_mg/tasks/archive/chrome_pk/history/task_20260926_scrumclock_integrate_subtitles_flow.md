---
title: "ScrumClock 字幕資料流整併與今日戰役任務轉化串接"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-09-26"
deadline: "2026-10-03"
---

## 1. 目標
1. 整併 `Experimental SRT` (模組 8) 的解析能力至 `Subtitle Collector` (模組 3 子工具)。
2. 打通 Subtitle Collector 與 ScrumClock 核心任務池的轉化管道：實現將擷取到的影音字幕筆記/時間戳一鍵轉換為今日衝刺戰役任務 (`CoreBattle`) 或收件匣項目 (`InboxItem`)。

## 2. 策略與鎖定檔案
- 盤點 `src/features/experimental-srt/utils/srtParser.ts`，評估整併進 `src/features/toolbox/tools/subtitle-collector/services/`。
- 在 `SubtitleCollector.tsx` 實裝已預留之轉換動作（使用 `storage.ts` 將筆記寫入 `todayBattles` 或 `inboxItems`）。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/features/toolbox/tools/subtitle-collector/SubtitleCollector.tsx`
- `chrome_scrumclock/src/features/toolbox/tools/subtitle-collector/services/srtParser.ts` (新增)
- `chrome_scrumclock/src/features/toolbox/tools/subtitle-collector/services/subtitleConverter.ts` (新增)
- `chrome_scrumclock/src/features/experimental-srt/index.ts`
- `chrome_scrumclock/src/features/experimental-srt/utils/srtParser.ts`
- `chrome_scrumclock/src/core/chrome/storage.ts`
- `chrome_scrumclock/SCRUMCLOCK_README.md` (SSOT 文檔維護)

## 3. 任務拆解

### Phase 1: 字幕解析模組整併 狀態：`[已完成]`
- [x] 任務 1.1: 整合 SRT 解析工具函式
    - [x] 將 `experimental-srt` 的解析邏輯統整為通用字幕解析工具
    - [x] 標記或清理 `experimental-srt` 重複代碼，維持向後相容
- [x] 任務 1.2: 擴充 SubtitleCollector 支援本地 SRT 檔案拖放解析匯入

### Phase 2: 今日戰役任務轉換管道實作 狀態：`[已完成]`
- [x] 任務 2.1: 建立轉換轉接器服務
    - [x] 實作 `subtitleConverter.ts`：將 `CapturedSubtitleNote` 格式化為 `CoreBattle` 與 `InboxItem` 資料結構
- [x] 任務 2.2: 在 `SubtitleCollector.tsx` 接入「加入今日戰役」互動操作
    - [x] 點擊轉換後自動寫入 `chrome.storage.local`，並跳出成功 Toast

### Phase 3: 驗收與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 3.1: 驗證 Side Panel 與 New Tab 下轉換後的任務能否正確顯示在 SprintPomodoro 與 Inbox
- [x] 任務 3.2: 執行專案 Build 檢驗
- [x] 任務 3.3: 更新 `SCRUMCLOCK_README.md` 模組關聯與流向圖

## 4. 影響評估
- 強化 Subtitle Collector 實用性，使其能與 Scrum 衝刺流程產生緊密價值閉環。
- 寫入 `chrome.storage.local` 時使用既有 keys (`todayBattles` / `inboxItems`)，與現有資料庫架構 100% 相容。

## 5. 驗收標準
- [x] **技術指標**: 成功在 Subtitle Collector 介面點擊按鈕將字幕筆記無失真轉換為衝刺戰役與收件匣項目。
- [x] **核心規範**: 資料操作遵循 `storage.ts` 型別安全規範。
- [x] **除錯清理**: 移除所有除錯用 `console.log`。
- [x] **檔案編碼**: 確認所有檔案皆以 UTF-8 (無 BOM) 保存。
- [x] **SSOT 文件同步**: 同步更新 `SCRUMCLOCK_README.md` 與 `功能說明.md` 模組矩陣說明。
- [x] **插件驗證**: `npm run build` 通過且在 Chrome 側邊欄實測加入戰役功能流暢。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: 2ddf9c50-f3a8-445e-8ada-c5bf528b994c (初始化)
> - 2026-09-26 ID: 3f22f9fc-ff2b-43ae-bc72-6a02843f2066 (執行 Phase 1 ~ Phase 3 結案)
>
> **跨會話接力指令 (Session Handover)**:
> 任務已全部完成結案。可直接封存或進行下一項任務。
> ```
