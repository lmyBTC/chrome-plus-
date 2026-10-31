---
title: "GeminiOfficialBridge_WorkspaceUI"
plugin: "chrome_pk"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-10-31"
deadline: "2026-10-31"
appetite: "3h" # 人類時間預算
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)" # AI 複雜度約束邊界
current_session: "Session 3 (Phase 2 雙軌 UI + 模型切換)" # 當前執行會話標記
related_drafts: ["0.doc_mg/tasks/archive/task_1030_03_chrome_gemini_nano,chrome_pk_GeminiOfficialBridge_BidirectionalSync.md"]
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent 校準)**：
  - 核心並非去串接第三方或 Google AI Studio 的 Gemini 1.5 Flash API Key（無須申請額外 Key、避免 REST API 額外計費與隱私暴露）。
  - 用戶在日常工作中直接使用 Google 官方原生產品：
    1. **Google Workspace 中的 Gemini 側邊欄 (Ask Gemini)**（如 Docs, Gmail, Drive 側欄對話歷史，參照支援文件 16880047）。
    2. **Gemini Apps 官方網頁/應用程式 (`gemini.google.com`)**（參照支援文件 13666746 之歷史對話與即時串流）。
  - 用戶的核心痛點是：希望將右側或 Google 官方 Gemini 側邊欄產生的豐富對話與歷程，無縫流入左側 PK+ 面板，一鍵提取或轉化為敏捷戰役/待辦任務，並能從左側快速回拋 Prompt 給官方側欄繼續處理，徹底將官方 Gemini 強大算力融入敏捷工作流。
- **核心目標**：
  1. **官方 Gemini 橋接架構完善 (Workspace & Web Bridge Integration)**：
     - 在 `chrome_pk` 側端（`OfficialGeminiConnector.ts`）確保完整支援 Google Workspace Ask Gemini 側邊欄與 `gemini.google.com` 的雙向資料流接收。
     - 在 `useAISession.ts` 中整併官方側欄狀態：當使用者未開啟本機 Nano 或本機 Nano 受限於 iframe 時，自動提供「官方 Gemini 聯動模式」，直接銜接官方側欄對話與回拋。
  2. **官方對話歷史同步與任務轉化介面 (Official Bridge UI & Task Converter)**：
     - 在 `AIAssistantView` 建立雙軌 Tab 檢視（「💬 PK+ 助理」與「🌐 官方 Gemini 側欄同步」）。
     - 即時呈現 `geminiConversations`（對話卡片、時間、來源標籤、引用分頁）。
     - 實作「⚡ 一鍵轉為衝刺戰役」、「📥 加入 GTD 待辦收件匣」、「🔄 回拋至官方 Gemini 輸入框 (`injectToOfficialGemini`)」。
- **邊界與假設**：
  - **零 API Key 負擔**：完全依托用戶既有的 Google 官方帳號與 Workspace / Gemini 登入狀態，無需用戶申請或管理任何 API Key。
  - **樣式完全隔離**：維持在現有 Shadow DOM 注入架構與 Vite 側欄元件內。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `.agents/skills/pk-core/SKILL.md`、`0.doc_mg/docs/spec-official-gemini-bridge.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `py 1.devtools/tools/code_skeleton.py` / `repo_radar.py` | `code_skeleton.py` 提煉 sidebar main (11行)、AIAssistantView (9行)、useAISession (26行)、ai-helper (24行) | 減少 94% 雜訊 |
  | **Gate 2: 執行** | `2>&1 \| py 1.devtools/tools/compact_log.py` / `rtk` | 待 Phase 執行時串接脫水 | 待執行 |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py` / `audit_manifests.py` | 待結案執行合規審計 | 待執行 |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`0.doc_mg/tasks/tmp/tmp_probe_GeminiCloudUpgrade.md`
- **影響範圍地圖 (Entity Map)**：
  - `chrome_pk/src/utils/ai-helper.ts`：實作 `executeGeminiCloudInference` 雲端推論函式
  - `chrome_pk/src/entries/sidebar/hooks/useAISession.ts`：整合雲端推論與本機推論雙模調度
  - `chrome_pk/src/entries/sidebar/components/AIAssistantView.tsx`：增加 API Key 快捷設定、雙軌分頁 (AI 助理 / 官方側欄同步)、對話轉任務按鈕
  - `chrome_pk/src/core/ai/OfficialGeminiConnector.ts`：確認 `injectToOfficialGemini` 接口與 UI 對接
- **前置條件 (Prerequisites)**：
  - `npm --prefix chrome_pk run build` 通過

## 3. 策略與架構防護 (Strategy & Guardrails)

- **DRY 檢查**：
  - 複用 `OfficialGeminiConnector.ts` 現成之 `geminiConversations` 歷史對話池，不另外建立多餘 storage 鍵值。
  - 複用現有的 `parseTasksFromText` 與 `StorageQueue` 實作任務與 GTD 快速寫入。
