# 歷史任務與草稿檔案管理指南 (Task & Draft Manager Guide)

本文件說明如何使用收納工具整理 `doc/doc_task/`、`doc/doc_task/archive/` 以及 `doc/draft/archive/` 底下的歷史任務與關聯草稿檔案，以維持專案目錄的極致整潔與高追溯性。

---

## 1. 核心架構與工具簡介

- **工具路徑**：`scratch/manager/util_archive_manager.py` (遵守 `scratch/0mg.md` 規範，此工具具有 `util_` 前綴，會永久保留於 scratch 子目錄中)。
- **平行鏡像週目錄架構與雙層收納機制 (Parallel Weekly Mirror & Two-Tier Archive)**：
  - **熱資料層（近 2 週）**：保持第一層極致精簡，僅保留當週與前一週目錄：
    - 任務歸檔路徑：`doc/doc_task/archive/YYYY-MM-DD/` (以當週週一日期命名)
    - 草稿歸檔路徑：`doc/draft/archive/YYYY-MM-DD/` (與任務保持完全一致的週目錄)
  - **冷資料層（逾 2 週歷史下沉）**：
    - 歷史任務收納：`doc/doc_task/archive/historical/YYYY-MM-DD/`
    - 歷史草稿收納：`doc/draft/archive/historical/YYYY-MM-DD/`
    - 已用草稿收納：`doc/draft/used/historical/` (第一層僅保留近兩週活躍檔案)
  - **自動滑動維護 (Sliding Window)**：執行 `archive-tasks` 或 `archive-drafts` 時，自動將超過 14 天的週目錄與已用檔案下沉至 `historical/`，無須手動整理。
- **草稿生命週期命名與同名隔離先行原則 (Draft Lifecycle Naming SSOT)**：
  1. **中間預處理 Markdown**：命名格式統一為 `scratch/tmp/tmp_preprocessed_[slug].md`（優先）或 `doc/draft/preprocessed-[slug].md`，且**必須具備 YAML Frontmatter** 顯式宣告 `article_id: [slug]`，嚴禁使用 `clean_[topic].md`。
  2. **編譯草稿 HTML（同名隔離先行）**：編譯器輸出時直接對齊正式發布檔名（`doc/draft/YYYYMMDD-[slug].html` 或 `doc/draft/[slug].html`），徹底廢除冗餘 `draft-` 前綴。草稿在 `doc/draft/` 生成當下，Canonical URL 與 JSON-LD 即為標準正式 URL。生產發布時僅作目錄遷移，從根本杜絕手動更名導致的 Canonical 脫鉤。
- **主要功能**：
  1. **任務與關聯草稿雙向聯動歸檔**：掃描 `doc/doc_task/` 根目錄下非今日且已標記為 `status: "已完成"` 的任務檔，依據任務 Frontmatter 中宣告的 `related_drafts`（或依任務 Slug 匹配的草稿/中繼 HTML），自動同步將任務移至 `doc/doc_task/archive/YYYY-MM-DD/`，並將關聯草稿移至 `doc/draft/archive/YYYY-MM-DD/`。
  2. **草稿生命週期即時歸檔**：遵循「**草稿完成即歸檔，Task 保留今日**」原則，文章發布完成後，草稿立即收納歸檔至對應週目錄，確保 `doc/draft/` 根目錄永久保持極致純淨；當日任務則穩定保留於 `doc/doc_task/` 根目錄供審閱。
  3. **歷史草稿存量分類 (Draft Backfill)**：自動掃描 `doc/draft/archive/` 根目錄下既有的散落歷史草稿，解析其時間後自動歸類到對應的週目錄中。
- **保護與安全邊界 (Whitelist Protection)**：
  * **保護任務檔案**：嚴格保護 `task_template_v2.md`, `task_manager.md`, `Daily_task.md`, `task_SOP*.md` 及**今日新建之任務檔**。
  * **保護草稿檔案**：嚴格保護所有 `00` 開頭的模板檔（如 `00.pulse-text.md`, `00_pulse-sop.md`, `00search-draft-template.md`）以及寫作規範指南（如 `SEO_H1H2H3H4.md`, `review-writing.md`, `架構升級分析與重構指南.md`, `Mason_Writing_Style_Guide.md` 等），絕不誤移。
  * **未完成任務與草稿保護**：狀態為「開發中」、「進行中」、「規劃中」或「待辦」的未完成任務檔及其對應草稿，永久保留於工作區，除非傳入 `--force` 參數。

---

## 2. 日期辨識規則與優先級

為了精準抓取每份任務建立的時間，腳本會依序使用以下方式進行解析：

