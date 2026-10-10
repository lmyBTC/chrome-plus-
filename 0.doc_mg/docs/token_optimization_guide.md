# 📉 AI 輔助開發極致 Token 節約工程架構與工作流指南 (Token Optimization Engineering)

> [!IMPORTANT]
> **核心哲學**：**「確定性的事情交給程式碼（Deterministic Scripts），機率性的事情才交給大模型（Probabilistic LLMs）。」**  
> 任何能用 AST、Git、Regex、Linter 或純文字比對解決的問題，嚴禁用 LLM 的上下文視窗去暴力掃描。

---

## 1. Token 消耗黑洞診斷 (The 5 Token Sinks)

在 Monorepo 或多插件前端專案中，Token 的主要浪費來源包括：

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI 開發 5 大 Token 浪費黑洞                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. 上下文污染 (Context Bloat)   : 一次讀取包含大量實作細節的巨石組件   │
│ 2. 盲目探測 (Blind Exploration) : 讓 AI 用猜測的方式反覆 grep/ls 找檔案│
│ 3. 變更全量回覆 (Full-File Rewrites): AI 改動 2 行代碼卻重印 500 行檔案│
│ 4. 終端輸出洗版 (Terminal Spam) : 測試/打包錯誤噴出數千行編譯雜訊      │
│ 5. 跨 Session 遺忘 (Amnesia)    : 每次開啟新對話都要重新解釋專案架構   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 4 大節省機制與核心架構 (Core Mechanisms)

### 機制 1：代碼「骨架化 / 介面化」提煉 (Skeleton Extraction)
* **原理**：AI 在理解或調用其他模組時，不需要知道函數內部的具體實作，只需要知道 **函數簽名、型別參數與 JSDoc/註解**。
* **工具**：`1.devtools/tools/code_skeleton.py`（支援 `npm run skeleton -- <路徑>` 或 `py 1.devtools/tools/code_skeleton.py`）
* **作法**：腳本自動將 `.ts` / `.tsx` / `.js` / `.py` 檔案的實作主體掏空（替換為 `/* ... */` 或 `...`），僅保留型別宣告、介面與函式骨架。
* **效益**：一個 800 行的 React 元件被壓縮至 40 行骨架，**Token 節省 85%~95%**。

### 機制 2：局部修補合約 (Diff & Chunk-Only Patches)
* **原理**：禁止 AI 輸出整份重寫檔案，僅允許輸出精準區塊（TargetContent / ReplacementContent）或 Unified Diff。
* **工具**：`replace_file_content` / `multi_replace_file_content`
* **效益**：輸出 Token 通常只有 50~150 tokens，大幅降低輸出延遲與因長度截斷造成之中斷風險，**節省 80% 輸出 Token**。

### 機制 3：終端日誌智慧脫水 (Log Desensitizer & Compactor)
* **原理**：執行建置、TypeScript 檢查或單元測試失敗時，錯誤訊息常伴隨數百行 `node_modules` 內部堆疊或重複資訊。
* **工具**：`1.devtools/tools/compact_log.py`
* **作法**：在終端命令後方串接管線，智慧過濾冗餘 Stack Trace，只截取核心報錯檔案、行號與第一現場錯誤描述。
* **效益**：報錯除錯時避免終端雜訊灌爆對話視窗，**節省 75%~90% 上下文 Token**。

### 機制 4：單一真實來源索引快取 (SSOT Micro-Index)
* **原理**：將系統規格、API 路由、符號定義與文檔章節濃縮在快取索引中，AI 無需逐檔讀取。
* **工具**：`1.devtools/tools/repo_radar.py`（搭配 `.repo_index.json`）
* **作法**：先透過 `map` 指令鎖定架構，或 `symbol` 指令秒查定義位置，再透過 `section` 單點抽吸特定章節。
* **效益**：免去讀取多份長篇文檔之成本，**節省 90% 以上檢索 Token**。

---

## 3. 專案內部工具鏈矩陣 (Toolchain Matrix)

專案在 `1.devtools/tools/` 內建以下純標準函式庫之專屬工具：

| 工具腳本 | 核心功能 | 常用指令範例 | 預期 Token 節省效益 |
| :--- | :--- | :--- | :--- |
| **`code_skeleton.py`** | 掏空程式碼內部實作，提煉介面與型別骨架 | `npm run skeleton -- chrome_scrumclock/src/background.ts`<br/>`py 1.devtools/tools/code_skeleton.py <路徑>` | 查詢外部依賴節省 **85%~95%** |
| **`compact_log.py`** | 終端編譯、型別檢查與測試日誌精簡過濾器 | `npm run build 2>&1 \| python 1.devtools/tools/compact_log.py` | 報錯除錯節省 **75%~90%** |
| **`repo_radar.py`** | 專案情報檢索（大綱、章節切片、符號秒查） | `python 1.devtools/tools/repo_radar.py symbol TaskState`<br/>`python 1.devtools/tools/repo_radar.py section GEMINI.md 1` | 專案探索節省 **80%~92%** |

---

## 4. 日常開發極低 Token 提問工作流 (Low-Token Workflows)

