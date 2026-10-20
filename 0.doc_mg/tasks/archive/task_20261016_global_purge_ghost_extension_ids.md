---
title: "Chrome Canary 幽靈 Extension ID 衝突清理與常駐持久化修復"
plugin: "global"
status: "進行中"
created: "2026-10-16"
deadline: "2026-10-16"
appetite: "1h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 2 (Phase 1 Complete)"
related_drafts: ["0.doc_mg/draft/Chrome 未封裝擴充功能重啟自動消失問題排查與修復手冊.md"]
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：
  徹底解決除 `browser-activity-monitor` 外，其餘 4 款未封裝插件（`chrome_gemini_nano`、`chrome_scrumclock`、`chrome_video speed plus`、`finance-research-clipper-oss`）在重啟 Chrome Canary 後反覆自動消失、被迫手動重新「載入未封裝項目」掛載的根本痛點。
- **核心目標**：
  清除 Chrome Canary 底層 `Secure Preferences` 內殘留之 4 組歷史隨機舊 ID（`agaall...`、`egch...`、`gpgl...`、`lddm...`），消除「同一磁碟路徑綁定雙重 Extension ID」之底層衝突，使 4 款插件達到與 BAM 完全相同之 100% 重啟常駐狀態。
- **邊界與假設**：
  本任務主要處置本機 Chrome Canary Profile 內部註冊表衝突，操作前必須先安全備份 `Secure Preferences`。清理執行時 Chrome Canary 必須處於完全關閉狀態，避免檔案寫入鎖死或被記憶體快取反向覆寫。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `.agents/rules.md` 之 4-Gate Protocol 與合規底線。
- **影響範圍地圖 (Entity Map)**：
  - 本機 Profile: `%LOCALAPPDATA%\Google\Chrome SxS\User Data\Default\Secure Preferences`
  - 輔助清理工具: `1.devtools/tools/clean_ghost_extensions.py` (新增)
- **前置條件 (Prerequisites)**：
  - Chrome Canary 關閉完成。
  - 工作區 Git 狀態正常可控。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：使用 Python 標準函式庫處理 JSON 與自動備份（`.bak`），杜絕第三方非必要依賴。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（純手動）：引導使用者手動刪除 Chrome Profile 重建（代價過高，書籤與瀏覽歷史遺失）。
  - 方案 B（精準手術修復，選定）：編寫專用腳本安全精準刪除 `Secure Preferences` 中 4 組舊 ID key，保留其他所有 Profile 設定與歷史紀錄。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁在 Chrome 運作中修改檔案。
  - 嚴禁修改未封裝插件原始碼之 `"key"` 欄位（公鑰需絕對維持不變）。
  - 嚴禁整檔覆寫任務檔，落實局部錨定更新。

### 鎖定檔案 (Target Files)
- `./1.devtools/tools/clean_ghost_extensions.py`
- `0.doc_mg/tasks/task_20261016_global_purge_ghost_extension_ids.md`

### 鎖定工具鏈 (Target Devtools)
- [ ] 結案自動審計: `py 1.devtools/tools/audit_manifests.py` / `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L4 任務生命週期: `0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 幽靈 ID 精準清理工具撰寫與安全執行 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 建立 `clean_ghost_extensions.py` 清理工具
    - **動作**: 於 `1.devtools/tools/` 建立腳本，實作自動備份、鎖定 4 組舊 ID（`agaallmookjjfabbpdgoeailhfllcgkn`、`egchfajhgaaebcbnbmbhnmdabicbflkf`、`gpgleghipcihiijlbieohhbghedmlppe`、`lddmofabeepifibcahaneebcjapolbjl`）並安全剔除。
    - **驗證 (Exit 0)**: 執行 `python 1.devtools/tools/clean_ghost_extensions.py --dry-run` 正確辨識 4 筆舊 ID 且無語法錯誤。
- [x] 任務 1.2: 執行實體安全清理
    - **動作**: 確認 Chrome Canary 已完全關閉後，執行 `python 1.devtools/tools/clean_ghost_extensions.py --apply`。
    - **驗證 (Exit 0)**: 腳本輸出顯示備份成功、4 筆舊 ID 成功刪除，重新掃描驗證 `Secure Preferences` 僅留新 ID。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出開立新 Session 接力提示詞代碼塊。

### Phase 2: 使用者本機重新掛載與重啟常駐驗證 狀態：`[待辦]`
- [ ] 任務 2.1: 指引使用者在 Chrome Canary 重新「載入未封裝項目」掛載 4 款插件。
- [ ] 任務 2.2: 關閉並完全重啟 Chrome Canary，驗收 4 款插件是否如 BAM 般 100% 常駐不遺失。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[待辦]`
- [ ] 任務 F.1: 自動化工具合規審計 (`audit_manifests.py`、`doc_cross_ref.py`)。
- [ ] 任務 F.2: 任務封存歸檔至 `0.doc_mg/tasks/archive/global/`。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：Chrome Canary 未完全關閉即執行寫入，導致檔案衝突或重開時 Canary 使用快取覆蓋。
- **降級/回滾方案**：腳本自動產生 `.bak` 備份檔，若有異常可一鍵原樣還原。
- **熔斷機制**：2-Strike 熔斷，最多重試 2 次。

## 6. 驗收標準 (Acceptance Criteria)
- [x] **技術指標**: Chrome Canary 的 `Secure Preferences` 中，專案 5 款插件路徑各自唯一對應 1 個固定 Extension ID，無任何重複路徑。
- [ ] **核心規範**: 符合 Chrome Extension Manifest V3 與本機開發規範。
- [ ] **SSOT 閉環**: 輕量任務豁免 (L1~L3)，完成 L4 封存歸檔。
- [ ] **插件驗證**: Chrome Canary 完全關閉並重啟後，5 款插件全部常駐於已安裝清單，無任何自動消失或需重新載入之現象。

## 7. 狀態收斂歷程 (Condensed History)
- [2026-10-16] 藍圖建立完成 (Session 1 Gate 1 Blueprint)
- [2026-10-16] Phase 1 完成：建立 clean_ghost_extensions.py 工具，自動完成 Secure Preferences 備份並成功剔除 12 處幽靈 ID 節點，二次掃描驗收通過，同路徑雙 ID 衝突徹底消除。

## 8. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
>
> **參與對話 ID 紀錄**:
> - 2026-10-16 ID: 5a644230-4a7b-4532-b846-68122a797377 (初始化 Gate 1)
> - 2026-10-16 ID: 22c1a571-3e5f-49eb-b40b-add7548443cf (執行 Phase 1 清理)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放執行佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261016_global_purge_ghost_extension_ids.md，開始執行 Phase 2
> ```