1. **檔名日期**：優先匹配檔名中的新規範 `task_MMDD_NN_*.md` 格式（月日 + 兩位數以上流水號，如 `task_1020_01_slug.md`），並完整向下相容歷史 `task_(YYYYMMDD)_*.md` 格式。
2. **內文日期**：若檔名無完整西元日期（例如僅具月日），則讀取檔案前 30 行，優先匹配 YAML Frontmatter 的 `created:\s*"?(YYYY-MM-DD)"?` 或 `建立日期:\s*(YYYY-MM-DD)` 標記以推導年份與真實日期。
3. **系統日期**：若皆無上述標記，則取用該檔案在作業系統中的建立/修改時間。
4. **Fallback 安全歸檔**：若上述方式皆無法解析，則將該檔案安全歸檔至 `archive/unknown/` 目錄，確保不會遺失任何檔案。

---

## 3. 指令使用說明

> [!TIP]
> **Windows 環境相容性規範**：在 Windows 環境下，直接執行 `python` 可能會觸發系統應用程式執行別名（Windows Store 0.0.0.0 樁）導致 Exit 1。專案全面規範一律使用 `py` 前綴調用 Python 直譯器（如 `py scratch/manage.py ...`、`py tools/...`）。

執行指令時，請確保您的終端機工作目錄位於專案的根目錄下。

### 3.1. 官方標準歸檔指令 (Recommended via manage.py)

專案已將歸檔能力深度整合至 `scratch/manage.py`：

```bash
# A. 針對特定任務進行專屬草稿歸檔 (草稿完成即歸檔)
py scratch/manage.py archive-drafts doc/doc_task/task_MMDD_NN_xxx.md

# B. 模擬預檢全站歷史草稿歸檔
py scratch/manage.py archive-drafts --dry-run

# C. 執行全站歷史草稿收納歸檔
py scratch/manage.py archive-drafts
```

### 3.2. 底層管理工具進階指令 (util_archive_manager.py)

若需精細控制歸檔維度或強制收納歷史任務，可直接調用底層腳本：

```bash
# 模擬執行預檢 (Dry Run)
py scratch/manager/util_archive_manager.py --dry-run

# 正式執行常規歸檔 (自動保護未完成任務與今日任務)
py scratch/manager/util_archive_manager.py

# 強制模式 (無視未完成狀態，將歷史任務全數歸檔)
py scratch/manager/util_archive_manager.py --force

# 僅歸檔任務檔案
py scratch/manager/util_archive_manager.py --tasks-only

# 僅歸檔草稿檔案
py scratch/manager/util_archive_manager.py --drafts-only
```

---

## 4. 特色與安全性設計

- **保留 Git 歷史 (Git History Preserved)**：腳本會優先調用 `git mv` 命令進行搬移。這能確保 Git commit 的歷史紀錄在搬移後依然得以完整保留。若該檔案尚未被 Git 追蹤或執行失敗，腳本會自動 fallback 採用 Python 原生的 `shutil.move`。
- **編碼安全性**：腳本在讀取檔案進行日期解析時，顯式指定以 `utf-8` 格式載入，徹底防範 Windows 環境下常見的 PowerShell 亂碼與編碼衝突地雷。

---

## 5. 專案系統檢查與優化工具 (System Check & Optimization CLI)

除了歷史任務歸檔工具外，專案在 `scratch/manage.py` 與 `tools/` 中提供了一系列強大的 CLI 指令，用於維護日常任務、審計 Token 消耗、以及檢查專案一致性（在 Windows 環境統一使用 `py` 前綴）：

### 5.1. 任務生命週期管理 (Task Lifecycle)
- **初始化新任務 (Clean Init)**：
  ```bash
  # 建立新任務檔（自動剔除模板註解並排版乾淨）
  py scratch/manage.py init-task --title "你的任務名稱" --chat-id "對話-ID"

  # 模擬初始化檢視輸出（不實際寫入檔案）
  py scratch/manage.py init-task --title "測試任務" --dry-run
  ```
  * 從 `doc/doc_task/task_template_v2.md` 自動建立任務檔案。
  * **Token 防護特性**：自動以正規表達式徹底剔除模板中的 `<!-- ... -->` 提示註解並修剪空行，防止後續讀寫產生 Context 污染與 Token 冗餘。

- **驗證物理任務文件 (Task Verification & Guard)**：
  ```bash
  # 自動偵測最新任務檔案進行常規 SOP 驗證（AI 簽到、結構完整性等）
  py scratch/manage.py check-task

  # 針對指定任務檔案進行驗證
  py scratch/manage.py check-task path/to/task.md

  # 封存就緒嚴格驗證模式（歸檔前必備檢查）
  py scratch/manage.py check-task --archive-ready path/to/task.md
  ```
  * `--archive-ready` 模式：嚴格檢查所有 Phase 是否均為 `[已完成]`、無任何未勾選之待辦項目 (`- [ ]`)、驗收標準全部收斂且 `status` 為「已完成」，杜絕半成品被意外封存。

