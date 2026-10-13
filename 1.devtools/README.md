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
| **`audit_manifests.py`** | Chrome 插件 Manifest V3 合規性與安全性自動審計器 | `python 1.devtools/tools/audit_manifests.py` |
| **`validate_contract.py`** | 跨插件黑盒通訊契約（JSON Schema）驗證工具 | `python 1.devtools/tools/validate_contract.py` |
| **`task_cli.py`** | 任務生命週期管理輔助 CLI (建立與歸檔) | `py 1.devtools/tools/task_cli.py init --plugin <名> --title <標題>`<br/>`py 1.devtools/tools/task_cli.py archive` |
| **`export_converter.py`** | 格式匯出與資料轉換工具 | `py 1.devtools/tools/export_converter.py` |
| **`doc_cross_ref.py`** | 文件交叉引用與連結完整性檢查工具 | `py 1.devtools/tools/doc_cross_ref.py --dir <目錄> --dry-run`<br/>`py 1.devtools/tools/doc_cross_ref.py --dir <目錄> --apply` |

---

## 2. 任務流程調用索引 (Task Lifecycle Workflow Integration)

在遵循 4-Gate 開發協議時，各階段應強制調用對應之 Devtools 工具鏈：

### 階段零：Gate 0 意圖對齊與邊界錨定 (Zero-Tool, Zero-Scan)
- **零工具原則**：新需求提出時**嚴禁呼叫任何工具或掃描檔案**。僅以 100~200 字輸出對齊方向與技術權衡，停步交出控制權等待授權。

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
- **Manifest V3 安全合規審查**：
  ```bash
  py 1.devtools/tools/audit_manifests.py
  ```
- **文件交叉引用與路徑一致性驗證**：
  ```bash
  py 1.devtools/tools/doc_cross_ref.py --dir 0.doc_mg --dry-run
  # 確認無誤後寫入
  py 1.devtools/tools/doc_cross_ref.py --dir 0.doc_mg --apply
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
- **檢索決策樹指引**：`0.doc_mg/docs/repo_radar_ai_prompt_instructions.md`
- **Manifest 合規審計技能**：`.agents/skills/chrome-auditor/SKILL.md`
- **Token 節省工程技能**：`.agents/skills/token-saver/SKILL.md`
- **Token 節省工程指南**：`0.doc_mg/docs/token_optimization_guide.md`
