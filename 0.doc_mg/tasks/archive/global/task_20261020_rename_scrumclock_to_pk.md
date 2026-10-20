---
title: "重構 scrumclock 插件更名為 PK (chrome_pk)"
plugin: "global"
status: "已完成"
created: "2026-10-20"
deadline: "2026-10-20"
appetite: "1.5h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 3 (Phase 3 完工，結案封存)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：將原有 `chrome_scrumclock` 插件全面正式改名為 `PK+` (Power Kit)，目錄名稱統一對齊為 `chrome_pk`，以建立更強大的個人工具箱 (Power Kit) 品牌定位。
- **核心目標**：
  1. 將目錄 `chrome_scrumclock/` 搬移/重命名為 `chrome_pk/`。
  2. 更新外掛清單與 UI（`manifest.json` 名稱改為 `PK+` / `PK+ (Power Kit)`，`popup.html` 標題與相關視覺文字）。
  3. 更新專案自動化工具與專家技能清單（`audit_manifests.py`、`scrumclock-core` ➔ `pk-core` 或對應引用更新）。
  4. 同步頂層與全域文檔（`README.md`、`使用說明.md`、`package.json`），確保無死鏈與斷層。
- **邊界與假設**：
  - 各插件間維持黑盒獨立性。
  - Chrome 開發者模式使用者需重新載入 `chrome_pk/` 資料夾。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `.agents/rules.md`、`chrome_scrumclock/SCRUMCLOCK_README.md`。
- **全流程工具鏈檢核矩陣**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `grep_search` / `repo_radar.py` | 掃描 `chrome_scrumclock` 引用分佈 | 鎖定改動範圍 |
  | **Gate 2: 執行** | `git mv` / `replace_file_content` | 原子搬遷與更新 | Exit 0 |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_manifests.py` / `doc_cross_ref.py` | 全自動 Manifest 與死鏈審計 | Exit 0 |
- **影響範圍地圖 (Entity Map)**：
  - 目錄搬遷：`chrome_scrumclock/` ➔ `chrome_pk/`
  - 核心外掛：`chrome_pk/manifest.json`, `chrome_pk/popup.html`, `chrome_pk/PK_README.md` (原 `SCRUMCLOCK_README.md`)
  - 專家技能：`.agents/skills/scrumclock-core/` ➔ `.agents/skills/pk-core/`
  - 工具腳本：`1.devtools/tools/audit_manifests.py`, `1.devtools/tools/clean_ghost_extensions.py`, `1.devtools/tools/task_cli.py`
  - 全域文檔：`README.md`, `使用說明.md`, `package.json`
- **前置條件 (Prerequisites)**：Git 狀態無衝突。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：保持內部程式碼與業務邏輯不變，僅進行識別符號、目錄與文件層面的重命名與搬移。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（僅改 UI/名稱，不改目錄）：已於 Gate 0 被放棄，用戶指定全面改為 `chrome_pk`。
  - 方案 B（全域搬移與同步重構）：選用此方案，以 `git mv` 保持 Git 歷史記錄，並依 Phase 分批原子替換。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁整檔覆寫任務檔或原始代碼。
  - 嚴禁更動其他非關插件的核心邏輯代碼。
  - 遵守 One Phase, One Session 原則。

### 鎖定檔案 (Target Files)
- `./chrome_pk/manifest.json`
- `./chrome_pk/popup.html`
- `./chrome_pk/PK_README.md`
- `./.agents/skills/pk-core/SKILL.md`
- `./.agents/rules.md`
- `./1.devtools/tools/audit_manifests.py`
- `./README.md`
- `./使用說明.md`
- `./package.json`

### 鎖定工具鏈 (Target Devtools)
- [x] 結案自動審計: `py 1.devtools/tools/audit_manifests.py` / `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/pk-core/SKILL.md`
- [x] L2 插件導航：`./chrome_pk/PK_README.md`
- [x] L3 業務規格：`./使用說明.md`、`./README.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/`

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 目錄搬遷與插件內部識別更名 (Directory & Plugin Rename) 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 執行 `git mv chrome_scrumclock chrome_pk` 與技能目錄更名 `.agents/skills/scrumclock-core` ➔ `.agents/skills/pk-core`
    - **動作**: 透過 git 命令完整保留歷史紀錄。
    - **驗證 (Exit 0 / 客觀指標)**: `git status` 確認搬遷完成。
- [x] 任務 1.2: 更新 `chrome_pk/manifest.json` 與 UI 標題
    - **動作**: 將外掛名稱改為 `PK+ (Power Kit)`，更新快捷鍵說明、popup.html 標題與相關視覺名稱。
    - **驗證 (Exit 0 / 客觀指標)**: 驗證 manifest.json 格式正確無誤。
- [x] 任務 1.3: 重命名並更新 `chrome_pk/PK_README.md` (原 `SCRUMCLOCK_README.md`)
    - **動作**: 將文件標題、描述與內部相對路徑校正為 `chrome_pk`。
    - **驗證 (Exit 0 / 客觀指標)**: 檢查檔案存在且路徑正確。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 目錄與插件內部識別完全更新，Git 追蹤狀態乾淨。

---

### Phase 2: 開發工具鏈與專家技能庫校準 (Devtools & Agent Skills Calibration) 狀態：`[已完成]`
- [x] 任務 2.1: 校準 `.agents/skills/pk-core/SKILL.md` 與 `.agents/rules.md`
    - **動作**: 更新技能名稱、路徑、描述及 rules 中的專家技能樹。
    - **驗證 (Exit 0 / 客觀指標)**: 檢查 rules.md 與 SKILL.md 一致性。
- [x] 任務 2.2: 校準 `1.devtools/tools/` 相關自動化腳本
    - **動作**: 更新 `audit_manifests.py`、`clean_ghost_extensions.py`、`task_cli.py` 等檔案中的外掛目錄與識別參照。
    - **驗證 (Exit 0 / 客觀指標)**: 執行 `py 1.devtools/tools/audit_manifests.py` 確認可正確掃描 `chrome_pk` 並回傳 Exit 0。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 工具鏈腳本與專家技能庫無任何舊有斷層，自動審計腳本順利執行。

---

### Phase 3: 全域文檔校準、交叉審計與結案封存 (Global Docs & Gate 3 Audit) 狀態：`[已完成]`
- [x] 任務 3.1: 更新 `README.md`、`使用說明.md` 與 `package.json`
    - **動作**: 全面將外掛名稱標示為 `PK+ (Power Kit)`，目錄連結修正為 `chrome_pk/`。
    - **驗證 (Exit 0 / 客觀指標)**: 檢查各文件連結與語意。
- [x] 任務 3.2: 執行 Gate 3 自動化交叉審計
    - **動作**: 執行 `py 1.devtools/tools/audit_manifests.py` 與 `py 1.devtools/tools/doc_cross_ref.py`。
    - **驗證 (Exit 0 / 客觀指標)**: 審計腳本全員 Exit 0。
- [x] 任務 3.3: 結案歸檔
    - **動作**: 打勾所有 Checkpoint，將任務檔移動至 `0.doc_mg/tasks/archive/global/`。
    - **驗證 (Exit 0 / 客觀指標)**: 任務完成歸檔。

> 🏁 **Phase 3 Checkpoint (狀態收斂區)**：
> - [x] 全自動交叉審計 Exit 0，文檔與技能樹全面閉環。