- **突發問題分流與多會話隔離協議 (Incident Offloading SOP)**：
  * **核心原則**：當執行任務過程中發現非當前 Phase 原子目標的次生 Bug、全域依賴衝突或單次嘗試未果之深層問題時，**嚴禁在原對話展開跨模組深挖探索**，避免 Traceback 與大檔閱讀造成 Context 滾雪球膨脹。
  * **標準四步工作流**：
    1. **中斷探索 (Halt)**：立即停止任何探索性工具呼叫。
    2. **物理回寫 (Write-Back)**：若為本任務阻礙，於 `task_*.md` 當前 Phase 標註 `[BLOCKED: 錯誤簽名]`；若為獨立系統 Bug，執行 `py tools/log_issue.py --title "..." --severity HIGH`。
    3. **乾淨還原 (Rollback)**：使用 `git checkout` 撤銷探索性髒修改，確保工作區維持穩定。
    4. **停步並產出提示詞 (Handover)**：AI 強制結束當前輪次並交回控制權，輸出專用接力代碼塊，引導人類開立全新的 0 Token 乾淨 Session 獨立解決該問題。

- **階段性會話重置與接力協議 (One Session, One Phase Protocol)**：
  * **核心原則**：為防止長任務執行中 Context 累積導致注意力稀釋 (Lost in the middle) 與 Token 成本複利膨脹，專案嚴格落實「**One Phase, One Session**」物理隔絕。
  * **標準執行規範**：
    1. **單階段收斂**：單一會話僅專注於一個 Phase 的原子目標與驗收。
    2. **狀態回寫打勾**：Phase 驗收 (Exit 0) 通過後，統一於 Checkpoint 單次批次打勾，更新實體任務檔狀態為 `[已完成]`，並追加單行緊湊歷程；嚴禁在原子步驟間頻繁打勾橫跳。
    3. **強制停步交權**：完成 Checkpoint 後，AI 必須強制停止一切後續工具調用，嚴禁在同一會話自動滾動或推進下一階段。
    4. **輸出接力提示詞**：於回覆末尾強制輸出開立新 Session 的接力代碼塊（具自包含設計，包含上階產出、本階目標與檔案錨點），由人類開立全新會話接續下一 Phase。

- **語意單元探勘與局部替換最佳實踐 (Semantic Chunk Editing & Read SOP - v3.2)**：
  * **探勘硬窄化與語意單元細讀**：逾 150 行之長文檔或代碼強制以 `tools/code_skeleton.py` 或 `repo_radar.py outline` 提煉骨架；局部細讀以 80 ~ 150 行完整函式/組件為自然單元，消除切香腸式破碎盲讀。
  * **語意錨定局部替換**：檔案修改與實體任務檔更新嚴格限制使用原生局部替換工具 (`replace_file_content`)，單次替換範圍放寬為語意區塊 (≤ 50-80 行，以唯一上下文或完整函式邊界為錨點)，嚴禁 `write_to_file` 全量覆寫；對 workspace 檔案寫入嚴禁傳遞 `ArtifactMetadata`。
  * **強制收尾與清理前置**：暫存檔清理必須完全前置於任務檔更新；更新任務檔為本輪最後工具呼叫，完成後即刻停步交權。

### 5.2. 系統審計與自動修復 (System Audit & Repair)
- **全站 SSOT 與規範一致性審計 (SSOT Audit)**：
  ```bash
  py scratch/manage.py audit-ssot
  ```
  * 審查全站 SSOT 文件、專家技能與 CLI 一致性（註：歷史文檔中若曾誤記為 `audit_manifests.py`，請一律使用此實體命令）。
- **Markdown 鏈接與路徑審計 (Markdown Links Audit)**：
  ```bash
  py tools/audit_markdown_links.py
  ```
  * 掃描並修復全站 Markdown 鏡像路徑與相對鏈接（註：歷史文檔中若曾誤記為 `doc_cross_ref.py`，請一律使用此實體腳本）。
- **Token 限制審計**：
  ```bash
  py tools/audit_token_usage.py --log-issue
  ```
  * 審查規則文件與技能文檔的 Token 消耗，若超過預算會自動透過 `log_issue.py` 登錄。
- **三方註冊一致性審計**：
  ```bash
  py scratch/manage.py audit-registry --repair
  ```
  * 校對 news HTML、`assets/js/core-articles-data.js` 與 `sitemap.xml` 之間的一致性並自動修復。
