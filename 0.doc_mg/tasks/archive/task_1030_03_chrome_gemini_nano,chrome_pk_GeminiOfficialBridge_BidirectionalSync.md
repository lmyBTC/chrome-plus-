---
title: "官方 Gemini 側欄雙向橋接 (Official Gemini Bridge Bi-directional Sync v2.4)"
plugin: "chrome_gemini_nano, chrome_pk"
status: "已完成"
created: "2026-10-30"
deadline: "TBD"
appetite: "4h"
complexity_budget: "Max 5 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 6 (Completed & Archived)"
related_drafts: ["0.doc_mg/draft/code_artifact.md", "0.doc_mg/draft/gemini.md"]
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：消弭「官方 Gemini 側欄」與「PK+ 插件生態」的工具割裂——在官方側欄作業的上下文（對話、引用分頁）可自動流入 PK+ 形成任務；PK+ 投研結論可一鍵回拋官方側欄繼續處理，形成完整閉環。
- **核心目標**：
  1. **Ingress（官方→PK+）**：`geminiOfficialBridge.ts` Content Script 監聽 gemini.google.com DOM 串流輸出，800ms 防抖後透過 `chrome.runtime.sendMessage` 廣播 `GEMINI_OFFICIAL_SYNC` 至 PK+ (`OfficialGeminiConnector.ts`)。
  2. **Egress（PK+→官方）**：`OfficialGeminiConnector.ts` 提供 `injectToOfficialGemini()` 接口，發送 `INJECT_TO_OFFICIAL_GEMINI` 至 Bridge，Bridge 以原生 Setter + 合成事件注入官方輸入框並自動發送。
  3. **三層降級保底**：層 1 正常 DOM 聯動 → 層 2 本機 `:8765` 橋接 → 層 3 剪貼簿 + Chrome Notification 兜底。
- **邊界與假設**：
  - **插件隔離**：`chrome_gemini_nano` 與 `chrome_pk` 嚴禁共用 source，僅透過 `chrome.runtime.sendMessage` 黑盒通訊。
  - **恆定 Extension ID**：PK+ 目標 ID = `ahiihabnbjeoeneahcgbdcofncjoclcp`（需驗查 `chrome_pk/manifest.json` RSA key）。
  - **Content Script 可注入性**：假設官方側欄可在 `gemini.google.com` 標籤頁注入；若為 `chrome-untrusted://` 則直接走層 2。
  - **Vite 輸出格式**：Content Script 需 IIFE 格式，須追加獨立 build entry。

---

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `.agents/skills/pk-core/SKILL.md`、`.agents/skills/gemini-nano-core/SKILL.md`、`0.doc_mg/draft/gemini.md`（v2.4 規格書）、`0.doc_mg/draft/code_artifact.md`（跨插件契約規範）。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `py 1.devtools/tools/code_skeleton.py` / `repo_radar.py` | 讀取 draft/gemini.md、manifest.json、vite.config.ts | 通過結構定位 |
  | **Gate 2: 執行** | `2>&1 \| py 1.devtools/tools/compact_log.py` / `rtk` | `npm --prefix chrome_gemini_nano run build 2>&1 \| python 1.devtools/tools/compact_log.py` ➔ Exit 0 | 減少終端雜訊 |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py` / `audit_manifests.py` | `py 1.devtools/tools/audit_manifests.py --plugin chrome_gemini_nano --compact` ➔ Exit 0 | MV3 完全合規 |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`0.doc_mg/tasks/tmp/tmp_probe_gemini_bridge.md`
- **影響範圍地圖 (Entity Map)**：
  - `chrome_gemini_nano/manifest.json`：追加 `host_permissions`、`content_scripts`、`clipboardWrite`、`notifications`
  - `chrome_gemini_nano/vite.config.ts`：追加 IIFE 獨立 entry `geminiOfficialBridge`
  - `chrome_gemini_nano/src/geminiOfficialBridge.ts`：【新建】Content Script 核心
  - `chrome_pk/src/core/ai/OfficialGeminiConnector.ts`：【新建】PK+ 接收端服務
  - `chrome_pk/src/background.ts`：掛載 `GEMINI_OFFICIAL_SYNC` / `INJECT_TO_OFFICIAL_GEMINI` listener
  - `0.doc_mg/docs/spec-official-gemini-bridge.md`：【新建】draft/gemini.md 升格 SSOT
- **前置條件 (Prerequisites)**：
  - `git status` 工作區乾淨（兩個插件）
  - 驗查 `chrome_pk/manifest.json` 已配置 RSA key 確保 Extension ID 恆定
  - 確認官方側欄的實際 URL 載體（`gemini.google.com` 或 `chrome-extension://`）

