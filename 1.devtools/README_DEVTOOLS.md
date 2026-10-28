# 🛠️ 專案開發者工具鏈 (1.devtools)

> [!IMPORTANT]
> **工具導航索引**：本目錄存放 Chrome Plus 專案之自動化審計、合約驗證、Token 節省檢索與維護工具鏈。所有腳本均使用 Python 標準函式庫，零外部環境依賴。

---

## 1. 工具導航清單 (Tools Directory)

所有工具位於 `1.devtools/tools/`：

| 工具腳本 | 主要職責 | 常用指令範例 |
|:---|:---|:---|
| **`code_skeleton.py`** | 掏空程式碼內部實作，提煉介面、型別與簽名骨架（省 85%~95% Token） | `npm run skeleton -- chrome_scrumclock/src/background.ts`<br/>`py 1.devtools/tools/code_skeleton.py <檔案>` |
| **`run_py.js`** | 跨平台 Python 執行轉發器（防禦 Windows Store shim 阻斷並支援 npm 參數轉發） | `node 1.devtools/tools/run_py.js 1.devtools/tools/<腳本.py> [參數...]` |
| **`compact_log.py`** | 終端編譯、型別檢查與測試日誌精簡過濾器（剔除冗餘堆疊） | `npm run build 2>&1 \| python 1.devtools/tools/compact_log.py` |
| **`repo_radar.py`** | 極低 Token 專案情報檢索（大綱、章節切片、符號秒查、安全搜尋） | `python 1.devtools/tools/repo_radar.py map`<br/>`python 1.devtools/tools/repo_radar.py symbol <Name>` |
| **`generate_symbol_index.py`** | 專案全域符號與文檔導航快取生成器（產出 `.repo_index.json`） | `python 1.devtools/tools/generate_symbol_index.py` |
| **`audit_suite.py`** | Gate 3 整合自動化審計套件（Manifest/隔離/死鏈/交叉引用/Token 預算/SSOT 防腐一鍵檢驗） | `py 1.devtools/tools/audit_suite.py`<br/>`py 1.devtools/tools/audit_suite.py --compact`<br/>`py 1.devtools/tools/audit_suite.py --strict` |
| **`audit_plugin_isolation.py`** | Chrome 多插件工作區物理隔離與黑盒契約防衛審計器（憲法級防護） | `py 1.devtools/tools/audit_plugin_isolation.py`<br/>`py 1.devtools/tools/audit_plugin_isolation.py --compact` |
| **`audit_manifests.py`** | Chrome 插件 Manifest V3 合規性與安全性自動審計器（支援 `--compact` 脫水模式） | `python 1.devtools/tools/audit_manifests.py`<br/>`py 1.devtools/tools/audit_manifests.py --compact` |
| **`validate_contract.py`** | 跨插件黑盒通訊契約（JSON Schema）驗證工具 | `python 1.devtools/tools/validate_contract.py` |
| **`task_cli.py`** | 任務生命週期管理輔助 CLI (建立、註解自動清理、自動 git-add 與雙層滾動歸檔) | `py 1.devtools/tools/task_cli.py init --plugin <名> --title <標題>`<br/>`py 1.devtools/tools/task_cli.py archive` |
| **`export_converter.py`** | 格式匯出與資料轉換工具 | `py 1.devtools/tools/export_converter.py` |
| **`doc_cross_ref.py`** | 文件交叉引用、死鏈審計、倒排索引自動修復與冗餘清理工具 | `py 1.devtools/tools/doc_cross_ref.py --audit`<br/>`py 1.devtools/tools/doc_cross_ref.py --fix --clean-redundant` |
| **`audit_token_usage.py`** | 全專案規則與技能檔 Token 預算監控與健康度審計（支援 `--compact`） | `py 1.devtools/tools/audit_token_usage.py`<br/>`py 1.devtools/tools/audit_token_usage.py --compact` |
| **`token_estimator.py`** | 輕量純 Python 字元啟發式 Token 估算器核心模組 | `py 1.devtools/tools/token_estimator.py <檔案路徑>` |
| **`audit_markdown_links.py`** | 全專案 Markdown 相對路徑、錨點與跨檔引用自動校驗與修復 | `py 1.devtools/tools/audit_markdown_links.py`<br/>`py 1.devtools/tools/audit_markdown_links.py --fix` |
| **`audit_ssot.mjs`** | SSOT 靜態合規與真理防腐審計器（索引存在性校驗/孤兒真理探測/命名防腐/90-10閉環） | `node 1.devtools/tools/audit_ssot.mjs`<br/>`npm run audit:ssot`<br/>`node 1.devtools/tools/audit_ssot.mjs --strict` |
| **`git_extract_section.py`** | 自 Git 歷史 Commit 秒級抽取 Markdown 標題或 HTML 區塊（免全量 checkout） | `py 1.devtools/tools/git_extract_section.py <commit> <檔案> -s "<標題>"` |

