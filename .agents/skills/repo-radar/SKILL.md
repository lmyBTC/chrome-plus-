---
name: 專案情報雷達 (Repo Radar & Symbol Locator)
description: 提供極低 Token 的專案拓撲地圖 (map)、文檔大綱 (outline)、章節切片 (section)、全域符號秒查 (symbol) 與熔斷搜尋 (search)。
triggers: [repo radar, 符號查詢, 檢索代碼, 查型別, 查介面, 查文檔, 文檔大綱, 章節切片, 專案地圖, symbol lookup, 專案雷達]
dependencies: []
ssot_dependencies: [0.doc_mg/docs/repo_radar_ai_prompt_instructions.md, 1.devtools/tools/repo_radar.py, 1.devtools/tools/generate_symbol_index.py]
---

# 專家技能：專案情報雷達與極致精準檢索 (Repo Radar Skill)

本技能定義在 Monorepo 架構下進行代碼探勘與文檔檢索之標準化工具鏈，以「**大綱先行、章節切片、符號定位、預算熔斷**」消滅 Token 浪費黑洞。

---

## 1. 核心指令矩陣 (CLI Matrix)

所有指令皆在專案根目錄執行，依賴 Python 3.8+（標準函式庫，零外部依賴）：

| 意圖 / 情境 | 執行指令 | 預期 Token 消耗 | 傳統方式對比 |
|:---|:---|:---:|:---:|
| **專案文件全貌地圖** | `python 1.devtools/tools/repo_radar.py map` | ~80 tokens | 需 dump 所有目錄與 README (~10k) |
| **長文檔標題大綱** | `python 1.devtools/tools/repo_radar.py outline <file>` | ~50 tokens | 需全讀 800+ 行 (~3k) |
| **精準提取特定條款** | `python 1.devtools/tools/repo_radar.py section <file> -H "<標題>"` | ~150 tokens | 需整份文檔塞入上下文 (~2.5k) |
| **型別/介面/類別定位** | `python 1.devtools/tools/repo_radar.py symbol <名稱>` | ~90 tokens (0ms 快取) | 需跨檔 Grep 逐一讀檔 (~2k) |
| **安全關鍵字搜尋** | `python 1.devtools/tools/repo_radar.py search "<字串>" -L 3` | ≤ 1500 字元熔斷 | 容易誤掃 dist/ 導致爆 token |
| **重建符號快取索引** | `python 1.devtools/tools/generate_symbol_index.py` | 終端本機輸出 | 自動更新 `.repo_index.json` |

---

## 2. 檢索規範與行為準則

1. **Gate 1 勘查約束**：
   - 在 Gate 1 窄化勘查階段，禁止全文 `view_file`，優先使用 `repo_radar.py outline` 與 `section` 鎖定架構合約。
   - 需要確認外部合約介面（如跨插件 Props、Action Types）時，一律使用 `symbol <Name>`。
2. **黑名單隔離**：
   - 工具已內建過濾 `node_modules`, `dist`, `build`, `.git`, `archive` 等非源碼目錄。
3. **黑盒邊界防禦**：
   - 透過 `symbol` 查得非目標插件之實作時，僅參考介面簽名（Interface Signature），嚴禁越界讀取該插件私有邏輯。

---

## 3. 關聯 SSOT 與技術指針

- **AI 導航指引與決策樹**：`0.doc_mg/docs/repo_radar_ai_prompt_instructions.md`
- **實體工具腳本**：`1.devtools/tools/repo_radar.py`
- **符號索引生成器**：`1.devtools/tools/generate_symbol_index.py`
- **全域規則對齊**：`.agents/rules.md`