---

## 3. 策略與架構防護 (Strategy & Guardrails)

- **DRY 檢查**：
  - Ingress 去重複用 SHA-1 hash 比對（`lastSyncedHash`），避免串流重複寫入
  - 降級剪貼簿使用 `navigator.clipboard.writeText`（瀏覽器原生，無需額外依賴）
  - 4 秒超時熔斷統一封裝為 `withTimeout(4000, fn)` 工具函式（複用於 Ingress/Egress）
- **架構策略**：
  - **方案 A（選定）**：`geminiOfficialBridge.ts` 作為純 IIFE Content Script，獨立於現有 Vite SPA build，透過 `chrome.runtime.sendMessage` 橋接至 PK+，符合插件隔離原則。
  - **方案 B（備選）**：全走 `:8765` REST API 橋，放棄直連 DOM。僅在層 1 完全不可注入時啟用。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁跨插件 import/require（`chrome_gemini_nano` ↔ `chrome_pk` 原始碼禁止互讀）
  - 嚴禁整檔覆寫任務檔，一律 `edit_file` 局部替換 ≤ 50~80 行語意區塊
  - 嚴禁傳遞 `ArtifactMetadata` 至 workspace 專案檔
  - 終端長日誌強制串接 `compact_log.py` 或 `rtk` 脫水
  - 2-Strike 熔斷：單一問題重試上限 2 次，第 3 次前必須停步立案並開新 Session

### 鎖定檔案 (Target Files)

- `chrome_gemini_nano/manifest.json`
- `chrome_gemini_nano/vite.config.ts`
- `chrome_gemini_nano/src/geminiOfficialBridge.ts`（新建）
- `chrome_pk/src/core/ai/OfficialGeminiConnector.ts`（新建）
- `chrome_pk/src/background.ts`
- `0.doc_mg/docs/spec-official-gemini-bridge.md`（新建）

### 鎖定工具鏈 (Target Devtools)

- [x] 探勘骨架/雷達：`py 1.devtools/tools/code_skeleton.py <目標檔案>` 或 `py 1.devtools/tools/repo_radar.py`
- [x] 終端日誌脫水：`npm run build 2>&1 | py 1.devtools/tools/compact_log.py`（或 `rtk`）
- [x] 結案整合審計：`py 1.devtools/tools/audit_suite.py --compact`（及 `audit_manifests.py`、`audit_plugin_isolation.py`）
- [x] 2-Strike 熔斷立案：`py 1.devtools/tools/log_issue.py log`

### 鎖定 SSOT 回寫清單 (Target SSOTs)

> 本任務為**重大架構變更**（新增跨插件通訊模組 + Content Script + manifest 結構變動），屬 10% 重大任務，需執行 L1~L3 骨架回寫。

- [x] L1 專家技能：`.agents/skills/gemini-nano-core/SKILL.md`（追加 `geminiOfficialBridge` 模組入口）
- [x] L1 專家技能：`.agents/skills/pk-core/SKILL.md`（追加 `OfficialGeminiConnector` 至 `src/core/ai/` 欄位）
- [x] L2 插件導航：`chrome_gemini_nano/overview-nano.md`（模組速查矩陣追加 Bridge 模組）
- [x] L3 業務規格：`0.doc_mg/docs/spec-official-gemini-bridge.md`（draft/gemini.md 升格正式 SSOT）
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/`（執行 `py 1.devtools/tools/task_cli.py archive` 歸檔）

---

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 前置驗查與 Manifest 修改 狀態：`[已完成]`

- [x] 任務 1.1 `[Blocker]`：驗查 PK+ Extension ID 恆定性
  - **動作**：讀取 `chrome_pk/public/manifest.json` 的 `key` 欄位，計算 RSA SHA-256 DER，確認 ID = `ahiihabnbjeoeneahcgbdcofncjoclcp`。
  - **驗證 (Exit 0)**：`Calculated Extension ID: ahiihabnbjeoeneahcgbdcofncjoclcp` 吻合無誤。
- [x] 任務 1.2 `[Blocker]`：確認官方側欄注入環境
  - **動作**：確認 Content Script 注入匹配為 `https://gemini.google.com/*`，輸入 DOM 載體定位為 `rich-textarea` / `div[contenteditable="true"]` / `textarea`，並建立三層降級機制。
  - **驗證 (Exit 0)**：符合規格書定義。
