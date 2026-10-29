# Task & Token Protocol 安裝與調優經驗探勘快取 (Probe Cache)

## 1. 探勘背景
彙整以下三份歸檔任務中的真實踩坑與實踐數據：
- `0.doc_mg/tasks/archive/task_1028_06_global_install_task_protocol_pack.md` (初次實體安裝與專案適配)
- `0.doc_mg/tasks/archive/task_1029_01_global_test_task_protocol_and_toolchain_efficiency.md` (路徑缺陷修復與效能實測)
- `0.doc_mg/tasks/archive/task_1029_02_global_optimize_toolchain_and_handover_flow.md` (共用微庫抽出、自動接力流與焦點骨架)

## 2. 核心技術點與踩坑教訓 (Key Lessons Learned)

### 2.1 根路徑解析缺陷與共用微庫架構 (lib/common.py)
- **問題**：原生工具使用 `SCRIPT_DIR.parent`，工具若部署在 `1.devtools/tools/` 下只退一層會指向 `1.devtools`，導致相對路徑與暫存檔寫入錯誤。
- **解法**：建立 `1.devtools/tools/lib/common.py`，實作 `get_repo_root()`，透過尋找 `.git` 或 `0.doc_mg` 自動回溯專案根目錄。

### 2.2 宿主專案適配與殘留路徑清理
- **問題**：套件內部原本殘留外部路徑（例如 `doc/doc_task`、`scratch/manage.py`）。
- **解法**：安裝後執行專案適配，更新 `task_template_v2.md` 與 `.agents/skills/`，對齊專案目錄規範與 SSOT 鏈條。

### 2.3 Windows 控制台編碼與環境相容
- **問題**：Windows 終端輸出 UTF-8 字符（Emoji / 特殊符號）報錯 `UnicodeEncodeError` (cp950)；`analyze_task_tokens.py` 解析使用者 Antigravity transcript 時受目錄路徑差異影響。
- **解法**：在 `lib/common.py` 中實作 `setup_utf8_output()`；增強 `analyze_task_tokens.py` 對 `~/.gemini/antigravity` 與位置參數的相容支援。

### 2.4 實證效能數據
- **日誌脫水率**：`compact_log.py` 達到 90.4% 的 Token 節省，有效過濾長堆疊與 node_modules 雜訊。
- **會話隔離成效**：連續會話峰值達 109k，切換新會話 (One Phase, One Session) 降至 38.7k，有效杜絕幻覺與過載。
- **情報雷達速度**：`repo_radar.py` 四大模式 (map, outline, section, symbol) 毫秒級返回，節省 90% 探索 Token。

### 2.5 工具鏈最新演進
- `task_cli.py init`: 建檔即自動 `git add` 防護。
- `task_cli.py handover`: 自動分析任務進度並生成精準接力 Prompt 代碼塊。
- `code_skeleton.py --expand <symbol>`: 焦點骨架提煉，兼顧整體結構與核心函式實作。
- `task_cli.py archive`: 雙層任務生命週期歸檔，保持 tasks 目錄純淨零結案。

## 3. 落地手冊規劃
- **目標手冊**：`task_protocol_pack/INSTALLATION_GUIDE.md` (獨立詳細手冊)
- **同步更新**：`task_protocol_pack/README.md` (補齊最新目錄結構、手冊入口、更新紀錄)

