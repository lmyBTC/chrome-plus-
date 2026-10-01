---
title: "新分頁 UI 全夜晚黑暗模式更新"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-14"
deadline: "2026-07-14"
---

## 1. 目標
更新 chrome_scrumclock 插件，使新分頁 UI 呈現全夜晚黑暗模式，去除所有白底，提供舒適的暗色視覺體驗。

## 2. 策略與鎖定檔案
使用全域 CSS 覆寫機制（在 `src/index.css`），針對 TailwindCSS 的背景色（如 `bg-white`、`bg-gray-50`）以及邊框色 and 文字色進行深色覆寫。此做法無需修改大量 React 元件，能保持程式碼極簡並降低出錯率。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/index.css`

## 3. 任務拆解

### Phase 1: 規劃與審查 狀態：`[已完成]`
### Phase 2: 程式碼修改 狀態：`[已完成]`
### Phase 3: 編譯與驗證 狀態：`[已完成]`

## 4. 影響評估
本修改僅影響 `chrome_scrumclock` 插件的新分頁 UI，不影響其他背景腳本與外部主機的通訊。

## 5. 驗收標準
- [x] **技術指標**: 所有白底皆被替換為暗色背景（#0f172a / #1e293b），文字在高對比下清晰可讀。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範。
- [x] **除錯清理**: 無測試用的 `console.log()`。
- [x] **檔案編碼**: UTF-8 (無 BOM) 編碼。
- [x] **插件驗證**: 已在 Chrome 中載入編譯後的 `dist/`，確認正常運行無報錯。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-14] ID: 8aafa489-e54a-496b-af20-3cbe6abec04f (初始化)