- [x] 任務 1.3：修改 `chrome_gemini_nano/manifest.json`
  - **動作**：追加 `host_permissions: ["http://127.0.0.1:8765/*", "https://gemini.google.com/*"]`、`content_scripts` entry、`clipboardWrite`、`notifications` 至 permissions。
  - **驗證 (Exit 0)**：`py 1.devtools/tools/audit_manifests.py --plugin chrome_gemini_nano --compact` Exit 0 無警告。
- [x] 任務 1.4：修改 `chrome_gemini_nano/vite.config.ts`
  - **動作**：追加 `geminiOfficialBridge` 為獨立 `lib` entry，設定 `format: ['iife']`，package.json build 串接 `--mode bridge`。
  - **驗證 (Exit 0)**：`npm --prefix chrome_gemini_nano run build 2>&1 | py 1.devtools/tools/compact_log.py` Exit 0，且 `dist/` 產出 `geminiOfficialBridge.iife.js`。

> 🏁 **Phase 1 Checkpoint**：
> - [x] 所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾，更新後即刻停步交權，輸出接力代碼塊。

---

### Phase 2: Ingress — `geminiOfficialBridge.ts` 核心實作 狀態：`[已完成]`

- [x] 任務 2.1 `[Blocker]`：DOM 選擇器偵測與 MutationObserver 初始化
  - **動作**：新建 `chrome_gemini_nano/src/geminiOfficialBridge.ts`，實作 `initObserver()`：以 `aria-label` / `role` 屬性定位回覆容器，監聽 `childList`、`subtree`、`characterData`。
  - **驗證 (Exit 0)**：成功建置 IIFE bundle，包含 DOM 變更監聽與自動掛載至 `main`/`body`，無報錯。
- [x] 任務 2.2：防抖提取與雜訊過濾
  - **動作**：實作 `debounceExtract(800ms)` 守護，加入 `sanitizeText()` 過濾免責聲明與操作按鈕文字。
  - **驗證 (Exit 0)**：`extractCleanText()` 成功剔除 button/action 節點與免責聲明，`DEBOUNCE_DELAY_MS = 800` 防抖保護。
- [x] 任務 2.3：`broadcastToPK()` 廣播至 PK+
  - **動作**：實作 `chrome.runtime.sendMessage('ahiihabnbjeoeneahcgbdcofncjoclcp', { type: 'GEMINI_OFFICIAL_SYNC', payload: {...} })` 附帶 `sessionId`、`role`、`text`、`modelName`、`referencedTabs`、`timestamp`。
  - **驗證 (Exit 0)**：型別定義與通訊邏輯完全對齊 v2.4 契約規範，防重複 hash 機制就緒。

> 🏁 **Phase 2 Checkpoint**：
> - [x] 所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾，更新後即刻停步交權，輸出接力代碼塊。

---

### Phase 3: PK+ 接收端 — `OfficialGeminiConnector.ts` 實作 狀態：`[已完成]`

- [x] 任務 3.1 `[Blocker]`：新建 `OfficialGeminiConnector.ts` 骨架與介面
  - **動作**：新建 `chrome_pk/src/core/ai/OfficialGeminiConnector.ts`，宣告 `GeminiOfficialSyncPayload` 介面（含 `referencedTabs?: {title:string; url:string}[]` 可選欄位）。
  - **驗證 (Exit 0)**：TypeScript 編譯無型別錯誤（`./chrome_pk/node_modules/.bin/tsc -p chrome_pk/tsconfig.json --noEmit` Exit 0）。
- [x] 任務 3.2：`handleSync()` 寬容接收與去重
  - **動作**：實作寬容讀者模式（`referencedTabs` 缺失 → `[]` 降級）、SHA-1 `lastSyncedHash` 去重（取 `text` 前 200 字）、廣播至 sidebar UI。
  - **驗證 (Exit 0)**：`tests/test_official_gemini_connector.ts` 單元驗證通過，連送相同文字 3 次 → 歷史對話池僅新增 1 筆 (Exit 0)。
- [x] 任務 3.3：在 `background.ts` 掛載 listener
  - **動作**：於 `chrome_pk/src/background.ts` 引入 `OfficialGeminiConnector`，在 `chrome.runtime.onMessage` 與 `externalService.ts` 分流 `GEMINI_OFFICIAL_SYNC` case。
  - **驗證 (Exit 0)**：`npm --prefix chrome_pk run build` 通過，且審計全數 Exit 0。

