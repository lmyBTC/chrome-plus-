---
title: "工作區全局架構盤點與規範一致性修復"
plugin: "global"
status: "已完成"
created: "2026-09-26"
deadline: "2026-09-27"
---

## 1. 目標
針對全專案架構盤點所發現之 5 大核心問題進行分階段改善與對齊：
1. **子專案結構與規範對齊**：為 `browser-activity-monitor/` 補齊 `ACTIVITY_MONITOR_README.md` 與極簡 `README.md` 導航存根，並建立專屬核心技能 `.agents/skills/activity-monitor-core/SKILL.md`。
2. **自動化工具覆蓋盲區修復**：修復 `0.doc_mg/tools/audit_manifests.py`，改為動態偵測工作區內所有含 `manifest.json` 的子目錄，納入 `browser-activity-monitor`。
3. **功能邊界與契約對齊**：釐清 `browser-activity-monitor` 與 `chrome_scrumclock/src/features/toolbox/tools/activity-monitor/` 的架構關係，落實黑盒契約或共用說明。
4. **歷史已完成任務歸檔**：執行任務歸檔工具，將 `0.doc_mg/tasks/` 中已驗收之任務移至 `archive/`。
5. **安全弱點修復（XSS/innerHTML）**：分階段將各插件之 `.innerHTML` 安全漏洞轉為 `.textContent` 或消毒封裝。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./0.doc_mg/tools/audit_manifests.py`
- `./README.md`
- `./browser-activity-monitor/README.md`
- `./browser-activity-monitor/ACTIVITY_MONITOR_README.md`
- `./.agents/skills/activity-monitor-core/SKILL.md`
- `./0.doc_mg/tasks/` (歸檔處理)

## 3. 任務拆解

### Phase 1: 工具覆蓋與子專案規範一致性 (自動化與 SSOT 閉環) 狀態：`[已完成]`

### Phase 2: 歷史任務歸檔與工作區清潔 狀態：`[已完成]`

### Phase 3: 安全弱點與 innerHTML 改善規劃 狀態：`[已完成]`
- [x] 任務 3.1: 針對審計工具提出的 XSS 警告（ScrumClock、VideoSpeed、FinanceClipper）建立專項安全改善任務（依多插件隔離憲法建立 3 份獨立任務藍圖）。

## 4. 影響評估
- 本次架構優化以文檔 SSOT 規範與 Python 審計工具為主，不影響各插件核心業務代碼運行。
- 新增之技能與文檔嚴格遵守純相對路徑與 UTF-8 (無 BOM) 規範。
- 各插件安全改善已建立獨立任務藍圖，確保後續修復符合多插件邊界隔離與原子執行原則。

## 5. 驗收標準
- [x] **審計工具驗證**: `py 0.doc_mg/tools/audit_manifests.py` 成功掃描全部 4 款插件，無漏網插件。
- [x] **SSOT 文件同步**: `browser-activity-monitor` 符合工作區防誤讀規範與技能字典標準。
- [x] **工作區整潔**: 已完成之歷史任務成功歸檔。
- [x] **檔案編碼**: 確認所有新增與修改檔案皆為 UTF-8 (無 BOM)。
- [x] **安全規劃落實**: 針對審計警告已建立 3 款插件之專屬安全修復任務。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: a914e565-5be6-42ed-8587-6ed75d257388 (Gate 1 初始化)
> - 2026-09-26 ID: a6dd0640-acc6-482b-9999-c83dac97f902 (Phase 1 執行完成)
> - 2026-09-26 ID: 2d699c7a-fdcd-4287-b916-6ba488654246 (Phase 2 執行完成)
> - 2026-09-26 ID: c615df2f-4854-48bd-a4dc-ac1684699c4d (Phase 3 執行完成並結案)
