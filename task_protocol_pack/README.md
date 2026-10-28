# 📦 Task & Token Protocol 完整實體套件 (Task & Token Protocol Pack)

> **版本**：v3.2+ 鬆綁流暢版 (Enterprise Grade)  
> **來源專案**：`masonyang-blog` 核心協作體系  
> **目標專案**：`chrome plus project` 及其他多模組 / 多插件開發專案  
> **核心使命**：杜絕 Context 膨脹、降低 70%~90% LLM Token 損耗、建立嚴謹自包含的物理任務驅動與會話隔離體系。

---

## 1. 核心哲學與四大防護支柱

在大型專案與多插件開發環境中，AI Agent 最常見的失敗模式為：
1. **Context 泛洪 (Context Bloat)**：盲目 `view_file` 數百行檔案或巨量終端日誌，導致模型進入「Lost in the middle」注意力稀釋狀態。
2. **無任務隨機編碼 (No Task, No Code 違背)**：未經客觀驗證標準即動手改碼，引發次生架構漂移。
3. **同會話硬推進 (Context Degradation)**：在已消耗數萬 Token 的髒環境下連續推進多個階段，造成回答截斷與幻想。
4. **2-Strike 盲目死磕**：單一錯誤原地重試多次，製造大量髒代碼與污染工作區。

本套件透過**四大支柱**建立確定性的工程閉環：

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Task & Token Protocol 四大支柱                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. 門禁責任隔離 (Phase-Gated)    : 4-Gate / 3-Gate，每階段客觀 Exit 0 檢核  │
│ 2. 會話物理隔絕 (One Phase, One Session) : 完成單 Phase 即停步，輸出無損接力碼塊 │
│ 3. 四層 Token 防火牆 (Token Firewall) : 骨架先行、日誌脫水、雷達抽吸、水位預警 │
│ 4. 實體任務真理源 (Task SSOT)    : task_*.md 為唯一狀態真理，行號錨定零猜測 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 套件目錄結構清單

```
task_protocol_pack/
├── README.md                          # 本說明手冊（原理、用法與適配指南）
├── install.py                         # Chrome Plus 專案一鍵安裝/升級輔助腳本
│
├── docs/                              # 核心文檔與範本真理源
│   ├── task_manager.md                # 任務生命週期、狀態收斂與雙層封存治理指南
│   └── task_template_v2.md            # 任務實體範本（含 Tool Invocation Matrix、Probe Cache）
│
├── skills/                            # Agent 專家技能定義 (YAML Frontmatter + SOP)
│   ├── task-protocol/
│   │   └── SKILL.md                   # 任務協議守護者 (門禁、會話隔離、局部替換防護)
│   └── token-saver/
│       └── SKILL.md                   # Token 節省器 (四層防火牆、CLI 脫水模式、換場指南)
│
└── scripts/                           # 核心執行引擎工具鏈 (Python)
    ├── repo_radar.py                  # 情報雷達 (outline 大綱 / section 章節 / symbol 符號 / map 地圖)
    ├── code_skeleton.py               # 代碼骨架提煉器 (JS/TS/Python 多語言掏空實作)
    ├── compact_log.py                 # 終端日誌脫水器 (管線過濾 Traceback 與重複堆疊)
    ├── generate_symbol_index.py       # 全域符號與情報索引生成器 (.repo_index.json)
    ├── log_issue.py                   # 2-Strike 熔斷與突發問題立案登記工具
    ├── analyze_task_tokens.py         # 任務 Token 消耗與縮減分析工具
    ├── token_estimator.py             # 統一 Token 計數與估算真理源
    └── util_archive_manager.py        # 歷史任務與草稿雙層歸檔收納器 (熱資料/冷資料滑動維護)
```

---

## 3. 核心工具鏈功能與使用範例

### 3.1. 專案情報雷達 (`repo_radar.py`)
- **功能**：免全文檢索快速定位專案結構與宣告，單次僅消耗數十至數百 Token。
- **常用指令**：
  ```bash
  # 1. 長文檔或代碼大綱樹提煉 (50~100 tokens 掌握全貌)
  py 1.devtools/tools/repo_radar.py outline path/to/file.js
  py 1.devtools/tools/repo_radar.py outline path/to/file.js --save scratch/tmp/tmp_probe_task.md

  # 2. 精準抽吸單一章節 (受 150 行超長防護，杜絕全文 view)
  py 1.devtools/tools/repo_radar.py section doc/spec.md --heading "核心架構"

  # 3. 符號宣告秒查 (免全域 grep，秒定位類別/函式/Web Components)
  py 1.devtools/tools/repo_radar.py symbol MyComponent

  # 4. 全站情報壓縮地圖 (輸出全站 SSOT 與文檔導航)
  py 1.devtools/tools/repo_radar.py map
  ```