> 🏁 **Phase 3 Checkpoint**：
> - [x] 所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾，更新後即刻停步交權，輸出接力代碼塊。

---

### Phase 4: Egress — 回拋注入與三層降級 狀態：`[已完成]`

- [x] 任務 4.1：`injectToOfficialGemini()` 接口實作（PK+ 端）
  - **動作**：`OfficialGeminiConnector.ts` 新增 `injectToOfficialGemini(text, autoSubmit?)` → 發送 `INJECT_TO_OFFICIAL_GEMINI` 至 Bridge，帶 `withTimeout(4000)` 熔斷。
  - **驗證 (Exit 0)**：PK+ 呼叫後 Bridge Console 顯示收到 inject 指令；單元測試驗證層 1 注入派發與 `withTimeout` 熔斷機制 Exit 0。
- [x] 任務 4.2：Bridge 端注入邏輯（`geminiOfficialBridge.ts`）
  - **動作**：`handleInjectRequest()` → `probeInputType()` → 原生 Setter 注入 + `focus → input → change → blur → 150ms → Enter` 事件派發序列。
  - **驗證 (Exit 0)**：官方 Gemini 側欄輸入框探測與注入事件序列單元測試全數 Exit 0。
- [x] 任務 4.3：三層降級
  - **動作**：層 2（`:8765` REST API 轉發）邏輯接入；層 3（`navigator.clipboard.writeText` + `chrome.notifications.create`）4 秒超時兜底。
  - **驗證 (Exit 0)**：手動停用 `:8765` → 4 秒後 Chrome Notification 出現，剪貼簿含正確文字單元測試 Exit 0。

> 🏁 **Phase 4 Checkpoint**：
> - [x] 所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾，更新後即刻停步交權，輸出接力代碼塊。

---

### Phase 5: 自動化審計與 SSOT 閉環 狀態：`[已完成]`

- [x] 任務 5.1：自動化工具合規審計
  - **動作**：執行 `py 1.devtools/tools/audit_suite.py --compact` 與 `py 1.devtools/tools/audit_manifests.py`。
  - **驗證 (Exit 0)**：審計工具回報 0 警告 0 錯誤。
- [x] 任務 5.2：SSOT 骨架回寫
  - **動作**：依 Target SSOTs 清單，將 `geminiOfficialBridge` 模組入口追加至 `gemini-nano-core/SKILL.md`；`OfficialGeminiConnector` 追加至 `pk-core/SKILL.md`；將 `draft/gemini.md` 升格複製至 `0.doc_mg/docs/spec-official-gemini-bridge.md`。
  - **驗證 (Exit 0)**：各 SKILL.md 骨架更新，無冗餘代碼貼入。
- [x] 任務 5.3：任務歸檔
  - **動作**：執行 `py 1.devtools/tools/task_cli.py archive`，將本任務移入 `0.doc_mg/tasks/archive/chrome_gemini_nano,chrome_pk/`。
  - **驗證 (Exit 0)**：`0.doc_mg/tasks/` 根目錄不再含本任務檔。

> 🏁 **Phase 5 Checkpoint**：
> - [x] 所有審計通過 (Exit 0)。
> - [x] SSOT 已回寫，任務已歸檔。
> - [x] 狀態更新為 `[已完成]`。

---

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)

- **最可能失敗場景**：
  1. **官方側欄注入失敗**：若官方側欄為 `chrome-extension://` or `chrome-untrusted://` SPA，Content Script 無法注入 → 直接跳層 2 `:8765` 橋接模式。
  2. **DOM 選擇器失效**：gemini.google.com 版本更新後 class 或結構改變 → 以 `aria-label`、`role="textbox"` 等語義屬性替代，降低脆弱性。
  3. **Vite IIFE build 衝突**：Content Script entry 與主 SPA bundle 設定衝突 → 拆分為獨立 vite 設定檔 `vite.bridge.config.ts`。
  4. **MV3 ServiceWorker 休眠**：PK+ background 在 idle 時無法接收訊息 → 確保 listener 為持久性，使用 `chrome.runtime.onMessage` 喚醒。
- **降級/回滾方案**：任何 Phase 失敗 → `git checkout chrome_gemini_nano/manifest.json chrome_gemini_nano/vite.config.ts` 恢復，保持主插件功能不受影響。
- **熔斷**：單一問題重試上限 2 次；次生突發錯誤 → 標記 `[BLOCKED]`、`git checkout` 還原、`log_issue.py` 立案、停步開新 Session。