---

## 2. 任務流程調用索引 (Task Lifecycle Workflow Integration)

在遵循 3-Gate 開發協議時（停止使用 Gate 0，直接自 Gate 1 開始），各階段應強制調用對應之 Devtools 工具鏈：

### 階段一：Gate 1 勘查與藍圖 (Grounding & Blueprint)
- **拓撲與符號勘查**：使用 `repo_radar.py` 查詢目錄結構或全域符號（替代全檔遍歷）：
  ```bash
  py 1.devtools/tools/repo_radar.py map
  py 1.devtools/tools/repo_radar.py symbol <符號名稱>
  ```
- **介面骨架提煉**：檔案超過 100 行時，強制優先掏空實作提煉簽名（嚴禁全量讀取）：
  ```bash
  npm run skeleton -- <檔案路徑>
  # 或直接調用
  py 1.devtools/tools/code_skeleton.py <檔案路徑>
  ```
- **歷史版本章節秒級抽取**：探勘 Git 歷史 Commit 代碼或文檔時，使用 `git_extract_section.py` 抽取特定章節（免全量 checkout）：
  ```bash
  py 1.devtools/tools/git_extract_section.py <commit_hash> <檔案路徑> -s "<標題名>"
  ```
- **任務藍圖初始化**：透過 CLI 依 `0.doc_mg/task_template_v2.md` 初始化任務檔並納入版本防護：
  ```bash
  py 1.devtools/tools/task_cli.py init --plugin <插件名稱> --title <任務標題>
  ```

### 階段二：Gate 2 分段執行 (Atomic Execution - One Phase, One Session)
- **終端日誌脫水**：編譯、型別檢查或測試時，過濾 `node_modules` 冗長調用堆疊：
  ```bash
  npm run build 2>&1 | py 1.devtools/tools/compact_log.py
  ```
- **任務檔防護戒律**：局部替換 ≤ 10 行、禁止向 workspace 傳遞 `ArtifactMetadata`，更新任務檔為本輪最後動作。

### 階段三：Gate 3 知識收斂與自動化審計 (Knowledge Consolidation & Automated Audit)
- **Gate 3 一鍵全自動審計套件 (推薦首選)**：
  ```bash
  py 1.devtools/tools/audit_suite.py
  # 嚴格模式 (遇任何 WARN/CRITICAL 即 Exit 1)
  py 1.devtools/tools/audit_suite.py --strict
  ```
- **多插件實體隔離與邊界防衛審查 (憲法級)**：
  ```bash
  py 1.devtools/tools/audit_plugin_isolation.py --compact
  ```
- **Manifest V3 安全合規審查**：
  ```bash
  py 1.devtools/tools/audit_manifests.py --compact
  ```
- **文件交叉引用與路徑一致性驗證 (死鏈審計與倒排自動修復)**：
  ```bash
  py 1.devtools/tools/doc_cross_ref.py --audit
  # 自動修復死鏈並清理冗餘格式 (支援 --dry-run 預覽)
  py 1.devtools/tools/doc_cross_ref.py --fix --clean-redundant
  ```
- **SSOT 靜態合規與真理防腐審查 (Suite 6 內建)**：
  ```bash
  node 1.devtools/tools/audit_ssot.mjs --compact
  # 包含 Git 與任務 90/10 閉環審查
  node 1.devtools/tools/audit_ssot.mjs --task-check
  ```
- **Markdown 死鏈與錨點自動審計修復**：
  ```bash
  py 1.devtools/tools/audit_markdown_links.py --fix
  ```
- **規則與技能檔 Token 預算健康度審計**：
  ```bash
  py 1.devtools/tools/audit_token_usage.py --compact
  ```
- **跨插件通訊黑盒契約驗證**：
  ```bash
  py 1.devtools/tools/validate_contract.py
  ```
- **已完成任務自動歸檔**：
  ```bash
  py 1.devtools/tools/task_cli.py archive
  ```

---

## 3. 相關專家技能與業務指引

- **任務協議技能**：`.agents/skills/task-protocol/SKILL.md`
- **任務管理指引**：`0.doc_mg/docs/task_manager.md`
- **專案情報雷達技能**：`.agents/skills/repo-radar/SKILL.md`
- **檢索決策樹指引**：`0.doc_mg/docs/README_REPO_RADAR_PROMPTS.md`
- **Manifest 合規審計技能**：`.agents/skills/chrome-auditor/SKILL.md`
- **Token 節省工程技能**：`.agents/skills/token-saver/SKILL.md`
- **Token 節省工程指南**：`0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md`