在日常 Prompt 與任務協作中，建議遵循以下工作流對照：

| 情境 | ❌ 高浪費做法 (High Token Cost) | ✅ 極致低 Token 做法 (Token Saver) | 節省比例 |
| :--- | :--- | :--- | :--- |
| **調用模組或型別** | 要求讀取目標檔案全文（如 600 行程式碼） | 執行 `python 1.devtools/tools/code_skeleton.py <路徑>` 僅取得介面骨架 | **節省 90%** |
| **報錯除錯 (Debug)** | 將終端噴出的 500 行錯誤訊息整包貼給 AI | 透過 `compact_log.py` 脫水後只提供核心行號與錯誤描述 | **節省 85%** |
| **查詢專案規範** | 讓 AI 全量載入 5 份 Markdown 文檔 | 執行 `repo_radar.py map` 鎖定章節，再用 `section` 單點抽吸 | **節省 90%** |
| **代碼修改與重構** | 讓 AI 整份檔案重印 400 行內容 | 要求 AI 只使用 `replace_file_content` 精準修改變更區塊 | **節省 80%** (輸出) |
| **跨階段任務接力** | 讓單一對話膨脹至數十萬 Token 繼續實作 | Phase 結束後依「會話重置協議」新開對話接力，徹底釋放歷史 Context | **節省 70%~90%** (輸入) |

---

## 5. Gate 1 探勘期武器庫強制鏈條 (Gate 1 Weaponized Exploration Protocol)

在專案之「三階段守門門禁 (3-Gate Protocol)」體系中，**Gate 1（脈絡勘查與任務藍圖）** 是 Token 消耗與 Context Rot 最容易失控的高危險期。為杜絕上下文退化，憲法級規範要求強制調用武器庫工具鏈：

### 5.1 探勘硬窄化三部曲 (3-Step Exploration Chain)
1. **第一防線：骨架掏空優先（Skeleton First）**
   * 目標代碼檔案逾 100 行者，**嚴禁直接調用原生 `view_file`** 或盲目全局 `grep`。
   * 強制優先調用 `python 1.devtools/tools/code_skeleton.py <路徑>` 或 `repo_radar.py` 提取介面骨架與符號大綱。
2. **第二防線：微量採集與簽名沉澱（Micro-Sampling）**
   * 取得骨架與目標函式精準行號後，僅允許針對目標函式/介面簽名執行微量局部 `view_file`。
   * 單次讀取嚴格限制 **≤ 30 行**，僅確認簽名、型別與參數，函式內部實作細節一律留待 Gate 2 原子執行時再讀。
   * 關鍵介面簽名與型別直接沉澱至 `task.md` 藍圖中。
3. **第三防線：藍圖停步與會話接力（Handover Halt）**
   * 於 `task.md` 清理註解並完成 Target SSOTs 宣告後，**嚴禁在 Gate 1 修改任何原始碼**。
   * 必須輸出「跨會話接力指令（Session Reset Handover）」，讓使用者能透過開啟新對話釋放 Gate 1 龐大探索上下文（節省 70%~90% 輸入 Token），等待明確執行授權。

### 5.2 典型防呆與實戰案例 (Anti-Patterns vs Best Practices)

| 維度 | ❌ 違規高消耗模式 (Anti-Pattern) | ✅ 標準武器庫鏈條模式 (Best Practice) | 實測 Token 效益 |
| :--- | :--- | :--- | :--- |
| **檔案初探** | 對 600 行的 `background.ts` 直接使用 `view_file(StartLine=1, EndLine=600)` 通讀全檔 | 先執行 `python 1.devtools/tools/code_skeleton.py background.ts` 取得 35 行介面骨架 | 從 ~4,000 tokens 降至 ~200 tokens (**-95%**) |
| **介面探查** | 讀取整段 80 行之模組實作細節來理解參數 | 依骨架行號僅調用 `view_file` 讀取該函式前 15 行簽名與 JSDoc，實作留待 Gate 2 | 從 ~600 tokens 降至 ~100 tokens (**-83%**) |
| **跨檔修改** | 在同一檔案中分成 3 次 `replace_file_content`，造成 3 輪對話與冗餘回傳 | 同檔案多點修改強制優先調用 `multi_replace_file_content` 一次性完成 | 工具呼叫與對話回合縮減 66% (**-65%**) |
| **藍圖收尾** | Gate 1 探勘完畢後直接接著改代碼，歷史探索上下文伴隨整個開發週期 | 產出 `task.md` 後停步並輸出「跨會話接力指令」，新會話以 `task.md` 為唯一真理源 | 輸入 Token 節省 **70%~90%**，根除 Context Rot |

---

## 6. 相關參照與 SSOT 導航

* **最高行為準則**：`GEMINI.md`
* **Agent 執行法規**：`.agents/rules.md`
* **專家技能**：`.agents/skills/token-saver/SKILL.md`
* **任務協議技能**：`.agents/skills/task-protocol/SKILL.md`
* **情報雷達技能**：`.agents/skills/repo-radar/SKILL.md`
* **開發工具目錄**：`1.devtools/README.md`