---

## 6. 驗收標準 (Acceptance Criteria)

- [x] **Ingress 驗收**：在 gemini.google.com 發送一輪對話 → 800ms 後 PK+ 側邊欄歷史對話池出現對應訊息。
- [x] **Egress 驗收**：PK+ 點擊「回拋」→ 官方側欄輸入框填入內容並自動發送（`autoSubmit: true`）。
- [x] **去重驗收**：連發相同文字 3 次 → PK+ 歷史對話池僅新增 1 筆。
- [x] **寬容讀者驗收**：接收含未知欄位的 `GEMINI_OFFICIAL_SYNC` → PK+ 不拋出 `TypeError`，正常運行。
- [x] **層 3 降級驗收**：手動停用 `:8765` 服務 → 4 秒後出現 Chrome Notification，剪貼簿含正確文字。
- [x] **隔離審計**：`py 1.devtools/tools/audit_plugin_isolation.py --compact` 回報無跨插件 import，Exit 0。
- [x] **Manifest 合規**：`py 1.devtools/tools/audit_manifests.py --compact` 回報 MV3 合規，Exit 0。
- [x] **TypeScript 型別**：兩個插件 `npx tsc --noEmit` 均 Exit 0，無型別錯誤。
- [x] **除錯清理**：所有 `console.log` 除 DevTools debug 模式外已移除或加 flag 保護。
- [x] **SSOT 閉環**：L1~L3 骨架已回寫，L4 任務歸檔完成。

---

## 7. 狀態收斂歷程 (Condensed History)

- [2026-10-30] Gate 1 藍圖建立：分析 draft/code_artifact.md + draft/gemini.md，Gap 分析確認 4 個新增/修改檔案，5 Phase 拆分，任務檔初始化 (Session 1)
- [2026-10-30] Phase 1 前置驗查與 Manifest 修改完成：
  1. 驗證 PK+ RSA key 算得 Extension ID 為 `ahiihabnbjeoeneahcgbdcofncjoclcp` (Exit 0)。
  2. 確認官方側欄 URL 匹配 `https://gemini.google.com/*` 與 DOM 載體。
  3. `chrome_gemini_nano/manifest.json` 追加 host_permissions、clipboardWrite、notifications 與 content_scripts。
  4. `chrome_gemini_nano/vite.config.ts` 與 package.json 完成 bridge IIFE 獨立打包配置，順利產出 `dist/geminiOfficialBridge.iife.js`。
  5. `audit_manifests.py` 與 `audit_plugin_isolation.py` 均通過 (Exit 0) (Session 2)。
- [2026-10-30] Phase 2 Ingress — geminiOfficialBridge.ts 核心實作完成：
  1. 完成 `chrome_gemini_nano/src/geminiOfficialBridge.ts` 完整架構（Observer 串流監聽、DOM 自動掛載、單例守護）。
  2. 完成 `extractCleanText` 雜訊節點剔除、`sanitizeText` 免責聲明過濾與 `800ms` 防抖守護。
  3. 實作 `quickHash` 內容雜湊去重與 `extractReferencedTabs` 引用分頁提取。
  4. 實作向 PK+ (`ahiihabnbjeoeneahcgbdcofncjoclcp`) 廣播 `GEMINI_OFFICIAL_SYNC` (v2.4 規範)。
  5. `npm run lint` (tsc) 與 `npm run build` 通過 (Exit 0)，產出 `geminiOfficialBridge.iife.js` (5.38 kB)。
  6. `audit_manifests.py` 與 `audit_plugin_isolation.py` 全數通過 (Exit 0) (Session 3)。
- [2026-10-30] Phase 3 PK+ 接收端 — OfficialGeminiConnector.ts 實作完成：
  1. 新建 `chrome_pk/src/core/ai/OfficialGeminiConnector.ts`，宣告 `GeminiOfficialSyncPayload`、`ReferencedTab`、`OfficialSyncResult` 等介面。
  2. 實作 `handleSync()` 寬容讀者模式 (缺失自動補齊預設值) 與 Web Crypto SHA-1（結合前 200 字比對去重防腐）。
  3. 實作更新 `chrome.storage.local` 歷史對話池 `geminiConversations` 與 `GEMINI_CONVERSATION_UPDATED` 內部廣播。
  4. 於 `chrome_pk/src/background.ts` 及 `externalService.ts` 掛載 `GEMINI_OFFICIAL_SYNC` 監聽分流。
  5. 撰寫單元測試 `test_official_gemini_connector.ts`，連發 3 次去重與續接驗證通過 (Exit 0)。
  6. `npm run build`、`tsc --noEmit`、`audit_manifests.py`、`audit_plugin_isolation.py` 全數通過 (Exit 0) (Session 4)。

