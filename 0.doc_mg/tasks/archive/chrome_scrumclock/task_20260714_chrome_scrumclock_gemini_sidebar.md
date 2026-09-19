---
title: "利用最新的 Chrome Gemini 側欄功能整合為 ScrumClock 助理"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-14"
deadline: "2026-07-16"
---

## 1. 目標
將最新的 Chrome Gemini 內建 AI (Prompt API / ai.languageModel) 與 Chrome Side Panel API 整合進 ScrumClock，打造一個專屬的側邊欄 (Side Panel) 助理。讓使用者可以：
- 在任何網頁側邊欄開啟 ScrumClock 助理，不影響主網頁瀏覽。
- 使用 Chrome 內建 AI 在本地端運行助理，進行敏捷任務評估、番茄鐘預估。
- 透過 Message Passing 從當前活躍的網頁中一鍵抓取任務並丟給側欄助理分析。

## 2. 策略與鎖定檔案
- 使用 Chrome `sidePanel` API 註冊側欄。
- 呼叫最新的 `chrome.aiOriginTrial.languageModel` (或 `ai.languageModel`) 進行本地 AI 推理。
- 新增 `src/entries/sidebar/` 目錄，內含 `index.html` 與 `sidebar.ts` 以符合 `chrome_scrumclock` 的打包習慣。
- 在 `vite.config.ts` 加入 `sidebar` 入口。
- 修改 `public/manifest.json` 加入 `sidePanel` 權限及 `side_panel` 屬性。
- 修改 `src/background.ts` 配置點擊 action 圖示時打開側欄的行為。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/public/manifest.json` [MODIFY]
- `./chrome_scrumclock/vite.config.ts` [MODIFY]
- `./chrome_scrumclock/src/background.ts` [MODIFY]
- `./chrome_scrumclock/src/entries/sidebar/index.html` [NEW]
- `./chrome_scrumclock/src/entries/sidebar/sidebar.ts` [NEW]

## 3. 任務拆解

### Phase 1: 技術規劃與基礎建設 狀態：`[已完成]`

### Phase 2: 側欄 UI 與 Background 邏輯開發 狀態：`[已完成]`

### Phase 3: 任務匯入與訊息通訊串接 狀態：`[已完成]`

### Phase 4: 驗證與上架合規審查 狀態：`[已完成]`

## 4. 影響評估
- **權限變更**: 新增 `sidePanel` 權限。不會新增額外的敏感權限，符合最小權限原則。
- **內建 AI 相容性**: 內建 Prompt API 目前為 Chrome 新版實驗性功能。需要在代碼中做好 capabilities 偵測，若使用者環境不支援，需提示引導如何啟用 (例如在 `chrome://flags/#optimization-guide-on-device-model` 與 `chrome://components` 下載 Gemini Nano 模型)。

## 5. 驗收標準
- [x] **技術指標**: 點擊插件圖示可以正確喚起側欄，且側欄顯示 UI 為深色模式。
- [x] **核心規範**: 成功調用 `ai.languageModel` 並能正常對話。若不支援能優雅降級顯示提示。
- [x] **安全規範**: 對於 AI 回傳的內容，避免直接 `innerHTML`，進行安全渲染。
- [x] **編碼與打包**: Vite 打包無 Error。

## 6. AI 簽到區
- [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
- **參與對話 ID 紀錄**:
  - [2026-07-14] ID: 9c3bbfa5-39d0-471f-9a0d-a12ada4ba745 (初始化)
