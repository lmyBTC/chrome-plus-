---
title: "優化全專案 README 文檔去除多餘路徑字符以大幅降低 Token 閱讀消耗"
plugin: "global"
status: "已完成"
created: "2026-09-26"
deadline: "2026-09-26"
---

## 1. 目標
全面清理專案內部各插件與根目錄之 README 文檔，嚴格落實 GEMINI.md 之「路徑跳轉雙軌制」：
1. 去除內部冗餘的 Markdown 連結格式（例如 `[`features/index.ts`](src/features/index.ts)`、`[`types.ts`](src/types.ts)`、`[README.md](README.md)` 等重複書寫兩次路徑或包裹中括號與圓括號的字符）。
2. 將所有檔案與目錄參照全面精簡為純字串相對路徑（例如用反引號包覆的純相對路徑 `` `src/features/index.ts` `` 或純文字），杜絕 Context 噪音與無效路徑符號。
3. 顯著降低 AI 閱讀文檔時的 Token 消耗（預計減少 15%~30% Markdown 語法開銷），提升導航檢索與代碼定位效率。

## 2. 策略與鎖定檔案

### 核心原則
- **專案內部（極致精簡）**：專案檔案內部一律採用純字串相對路徑，不再使用 Markdown `[name](path)` 雙重冗餘形式。
- **保留可讀性**：關鍵代碼檔案路徑以反引號標記（如 `` `manifest.json` ``、`` `src/background.ts` ``），保持表格整齊與清晰度。

### 鎖定檔案 (Target Files)
- `./README.md`
- `./chrome_scrumclock/SCRUMCLOCK_README.md`
- `./chrome_scrumclock/README.md`
- `./chrome_video speed plus/VIDEOSPEED_README.md`
- `./chrome_video speed plus/README.md`
- `./finance-research-clipper-oss/FINANCE_CLIPPER_README.md`
- `./finance-research-clipper-oss/README.md`
- `./browser-activity-monitor/README.md`
- `./chrome_scrumclock/docs/README.md`
- `./chrome_scrumclock/src/features/ai-sidebar/dev-tools/README.md`
- `./chrome_scrumclock/src/features/toolbox/tools/image-scraper/dev-tools/README.md`

## 3. 任務拆解

### Phase 1: 優化根目錄與三大核心插件前綴 README 狀態：`[已完成]`
- [x] 任務 1.1: 優化 `./README.md`
    - [x] 將導航表格與說明中的 Markdown 超連結改為純字串相對路徑與純文本標籤。
- [x] 任務 1.2: 優化 `./chrome_scrumclock/SCRUMCLOCK_README.md`
    - [x] 清理 8 大模組速查矩陣表格中所有冗餘的 `[`path`](path)` 連結，收斂為純字串相對路徑。
    - [x] 清理 Chrome Extension 核心生命週期與入口索引中所有冗餘的 Markdown 連結。
- [x] 任務 1.3: 優化 `./chrome_video speed plus/VIDEOSPEED_README.md`
    - [x] 清理架構表格與跨插件協定引用中的 Markdown 連結語法。
- [x] 任務 1.4: 優化 `./finance-research-clipper-oss/FINANCE_CLIPPER_README.md`
    - [x] 清理架構表格與雙載體視圖引用中的 Markdown 連結語法。

### Phase 2: 優化活動監控與子目錄存根 README 狀態：`[已完成]`
- [x] 任務 2.1: 優化 `./browser-activity-monitor/README.md`
    - [x] 清理架構表格與檔案路徑中的 Markdown 連結語法。
- [x] 任務 2.2: 優化各子插件存根導航文檔
    - [x] `./chrome_scrumclock/README.md`
    - [x] `./chrome_video speed plus/README.md`
    - [x] `./finance-research-clipper-oss/README.md`
- [x] 任務 2.3: 優化輔助工具與 docs 子目錄 README
    - [x] `./chrome_scrumclock/docs/README.md`
    - [x] `./chrome_scrumclock/src/features/ai-sidebar/dev-tools/README.md`
    - [x] `./chrome_scrumclock/src/features/toolbox/tools/image-scraper/dev-tools/README.md`

### Phase 3: 全案校驗與 Token 規範驗收 狀態：`[已完成]`
- [x] 任務 3.1: 檢查所有已修改 README，確認無殘留本機路徑、無破失 Markdown 語法。
- [x] 任務 3.2: 檢查所有文件 UTF-8 (無 BOM) 編碼與排版完整性。
- [x] 任務 3.3: 完成狀態收斂與任務檔閉環。

## 4. 影響評估
- 僅修改文檔說明中的文字與 Markdown 標記，完全不更動任何程式碼邏輯與執行檔。
- 對外/對內完全相容，大幅提升未來的 Token 利用效率與上下文精準度。

## 5. 驗收標準
- [x] **技術指標**: 所有目標 README 檔案排版正常，表格 Markdown 語法無破損。
- [x] **路徑規範**: 專案文檔內部 100% 貫徹純字串相對路徑，無 `[`path`](path)` 冗餘重複語法，嚴禁任何本機絕對路徑。
- [x] **檔案編碼**: 確認所有修改的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **Token 效益**: 顯著減少 Markdown 括號與重複路徑 Token。
- [x] **SSOT 閉環**: 符合全域雙軌制與 Task Protocol 規範。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: dd9fc502-3748-477d-9bcf-c7d1c53059b2 (初始化)
> - 2026-09-26 ID: a686d429-3d78-4187-a861-7ec6783788d9 (Phase 1 執行)
> - 2026-09-26 ID: b645db7c-ec81-4903-975f-350f39ea9614 (Phase 3 驗收結案)
>
> **跨會話接力指令 (Session Handover)**:
> 本任務已全數驗收完成結案，無需接力。
