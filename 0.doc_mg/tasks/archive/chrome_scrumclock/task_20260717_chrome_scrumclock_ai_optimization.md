---
title: "ScrumClock 本地端 AI 效能、穩定性與代碼精簡優化"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-17"
deadline: "2026-07-20"
---

## 1. 目標
1. **提升本地端 AI 響應速度**：將 Gemini Nano 意圖解析的 Session 進行常駐快取，消除每次口語指令高達 1-3 秒的初始化延遲。
2. **提高意圖識別精準度**：引入 Few-shot 範例提示，確保 Nano 能 100% 穩定輸出正確格式的專案或每日任務操作 JSON。
3. **解決並發寫入衝突**：在 Storage 層防禦競態條件 (Race Condition)，避免側欄與儀表板同時更新資料時產生覆蓋。
4. **巨型代碼精簡**：重構 1100+ 行的 `main.tsx`，提取 Markdown、Regex 及自訂 Hooks (如 `useTimerSync`, `useAISession`)，降低程式碼複雜度。

## 2. 策略與鎖定檔案
1. 實作雙常駐 Session：於 `main.tsx` 組件載入時初始化並快取 `parseSessionRef`，元件卸載時銷毀。
2. 重構 Prompt：重寫 `parseOptions.systemPrompt`，加入 Few-shot 指令範例。
3. 建立 Storage 管理防禦：實作具備互斥或防震處理的 Storage 寫入機制。
4. 元件模組化拆分：
   - 提取 Markdown 邏輯至獨立工具。
   - 提取任務正則解析。
   - 封裝 AI 生命週期與數據操作至自訂 React Hooks。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/entries/sidebar/main.tsx`
- `./chrome_scrumclock/src/utils/ai-helper.ts`
- [NEW] `./chrome_scrumclock/src/utils/markdown.tsx`
- [NEW] `./chrome_scrumclock/src/utils/task-parser.ts`

## 3. 任務拆解

### Phase 1: AI Session 常駐快取與 Few-shot Prompt 增強 狀態：`[已完成]`
- [x] 任務 1.1: 實作 Session 常駐快取機制
    - [x] 在 `main.tsx` 中新增 `parseSessionRef` 並在 `checkAndInitAI` 時建立
    - [x] 移除 `handleSend` 內每次重複 `create` 與 `destroy` 的臨時解析會話邏輯
    - [x] 於 `useEffect` cleanup 函數中加上 `parseSessionRef.current?.destroy()` 確保釋放 VRAM
- [x] 任務 1.2: Few-shot Prompt 指令優化
    - [x] 重新設計意圖識別 Prompt，新增專案新增、進度更新、每日任務狀態變更及一般問答的少樣本範例
    - [x] 驗證 AI 在接收模糊口語指令下的 JSON 輸出穩定性

### Phase 2: Chrome Storage 讀寫競態防禦 狀態：`[已完成]`
- [x] 任務 2.1: 解決多重視窗讀寫競態條件 (Race Condition)
    - [x] 設計互斥寫入或序列化操作 (Transaction Lock)
    - [x] 封裝安全更新 API 並套用至 `handleProjectActionUpdate` 與 `handleDailyMissionActionUpdate`
- [x] 任務 2.2: 雙向狀態連動優化
    - [x] 確保側欄儲存後，Dashboard 與 Content Script 能實時無縫更新狀態且不產生多餘讀取開銷

### Phase 3: 代碼模組化與巨型 main.tsx 拆分 狀態：`[已完成]`
- [x] 任務 3.1: 抽取 Markdown 安全渲染模組
    - [x] 新增 `src/utils/markdown.tsx`，遷移 `parseMarkdown` 函數與其對應樣式
    - [x] 確保防禦 XSS 漏洞之核心邏輯不變
- [x] 任務 3.2: 抽取任務正則提取模組
    - [x] 新增 `src/utils/task-parser.ts`，遷移 `parseTasksFromText` 函數
    - [x] 優化任務清單與 🍅 數量的正則匹配準確率

### Phase 4: 自訂 React Hooks 封裝與精簡 狀態：`[已完成]`
- [x] 任務 4.1: 封裝 `useTimerSync` Hook
    - [x] 抽取番茄鐘定時器狀態更新、儲存監聽與 context menu 右鍵同步邏輯
- [x] 任務 4.2: 封裝 `useAISession` Hook
    - [x] 將 AI 功能初始化、Session 生命週期與對話處理移至獨立 Hook
- [x] 任務 4.3: `main.tsx` 大幅精簡與整合
    - [x] 將側欄主元件改為呼叫自訂 Hooks，使 main.tsx 行數控制在 650 行內（內含 HTML 佈局）並完成驗證

## 4. 影響評估
- 本次優化不變更 Chrome Extension Manifest V3 權限。
- 模組化重構可大幅降低代碼冗餘度，但不影響現有的敏捷統計、番茄鐘等功能。

## 5. 驗收標準
- [x] **技術指標**: 口語指令回應時間由原先的 1~3 秒降至 300ms 以內，且連續輸入下無崩潰。
- [x] **核心規範**: 代碼結構更清晰，符合 Chrome Extension MV3 安全性原則。
- [x] **除錯清理**: 所有提取的 utils 及 Hooks 通過 TypeScript 類型檢查，無編譯錯誤。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM)編碼保存。
- [x] **插件驗證**: 執行 `npm run build` 通過編譯，並在 Chrome 中重新載入測試功能均正常。

## 6. AI 簽到區
- [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
**參與對話 ID 紀錄**:
- [2026-07-17] ID: 2e901310-fed7-418f-81bd-caede87536c8 (任務記錄與四大階段拆解初始化，完成全部四階段優化)
