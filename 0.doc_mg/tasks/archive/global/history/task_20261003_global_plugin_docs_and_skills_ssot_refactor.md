---
title: "各插件 README 與 SKILLS SSOT 整理更新暨輕量化任務"
plugin: "global"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-04"
---

## 1. 目標
重構專案中四大核心插件（`chrome_scrumclock`、`chrome_video speed plus`、`finance-research-clipper-oss`、`browser-activity-monitor`）之文檔體系：
1. **SKILLS 輕量化**：大幅瘦身各插件的 `SKILL.md`，將冗長的資料模型、選擇器字典、元件細節與長篇代碼範例下沉，僅保留核心定位、觸發條件、架構入口索引與絕對性架構約束，大幅降低每次調用時注入之 Context Token（目標單檔壓縮 50% 以上）。
2. **README 沉澱為深層 SSOT**：將詳細規格、資料結構字典、選擇器規範與架構說明完整回寫整合至各插件之 `[PLUGIN]_README.md` 與根目錄 `README.md`，確保開發細節不丟失、有跡可循。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./.agents/skills/scrumclock-core/SKILL.md`
- `./chrome_scrumclock/SCRUMCLOCK_README.md`
- `./chrome_scrumclock/README.md`
- `./.agents/skills/video-speed-core/SKILL.md`
- `./chrome_video speed plus/VIDEOSPEED_README.md`
- `./chrome_video speed plus/README.md`
- `./.agents/skills/finance-clipper-core/SKILL.md`
- `./finance-research-clipper-oss/FINANCE_CLIPPER_README.md`
- `./finance-research-clipper-oss/README.md`
- `./.agents/skills/activity-monitor-core/SKILL.md`
- `./browser-activity-monitor/ACTIVITY_MONITOR_README.md`
- `./browser-activity-monitor/README.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/*-core/SKILL.md`（四個插件核心技能全數輕量化）
- [x] L2 插件導航：`./[plugin]/[PLUGIN]_README.md` 與 `./[plugin]/README.md`（下沉詳細規格，同步導航）
- [ ] [N/A] L3 業務規格：無新增獨立規格檔，業務規則沉澱於 L2 README
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/`（結案後移動封存歸檔）

## 3. 任務拆解

### Phase 1: ScrumClock 文檔整合與 SKILL 輕量化 狀態：`[已完成]`
- [x] 任務 1.1: 將 `scrumclock-core/SKILL.md` 詳細元件結構、Storage 模型字典與外部整合通訊規範完整沉澱至 `chrome_scrumclock/SCRUMCLOCK_README.md` 與 `chrome_scrumclock/README.md`
- [x] 任務 1.2: 精簡 `scrumclock-core/SKILL.md` 為輕量索引（保留 triggers、技術棧重點、入口檔案清單、核心底線禁忌與 README 索引，壓低至 50 行以內）

### Phase 2: VideoSpeedPlus 文檔整合與 SKILL 輕量化 狀態：`[已完成]`
- [x] 任務 2.1: 將 `video-speed-core/SKILL.md` 中 Shadow DOM 掛載機制、快捷鍵預設值與 Storage Schema 完整沉澱至 `chrome_video speed plus/VIDEOSPEED_README.md` 與 `chrome_video speed plus/README.md`
- [x] 任務 2.2: 精簡 `video-speed-core/SKILL.md`，聚焦於 Shadow DOM 樣式隔離底線、入口路徑與 README 索引

### Phase 3: FinanceClipper 文檔整合與 SKILL 輕量化 狀態：`[已完成]`
- [x] 任務 3.1: 將 `finance-clipper-core/SKILL.md` 中龐大的多市場選擇器字典（Yahoo/Google/鉅亨/Goodinfo）、Miner Schema 與跨模組清洗流程完整沉澱至 `finance-research-clipper-oss/FINANCE_CLIPPER_README.md` 與 `finance-research-clipper-oss/README.md`
- [x] 任務 3.2: 精簡 `finance-clipper-core/SKILL.md` 為輕量核心（保留 triggers、zero-build 規範、入口索引、對外通訊黑盒契約與 README 索引）

### Phase 4: ActivityMonitor 文檔整合與 SKILL 輕量化 狀態：`[已完成]`
- [x] 任務 4.1: 將 `activity-monitor-core/SKILL.md` 中 80/20 雙層探針架構、IndexedDB 儲存結構、動態腳本注入規範沉澱至 `browser-activity-monitor/ACTIVITY_MONITOR_README.md` 與 `browser-activity-monitor/README.md`
- [x] 任務 4.2: 精簡 `activity-monitor-core/SKILL.md`，保留常駐監控原則、入口清單與權限合規底線

### Phase 5: 全域一致性檢視與驗收閉環 狀態：`[已完成]`
- [x] 任務 5.1: 驗核四大插件的 `SKILL.md` 與 `README.md` 彼此相互引用路徑皆正確無誤
- [x] 任務 5.2: 檢查所有技能之 Frontmatter (name, triggers, ssot_dependencies) 完整合規
- [x] 任務 5.3: 完成實體 `task.md` 狀態收斂與結案歸檔

## 4. 影響評估
- 本任務純屬文檔體系（Markdown）與專家技能配置重構，不更動任何 JavaScript/TypeScript 原始碼及擴充功能功能邏輯。
- 插件執行與 Manifest V3 機制不受影響。
- SKILL 瘦身後，AI 每次載入專家技能之 Prompt Token 消耗預期降低 50%~70%，大幅緩解 Context 膨脹。

## 5. 驗收標準
- [x] **技術指標**: 不涉及代碼變更，無破壞性修改。
- [x] **核心規範**: 所有文檔維持最簡潔純字串相對路徑，無多餘噪音。
- [x] **除錯清理**: 無暫存檔案遺留。
- [x] **檔案編碼**: 確認所有修改的 Markdown 檔案皆為 UTF-8 (無 BOM) 編碼。
- [x] **SSOT 閉環**: 重大架構同步完成（四大插件 L1 專家技能與 L2 插件導航皆精準對齊）。
- [x] **L4 任務封存歸檔**: 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/global/`。
- [x] **技能合規**: 各插件 `SKILL.md` 內容精簡扼要，複雜細節已 100% 下放至各插件的 README 文檔。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: 15dd2272-561f-41a7-9438-0b172713a356 (初始化)
> - 2026-10-03 ID: 2de510b9-d24b-4df9-afcd-6e20cc8e34c4 (執行 Phase 1)
> - 2026-10-03 ID: daa02637-2b0d-4eb2-bb12-797c5cb213b7 (執行 Phase 2)
> - 2026-10-03 ID: 79566eb7-d858-4188-adc5-defbe884a4a6 (執行 Phase 3)
> - 2026-10-03 ID: ce585d44-1ef1-4646-98a1-04cb201e1e6a (執行 Phase 4)
> - 2026-10-03 ID: 98fc4013-ba15-4701-9413-90b9f08eaac6 (執行 Phase 5 與驗收結案)
>
> **跨會話接力指令 (Session Handover)**:
> 本任務所有 Phase 皆已圓滿結案並完成歸檔。

