---
title: "增強 sanitize_draft.py：新增 Angular 與 Web Component DOM 標籤深度剝除管線"
plugin: "global"
status: "已完成"
created: "2026-10-12"
deadline: "2026-10-12"
---

## 1. 目標
針對從 Gemini、Claude、ChatGPT 等 Web App 前端直接複製之 HTML / DOM 內容（帶有大量 Angular 與自訂組件標籤如 `<div _ngcontent-...>`、`<response-element>`、`<gem-icon-button>`、`<mat-icon>` 等），在 `clean_clipboard_artifacts` 建立深層純化管線，自動剝除私有屬性、解包容器標籤、剃除 UI 圖示按鈕，一鍵實現乾淨純文字與 Markdown 格式。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./0.doc_mg/draft/sanitize_draft.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/[plugin]-core/SKILL.md` (僅骨架：元件字典、Storage Schema)
- [ ] L2 插件導航：`./[plugin]/[PLUGIN]_README.md` (模組速查矩陣、入口索引)
- [ ] L3 業務規格：`./[plugin]/docs/[feature]-spec.md` (業務規格，無則免填)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 實作 Angular/Web DOM 剝除與純化正則 狀態：`[完成]`
- [x] 任務 1.1: 定義 UI 雜訊組件過濾規則
    - [x] 針對純 UI 標籤（如 `<gem-icon-button>...</gem-icon-button>`、`<mat-icon>...</mat-icon>`、`<button>...</button>`）直接整段剃除
- [x] 任務 1.2: 實作容器組件解包與私有屬性剝除
    - [x] 剃除 Angular 私有屬性（如 `_ngcontent-[a-zA-Z0-9_-]+`、`_nghost-[a-zA-Z0-9_-]+`、`jsaction=".*?"`、`jscontroller=".*?"` 等）
    - [x] 解包容器自訂標籤（如 `<response-element>`、`<message-content>` 等保留內部文字並去除外層自訂標籤）
- [x] 任務 1.3: 整合至 `clean_clipboard_artifacts`
    - [x] 計數並累加清理之標籤與雜訊項目數量
    - [x] 保持原本的純文字剪貼標記清洗能力

### Phase 2: 單元驗證與回歸測試 狀態：`[完成]`
- [x] 任務 2.1: 測試真實 Gemini Web DOM 複製剪貼片段
    - [x] 驗證包含 `<div _ngcontent-...>`, `<response-element>`, `<mat-icon>` 之複雜片段經消毒後無殘留標籤且內文完整保留
- [x] 任務 2.2: 驗證既有 LaTeX / Base64 / 剪貼文字清除功能不受影響

## 4. 影響評估
- 僅修改 `0.doc_mg/draft/sanitize_draft.py` 中的 `clean_clipboard_artifacts` 函式邏輯，對外部命令行參數介面完全向後相容。
- 不影響 Chrome 擴充功能原始碼或跨插件通訊。

## 5. 驗收標準
- [x] **技術指標**: 成功清理包含 `_ngcontent`、`<response-element>`、`<gem-icon-button>`、`<mat-icon>` 之 DOM 片段，Markdown/文字排版保持整潔。
- [x] **核心規範**: 遵循零額外依賴原則（純 Python 標準庫 `re`），維持極速處理。
- [x] **除錯清理**: 已確認移除或註解所有測試用的除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環（二選一）**:
  - [x] [N/A] 輕量任務豁免（無結構變動，L1~L3 免比對免回寫）
  - [ ] 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）
- [ ] **L4 任務封存歸檔**: 任務完成後由使用者確認是否移動至 `0.doc_mg/tasks/archive/global/` 封存。
- [x] **插件驗證**: 執行測試驗證腳本無報錯，清理結果符合預期。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - 2026-10-12 ID: bb93dfd7-9ecd-4ae7-9f53-0964df69be07 (初始化)
> - 2026-10-12 ID: 29a1f9b9-e131-4243-bb79-1142cddcdbaf (完成 Phase 1)
> - 2026-10-12 ID: 793950b3-22cc-4618-aff7-cc2f63f24e95 (完成 Phase 2 驗證)

