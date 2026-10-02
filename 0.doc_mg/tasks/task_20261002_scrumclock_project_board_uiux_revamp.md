---
title: "專案規劃看板 UI/UX 現代化重構 (Linear 風格輕量清單與詳情抽屜)"
plugin: "chrome_scrumclock"
status: "進行中"
created: "2026-10-02"
deadline: "2026-10-05"
---

## 1. 目標
重構現有「專案規劃看板」之任務池（Task Pool），解決標題寬度擠壓、文字過度折行、厚重文字框佔位與控制列多層堆疊等嚴重視覺與易用性卡點。導入現代化敏捷工具（Linear / Notion）之單行極簡排版、右側滑出式任務詳情抽屜（TaskDetailDrawer）與批次「推入今日焦點」工作流，達成高效流暢的規劃體驗。

## 2. 策略與鎖定檔案

### 核心設計策略
1. **頂部控制層級瘦身**：將提示引導橫幅改為可收合/精簡提示，欄位顯示開關簡化為輕量選單，釋放首屏垂直空間。
2. **單行化 Linear 風格清單列**：
   - 標題彈性延展（`flex-grow` / 寬欄自適應），支援就地雙擊/點擊編輯與截斷保護。
   - 移除預設佔位的笨重文字輸入框（Execution Notes）與低頻欄位（Task ID、Created At），改為徽章指示與點擊展開。
   - 操作按鈕改為懸浮（Hover）才淡入顯示，預設視覺乾淨無雜訊。
3. **右側滑出式詳情抽屜 (TaskDetailDrawer)**：
   - 點擊任一任務列時，右側滑出詳情抽屜，完整展示/編輯執行備忘（Execution Notes）、AI 拆解子任務、狀態切換、歷史日誌與推入焦點動作。
