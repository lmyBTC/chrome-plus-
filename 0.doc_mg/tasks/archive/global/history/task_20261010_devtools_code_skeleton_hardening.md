---
title: "DevTools 代碼骨架提煉器 (code_skeleton.py) 健壯度加固與 Token 工具鏈優化"
plugin: "global"
status: "已完成"
created: "2026-10-10"
deadline: "2026-10-10"
---

## 1. 目標
加固開發者工具 `1.devtools/tools/code_skeleton.py` 之解析邏輯與執行環境相容性。修復 Windows 環境下 Python 直譯器呼叫失敗（Microsoft Store shim 阻斷）、修復骨架提煉後的孤兒括號語法瑕疵，強化頂層監聽器與箭頭函式提煉，並於根目錄 `package.json` 封裝跨平台 npm 指令與更新相關 SSOT 文檔，確保 Agent 探勘時 100% 能派上用場並穩定節省 80%+ Context Token。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `1.devtools/tools/code_skeleton.py`
- `1.devtools/README.md`
- `package.json`
- `.agents/skills/token-saver/SKILL.md`
- `0.doc_mg/docs/token_optimization_guide.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [x] L1 專家技能：`./.agents/skills/token-saver/SKILL.md` (調用指令相容性與武器庫鏈條更新)
- [x] L2 插件導航：`./1.devtools/README.md` (工具速查矩陣指令更新)
- [x] L3 業務規格：`./0.doc_mg/docs/token_optimization_guide.md` (骨架提煉器最佳實踐更新)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 核心解析器邏輯修復與語法加固 狀態：`[已完成]`
- [x] 任務 1.1: 修復括號配對與孤兒閉合括號瑕疵
    - [x] 修正 `skipping_function_body` 結尾處重複 append 原始結尾括號造成雙重閉合括號的問題
    - [x] 支援頂層事件監聽器與非賦值箭頭回呼（如 `chrome.runtime.onMessage.addListener`）之簽名保留與實作掏空
- [x] 任務 1.2: 強化 TypeScript 泛型函式與解構參數辨識
    - [x] 擴充 `func_class_pattern` 與 `const_func_pattern` 正則，支援 `<T, R>` 泛型簽名與多行解構參數

### Phase 2: 工作區指令封裝與 Windows 跨平台相容 狀態：`[已完成]`
- [x] 任務 2.1: 工作區根目錄指令封裝
    - [x] 於 `package.json` 加入 `"skeleton": "node 1.devtools/tools/run_py.js 1.devtools/tools/code_skeleton.py"`（搭配 `run_py.js` 解決 Windows 下 Python 直譯器名稱歧義與 npm 參數轉發）
- [x] 任務 2.2: 骨架提取器內部自檢與 CLI 防禦
    - [x] 在 `code_skeleton.py` 增強檔案不存在、目錄誤傳、語法錯誤與 UTF-8 解碼異常之友善回報

### Phase 3: 驗證測試與文檔 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 3.1: 實測各插件核心檔案骨架提煉效果
    - [x] 測試 `chrome_scrumclock/src/background.ts`（驗證行數減少率 ≥ 75% 且無孤兒括號）
    - [x] 測試 `chrome_video speed plus/content.js` 與 `kanbanAuditor.ts` 核心模組
- [x] 任務 3.2: 專家技能與工具鏈文檔同步
    - [x] 更新 `.agents/skills/token-saver/SKILL.md`
    - [x] 更新 `1.devtools/README.md`
    - [x] 更新 `0.doc_mg/docs/token_optimization_guide.md`

## 4. 影響評估
- 本任務純屬開發者工具鏈（DevTools）與專案輔助腳本加固，不改動任何瀏覽器插件之執行階段 (Runtime) 業務邏輯。
- 解決 Windows 環境下 Python 啟動問題，大幅提升 Agent 自動化工具調用成功率。

## 5. 驗收標準
- [x] **技術指標**: `py 1.devtools/tools/code_skeleton.py <檔案>` 或 `npm run skeleton -- <檔案>` 在 Windows 環境下正常執行無報錯。
- [x] **提煉品質**: 提煉後的 TypeScript 代碼無孤兒括號語法錯誤，清晰呈現導出介面、函式簽名與 JSDoc。
- [x] **Token 節省率**: 測試核心代碼檔案之壓縮比率維持在 70% ~ 95% 區間。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 完成 `.agents/skills/token-saver/SKILL.md` 與 `1.devtools/README.md` 調用方式同步更新。
- [x] **L4 任務封存歸檔**: 任務完成後依協議移動至 `0.doc_mg/tasks/archive/global/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - [2026-10-10] ID: fb173f97-55a8-460c-a5eb-b74a3934fe3b (初始化)
> - [2026-10-10] ID: 79a6b369-b40a-4518-83ce-bf6cb3727a6c (Phase 1 執行)
> - [2026-10-10] ID: 13d2924e-5186-4bbb-84f0-c07c6e7e072e (Phase 2 執行)
> - [2026-10-10] ID: 22b4d38d-9d6c-4dc7-8bd8-361bf77a0828 (Phase 3 執行)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261010_devtools_code_skeleton_hardening.md，開始執行 Phase 3
> ```
