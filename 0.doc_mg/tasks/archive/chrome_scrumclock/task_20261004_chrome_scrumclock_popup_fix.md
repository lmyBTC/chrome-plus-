---
title: "修復 Power Kit (chrome_scrumclock) 點擊圖示未彈出 Popup 問題"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-04"
deadline: "2026-10-04"
---

## 1. 目標
修復 `chrome_scrumclock` (Power Kit) 在 Chrome 工具列點擊擴充功能圖示時毫無反應、無法彈出 Popup 介面的問題。

## 2. 策略與鎖定檔案

### 根本原因分析
1. `chrome_scrumclock/public/manifest.json` 中的 `action` 僅宣告了 `"default_title": "Power Kit"`，缺少 `"default_popup": "src/entries/popup/index.html"`。
2. `chrome_scrumclock/src/background.ts` 在 `chrome.runtime.onInstalled` 中呼叫了 `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`，將點擊行為強制導向 Side Panel（若使用者預期開啟 Popup，兩者行為衝突；且若在未重新安裝或 API 異常時，導致點擊完全無反應）。
3. 專案中已實作完整的 Popup 元件（`src/entries/popup/index.html` 與 `src/entries/popup/main.tsx`）並在 `vite.config.ts` 打包清單中，需明確將 `default_popup` 補回 Manifest。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/public/manifest.json`
- `chrome_scrumclock/src/background.ts`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md`
- [ ] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md`
- [ ] L3 業務規格：`./chrome_scrumclock/docs/gtd-kanban-spec.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: Manifest 配置修正與行為解耦 狀態：`[已完成]`
- [x] 任務 1.1: 補齊 Manifest Action Popup 宣告
    - [x] 在 `chrome_scrumclock/public/manifest.json` 中的 `action` 節點加入 `"default_popup": "src/entries/popup/index.html"`。
- [x] 任務 1.2: 調整 Background 側欄點擊行為
    - [x] 檢視 `chrome_scrumclock/src/background.ts` 中的 `openPanelOnActionClick`，避免覆蓋或阻斷 `default_popup` 的預設行為（或透過 Popup 內的按鈕導向側欄）。

### Phase 2: 建置驗證與功能回歸 狀態：`[已完成]`
- [x] 任務 2.1: 執行 Vite 打包建置
    - [x] 執行 `npm run build` 確認 `dist/src/entries/popup/index.html` 與相依資源正常輸出。
- [x] 任務 2.2: 驗證無報錯與除錯清理
    - [x] 確認無語法錯誤與 CSP 違規，確保點選擴充功能圖示能正常展開 Popup 視窗。

## 4. 影響評估
- 恢復預設 Popup 彈窗，可直接查看當日衝刺進度與快捷入口。
- 若使用者需要開啟側邊欄（Side Panel），可在 Popup 中保留/加入開啟側欄之快捷按鈕或透過右鍵/側邊欄選單開啟，不再與點擊 Action 互斥。

## 5. 驗收標準
- [x] **核心規範**: 確認修改符合 Chrome Extension Manifest V3 規範。
- [x] **除錯清理**: 確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: [x] [N/A] 輕量任務豁免。
- [x] **L4 任務封存歸檔**: 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: 執行 `npm run build` 成功建置，載入 `dist/` 後點擊圖示能順暢跳出 Popup。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-04 ID: 657f45e7-289f-4182-a5be-9fbe12277565 (初始化)
> - 2026-10-04 ID: bc12bdbc-6ebb-43d0-9e3a-218d45252568 (執行 Phase 1)
> - 2026-10-04 ID: a788c694-218b-4e54-a9f5-fcc67116ecf4 (執行 Phase 2 並驗收結案歸檔)

