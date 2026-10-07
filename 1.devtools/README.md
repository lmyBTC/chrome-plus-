# 🛠️ 專案開發者工具鏈 (1.devtools)

> [!IMPORTANT]
> **工具導航索引**：本目錄存放 Chrome Plus 專案之自動化審計、合約驗證、Token 節省檢索與維護工具鏈。所有腳本均使用 Python 標準函式庫，零外部環境依賴。

---

## 1. 工具導航清單 (Tools Directory)

所有工具位於 `1.devtools/tools/`：

| 工具腳本 | 主要職責 | 常用指令範例 |
|:---|:---|:---|
| **`repo_radar.py`** | 極低 Token 專案情報檢索（大綱、章節切片、符號秒查、安全搜尋） | `python 1.devtools/tools/repo_radar.py map`<br/>`python 1.devtools/tools/repo_radar.py symbol <Name>` |
| **`generate_symbol_index.py`** | 專案全域符號與文檔導航快取生成器（產出 `.repo_index.json`） | `python 1.devtools/tools/generate_symbol_index.py` |
| **`audit_manifests.py`** | Chrome 插件 Manifest V3 合規性與安全性自動審計器 | `python 1.devtools/tools/audit_manifests.py` |
| **`validate_contract.py`** | 跨插件黑盒通訊契約（JSON Schema）驗證工具 | `python 1.devtools/tools/validate_contract.py` |
| **`task_cli.py`** | 任務生命週期管理輔助 CLI | `python 1.devtools/tools/task_cli.py` |
| **`export_converter.py`** | 格式匯出與資料轉換工具 | `python 1.devtools/tools/export_converter.py` |
| **`doc_cross_ref.py`** | 文件交叉引用與連結完整性檢查工具 | `python 1.devtools/tools/doc_cross_ref.py` |

---

## 2. 相關專家技能與業務指引

- **專案情報雷達技能**：`.agents/skills/repo-radar/SKILL.md`
- **檢索決策樹指引**：`0.doc_mg/docs/repo_radar_ai_prompt_instructions.md`
- **Manifest 合規審計技能**：`.agents/skills/chrome-auditor/SKILL.md`
- **Token 節省工程**：`.agents/skills/token-saver/SKILL.md`