- **深度 SEO 與元數據驗證**：
  ```bash
  py scratch/manage.py seo-validate --repair
  ```
  * 進行 JSON-LD 結構、頁面 meta 描述與 sitemap 修改時間戳記的一致性檢查與修復。
- **壞軌連結與孤立資源檢查**：
  * HTML 壞軌連結檢測：`py scratch/manage.py check-links`
  * 孤立圖片資源檢測：`py scratch/manage.py audit-assets --dry-run`
- **文章排版衛生與雙版 TOC 審計工具**：
  ```bash
  py tools/article_hygiene.py <html_path> --audit-shell
  py tools/article_hygiene.py <html_path> --all
  ```
  * 一鍵自動清洗 CJK 換行空格與重複單位、修復 H2 單行壓縮、自動校正閱讀時間與字數，並自動提取 H2/H3 生成 Desktop + Mobile 雙版本 TOC，防止手動維護錨點漂移。
- **文章與專案全站 SSOT 一鍵原子同步工具**：
  ```bash
  py tools/sync_article_ssot.py --file <html_path>
  py tools/sync_article_ssot.py --compact
  ```
  * 單檔自動解析 `<head>` 元數據並一鍵同步雙路徑 `core-articles-data.js`、`search-index.json`、`sitemap.xml` 與 `sw.js`，保證 0 資料漂移。
- **環境清理**：
  ```bash
  py scratch/manage.py clean-scratch
  ```
  * 自動清理 `scratch/` 目錄下的暫存檔案 (`tmp_*` 與 `data_*`)，保持工作區乾淨。

### 5.3. 核心 Token 脫水與情報雷達工具鏈 (Core Token Optimizers)

為貫徹「Gate 1 探勘硬窄化、Gate 2 脫水防衛、Gate 3 快取閉環」，專案於 `tools/` 提供四大常備 Token 守護工具：

1. **專案情報雷達 (`tools/repo_radar.py`)**：
   - **大綱樹提取 (`outline`)**：`py tools/repo_radar.py outline <path>`（以 ~50 tokens 掌握長文檔或代碼結構，杜絕全檔 view）。
   - **精準章節抽吸 (`section`)**：`py tools/repo_radar.py section <path> --heading "<標題>"`（受 150 行超長防禦保護，單次僅消耗 ~150 tokens）。
   - **符號秒級定位 (`symbol`)**：`py tools/repo_radar.py symbol <name>`（免全域 grep，秒查類別、Web Components、函式宣告）。
   - **全站壓縮地圖 (`map`)**：`py tools/repo_radar.py map`（以 ~80 tokens 輸出全站 SSOT 與核心文檔地圖）。

2. **代碼骨架提煉器 (`tools/code_skeleton.py`)**：
   - **用法**：`py tools/code_skeleton.py <file>`
   - **用途**：掏空函式實作與龐大資料陣列，保留介面合約、型別簽名與 JSDoc。查閱大型 JS 資料庫（如 `db-posts.js`）或複雜前端組件時必備，節省 60%~80% Context。

3. **終端日誌智慧脫水器 (`tools/compact_log.py`)**：
   - **用法**：`command 2>&1 | py tools/compact_log.py`
   - **用途**：過濾編譯、測試與 Python 審計腳本的長篇 Traceback、重複警告與進度條，僅保留關鍵報錯行與 Exit 狀態，杜絕終端雜訊污染對話。

4. **全域符號與情報索引生成器 (`tools/generate_symbol_index.py`)**：
   - **用法**：`py tools/generate_symbol_index.py`
   - **用途**：掃描專案並生成輕量快取 `.repo_index.json` (< 70KB)。當任務涉及新增組件、類別宣告或發布正式文章時，結案前強制調用以維持情報雷達秒查效能。

5. **增量一致性差異比對器 (`tools/diff_inspector.py`)**：
   - **用法**：`py tools/diff_inspector.py --post <html_path>`
   - **用途**：自動比對正式文章 HTML 元數據（Title, Description, Tags, Category, Date）與 `core-articles-data.js` 及 `sitemap.xml`，輸出緊湊差異報告，確保 0 drift。

6. **一鍵微流水線整合 (`manage.py pipe-build` & `pipe-publish`)**：
   - **用法**：`py scratch/manage.py pipe-build <draft.md>` 與 `py scratch/manage.py pipe-publish <draft.html>`
   - **用途**：雙巨石微流水線，自動整合消毒、編譯、AEO 鷹架生成、AEO 宣告式注入、靜態合規驗收、原子發布、全站三向同步與情報索引閉環，大幅壓縮發布對話回合與 Token 損耗。