### 3.2. 代碼骨架提煉器 (`code_skeleton.py`)
- **功能**：自動掏空 JavaScript / TypeScript / Python 檔案中的函式具體實作與龐大資料陣列，僅保留類別、型別簽名、JSDoc 與匯出介面，節省 60%~85% 上下文視窗。
- **常用指令**：
  ```bash
  # 快速提煉大型模組或核心組件之骨架
  py 1.devtools/tools/code_skeleton.py path/to/large_module.js
  
  # 提煉骨架並落地為 Gate 1 探勘快取 (供後續 Session 直接開工)
  py 1.devtools/tools/code_skeleton.py --save scratch/tmp/tmp_probe_task.md path/to/large_module.js
  ```

### 3.3. 終端日誌智慧脫水器 (`compact_log.py`)
- **功能**：過濾編譯、建置、測試或審計腳本輸出的冗長 Traceback、進度條與重複警告，僅保留關鍵錯誤行與退出狀態。
- **常用指令**：
  ```bash
  # 串接任何高輸出量指令
  npm run build 2>&1 | py 1.devtools/tools/compact_log.py
  py 1.devtools/tools/audit_suite.py 2>&1 | py 1.devtools/tools/compact_log.py
  ```

### 3.4. 全域符號與情報索引生成器 (`generate_symbol_index.py`)
- **功能**：掃描專案並生成/更新根目錄之輕量快取 `.repo_index.json`，讓 `repo_radar.py` 具備毫秒級查詢效能。
- **常用指令**：
  ```bash
  py 1.devtools/tools/generate_symbol_index.py
  ```

### 3.5. 2-Strike 熔斷與突發問題立案器 (`log_issue.py`)
- **功能**：當遭遇非本任務原子目標的次生 Bug，或單一錯誤嘗試 2 次修復失敗時，立即停止原地探索，登錄結構化 Issue 記錄並乾淨還原工作區。
- **常用指令**：
  ```bash
  py 1.devtools/tools/log_issue.py --title "Extension Storage Sync Timeout" --severity HIGH --desc "詳細錯誤快照"
  ```

### 3.6. 任務生命週期與雙層歸檔器 (`util_archive_manager.py`)
- **功能**：依日期與狀態自動將已結案任務下沉歸檔，保持任務目錄極致乾淨。
- **常用指令**：
  ```bash
  # 預檢常規歸檔 (Dry Run)
  py 1.devtools/tools/util_archive_manager.py --dry-run

  # 正式執行歸檔 (自動保護未完成任務與今日任務)
  py 1.devtools/tools/util_archive_manager.py
  ```

---

## 4. 任務範本與管理規範關鍵機制

### 4.1. 實體任務範本 (`task_template_v2.md`) 核心設計
1. **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix - 實證制)**：
   - 拒絕無證據虛應打勾。
   - Gate 1 必須填寫 `repo_radar` 或 `code_skeleton` 提取之骨架行數與節省比率。
   - Gate 2 必須填寫日誌脫水或 Exit 0 實證。
   - Gate 3 必須填寫 SSOT 審計 Exit 0 與快取更新實證。
2. **Gate 1 探勘持久化快取 (Probe Cache)**：
   - Gate 1 探索提煉之大綱/骨架強制輸出至 `scratch/tmp/tmp_probe_{slug}.md`。
   - Gate 2 (Phase 1+) 啟動時直接讀取快取，**零探索直接開工**，嚴禁重複 `view_file` 原始長檔。
3. **行號錨定 (Line Anchor)**：
   - 任務拆解動作必須標註目標檔案與預期修改行號（如 `src/popup.js L45-L60`），消除新會話盲搜。
4. **四層 SSOT 閉環 (90/10 分級守則)**：
   - 90% 輕量任務（樣式、文字排版、局部除錯）L1~L3 標記 `[N/A]` 全面豁免。
   - 10% 重大變更（架構合約、Storage Schema、跨插件 API）結案前僅回寫純骨架防腐。
