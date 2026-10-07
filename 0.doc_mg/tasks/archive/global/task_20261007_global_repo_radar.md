---
title: "安裝專案極速精準檢索 Skill (repo_radar & symbol_index)"
plugin: "global"
status: "已完成"
created: "2026-10-07"
deadline: "2026-10-07"
---

## 1. 目標
將草稿中的「極致輕量化、零 Token 浪費專案情報雷達」落地為專案級工具與專家技能。
整合包含：
1. `generate_symbol_index.py`：自動抽取專案 Markdown 核心結構與 TypeScript/Python 符號（interface, type, class, function, def），生成輕量 `.repo_index.json` 快取。
2. 升級版 `repo_radar.py`：提供 `map`（~80 tokens 全貌）、`outline`（大綱）、`section`（章節切片）、`symbol`（0ms 快取秒查）與 `search`（帶熔斷搜尋）。
3. 專家技能封裝 `.agents/skills/repo-radar/SKILL.md` 與操作指引 `0.doc_mg/docs/repo_radar_ai_prompt_instructions.md`。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `1.devtools/tools/generate_symbol_index.py`
- `1.devtools/tools/repo_radar.py`
- `.gitignore`
- `0.doc_mg/docs/repo_radar_ai_prompt_instructions.md`
- `.agents/skills/repo-radar/SKILL.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`.agents/skills/repo-radar/SKILL.md` (Repo Radar 專家技能定義與 CLI 參照)
- [x] L2 插件導航：`1.devtools/README.md` (工具清單擴充)
- [x] L3 業務規格：`0.doc_mg/docs/repo_radar_ai_prompt_instructions.md` (AI 導航與檢索決策樹規格)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 實體工具鏈落地 狀態：`[已完成]`
- [x] 任務 1.1: 建立 `1.devtools/tools/generate_symbol_index.py`
    - [x] 支援掃描 Markdown 標題層級與 TS/Python 符號宣告
    - [x] 排除黑名單目錄（`dist`, `node_modules`, `archive` 等）
    - [x] 生成輕量 JSON `.repo_index.json`
- [x] 任務 1.2: 落地 `1.devtools/tools/repo_radar.py`
    - [x] 實作 `map` 模組：秒讀快取輸出 ~80 tokens 專案核心文件大綱地圖
    - [x] 實作 `symbol` 模組：優先秒查 `.repo_index.json`，未中回退磁碟搜尋
    - [x] 整合 `outline`、`section`、`search`（含 1,500 字元與 token 熔斷限制）
    - [x] 確保路徑以 `REPO_ROOT` 為標準正確處理工作區相對路徑
- [x] 任務 1.3: 更新 `.gitignore`
    - [x] 加入 `.repo_index.json` 避免快取污染 Git 樹

### Phase 2: CLI 執行驗收與索引生成 狀態：`[已完成]`
- [x] 任務 2.1: 執行 `python 1.devtools/tools/generate_symbol_index.py` 生成 `.repo_index.json` 並確認體積與內容
- [x] 任務 2.2: 驗證 `python 1.devtools/tools/repo_radar.py map` 輸出格式與 token 預算
- [x] 任務 2.3: 驗證 `python 1.devtools/tools/repo_radar.py symbol TaskTriageProposal` 等關鍵字快取秒查行為
- [x] 任務 2.4: 驗證 `python 1.devtools/tools/repo_radar.py section` 與 `search` 熔斷機制

### Phase 3: 規範手冊與專家技能封裝 狀態：`[已完成]`
- [x] 任務 3.1: 撰寫 `0.doc_mg/docs/repo_radar_ai_prompt_instructions.md` AI 導航決策樹與使用規範
- [x] 任務 3.2: 建立 `.agents/skills/repo-radar/SKILL.md`，納入技能清單與觸發詞
- [x] 任務 3.3: 更新 `1.devtools/README.md` (或工具索引清單)

### Phase 4: 四層 SSOT 閉環與封存歸檔 狀態：`[已完成]`
- [x] 任務 4.1: 核對 L1~L3 SSOT 文檔一致性
- [x] 任務 4.2: 清理草稿或標註草稿已落地（保持草稿目錄整潔）
- [x] 任務 4.3: 封存歸檔至 `0.doc_mg/tasks/archive/global/`

## 4. 影響評估
- 本工具組為純本地 Python 腳本與只讀檢索工具，不涉及瀏覽器擴充功能 Runtime 程式碼，不改變現有 MV3 Manifest 設定。
- 不引入外部第三方套件依賴（純標準庫），零環境相容性問題。
- 專案所有 AI 會話皆可藉此大幅減少檢索掃描的 Token 浪費（預計省 90% 以上）。

## 5. 驗收標準
- [x] **技術指標**: `generate_symbol_index.py` 生成之快取包含 1761 個符號與 66 篇文檔，耗時 ~1.0s。
- [x] **功能驗證**: `repo_radar.py` 五大指令 (`map`, `outline`, `section`, `symbol`, `search`) 均已通過 CLI 執行驗證，各指令皆精準熔斷且輸出無誤。
- [x] **除錯清理**: 程式碼無未捕獲異常，輸出具備清楚終端格式化。
- [x] **檔案編碼**: 確認所有檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: L1 專家技能、L2 導航 README、L3 業務規格回寫完成。
- [x] **L4 任務封存歸檔**: 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/global/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-07 ID: 6f75db70-45da-476c-8e0d-2e4db3e5f55a (初始化 Blueprint)
> - 2026-10-07 ID: 64384a91-654a-49bf-9e6e-20ba7d7d2bfa (完成 Phase 1 實體工具鏈落地)
> - 2026-10-07 ID: 65e59295-896b-4474-8426-5070ace9a413 (完成 Phase 2 CLI 執行驗收與索引生成)
> - 2026-10-07 ID: e759d75f-2113-422c-bded-54f39ee98928 (完成 Phase 3 規範手冊與專家技能封裝)
> - 2026-10-07 ID: 5b1cc161-4b85-46b1-b9c6-5dbddcfe1127 (完成 Phase 4 四層 SSOT 閉環與封存歸檔)
