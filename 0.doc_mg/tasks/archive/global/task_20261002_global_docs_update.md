---
title: "同步更新全域使用說明.md 與根目錄 README.md"
plugin: "global"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-02"
---

## 1. 目標
針對近期 ScrumClock V2 完成之「極簡 GTD 輕量快捷捕捉 (Alt+Q / 右鍵)」、「多維/敏捷看板 (Inbox -> Next Actions -> In Progress -> Done)」、「In Progress WIP 限制警示」與「番茄鐘工時自動累加」等重大功能演進，同步更新工作區根目錄的 `使用說明.md` 與 `README.md`，確保對外指引與功能現況完全一致。

## 2. 策略與鎖定檔案
1. **使用說明.md (User Manual)**：
   - 更新第 3 節「ScrumClock 敏捷專注工作站操作指南」，新增 GTD 快捷捕捉 (Alt+Q/右鍵)、看板流程、WIP 限制及番茄工時自動回填說明。
   - 擴充第 9 節「全域快捷鍵與操作速查表」，納入 `Alt+Q` 全域捕捉。
   - 擴充第 8 節 FAQ，納入 GTD 與 WIP 相關問答。
2. **README.md (Quick Navigation)**：
   - 於根目錄導航矩陣與特色清單中，精確更新 ScrumClock 核心功能描述（GTD 捕捉、WIP 限制、看板與工時自動化）。

### 鎖定檔案 (Target Files)
- `./使用說明.md`
- `./README.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (純文檔更新，無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/global-core/SKILL.md`
- [ ] L2 插件導航：`./README.md`
- [ ] L3 業務規格：`./docs/spec.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 更新使用說明.md 狀態：`[已完成]`

### Phase 2: 更新根目錄 README.md 狀態：`[已完成]`

## 4. 影響評估
本任務僅更新 Markdown 說明文檔，不涉及任何 TypeScript/JavaScript 原始碼或 Manifest 設定，對現有擴充功能運行與建置 100% 零風險。

## 5. 驗收標準
- [x] **檔案編碼**: 確認所有修改的 Markdown 檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **格式規範**: 遵循雙軌路徑協議，文件內部維持純字串相對路徑。
- [x] **精準覆蓋**: `使用說明.md` 正確反映 Alt+Q、右鍵選單、GTD 狀態、看板流轉、WIP 限制與工時自動回填。
- [x] **SSOT 閉環**: 輕量任務豁免 L1~L3，結案後完成 L4 任務歸檔至 `0.doc_mg/tasks/archive/global/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: 5b91df47-0901-4f9d-bae6-60df203db2a0 (Gate 1 藍圖初始化 / Gate 2 執行完畢結案)

