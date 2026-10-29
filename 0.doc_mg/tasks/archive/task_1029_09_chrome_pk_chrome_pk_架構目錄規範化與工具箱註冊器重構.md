---
title: "chrome_pk_架構目錄規範化與工具箱註冊器重構"
plugin: "chrome_pk"
status: "已完成"
created: "2026-10-29"
deadline: "2026-10-29"
appetite: "2h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 4 (Phase Final Audit & SSOT Consolidation)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：目前 chrome_pk 已有許多組件與功能，之後還會不斷擴充，需依據剛建立之架構規範執行內部資料夾結構與命名方式之更新，讓後續擴充整齊且具擴展性。
- **核心目標**：
  1. 將 `src/dashboard/components/` 歸併入 `src/features/project-management/components/board/`，消除展示層與領域層分離。
  2. 消除 `activity-monitor` 內外重複目錄，統一對接全功能模組。
  3. 實作 `src/features/toolbox/registry.ts` 外掛註冊中心與微工具 `manifest.ts` 協議，使 `ToolboxHub.tsx` 動態掛載子工具，後續新增微工具零修改主 UI。
- **邊界與假設**：
  - 嚴禁更動其他插件代碼，維持多插件隔離。
  - 保持既有功能（番茄鐘、GTD 看板、腳本執行器、圖片擷取、字幕收集）行為 100% 不退化。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `chrome_pk/docs/guide-pk-features-arch.md`、`chrome_pk/overview-pk.md` 與 `.agents/skills/pk-core/SKILL.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `task_cli.py init` | `task_cli.py init --plugin chrome_pk` | 已建檔納入 Git 防護 |
  | **Gate 2: 執行** | `npm run build 2>&1 \| py 1.devtools/tools/compact_log.py` | `npm run build` (Exit 0，建置成功無錯誤) | 通過 |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py --compact` | `audit_suite.py` (Exit 0，所有門禁通過) & `audit_manifests.py` (MV3 100% 合規) | 通過 |
- **影響範圍地圖 (Entity Map)**：
  - `chrome_pk/src/dashboard/` ➔ 遷移至 `chrome_pk/src/features/project-management/components/board/`
  - `chrome_pk/src/features/toolbox/tools/activity-monitor/` ➔ 收斂整合
  - `chrome_pk/src/features/toolbox/registry.ts` ➔ 新建註冊中心
  - `chrome_pk/src/features/toolbox/ToolboxHub.tsx` ➔ 重構為動態註冊器渲染
  - `chrome_pk/src/features/toolbox/tools/*/manifest.ts` ➔ 補齊各微工具元數據
- **前置條件 (Prerequisites)**：Git status 乾淨，Node/npm 建置工具鏈就緒。

## 3. 策略與架構防護 (Strategy & Guardrails)

- **DRY 檢查**：複用 `ToolboxHub` 的標籤過濾與卡片渲染架構，透過 `IToolManifest` 抽象化介面。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（一次性大搬遷）：同時搬遷 core/、services/、dashboard/ 與所有 entries。風險：可能引發巨量路徑斷裂。
  - 方案 B（漸進式切片遷移 - 推薦）：
    - Phase 1 專注領域收斂（Dashboard 歸入 Project Mgmt、Activity Monitor 去重）。
    - Phase 2 專注微工具外掛架構（建立 Registry 與 Manifest，解耦 ToolboxHub）。
    - 選定方案 B，風險極小且每個 Phase 均可編譯驗證。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁在 Gate 1 修改任何原始程式碼。
  - 嚴禁破壞 Manifest V3 背景腳本與 Content Script 導出路徑。
  - 嚴禁同會話自動推進 Phase 2，恪守「One Phase, One Session」會話隔離。

### 鎖定檔案 (Target Files)
- `./chrome_pk/src/dashboard/components/BoardView.tsx`
- `./chrome_pk/src/dashboard/components/TaskCard.tsx`
- `./chrome_pk/src/dashboard/components/MergeTaskModal.tsx`
- `./chrome_pk/src/features/project-management/components/ProjectManagementDemo.tsx`
- `./chrome_pk/src/features/toolbox/ToolboxHub.tsx`
- `./chrome_pk/src/features/toolbox/registry.ts`
- `./chrome_pk/src/features/toolbox/types.ts`
- `./chrome_pk/src/features/toolbox/tools/script-runner/manifest.ts`
- `./chrome_pk/src/features/toolbox/tools/image-scraper/manifest.ts`
- `./chrome_pk/src/features/toolbox/tools/subtitle-collector/manifest.ts`

