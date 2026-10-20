---
title: "ScrumClock 主頁面側欄頂部 Google 帳號登入功能實作"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-16"
deadline: "2026-10-17"
appetite: "2h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 5 (Phase Final 完工結案歸檔)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：插件主頁面的左側工具列最上方 Logo 🛠️ PK+ 的右邊，新增一登入 Google 帳號的功能。
- **核心目標**：
  1. 在主頁面左側工具列 (`Sidebar.tsx`) 頂部 Logo（`🛠️ PK+`）右側，整合 Google 帳號登入與狀態指示元件。
  2. 支援未登入（登入按鈕）、登入中（Loading）與已登入（帳號頭像/Email 與登出選單）三種狀態。
  3. 全面復用既有 `googleAuthClient.ts`，支援即時登入授權、登出與 `chrome.storage` 狀態監聽。
- **邊界與假設**：
  - 遵循 `chrome_scrumclock` 零構建破壞原則，建置結果需通過 `npm run build`。
  - 嚴禁跨目錄讀取或修改非關插件。樣式與現有 Dark Theme 設計系統完全一致。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `0.doc_mg/docs/google_ecosystem_integration_spec.md` 與 `chrome_scrumclock/SCRUMCLOCK_README.md`。
- **影響範圍地圖 (Entity Map)**：
  - `chrome_scrumclock/src/core/layout/Sidebar.tsx`（主頁面左側導覽列頂部 Logo 與帳號區）
  - `chrome_scrumclock/src/components/GoogleAccountButton.tsx`（Google 帳號按鈕與狀態下拉選單元件）
  - `chrome_scrumclock/src/shared/google/googleAuthClient.ts`（既有 Google OAuth 授權客戶端）
- **前置條件 (Prerequisites)**：相依檔案路徑皆確認無誤。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：完全復用現有 `googleAuthClient.getAuthState()`、`googleAuthClient.getAuthToken(true)` 與 `googleAuthClient.signOut()`。
- **架構策略**：獨立封裝 `GoogleAccountButton` 元件，嵌入至 `Sidebar.tsx` 的頂部 Header，保持側邊欄程式碼乾淨且職責分離。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁更動非關插件目錄。
  - 任務檔局部替換 ≤ 50~80 行，嚴禁全檔覆寫。
  - 2-Strike 熔斷上限重試 2 次。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/core/layout/Sidebar.tsx`
- `chrome_scrumclock/src/components/GoogleAccountButton.tsx`

### 鎖定工具鏈 (Target Devtools)
- [x] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py` 或 `py 1.devtools/tools/repo_radar.py`
- [x] 終端日誌脫水: `npm run build 2>&1 | py 1.devtools/tools/compact_log.py`
- [x] 結案自動審計: `py 1.devtools/tools/audit_manifests.py` / `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [x] L1 專家技能：`.agents/skills/scrumclock-core/SKILL.md`
- [x] L2 插件導航：`chrome_scrumclock/SCRUMCLOCK_README.md`
- [ ] L3 業務規格：[N/A]
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/`

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 側欄頂部 Google 登入按鈕與狀態元件實作 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 封裝 `GoogleAccountButton.tsx` 元件，串接 `googleAuthClient.ts` 處理未登入（登入按鈕）、登入中（Spinner）、已登入（帳號指示、下拉選單含 Email、重新授權與登出）。
- [x] 任務 1.2: 於 `Sidebar.tsx` 頂部 Header (`🛠️ PK+`) 右側水平排版整合 `GoogleAccountButton` 元件，確保美觀與樣式協調。
    - **動作**: 引入 `GoogleAccountButton` 至 `Sidebar.tsx`，調整 Flexbox 版面使 Logo 與登入按鈕和諧並列。
    - **驗證 (Exit 0)**: 執行 `npm --prefix chrome_scrumclock run build 2>&1 | py 1.devtools/tools/compact_log.py`，確認無 TypeScript 編譯錯誤。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果以單行緊湊摘要寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔。
> - [x] 輸出開立新 Session 接力代碼塊，停步交出控制權。

### Phase 2: 連動狀態監聽與交互完整性驗證 狀態：`[已完成]`
- [x] 任務 2.1: 驗證登入／登出與 `chrome.storage.onChanged` 實時響應，點擊登入觸發 OAuth 互動流程，登出能即刻清除狀態。
    - **驗證 (Exit 0)**: 執行 `npm --prefix chrome_scrumclock run build 2>&1 | py 1.devtools/tools/compact_log.py`，確認產物無錯誤。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔。
> - [x] 輸出開立新 Session 接力代碼塊，停步交出控制權。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 自動化工具合規審計 (`audit_manifests.py`、`doc_cross_ref.py`)。
- [x] 任務 F.2: SSOT 實體回寫 (`SCRUMCLOCK_README.md`、`SKILL.md`) 與任務歸檔至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：使用者未配置 GAS URL 或未登入 Google 帳號導致點擊無反應或報錯。
- **降級/回滾方案 (Blast Radius Control)**：全面捕獲例外並彈出 Toast/提示視窗，一鍵引導跳轉至系統設定頁 (`chrome.runtime.openOptionsPage()`)。
- **熔斷機制**：單一問題重試上限 2 次 (2-Strike 熔斷)。

## 6. 驗收標準 (Acceptance Criteria)
- [x] **技術指標**: TypeScript 編譯通過，建置無警告無錯誤。
- [x] **核心規範**: 符合 Chrome MV3 規範與 Shadow DOM / UI 隔離原則。
- [x] **工具鏈合規審查**: 建置指令串接 `compact_log.py`，結案審計 Exit 0。
- [x] **四層 SSOT 閉打**: 完成 L1, L2 與 L4 封存治理。

## 7. 狀態收斂歷程 (State Condensation Log)
- [2026-10-16] [Gate 1] 建立任務藍圖檔並鎖定 Target Files，納入 Git 版本防護 (Session 1)。
- [2026-10-16] [Gate 1] 依用戶反饋校準目標為「主頁面左側工具列頂部 Logo 🛠️ PK+ 右側整合 Google 登入按鈕與狀態指示」(Session 2)。
- [2026-10-16] [Phase 1] 建立 GoogleAccountButton 元件並整合至 Sidebar 頂部 Header，建置與編譯驗證 Exit 0 (Session 3)。
- [2026-10-16] [Phase 2] 連動狀態監聽、點擊外部自動收合與錯誤降級引導驗證完畢，建置 Exit 0 (Session 4)。
- [2026-10-16] [Phase Final] 完成審計工具合規驗證 (Exit 0)、L1/L2 SSOT 實體回寫並執行 L4 任務結案封存 (Session 5)。

## 8. AI 簽到區與會話接力
> - [x] 2026-10-16 ID: 1dbbdf49-94b2-4401-bfee-39cc522a2b2b (Gate 1 Blueprint 初始化)
> - [x] 2026-10-16 ID: 7b83a236-c929-4585-bf7b-58eb53933e9b (Gate 1 任務方向校準完成)
> - [x] 2026-10-16 ID: 379c524e-a95e-4090-ae81-99efb0d2d7d8 (Phase 1 原子執行通過)
> - [x] 2026-10-16 ID: ab5ebe59-aeb8-4a77-b1d4-e21dd8e8a240 (Phase 2 原子執行通過)
> - [x] 2026-10-16 ID: 3f9aef85-4a75-4dcb-a02d-35a03953c4b0 (Phase Final 結案審計與 SSOT 閉環封存)
