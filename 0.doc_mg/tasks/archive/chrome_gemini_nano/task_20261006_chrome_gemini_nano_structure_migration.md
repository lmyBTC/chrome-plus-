---
title: "[架構規劃] Chrome Plus x Gemini Nano 獨立插件目錄架構重構與歸檔"
plugin: "chrome_gemini_nano"
status: "已完成"
created: "2026-10-06"
deadline: "2026-10-07"
---

## 1. 目標
將暫存在 `0.doc_mg/tasks/Chrome Plus x Gemini Nano/` 的程式碼與工具腳本依職責徹底拆分，重構為獨立插件目錄 `chrome_gemini_nano/`，落實 SSOT 規範與多插件邊界隔離。

## 2. 策略與鎖定檔案
採「獨立全新插件結構」，將 TS/TSX 前端與核心模組放入 `src/`，Python 批次腳本放入 `tools/`，架構規劃文檔沉澱為插件 README 與 L1 專家技能。

### 鎖定檔案 (Target Files)
- `./chrome_gemini_nano/src/components/SocialDispatcher.tsx`
- `./chrome_gemini_nano/src/services/nanoService.ts`
- `./chrome_gemini_nano/src/services/nanoIntentRouter.ts`
- `./chrome_gemini_nano/src/services/pulseExtractor.ts`
- `./chrome_gemini_nano/src/services/toneShifter.ts`
- `./chrome_gemini_nano/src/types.ts`
- `./chrome_gemini_nano/src/index.ts`
- `./chrome_gemini_nano/manifest.json`
- `./chrome_gemini_nano/package.json`
- `./chrome_gemini_nano/tsconfig.json`
- `./chrome_gemini_nano/sidepanel.html`
- `./chrome_gemini_nano/src/sidepanel.tsx`
- `./chrome_gemini_nano/vite.config.ts`
- `./chrome_gemini_nano/tools/main_dispatcher.py`
- `./chrome_gemini_nano/tools/social_publisher.py`
- `./chrome_gemini_nano/tools/rss_generator.py`
- `./chrome_gemini_nano/tools/markdown_archiver.py`
- `./chrome_gemini_nano/tools/local_dedup.py`
- `./chrome_gemini_nano/chrome_gemini_nano_README.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/gemini-nano-core/SKILL.md` (新增插件核心定位、元件字典與骨架導航)
- [x] L2 插件導航：`./chrome_gemini_nano/chrome_gemini_nano_README.md` (模組速查矩陣、入口索引)
- [x] L3 業務規格：`./chrome_gemini_nano/docs/gemini_nano_spec.md` (Prompt API 與本機自動化規格)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/gemini-nano/task_20261006_chrome_gemini_nano_structure_migration.md` (結案移動封存歸檔完成)

## 3. 任務拆解

### Phase 1: 建立獨立目錄結構與模組分流遷移 狀態：`[已完成]`

### Phase 2: SSOT 骨架建立與規格文件歸檔 狀態：`[已完成]`

### Phase 3: Manifest V3 基礎配置與閉環驗收 狀態：`[已完成]`

## 4. 影響評估
- 不更動現有 `chrome_scrumclock`、`finance-research-clipper-oss` 等既有插件之核心程式碼。
- 遵循多插件隔離原則，建立全新命名空間。

## 5. 驗收標準
- [x] **技術指標**: 所有前端模組與工具腳本結構清晰，無遺漏檔案。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 與多插件邊界隔離規範。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/gemini-nano/`。
- [x] **路徑標準**: 專案文件內部維持純字串相對路徑，無硬編碼絕對路徑。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-10-06] ID: 59efde13-95ee-4a6a-a50c-626084c2742d (初始化)
> - [2026-10-06] ID: b5233b10-06f2-486a-82f8-2ed5cfdebd59 (Phase 1 完成)
> - [2026-10-06] ID: ec0a7779-eb87-44ef-8f6d-aa0ae94a7617 (Phase 2 完成)
> - [2026-10-06] ID: 35ff363d-d833-4dfe-ba42-f70919b25ce9 (Phase 3 完成，結案封存)