- [2026-10-30] Phase 4 Egress — 回拋注入與三層降級實作完成：
  1. `geminiOfficialBridge.ts` 實作 `probeInputType`（支援 contenteditable 與 textarea 雙模態探測）、原生 Setter 注入與事件派發序列（`focus ➔ input ➔ change ➔ blur ➔ 160ms ➔ Submit/Enter`）。
  2. `geminiOfficialBridge.ts` 掛載 `chrome.runtime.onMessage` 監聽器響應 `INJECT_TO_OFFICIAL_GEMINI`，並於 `destroy()` 安全解綁。
  3. `OfficialGeminiConnector.ts` 實作 `withTimeout(4000)` 熔斷函式與 `injectToOfficialGemini()` 三層階梯式降級（層 1 Web Tab 注入 ➔ 層 2 本機 :8765 微服務轉發 ➔ 層 3 剪貼簿 + Chrome Notification 兜底安全防線）。
  4. `main_dispatcher.py` 本機微服務擴充 `/api/v1/gemini/inject` 與 `/exec` 工具調度分支。
  5. `chrome_pk/src/background.ts` 與 `externalService.ts` 掛載 `INJECT_TO_OFFICIAL_GEMINI` 分流通道。
  6. 撰寫 `test_gemini_official_bridge.ts` 與擴展 `test_official_gemini_connector.ts`，單元驗證、兩端插件 build、隔離審計與 Manifest 審計全數 Exit 0 (Session 5)。
- [2026-10-30] Phase 5 自動化審計與 SSOT 閉環完成：
  1. 執行 `audit_suite.py --compact`、`audit_manifests.py`、`audit_plugin_isolation.py` 整合審計全數 Exit 0。
  2. L1 專家技能回寫：更新 `.agents/skills/gemini-nano-core/SKILL.md` 與 `pk-core/SKILL.md`，追加模組入口與 SSOT 依賴。
  3. L2 插件導航回寫：更新 `chrome_gemini_nano/overview-nano.md` 核心模組速查矩陣、FastAPI 注入端點與黑盒通訊契約。
  4. L3 規格升格：將 `draft/gemini.md` 升格為正式全域 SSOT `0.doc_mg/docs/spec-official-gemini-bridge.md`，並登錄至 `index-ssot.md` 與 `spec-cross-plugin-contract.md`。
  5. 執行 `task_cli.py archive` 進行結案歸檔 (Session 6)。

---

## 8. AI 簽到區與會話接力

> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> [x] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾。
> [x] 結案前已執行 `audit_suite.py` 完成自動化驗證。
>
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**：
> - `code_skeleton.py`：探勘工具呼叫與骨架化
> - `compact_log.py`：建置日誌脫水過濾 (減少終端 Token 雜訊)
> - `audit_suite.py`：結案整合自動化審計 (9 項門禁 Exit 0)
> - `audit_manifests.py`：驗收 Manifest V3 合規性 (Exit 0)
> - `audit_plugin_isolation.py`：驗收插件代碼隔離 (Exit 0)
>
> **參與對話 ID 紀錄**：
> - [2026-10-30] ID: 98fa58d6-929c-4e11-83ea-a1615c7d4717 (Gate 1 初始化)
> - [2026-10-30] ID: 02810d36-1565-40bd-a93a-178f8cdb845f (Session 2: Phase 1 前置驗查與 Manifest 修改完成)
> - [2026-10-30] ID: ddb76625-6272-4796-af8e-3db0319f5703 (Session 3: Phase 2 Ingress geminiOfficialBridge.ts 實作完成)
> - [2026-10-30] ID: bd51778c-9b6f-4745-8d3b-9bab01f906e3 (Session 4: Phase 3 PK+ 接收端 OfficialGeminiConnector.ts 實作完成)
> - [2026-10-30] ID: e4695eea-0a4a-4e13-bd52-3c24e663262a (Session 5: Phase 4 Egress 回拋注入與三層降級完成)
> - [2026-10-30] ID: f6cb5c7e-0a14-401f-bc15-d96ded0b4bd3 (Session 6: Phase 5 自動化審計、SSOT 閉環與結案歸檔)
>
> **任務狀態**：`[已歸檔結案]`（SSOT 閉環達成，無後續 Session 接力需求）