### 鎖定工具鏈 (Target Devtools)
- [x] 終端日誌脫水: `npm run build 2>&1 | py 1.devtools/tools/compact_log.py`
- [x] 結案整合審計: `py 1.devtools/tools/audit_suite.py --compact`
- [x] 2-Strike 熔斷立案: `py 1.devtools/tools/log_issue.py log`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/pk-core/SKILL.md` (已完成關聯)
- [x] L2 插件導航：`./chrome_pk/overview-pk.md` (更新導航索引)
- [x] L3 業務規格：`./chrome_pk/docs/guide-pk-features-arch.md` (已建立規格手冊)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/` (結案時歸檔)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 專案看板收斂與目錄整合 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 遷移 `src/dashboard/components/` 至 `src/features/project-management/components/board/`
    - **動作**: 移動 `BoardView.tsx`, `TaskCard.tsx`, `MergeTaskModal.tsx` 等至 `project-management`，並更新內部與外部 import 路徑。
    - **驗證 (Exit 0)**: `npm run build` 通過無報錯。
- [x] 任務 1.2: 清理重複的 activity-monitor 目錄
    - **動作**: 讓 `features/toolbox/tools/activity-monitor/` 作為輕量代理直接引用 `features/activity-monitor/`，消除雙胞胎維護痛點。
    - **驗證 (Exit 0)**: `npm run build` 通過。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] 遵循「One Phase, One Session」停步交權，輸出開立新 Session 接力提示詞代碼塊。

### Phase 2: Toolbox 微工具註冊中心與外掛協議 狀態：`[已完成]`
- [x] 任務 2.1: 定義微工具協議介面與註冊器
    - **動作**: 建立 `src/features/toolbox/registry.ts`，並在 `types.ts` 定義 `IToolManifest`。
- [x] 任務 2.2: 為子工具補齊 `manifest.ts` 與 `index.ts` 門面
    - **動作**: 標準化 `script-runner`, `image-scraper`, `subtitle-collector`, `activity-monitor`, `finance-watchlist`。
- [x] 任務 2.3: 重構 `ToolboxHub.tsx` 為動態渲染
    - **動作**: 移除硬編碼工具卡片，改以 `TOOL_REGISTRY` 迴圈動態渲染，點擊載入對應 ToolView。
    - **驗證 (Exit 0)**: `npm run build` 通過。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 遵循「One Phase, One Session」停步交權。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 自動化工具合規審計
    - **動作**: 執行 `py 1.devtools/tools/audit_suite.py --compact` 與 `py 1.devtools/tools/audit_manifests.py`。
    - **驗證 (Exit 0)**: 審計工具回報 0 警告 0 嚴重錯誤 (Exit 0)。
- [x] 任務 F.2: SSOT 實體回寫與任務歸檔
    - **動作**: 更新 `chrome_pk/overview-pk.md` 與 `.agents/skills/pk-core/SKILL.md`，執行 `py 1.devtools/tools/task_cli.py archive` 移入歸檔目錄。
    - **驗證 (Exit 0)**: 檔案已正確歸檔。

> 🏁 **Phase Final Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] SSOT 閉環完成 (overview-pk.md, SKILL.md)。
> - [x] 執行任務歸檔。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：路徑遷移時某些深層組件遺漏更新 import 路徑導致編譯中斷。
- **降級/回滾方案**：若編譯失敗且 2 次無法定位，使用 `git checkout` 還原對應檔案。
- **熔斷與突發隔離機制**：單一問題重試上限 2 次 (2-Strike 熔斷)。

## 6. 驗收標準 (Acceptance Criteria)
- [x] `npm run build` 成功建置，無 TypeScript 錯誤或遺失模組。
- [x] 看板相關視圖完全封裝於 `project-management` 內部。
- [x] `ToolboxHub` 透過 `TOOL_REGISTRY` 動態載入，新增微工具無需改動 UI 代碼。
- [x] 符號索引與審計工具全數通過。

## 7. 狀態收斂歷程 (Condensed History)
- [2026-10-29] [Gate 1] 完成架構規劃、建立規格手冊、關聯專屬技能與初始化任務檔 (Session 1)
- [2026-10-29] [Gate 2 - Phase 1] 完成專案看板收斂至 project-management/components/board/，StandupModal 併入 modals/，清理 activity-monitor 重複 mock 並完成輕量代理橋接，npm run build 通過 (Exit 0) (Session 2)
- [2026-10-29] [Gate 2 - Phase 2] 完成 Toolbox 微工具註冊中心 (registry.ts) 與 IToolManifest 協議，標準化 5 大微工具 manifest/index.ts 門面，ToolboxHub 改為全動態掛載與渲染，npm run build 通過 (Exit 0) (Session 3)
- [2026-10-29] [Gate 3 - Phase Final] 通過 audit_suite.py 與 audit_manifests.py 自動化合規審計，完成 L2 插件導航 (overview-pk.md) 與 L1 技能 (pk-core/SKILL.md) SSOT 回寫，執行 task_cli.py archive 圓滿結案 (Session 4)

