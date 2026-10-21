---
title: "重構 Google Tasks 授權與同步設定卡片 UI/UX"
plugin: "chrome_pk"
status: "已完成"
created: "2026-10-21"
deadline: "2026-10-21"
appetite: "45m"
complexity_budget: "Max 2 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 1 (全階段完成，Gate 3 審計 Exit 0 結案封存)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：
  使用者在設定頁面遭遇「❌ Google 授權失敗：Google OAuth2 Client ID 尚未設定。請至設定頁面輸入您的 Client ID...」錯誤，疑惑不知「設定頁面在哪裡」。檢視後發現現有 UI/UX 存在嚴重盲區：
  1. 使用者已在設定頁，文案卻指引「請至設定頁面」，造成自我指涉矛盾與誤導。
  2. Placeholder 標註「若留空則使用預設值」，但留空後並無預設可用直接噴錯，引發預期落差。
  3. 資訊架構散落缺乏引導，缺少明確之 Step-by-Step 操作順序。
- **核心目標**：
  1. **步驟化導引卡片**：將設定區塊全面重構為清晰的 3 步驟（Step 1: 複製 Redirect URI ➔ Step 2: 填入 Client ID ➔ Step 3: Google 授權與同步狀態）。
  2. **消除誤導性文案與 Placeholder**：移除「若留空則使用預設值」不實字樣，改為「請輸入 GCP Web Client ID（例如：xxx.apps.googleusercontent.com）」。
  3. **智慧互動與錯誤定位**：點擊登入若未輸入 Client ID，直接於步驟 2 輸入框給予紅框警告並自動聚焦（Focus），錯誤訊息明確指引「請於步驟 2 輸入 Client ID」，不再指引外部「設定頁面」。
  4. **建置通過**：`chrome_pk` 專案 `npm run build` 通過無報錯。
- **邊界與假設**：
  - 本次改動僅限於 `chrome_pk` 內部之 Google Tasks 設定介面與相關提示字串，不影響其他外掛及底層 OAuth 核心邏輯。

## 2. 上下文探索與依賴 (Context Grounding)
- **影響範圍地圖 (Entity Map)**：
  - 設定面板 UI：`chrome_pk/src/components/SettingsPanel.tsx`
  - OAuth 認證客戶端：`chrome_pk/src/shared/google/googleAuthClient.ts`
- **前置條件 (Prerequisites)**：
  - 確認 `chrome_pk` 之 TypeScript 型別檢查與構建流程。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **UI/UX 設計原則**：
  - 依照專案既有 Tailwind 與 Dark mode 風格，打造層次分明、直觀專業的引導卡片。
  - 使用者即使是初次設定，也能依照「1 -> 2 -> 3」順序一眼理解整體流程。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁破壞既有之 Google Tasks 資料儲存結構 (`storage.getUserSettings`)。
  - 嚴守 Gate 1 嚴禁修改原始碼規則。
  - 嚴守 One Phase, One Session 物理隔絕原則。

### 鎖定檔案 (Target Files)
- `./chrome_pk/src/components/SettingsPanel.tsx`
- `./chrome_pk/src/shared/google/googleAuthClient.ts`

### 鎖定工具鏈 (Target Devtools)
- [x] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py`
- [x] 終端日誌脫水: `py 1.devtools/tools/compact_log.py`
- [x] 結案自動審計: `py 1.devtools/tools/audit_manifests.py` / `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量 UI/UX 改善任務豁免

---

## 4. 階段實施計畫 (Phase Execution Plan)

### Phase 1: 重構 Google Tasks 授權卡片 3 步驟 UI/UX 與文案優化 [已完成]
- [x] 步驟 1.1：調整 `googleAuthClient.ts` 報錯文案，將「請至設定頁面輸入...」改為精準的「Google OAuth2 Client ID 尚未設定，請先填入您的 Client ID 並於 GCP Console 設定重新導向網址」。
- [x] 步驟 1.2：重構 `SettingsPanel.tsx` 的 Google Tasks 區塊為 Stepper/Card 結構：
  - **Step 1: 取得 Chrome 重新導向網址**（含複製按鈕與 GCP 設定提醒）。
  - **Step 2: 填入 Google OAuth2 Client ID**（移除留空預設字樣，提供 useRef 支援未填時紅框震動/自動聚焦，更新 placeholder）。
  - **Step 3: 授權登入與狀態**（連線狀態指示燈、登入/解除綁定按鈕、手動立即同步按鈕）。
- [x] 步驟 1.3：執行 `chrome_pk` 建置與型別檢查，確保無任何編譯問題 (`npm run build` Exit 0)。

### Phase Final: 審計與結案 [已完成]
- [x] 執行自動化審計指令 (`audit_manifests.py` 與 `doc_cross_ref.py`) 通過 Exit 0。
- [x] 任務檔移至 `0.doc_mg/tasks/archive/` 根目錄，落實 SSOT 閉環。

---

## 5. 狀態收斂歷程 (Condensed History)
- [2026-10-21] [Phase 1] 完成 Google Tasks 授權區塊 Stepper 3 步驟 UI/UX 重構、Client ID 未填聚焦防呆與文案優化，`chrome_pk` 建置 Exit 0 (Session 1)。
- [2026-10-21] [Phase Final] 通過自動化審計 Exit 0，移入 archive/ 根目錄完成結案封存 (Session 1)。