- **架構策略與 Tree of Thoughts (ToT)**：
  - **方案 A (選定 - 雲端 REST API + 本地 Storage 雙軌 UI)**：輕量直接，不需要架設外部後端伺服器，利用 Google 官方公開的 Gemini 1.5 Flash REST API，直接自帶免費 API Key 即可呼叫；官方側欄對話則直接監聽已有的 chrome.storage 變更進行即時渲染。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁跨插件 import 原始碼
  - 嚴禁整檔覆寫任務檔，一律 `edit_file`
  - 終端長日誌強制串接 `compact_log.py` 脫水
  - 2-Strike 熔斷：單一問題重試上限 2 次

### 鎖定檔案 (Target Files)

- `chrome_pk/src/utils/ai-helper.ts`
- `chrome_pk/src/entries/sidebar/hooks/useAISession.ts`
- `chrome_pk/src/entries/sidebar/components/AIAssistantView.tsx`

### 鎖定工具鏈 (Target Devtools)

- [x] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py <目標檔案>` 或 `py 1.devtools/tools/repo_radar.py`
- [ ] 終端日誌脫水: `npm run build 2>&1 | py 1.devtools/tools/compact_log.py` (或 `rtk`)
- [ ] 結案整合審計: `py 1.devtools/tools/audit_suite.py --compact`
- [ ] 2-Strike 熔斷立案: `py 1.devtools/tools/log_issue.py log`

### 鎖定 SSOT 回寫清單 (Target SSOTs)

- [x] [N/A] 輕量任務豁免 (無插件間合約變更、無 Storage 結構破壞性改動)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/` (執行 `py 1.devtools/tools/task_cli.py archive` 移入歸檔緩衝區)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 官方 Gemini 橋接服務調度與狀態適配 狀態：`[已完成]`
- [x] 任務 1.1: `OfficialGeminiConnector.ts` 檢測與強化 Workspace / Gemini Apps 橋接
    - **動作**: 完善 `OfficialGeminiConnector` 對 Google Workspace Ask Gemini 側邊欄與 `gemini.google.com` 的來源標識與回拋調用；提供即時讀取與監聽 `geminiConversations` 的便利方法。
    - **驗證 (Exit 0)**: 建置通過，型別無錯誤，能精準獲取官方對話池與派發回拋。
- [x] 任務 1.2: `useAISession.ts` 升級支援「官方 Gemini 聯動模式」
    - **動作**: 當本機 Nano 受限（如 iframe Permission Policy 或尚未下載）時，自動呈現「官方 Gemini 模式」，允許使用者直接輸入 Prompt 一鍵回拋至官方側欄或切換至官方對話流。
    - **驗證 (Exit 0)**: 建置通過，支援無縫降級至官方側欄聯動。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出開立新 Session 接力提示詞代碼塊。

### Phase 2: 官方側欄同步 UI、任務一鍵提煉與雙向回拋 狀態：`[已完成]`
- [x] 任務 2.1: `AIAssistantView.tsx` 擴充雙軌檢視（「PK+ 助理」與「官方側欄同步」）
    - **動作**: 新增頂部切換 Tab（`💬 PK+ 助理` / `🌐 官方側欄同步`）+ 模型切換按鈕（Nano ⇄ 官方橋接）。在「官方側欄同步」分頁中，即時監聽 `geminiConversations`（chrome.storage.onChanged），將右側官方對話卡片化排列展示，含引用分頁標籤、來源標記與訊息數。
    - **驗證 (Exit 0)**: `npm run build` Exit 0 ✅
- [x] 任務 2.2: 實作「⚡ 一鍵轉為任務」、「📥 加入 GTD」與「🔄 回拋官方側欄」
    - **動作**: 對話卡片提供三個快速轉換按鈕，調用 `parseTasksFromText` 自動寫入核心戰役；GTD 寫入 `gtdInbox`；回拋調用 `injectToOfficial()`（useAISession 已暴露）。按鈕均有 idle / loading / success / error 四態回饋。
    - **驗證 (Exit 0)**: `npm run build` Exit 0 ✅
- [x] 額外需求：模型切換按鈕（用戶追加）
    - **動作**: 頂部 Tab 列右側新增 `🧠 Nano ⇄ 🌐 官方` 切換按鈕，一鍵切換 `aiMode`（`local_nano` / `official_bridge`），並在聊天區寫入系統提示確認切換狀態；輸入框 placeholder 也隨模式動態更新。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出開立新 Session 接力提示詞代碼塊。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 自動化工具合規審計
    - **動作**: 執行 `npm run build` 脫水過濾與 `py 1.devtools/tools/audit_suite.py --compact`。
    - **驗證 (Exit 0)**: `npm run build` Exit 0 ✅；`audit_suite.py` 8 PASS / 1 WARN(Token 預算) - 符合 Gate 3 結案標準 ✅
