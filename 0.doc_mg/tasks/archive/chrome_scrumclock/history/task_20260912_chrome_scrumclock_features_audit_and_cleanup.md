---
title: "Chrome ScrumClock 全功能模組檔案歸檔與架構整理任務"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-09-12"
deadline: "2026-09-13"
---

## 1. 目標
對 `chrome_scrumclock` 插件現有之 8 大功能模組進行全盤架構審查與檔案歸納整理。全面推行「垂直切片架構 (Vertical Slice Architecture)」與「門面匯出模式 (Barrel Export Pattern)」，確保各功能之原始碼、服務邏輯、專屬型別、除錯工具與規格說明文件完全封裝於各自獨立的資料夾中，杜絕全域污染與檔案混雜。

## 2. 策略與鎖定檔案
1. **就地收斂原則 (Co-location)**：各功能的型別定義 (`types.ts`)、服務模組 (`services/` 或 `utils/`)、測試工具 (`dev-tools/` 或 `tests/`) 與文件 (`README.md` / `spec.md`) 均收整於各自的 feature 目錄內。
2. **門面匯出規範 (Barrel Pattern)**：每個 feature 資料夾必須具備嚴格的 `index.ts`，對外僅暴露必要的介面與元件，其餘實作細節保持內部私有。
3. **無損重構方針**：依據最高行為準則，嚴禁刪除任何程式碼或歷史資產；所有過渡檔案與除錯腳本皆採搬移至專屬目錄歸檔保存。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/features/ai-sidebar/`
- `chrome_scrumclock/src/features/analytics/`
- `chrome_scrumclock/src/features/bookmarks/`
- `chrome_scrumclock/src/features/experimental-srt/`
- `chrome_scrumclock/src/features/gemini-exporter/`
- `chrome_scrumclock/src/features/project-management/`
- `chrome_scrumclock/src/features/scrumclock/`
- `chrome_scrumclock/src/features/toolbox/`
- `chrome_scrumclock/src/geminiContent.ts`
- `chrome_scrumclock/docs/`
- `chrome_scrumclock/archive/`

## 3. 任務拆解

### Phase 1: 全功能目錄盤點與檔案混雜度掃描 狀態：`[已完成]`
> 盤點總結：
> 1. **全域與孤立檔案**：發現 `tests/prompt-eval.ts`（AI 提示詞評估腳本）、`src/geminiContent.ts`（Gemini 注入腳本）、`src/utils/ai-*` 與 `task-parser.ts` 未就地收斂至對應 Feature。
> 2. **模組健康度與型別**：8 大功能模組皆已具備 `index.ts` 門面；目前僅 `toolbox` 與 `experimental-srt` 具備專屬 `types.ts`，其餘模組依賴全域型別。
> 3. **巨石檔案 (>500行)**：已識別出 `ImageScraper.tsx` (1008行)、`ProjectManagementDemo.tsx` (778行)、`SprintPomodoro.tsx` (711行)、`DailyMissionBriefing.tsx` (649行)、`imageExtractor.ts` (640行)、`geminiContent.ts` (569行)、`InstallDocs.tsx` (558行) 等待後續重構維護。
> 4. **文件對應**：`docs/` 內多份 spec 文件已完成對應映射。專案 `npm run build` 與 `tsc` 驗證基準線健康。

### Phase 2: 各功能檔案收攏、歸檔與目錄結構標準化 狀態：`[已完成]`
> 執行成果：
> 1. **Gemini Exporter 收斂**：新增 `features/gemini-exporter/types.ts`，將 `exporter.ts` 與 `src/geminiContent.ts` 的重複型別定義收整，打通 Content Script 與模組型別共用。
> 2. **AI 功能專屬型別與 Dev-Tools 歸整**：建立 `features/ai-sidebar/types.ts` 與 `features/ai-sidebar/dev-tools/README.md`，建立與 `tests/prompt-eval.ts` 評估腳本之架構對應。
> 3. **全模組專屬型別補齊**：為 `project-management`、`bookmarks`、`analytics`、`scrumclock` 建立專屬 `types.ts`，並在各自 `index.ts` 導出。
> 4. **門面匯出規範 (Barrel Pattern) 修正**：
>    - `features/scrumclock/index.ts` 補齊 `QuickCapture` 匯出，修復 `src/App.tsx` 繞過門面的深層 import。
>    - `features/toolbox/index.ts` 補齊 `tools/image-scraper` 匯出，修復 `src/entries/sidebar/main.tsx` 之深層 import。
> 5. **型別與建置通過**：經 `tsc && vite build` 實測 263 個模組順利編譯通過，打包無缺損。

### Phase 3: 編譯驗證、靜態檢查與回歸測試 狀態：`[已完成]`
> 驗證總結：
> 1. **Manifest V3 合規審計**：執行 `py 0.doc_mg/tools/audit_manifests.py` 檢驗全合規，無嚴重安全阻斷問題。
> 2. **靜態型別校驗**：執行 `npx tsc --noEmit` 回傳 0，全專案無型別衝突。
> 3. **Vite 打包建置**：執行 `npm run build` 成功建置 263 個模組至 `dist/`，耗時 5.95s。
> 4. **架構維護指南**：產出 `chrome_scrumclock/docs/features-architecture-guide.md` 作為未來模組擴充標準。

## 4. 影響評估
- **通訊與路徑**: 模組路徑調整可能影響 `App.tsx`、`Sidebar.tsx` 或 entries 入口檔案之 import 路徑，需透過 `index.ts` 統一出口以最小化改動範圍。
- **建置產物**: 內部測試與除錯檔案收攏進 `dev-tools/` 後，確保 Vite 不會將未使用的腳本打包入生產目錄 `dist/`，可降低 Extension 打包體積。
- **向後相容**: 所有移動均需保證既有外部介面（如 context、hooks、components）名稱與簽名不變。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-09-12] ID: 5b9da6a8-aabb-4ced-9b77-670e90106553 (初始化)
> - [2026-09-12] ID: cbd19ff2-6b15-429c-931b-66809ba7ff83 (執行 Phase 1, Phase 2, Phase 3 驗收結案)
