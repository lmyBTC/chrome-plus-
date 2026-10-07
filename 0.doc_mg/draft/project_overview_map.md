# 超級索引大地圖 – Chrome Plus Project

## 1️⃣ 專案總覽
此 repo 為多功能 Chrome 擴充套件集合，包含以下子插件與開發工具鏈，可在 **AI 協作** 場景中極低 Token 消耗下完成檢索、代碼生成與日誌分析。

- **核心插件目錄**：`browser-activity-monitor`、`chrome_gemini_nano`、`chrome_scrumclock`、`chrome_video speed plus`、`finance-research-clipper-oss`
- **開發與文件**：`0.doc_mg/`（文件、任務、原型） 、`1.devtools/`（工具腳本）
- **配置/依賴**：`package.json`、`.repo_index.json`
- **說明與 README**：`README.md`、`使用說明.md`
- **AI 規範與治理**：`GEMINI.md`（最高規範）、`.agents/`（規則、技能）

---

## 2️⃣ 目錄結構概覽
```
chrome plus project/
├─ .agents/                     # Agent 規則、技能、插件
├─ .git/                        # Git 版本控制
├─ .gitignore
├─ .pytest_cache/
├─ .repo_index.json            # Repo‑Radar 索引檔
├─ 0.doc_mg/                    # 文件、任務、草稿
│   ├─ draft/
│   │   └─ AI 輔助開發極致 Token 節約工程指南與機制規範.md
│   └─ tasks/
│       ├─ task_20261007_global_token_saver_tools_integration.md
│       └─ task_20261007_global_repo_radar.md
├─ 1.devtools/                  # 開發工具腳本
│   └─ tools/
│       ├─ code_skeleton.py
│       ├─ compact_log.py
│       ├─ generate_symbol_index.py
│       └─ repo_radar.py
├─ GEMINI.md                  # **SSOT 憲法級指令**（全部規範）
├─ README.md                  # 專案概述
├─ browser-activity-monitor/   # 活動監控插件
├─ chrome_gemini_nano/         # Gemini Nano 插件
├─ chrome_scrumclock/          # Scrum Clock 插件
├─ "chrome_video speed plus"/  # 影片倍速插件
├─ finance-research-clipper-oss/ # 金融資訊擷取插件
├─ package.json               # npm 依賴與腳本
├─ scratch/                    # 暫存腳本、測試檔案
├─ 使用說明.md                # 使用者說明文件
└─ "chrome plus project.code-workspace"  # VS Code 工作區設定
```
> **點擊即開**：上表中每個檔案/目錄均可點擊（例如 `[GEMINI.md](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/GEMINI.md)`）

---

## 3️⃣ 主要組件說明
| 組件 | 路徑 | 功能說明 |
|------|------|----------|
| **Browser Activity Monitor** | `browser-activity-monitor/` | 監控 Chrome 分頁/瀏覽行為，提供雙軌隨選健檢與 SSOT 導航。 |
| **Gemini Nano** | `chrome_gemini_nano/` | 本機 Prompt API、邊緣推論與工具代理框架。 |
| **Scrum Clock** | `chrome_scrumclock/` | Scrum 時間管理與倒數計時 UI。 |
| **Video Speed Plus** | `chrome_video speed plus/` | 影片倍速播放與 Shadow‑DOM 樣式隔離。 |
| **Finance‑Clipper** | `finance-research-clipper-oss/` | 財報資料抓取與解析、跨插件黑盒契約。 |

---

## 4️⃣ 超低 Token 開發工具鏈
| 工具腳本 | 路徑 | 核心概念 |
|----------|------|----------|
| **repo_radar.py** | `1.devtools/tools/repo_radar.py` | 產生 **專案拓撲圖**（章節切片、符號索引），支援 `0.doc_mg` 與 `.agents` 的快速定位。 |
| **generate_symbol_index.py** | `1.devtools/tools/generate_symbol_index.py` | 建立全域符號快取（函式、類別、常數），供 AI 直接查詢，減少遍歷檔案的 Token。 |
| **code_skeleton.py** | `1.devtools/tools/code_skeleton.py` | 從現有程式碼抽取 **骨架**（介面、類別結構），快速生成新檔案模板。 |
| **compact_log.py** | `1.devtools/tools/compact_log.py` | 終端日誌 **脫水**（壓縮、關鍵訊息抽取），讓長時間執行任務的 Log 只保留重要資訊。 |

> 這四把利器在 **AI‑Agent** 與 **人類開發者** 之間形成 **Token‑橋樑**：
> - `repo_radar` → 一次性提供完整目錄與章節索引，避免多次遍歷。
> - `generate_symbol_index` → 即時符號查詢，省去「搜尋檔案」的 Token。
> - `code_skeleton` → 快速生成骨架，減少重複編寫樣板代碼。
> - `compact_log` → 只把關鍵訊息回報給 Agent，降低長流程 Log 的 Token 消耗。

---

## 5️⃣ 快速上手指引
1. **瀏覽索引**：點擊上方目錄樹或使用 `repo_radar.py` 產生的圖形化視圖（可在 `scratch/` 中找到最新生成的 `repo_map.png`）。
2. **查找符號**：執行 `python 1.devtools/tools/generate_symbol_index.py`，產生 `symbol_index.json`，在對話框中使用 `search_symbol <symbol>` 取得定位。
3. **生成新檔案**：使用 `code_skeleton.py` 提供類別/介面名稱，即可得到雛形檔案。
4. **檢視精簡日誌**：執行 `compact_log.py <log_file>`，得到 `log_summary.txt`，直接貼給 Agent 進行分析。

---

## 6️⃣ 相關資源與連結
- **GEMINI 規範**：`[GEMINI.md](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/GEMINI.md)`
- **任務文件**：`[task_20261007_global_repo_radar.md](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/tasks/task_20261007_global_repo_radar.md)`
- **開發工具**：
  - `[repo_radar.py](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/1.devtools/tools/repo_radar.py)`
  - `[generate_symbol_index.py](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/1.devtools/tools/generate_symbol_index.py)`
  - `[code_skeleton.py](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/1.devtools/tools/code_skeleton.py)`
  - `[compact_log.py](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/1.devtools/tools/compact_log.py)`

---

> **結語**：此「超級索引大地圖」結合目錄樹、組件說明與低 Token 開發工具鏈，一目了然地呈現專案全貌，讓任何首次接觸的 AI 能在 **< 5 seconds** 內掌握核心結構與開發流程。