4. **批次操作與轉化動效**：
   - 提供左側 Checkbox 複選功能，勾選多個任務時浮現「批次推入今日焦點 (Batch Push to Today)」懸浮操作列。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/features/project-management/components/tabs/types.ts`
- `./chrome_scrumclock/src/features/project-management/components/tabs/TaskPoolTab.tsx`
- `./chrome_scrumclock/src/features/project-management/components/tabs/TaskDetailDrawer.tsx` (新元件)
- `./chrome_scrumclock/src/features/project-management/components/ProjectManagementDemo.tsx`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L2 插件導航索引：`./chrome_scrumclock/SCRUMCLOCK_README.md`
- [x] L1 專家技能字典：`./.agents/skills/scrumclock-core/SKILL.md` (登錄 TaskDetailDrawer 元件字典)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (封存歸檔)

## 3. 任務拆解

### Phase 1: 頂部資訊層級瘦身與佈局空間釋放 狀態：`[已完成]`
- [x] 任務 1.1: 提示橫幅與快速新增列整合
    - [x] 將 `Backlog SSOT 說明橫幅` 改為可一鍵關閉或摺疊至小燈泡 Tooltip，減少 60px 垂直高度佔用。
    - [x] 重新梳理新增任務輸入框與優先級選單之按鈕層級，統一視覺邊框與對齊。
- [x] 任務 1.2: 欄位篩選與視圖控制簡化
    - [x] 隱藏預設無效的 `Task ID` 與空值 `Created At` 欄位展示，改為設定選單抽屜。
    - [x] 確保主表格欄位寬度分配明確（Title 佔 50% 以上，其餘為狀態、優先級與操作）。

### Phase 2: 現代化 Linear 風格清單列 (TaskRow) 重構 狀態：`[已完成]`
- [x] 任務 2.1: 清單列單行化與排版彈性優化
    - [x] 移除列內常駐的 textarea，文字備忘改為以文字摘要或圖標徽章（附備忘計數/預覽）呈現。
    - [x] 解決標題因欄寬過窄折成細長條問題，讓 Title 擁有充裕寬度並保持文字清晰。
- [x] 任務 2.2: 懸浮操作按鈕組 (Hover Actions)
    - [x] 預設狀態下隱藏次要操作按鈕，滑鼠 hover 該列時平滑淡入「🎯 推入今日」、「✨ AI 拆解」、「🗑️ 刪除」。
    - [x] 加入點擊選中狀態的 Highlight 背景色。

### Phase 3: 右側滑出式任務詳情抽屜 (TaskDetailDrawer) 狀態：`[已完成]`
- [x] 任務 3.1: 建立 `TaskDetailDrawer.tsx` 元件
    - [x] 支援右側滑入 (Slide-over) 動畫與背景遮罩 (Backdrop)。
    - [x] 呈現完整任務標題編輯、優先級徽章切換、狀態選擇器。
    - [x] 整合完整尺寸之執行備忘文字框（Auto-resizing Textarea），支援隨打隨存。
    - [x] 整合 AI 拆解建議區塊與一鍵採用子任務按鈕。
- [x] 任務 3.2: 串接 `TaskPoolTab.tsx` 選中狀態
    - [x] 點擊任務列任何非按鈕區域即開啟對應任務之詳情抽屜。
    - [x] 抽屜內支援快速鍵（如 `Esc` 關閉）。

### Phase 4: 批次推入今日焦點與驗收驗證 狀態：`[已完成]`
- [x] 任務 4.1: 任務多選 (Multi-select) 與批次動作列
    - [x] 每列左側加入選取框，支援單選與全選。
    - [x] 勾選 ≥ 1 項任務時，底部浮現懸浮動作列：「已選取 N 項 ➔ 一鍵推入今日焦點」、「批次調整狀態」。
- [x] 任務 4.2: 建置驗證與樣式合規確認
    - [x] 執行 TypeScript 型別檢查與 Vite 專案建置 (`npm run build`)。
    - [x] 檢查暗色主題對比度與流暢度，確認無主控台錯誤。

### Phase 5: SSOT 閉環補全與多層規範同步 狀態：`[進行中]`
- [x] 任務 5.1: 補全 Agent 專家技能字典
    - [x] 於 `.agents/skills/scrumclock-core/SKILL.md` 登錄 `TaskDetailDrawer.tsx`。
- [ ] 任務 5.2: 補全驗收清單並執行任務封存
    - [ ] 將驗收標準更新為多維度 SSOT 檢核。
    - [ ] 依封存協議將任務移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。

## 4. 影響評估
- **架構影響**：純前端 UI/UX 呈現層與互動狀態優化，底層 LocalStorage 與 Google Sheets 同步資料結構（WeeklyMission 模型）完全保持相容。
- **權限與通訊**：無涉及新的 Chrome API 權限或擴展通訊契約變更。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **L2 插件導航同步**: 已同步更新 `chrome_scrumclock/SCRUMCLOCK_README.md`。
- [x] **L1 專家技能同步**: 已同步更新 `.agents/skills/scrumclock-core/SKILL.md`。
- [ ] **L4 任務封存**: 任務完成後已移至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: f7521928-1f97-498b-898d-f6460b397e4d (Gate 1 藍圖初始化)
> - 2026-10-02 ID: cddd6f85-81b4-44f5-994d-596cf4f3d65c (Phase 1 完成：頂部資訊層級瘦身與佈局空間釋放)
> - 2026-10-02 ID: 5dcf01da-f6b7-4ebd-8ce0-a78ed7b6d6d3 (Phase 2 完成：現代化 Linear 風格清單列重構與懸浮操作)
> - 2026-10-02 ID: f8dfac90-a331-4bb9-a3ca-2dcc272197e9 (Phase 3 完成：右側滑出式任務詳情抽屜與快捷互動串接)
> - 2026-10-02 ID: f7f540f9-d87c-45f7-800e-882daf84369a (Phase 4 完成：批次操作懸浮列、建置驗證與全案驗收結案)
> - 2026-10-02 ID: cef632a2-75fa-4f40-87df-28a3ae9182c9 (Phase 5 啟動：SSOT 閉環補全與流程反思)
>
> **跨會話接力指令 (Session Handover)**:
> 正在執行 Phase 5 SSOT 補全。完成後將正式封存。
