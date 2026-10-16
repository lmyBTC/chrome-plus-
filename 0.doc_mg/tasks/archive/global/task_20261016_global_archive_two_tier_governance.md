---
title: "全域任務歸檔管理規則：雙層滾動歸檔機制 (近一個月平鋪與歷史下沉歸納)"
plugin: "global"
status: "已完成"
created: "2026-10-16"
deadline: "2026-10-16"
appetite: "1h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 4 (Phase Final 自動化審計與結案歸檔完成)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：目前 `0.doc_mg/tasks/archive/[plugin]/` 堆疊大量歷史任務檔（部分多達 40~50 份），導致直接查閱近期開發項目時雜訊過多。用戶希望為 archive 增加管理規則：將過期超過一個月以上的任務檔再往下一層目錄歸納，使子目錄第一層僅保留近一個月的任務，大幅降低目視找查成本。
- **核心目標**：
  1. 確立並寫入規範：在 `.agents/rules.md` 與 `.agents/skills/task-protocol/SKILL.md` 的「封存協議」增訂「雙層滾動歸檔 (Two-Tier Archive Governance)」規則（≤ 30 天平鋪於各插件子目錄根層；> 30 天下沉至各子目錄之 `history/`）。
  2. 現狀實體梳理：將現有 `0.doc_mg/tasks/archive/` 各子目錄中超過一個月（以今日 2026-10-16 為基準，早於 2026-09-16）的任務檔整齊遷移至各插件專屬之 `history/` 子目錄，並歸位根目錄誤放之檔案。
  3. 自動化維護工具：提供輕量化腳本 `0.doc_mg/tools/archive_rotator.py`，支援自動偵測與批次搬移超過 30 天之已封存任務，確保規則未來可機械化貫徹。