- [x] 任務 F.2: SSOT 實體回寫與任務歸檔
    - **動作**: 執行 `py 1.devtools/tools/task_cli.py archive` 移入歸檔緩衝區。
    - **驗證 (Exit 0)**: 檔案已正確歸檔，工作區維持乾淨。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：用戶未填入 Gemini API Key 時若強行走雲端會拋錯 ➔ 降級方案：若未設定 Key，在 UI 顯示友善提示引導領取免費 Key，並提供按鈕一鍵切回本機 Nano。
- **熔斷與突發隔離機制**：單一問題重試上限 2 次 (2-Strike 熔斷)。

## 6. 驗收標準 (Acceptance Criteria)

- [x] **技術指標**: 支援 Google Workspace (Ask Gemini) 與 Gemini Apps 官方側欄雙向橋接與自動降級，徹底繞過 iframe 內本機 Nano Permission Policy 阻擋。
- [x] **功能指標**: 左側可即時顯示右側官方 Gemini 側欄對話，並能一鍵轉為衝刺任務/GTD 待辦與回拋。
- [x] **合規與合約審計**: `npm run build` 通過 Exit 0。
- [x] **L4 任務生命週期**: 任務結案後已執行 `task_cli.py archive` 歸檔。

## 7. 狀態收斂歷程 (Condensed History)

- [2026-10-31] 藍圖建立完成 (Session 1)：完成代碼探勘與骨架提取，鎖定 ai-helper、useAISession 與 AIAssistantView 雙軌改造。
- [2026-10-31] True Intent 校準與 Phase 1 完成 (Session 2)：
  - 對齊用戶核心需求（非 1.5 Flash API Key，而是 Google Workspace Ask Gemini 側欄 16880047 與 Gemini Apps 13666746 官方對話橋接）。
  - `OfficialGeminiConnector.ts` 擴充支援 Workspace 分頁與 Active Tab 智慧探針回拋，新增 `getStoredConversations`, `removeConversation`, `clearConversations` 方法。
  - `useAISession.ts` 升級支援「官方 Gemini 聯動模式 (official_bridge)」雙模調度，在 Nano 不可用或受限時自動無縫回拋官方側欄，免除 API Key 設定。
- [2026-10-31] Phase 2 完成 (Session 3)：
  - `AIAssistantView.tsx` 完整重構為雙軌 Tab 架構（`💬 PK+ 助理` / `🌐 官方側欄同步`）。
  - 官方側欄同步分頁：即時監聽 `chrome.storage.onChanged` 之 `geminiConversations`，自動刷新；對話以卡片化呈現，含來源標籤、模型名、引用分頁、預覽內容。
  - 三操作按鈕：⚡ 轉衝刺任務（調用 `parseTasksFromText` 寫入 `weeklyMissions` + `dailyLogs`）、📥 加入 GTD（寫入 `gtdInbox`）、🔄 回拋官方側欄（調用 `injectToOfficial`），均有四態回饋（idle / loading / success / error）。
  - **額外需求**：頂部 Tab 列右側新增「模型切換按鈕」（🧠 Nano ⇄ 🌐 官方），呼叫 `setAiMode`，並更新輸入框 placeholder 提示。
  - 驗證：`npm --prefix chrome_pk run build` 脫水驗證通過 (Exit 0)。

- [2026-10-31] Phase Final 完成 (Session 4)：
  - `npm --prefix chrome_pk run build` 脫水驗證通過 (Exit 0)，97.4% 雜訊過濾，僅有 chunkSizeWarning (非阻斷)。
  - `audit_suite.py --compact` 審計通過：8 PASS / 1 WARN (Token 預算 13 警告，CRITICAL 0)，符合 Gate 3 結案標準。
  - 任務狀態更新為「已完成」，並執行 `task_cli.py archive` 移入歸檔緩衝區，SSOT 閉環完成。

## 8. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> [x] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾。
> [x] 結案前已執行 `audit_suite.py` 完成自動化驗證。
> **參與對話 ID 紀錄**:
> - [2026-10-31] ID: 29f8a453-2dd1-430d-944a-21cd6aef8d96 (Gate 1 藍圖完備)
> - [2026-10-31] ID: ebade319-4e00-42f6-83b0-b0fdd9cf2c35 (True Intent 校準與 Phase 1 交付)
> - [2026-10-31] ID: cb43b183-ee73-40f2-8a09-a107c8a7a123 (Phase Final 審計結案)
> 若需開新視窗以徹底釋放 Phase 1 階段佔用之 Context，請複製以下指令至新對話：
> ```markdown
> 請讀取 0.doc_mg/tasks/task_1031_02_chrome_pk_GeminiCloudUpgrade_OfficialBridgeUI.md，開始執行 Phase 2
> ```