5. **語意區塊局部替換防護 (Semantic Chunk Replacement ≤ 50-80 行)**：
   - 嚴禁用全量覆寫 (`write_to_file`) 修改 workspace 程式碼或任務檔。
   - 放寬為 50~80 行具備前後唯一語意邊界的局部替換，杜絕行號漂移與死鎖重試。
   - 對 workspace 專案檔案寫入時嚴禁傳遞 `ArtifactMetadata`。
   - 任務更新為本輪最後一個工具呼叫，完成後即刻停步交權。

### 4.2. 多會話接力代碼塊 (Session Handover Block) 標準格式
當單一 Phase 完成或遇突發阻礙中斷時，AI 必須在回覆末尾強制輸出接力代碼塊：

```text
# 接續推進下一階段 (標準無損接力模式)
請讀取 0.doc_mg/tasks/task_MMDD_01_Topic.md，接續執行 Phase X：[階段名稱]。
- 【上階產出】：Phase X-1 已完成並收斂狀態（[簡要產出/關鍵修改]）。
- 【本階目標】：[條列 Phase X 核心目標與驗證指標]。
- 【目標檔案與錨點】：[列出目標檔案與預期修改行號/函式區塊]。
- 【門禁約束】：嚴格維持「One Phase, One Session」會話隔離；細讀以 80~150 行語意單元為準，局部替換放寬為 50~80 行語意錨定塊；Phase 結束統一於 Checkpoint 單次批次打勾，更新任務檔後即刻停步交權。
```

---

## 5. Chrome Plus Project 專案安裝與升級指南

本套件針對 `chrome plus project` 之現有架構設計了完全相容的路徑映射：

### 5.1. 路徑映射對照表

| 安裝包來源路徑 (`task_protocol_pack/`) | Chrome Plus 目標路徑 | 說明 |
| :--- | :--- | :--- |
| `docs/task_template_v2.md` | `0.doc_mg/task_template_v2.md` | 任務實體範本（升級至 v3.2+） |
| `docs/task_manager.md` | `0.doc_mg/docs/README_TASK_MANAGER.md` | 任務與封存治理指南（升級） |
| `skills/task-protocol/SKILL.md` | `.agents/skills/task-protocol/SKILL.md` | 任務協議守護者技能（升級） |
| `skills/token-saver/SKILL.md` | `.agents/skills/token-saver/SKILL.md` | Token 節省器技能（升級） |
| `scripts/repo_radar.py` | `1.devtools/tools/repo_radar.py` | 情報雷達（升級至完整版） |
| `scripts/code_skeleton.py` | `1.devtools/tools/code_skeleton.py` | 代碼骨架提煉器（升級） |
| `scripts/compact_log.py` | `1.devtools/tools/compact_log.py` | 終端日誌脫水器（升級） |
| `scripts/generate_symbol_index.py` | `1.devtools/tools/generate_symbol_index.py` | 符號索引生成器（升級） |
| `scripts/token_estimator.py` | `1.devtools/tools/token_estimator.py` | Token 估算器（升級） |
| `scripts/log_issue.py` | `1.devtools/tools/log_issue.py` | 2-Strike 熔斷立案器（全新安裝） |
| `scripts/analyze_task_tokens.py` | `1.devtools/tools/analyze_task_tokens.py` | Token 消耗分析器（全新安裝） |
| `scripts/util_archive_manager.py` | `1.devtools/tools/util_archive_manager.py` | 雙層任務歸檔器（全新安裝） |

### 5.2. 一鍵安裝指令 (自動備份保護)

在 `C:\Users\G1\00.coding workspace\chrome plus project` 終端下執行：

```bash
# 步驟 1: 預覽即將更新與安裝的檔案 (Dry Run)
py task_protocol_pack/install.py --dry-run

# 步驟 2: 執行安裝升級 (自動備份現有舊檔至 task_protocol_pack/backup_YYYYMMDD_HHMMSS/)
py task_protocol_pack/install.py --install
```

### 5.3. 安裝後驗證動作
安裝完成後，建議執行以下驗證確認工具鏈就緒：
```bash
# 1. 驗證情報雷達核心能力
py 1.devtools/tools/repo_radar.py --help

# 2. 驗證代碼骨架提煉能力
py 1.devtools/tools/code_skeleton.py --help

# 3. 更新 Chrome Plus 全域符號情報索引
py 1.devtools/tools/generate_symbol_index.py
```