- **邊界與假設**：
  - 嚴格遵守「嚴禁刪除任何檔案」底線，所有歸納動作一律使用移動（Move），保留完整歷史軌跡。
  - 任務檔內部純字串相對路徑與跳轉規範保持相容。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md`。
- **影響範圍地圖 (Entity Map)**：
  - `.agents/rules.md` (Gate 3 封存規則增補)
  - `.agents/skills/task-protocol/SKILL.md` (Section 6 封存協議增補雙層目錄對照)
  - `0.doc_mg/tasks/archive/**` (實體任務檔搬移與目錄結構調整)
  - `0.doc_mg/tools/archive_rotator.py` (新增自動化滾動維護工具)
- **前置條件 (Prerequisites)**：Git 狀態乾淨，目錄讀寫權限正常。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **目錄架構設計**：
  - 第一層（活躍封存區）：`0.doc_mg/tasks/archive/[plugin]/` 僅平鋪放置結案日期 ≤ 30 天的任務檔。
  - 第二層（歷史深層區）：`0.doc_mg/tasks/archive/[plugin]/history/` 存放結案日期 > 30 天之歷史任務檔。
- **硬性禁止動作 (Guardrails)**：
  - 嚴格禁止使用刪除指令（`rm`, `del`, `unlink`），一律以 `git mv` 或目錄搬移。
  - 嚴禁整檔覆寫任務檔，嚴禁傳遞 `ArtifactMetadata`。
  - 遵守「One Phase, One Session」物理隔絕。

### 鎖定檔案 (Target Files)
- `.agents/rules.md`
- `.agents/skills/task-protocol/SKILL.md`
- `0.doc_mg/tools/archive_rotator.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免 (無插件元件增刪、無 Storage 改動)
- [x] L1 專家技能：`./.agents/skills/task-protocol/SKILL.md` (封存協議雙層規範)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/`

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 規範增訂與自動化工具建立 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 更新 `.agents/rules.md` 與 `.agents/skills/task-protocol/SKILL.md`
    - **動作**: 於「封存協議」與「L4 封存治理」章節增修雙層滾動歸檔架構（定義近 30 天平鋪與 > 30 天下沉至 `history/` 規則）。
    - **驗證 (Exit 0)**: 確認文檔文字精簡、純字串相對路徑合規。
- [x] 任務 1.2: 建立 `0.doc_mg/tools/archive_rotator.py`
    - **動作**: 編寫輕量 Python 腳本，具備 dry-run 與 execute 模式，能解析檔名日期 `task_YYYYMMDD_*.md`，自動將逾 30 天之檔案搬移至各子目錄下之 `history/`。
    - **驗證 (Exit 0)**: `py 0.doc_mg/tools/archive_rotator.py --dry-run` 執行成功且正確辨識出逾期清單。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 規範文檔已同步更新，輔助工具已測試 dry-run 通過。
> - [x] 狀態標記為 `[已完成]`，輸出新 Session 接力提示詞代碼塊。

### Phase 2: 歷史檔案實體整理與驗證 狀態：`[已完成]`
- [x] 任務 2.1: 執行歷史任務檔雙層搬移
    - **動作**: 執行 `py 0.doc_mg/tools/archive_rotator.py --execute`，將各子目錄（`chrome_scrumclock/`、`global/`、`chrome_video speed plus/` 等）中 > 30 天之舊任務移至對應的 `history/`。
    - **驗證 (Exit 0)**: 檢查 `archive/[plugin]/` 根層僅保留近一個月之檔案。
- [x] 任務 2.2: 清理與修正 archive 頂層誤放檔案
    - **動作**: 將 `0.doc_mg/tasks/archive/task_20261010_chrome_scrumclock_fix_dashboard_input_colors.md` 移動至 `archive/chrome_scrumclock/`。
    - **驗證 (Exit 0)**: `archive/` 根目錄無散落之 `.md` 檔案。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 實體檔案已完成歸位，無檔案遺失。
> - [x] 狀態標記為 `[已完成]`，輸出新 Session 接力提示詞代碼塊。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 全域合規與審計確認
    - **動作**: 執行 `git status` 與 `audit_manifests.py` 確認所有更動路徑受控且合規。
    - **驗證 (Exit 0)**: 無未追蹤遺留髒檔案，Exit 0 通過。
- [x] 任務 F.2: 任務檔結案歸檔
    - **動作**: 本任務檔打勾結案，依新規則移動至 `0.doc_mg/tasks/archive/global/`（近 30 天活躍封存）。
    - **驗證 (Exit 0)**: `0.doc_mg/tasks/` 維持整潔。

## 5. 驗收標準 (Acceptance Criteria)
- [x] **規範完整性**: `.agents/rules.md` 與 `task-protocol/SKILL.md` 明確載明雙層歸檔規則。
- [x] **目錄整潔度**:
  - `0.doc_mg/tasks/archive/[plugin]/` 第一層僅包含最近 30 天內結案之任務檔。
  - 超過 30 天之歷史檔案均移入各插件對應的 `history/` 資料夾中。
  - `0.doc_mg/tasks/archive/` 根目錄下無任何散落之 `.md` 檔案。
- [x] **自動化與工具**: 提供 `0.doc_mg/tools/archive_rotator.py` 並能正常執行。
- [x] **零資料損失**: 所有搬移均為原樣保留，無任何檔案遭到刪除。

## 6. 狀態收斂歷程 (Condensed History)
- 2026-10-16: 完成 Gate 0 方向確認與 Gate 1 任務藍圖建立。
- 2026-10-16: [Phase 1] 完成 rules.md 與 task-protocol 雙層滾動歸檔規範增訂，並建置 archive_rotator.py 工具驗證 dry-run 通過 (Session 2)。
- 2026-10-16: [Phase 2] 執行 archive_rotator.py --execute 成功下沉 25 份逾期任務檔至各插件之 history/，並歸位 archive 根目錄散落檔案，驗證 dry-run 二次檢查通過 (Session 3)。
- 2026-10-16: [Phase Final] 完成 Manifest 合規審計 (Exit 0)、確認工作區受控無髒檔案，任務檔打勾結案並歸檔至 archive/global/ (Session 4)。
