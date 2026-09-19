---
title: "適配多插件開發區之管理文件與技能規則修改"
status: "已完成"
created: "2026-06-24"
deadline: "2026-06-24"
---

## 1. 目標
將自其他專案複製的 `.agents` 與 `0.doc_mg` 範本，調整為適合「多插件開發區」的管理文件與技能樹規則，確保 AI Agent 運作時能精準符合 Chrome 插件（包含編譯型如 Vite+TS，與原生型零建置）的開發規範，並正確地在 `0.doc_mg/tasks/` 下管理任務。

## 2. 策略與鎖定檔案
- 將部落格相關之寫作、SEO 自動化發布技能與規則移除。
- 新增 `0.doc_mg/dev_standards.md` 作為 Chrome 插件開發的 SSOT 技術規範。
- 將原專案的 `doc/doc_task` 任務路徑對齊至 `0.doc_mg/tasks/`。
- 修改 `.agents/rules.md` 與其下三個核心技能的定義，對齊多插件開發的脈絡。

### 鎖定檔案 (Target Files)
- `./.agents/rules.md`
- `./.agents/skills/dev-standards/SKILL.md`
- `./.agents/skills/task-protocol/SKILL.md`
- `./.agents/skills/token-saver/SKILL.md`
- `./0.doc_mg/task_manager.md`
- `./0.doc_mg/task_template_v2.md`
- `./0.doc_mg/dev_standards.md`

## 3. 任務拆解

### Phase 1: 核心技術規範與 SSOT 建立 狀態：`[已完成]`
- [x] 任務 1.1: 建立 `0.doc_mg/dev_standards.md` 作為 Chrome 插件開發規範的 SSOT。
- [x] 任務 1.2: 修改 `.agents/skills/dev-standards/SKILL.md`，使其指向新的 SSOT 檔案並專注於 Chrome 插件開發（包括 MV3, Shadow DOM 樣式隔離, Vite 與原生開發等）。

### Phase 2: 任務協議與管理文件調整 狀態：`[已完成]`
- [x] 任務 2.1: 修改 `0.doc_mg/task_template_v2.md`，新增 `plugin` 屬性，更新鎖定檔案路徑範本，並調整驗收標準以適配 Chrome 插件。
- [x] 任務 2.2: 修改 `0.doc_mg/task_manager.md`，更新任務歸檔與管理路徑至 `0.doc_mg/tasks/`，移除不相干的部落格腳本說明，調整為適合本專案的流程。
- [x] 任務 2.3: 修改 `.agents/skills/task-protocol/SKILL.md`，對齊新路徑 `0.doc_mg/tasks/` 與多插件命名的任務協議。

### Phase 3: 核心規則與 Token 優化調整 狀態：`[已完成]`
- [x] 任務 3.1: 修改 `.agents/skills/token-saver/SKILL.md`，移除不相干語系與 CLI，更新為適合 Web/插件開發的指令範例。
- [x] 任務 3.2: 修改 `.agents/rules.md`，清理非本專案的技能樹（只保留 dev-standards, task-protocol, token-saver），更新技術文件與 SOP 的鏈結路徑。

### Phase 4: 驗收與清理 狀態：`[已完成]`
- [x] 任務 4.1: 執行靜態檢查，確認所有相對路徑正確性與點擊可用性。
- [x] 任務 4.2: 清理所有產生的測試用檔案，完成簽到。

## 4. 影響評估
- 本修改為管理與規則層面調整，不影響現有插件（`chrome_scrumclock`, `chrome_video speed plus`, `finance-research-clipper-oss`）的實際運行代碼。
- 修改後，後續對話中 AI Agent 的開發行為將被導引至專注於 Chrome 插件架構（MV3 與 Shadow DOM），大幅提升開發品質。

## 5. 驗收標準
- [x] **任務格式**: 完全採用 `task_template_v2.md` 格式。
- [x] **技術指標**: 所有技能與管理文件中的部落格字樣被完全清理或改寫。
- [x] **核心規範**: 所有涉及任務路徑的規則均指向 `0.doc_mg/tasks/`。
- [x] **發布清理**: 移除所有範本中的 `<!-- AI: ... -->` 註解提示。
- [x] **檔案編碼**: 確認所有修改的檔案未發生 UTF-8 BOM 亂碼污染。

## 6. AI 簽到區
- [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
- **參與對話 ID 紀錄**:
  - [2026-06-24] ID: fe975795-4d88-49dd-b5f5-07deb3b2e614 (初始化與執行)
