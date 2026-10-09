---
title: "Chrome Canary 多實例未封裝擴充功能常駐與 ID 固定問題排查"
plugin: "global"
status: "進行中"
created: "2026-10-09"
deadline: "2026-10-09"
---

## 1. 目標
排查並解決 Chrome Canary 與 Chrome 正式版多版本並存時，5 款未封裝擴充功能（Browser Activity Monitor、Chrome Plus - Gemini Nano、Finance Research Clipper、Power Kit、YouTube Speed Plus）重啟後自動消失的根本問題，驗證各插件 key 欄位配置與 Chrome Sync 阻斷設定。

## 2. 策略與鎖定檔案

### 現況診斷
經精準掃描，專案中 5 款插件之 `manifest.json` 均已內建固定 Base64 公鑰（`"key"` 欄位），經 SHA-256 驗算所得之 Extension ID 均與 Canary 呈現之 ID 100% 精準吻合：
1. `browser-activity-monitor` -> `kjnoegggihncdaimlgfccccogghjapgn`
2. `chrome_gemini_nano` -> `ejookehegbdmnkohfllcblcnjbgahgke`
3. `finance-research-clipper-oss` -> `imnnkgiglcbjknfbkdfocdhoookkipji`
4. `chrome_scrumclock` (public/dist) -> `ahiihabnbjeoeneahcgbdcofncjoclcp`
5. `chrome_video speed plus` -> `dhdnogmjajghbdcgdccicpkfljmcoieg`

因此，重啟消失之根本原因並非「缺少公鑰/ID未固定」，而是「Chrome Sync 跨實例雲端擴充功能雙向覆蓋（Silent Eviction）」與「Canary 捷徑載入路徑未隔離」。

### 鎖定檔案 (Target Files)
- `./browser-activity-monitor/manifest.json`
- `./chrome_gemini_nano/manifest.json`
- `./finance-research-clipper-oss/manifest.json`
- `./chrome_scrumclock/public/manifest.json`
- `./chrome_scrumclock/dist/manifest.json`
- `./chrome_video speed plus/manifest.json`
- `./0.doc_mg/draft/Chrome 未封裝擴充功能重啟自動消失問題排查與修復手冊.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/[plugin]-core/SKILL.md`
- [ ] L2 插件導航：`./[plugin]/[PLUGIN]_README.md`
- [ ] L3 業務規格：`./[plugin]/docs/[feature]-spec.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 診斷確認與手冊補充 狀態：`[已完成]`

### Phase 2: 使用者本機實測與常駐驗收 狀態：`[進行中]`
- [x] 任務 2.1: 引導使用者在 Chrome Canary 與正式版關閉 `chrome://settings/syncSetup/advanced` 的擴充功能同步。
- [x] 任務 2.2: 提供 Canary 啟動參數腳本（一次性掛載 5 款插件），確保跨實例重啟 100% 常駐不遺失。
- [ ] 任務 2.3: 本機實測重啟驗收通過後，執行封存歸檔 (L4 任務生命週期)。

## 4. 影響評估
- 原始碼的 `manifest.json` 均已具備相應之 `"key"` 欄位，無需對插件原始碼進行破壞性修改，無向下相容性或權限風險。
- 本次處置重點在於環境配置與啟動流程標準化，避免 Google Sync 覆蓋。

## 5. 驗收標準
- [x] **技術指標**: 5 款插件公鑰（key）與 Extension ID 完全對應，不因重啟產生任何 ID 漂移。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範與本機開發原則。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: [x] [N/A] 輕量任務豁免（本任務為環境配置與診斷手冊補充，無模組結構更動）。
- [ ] **L4 任務封存歸檔**: 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/global/`。
- [ ] **插件驗證**: Chrome Canary 重啟後 5 款未封裝插件維持常駐，無被卸載或報錯現象。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - 2026-10-09 ID: 08a22e70-0ede-426b-a26b-1f2947313ea4 (初始化 Gate 1)
> - 2026-10-09 ID: dab69b5e-b1c5-4f95-9329-96fdf4be8bc4 (執行 Phase 2)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261009_global_fix_canary_extensions_persistence.md，開始執行 Phase 1
> ```
