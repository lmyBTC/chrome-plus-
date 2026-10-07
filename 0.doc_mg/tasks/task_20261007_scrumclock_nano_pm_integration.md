---
title: "Gemini Nano x ScrumClock 專案管理深度整合"
plugin: "chrome_scrumclock + chrome_gemini_nano"
status: "已完成"
created: "2026-10-07"
deadline: "2026-10-14"
---

## 1. 目標

將已建置之 Web AI API 矩陣（`WebAIGateway`、`ai.writer`、`ai.summarizer`）無縫植入 `chrome_scrumclock` 專案管理功能，實現以下核心指標：
- **零 API 成本**：100% 依賴 Gemini Nano 本機推論，無雲端費用
- **100% 離線可用**：邊緣運算，無需網路連線
- **GTD 收件匣處理時間降低 80%**：一鍵無感清空 (Inbox Zero)
- **任務啟動摩擦趨近於零**：原子化敏捷拆解 (Task Decomposition)

**SSOT 草稿來源**：
- 設計規格：`0.doc_mg/draft/Nano 賦能 ScrumClock 敏捷專案管理/Gemini Nano 賦能 ScrumClock 敏捷專案管理深度優化方案.md`
- 實作計畫：`0.doc_mg/draft/Nano 賦能 ScrumClock 敏捷專案管理/實作計畫.md`

---

## 2. 策略與鎖定檔案

**策略**：沿用 `chrome_gemini_nano` 已建置的 `WebAIGateway` 黑盒介面，在 `chrome_scrumclock` 側新增專屬 AI 服務層（`taskAIEngine.ts` / `kanbanAuditor.ts`），再以 HITL 模式逐層植入 UI 元件，最後閉環背景守護。

### 鎖定檔案 (Target Files)

**新增檔案（chrome_scrumclock）**
- `./chrome_scrumclock/src/features/project-management/services/taskAIEngine.ts`
- `./chrome_scrumclock/src/features/project-management/services/kanbanAuditor.ts`
- `./chrome_scrumclock/src/features/project-management/components/modals/InboxTriageModal.tsx`
- `./chrome_scrumclock/src/features/project-management/components/InboxTriageModal.tsx`

**改造檔案（chrome_scrumclock）**
- `./chrome_scrumclock/src/features/project-management/components/tabs/TaskDetailDrawer.tsx`
- `./chrome_scrumclock/src/dashboard/components/BoardView.tsx`
- `./chrome_scrumclock/src/features/project-management/components/tabs/TaskPoolTab.tsx`
- `./chrome_scrumclock/src/features/project-management/components/ProjectManagementDemo.tsx`
- `./chrome_scrumclock/src/features/scrumclock/components/EndOfDayReview.tsx`
- `./chrome_scrumclock/src/background.ts`

**參考（唯讀黑盒，chrome_gemini_nano）**
- `./chrome_gemini_nano/src/core/ai/webAIGateway.ts`（僅讀介面簽名 ≤ 30 行，嚴禁跨插件改動）

### 鎖定 SSOT 回寫清單 (Target SSOTs)

- [x] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md`（補充 taskAIEngine / kanbanAuditor 元件字典骨架）
- [x] L1 專家技能：`./.agents/skills/gemini-nano-core/SKILL.md`（確認跨插件黑盒契約路徑無需變動）
- [x] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md`（更新 AI 服務層模組速查矩陣）
- [x] L3 業務規格：（無獨立業務規格檔，豁免 L3）
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/`（待使用者指示進行封存歸檔）

---

## 3. 任務拆解

### Phase 1: AI 服務層建立 狀態：`[完成]`

- [x] **Task 1.1**：建立 `taskAIEngine.ts`
    - [x] [原子] 建立檔案骨架與 Singleton 模式（參照草稿 Code Example）
    - [x] [原子] 封裝 `triageInboxItems`：批次評估收件匣卡片，輸出 `GTDStatus` + 情境標籤 + 🍅 預估
    - [x] [原子] 封裝 `decomposeTask`：呼叫 `WebAIGateway.writeDraft`，將大型目標拆解為 3~4 個 Checklist
    - [x] [原子] 封裝 `generateDailyReviewSummary`：呼叫 `WebAIGateway.summarizeText`，產出日終 High-Signal 總結
- [x] **Task 1.2**：建立 `kanbanAuditor.ts`
    - [x] [原子] 掃描 `in-progress` 與 `next-action` 中超過 5 天未更新之卡片
    - [x] [原子] 提供健康度指標（WIP 飽和度、停滯任務比率）回傳型別（`KanbanHealthReport`）

### Phase 2: UI 元件與 HITL 整合 狀態：`[完成]`

- [x] **Task 2.1**：建立 `InboxTriageModal.tsx`
    - [x] [原子] 呈現 Nano 批次整理建議清單（狀態變更、標籤、番茄鐘 Diff 視窗）
    - [x] [原子] 實作單筆微調 + 「一鍵全部套用」以 StorageQueue 循序寫入
- [x] **Task 2.2**：改造 `TaskDetailDrawer.tsx`
    - [x] [原子] 新增「⚡ Nano 拆解為番茄作戰計畫」按鈕
    - [x] [原子] 將拆解的原子步驟自動寫入 `WeeklyMission.checklist`
- [x] **Task 2.3**：升級 `BoardView.tsx`
    - [x] [原子] 收件匣欄位頂部新增「✨ 一鍵釐清 (Inbox Zero)」觸發按鈕
    - [x] [原子] 實作拖曳時「語意 WIP 衝突提醒」彈窗（第 4 張卡片拖入 In Progress 時觸發）

### Phase 3: 日終反思與背景守護閉環 狀態：`[完成]`

- [x] **Task 3.1**：升級 `EndOfDayReview.tsx`
    - [x] [原子] 點擊「一鍵產生今日戰報」直接調度 `TaskAIEngine.generateDailyReviewSummary`
    - [x] [原子] 支援將日終反思匯出為帶有 YAML Frontmatter 的 Markdown 筆記（支援下載 .md 與一鍵複製）
- [x] **Task 3.2**：在 `background.ts` 整合 `chrome.idle` 監聽
    - [x] [原子] 閒置 15 分鐘後啟動 `kanbanAuditor` 輕量巡檢（manifest 已增配 `"idle"` 權限）
    - [x] [原子] 自動將殭屍卡片降級至 `someday`，重新開啟時於 BoardView 顯示紫藍色浮層提示

---

## 4. 影響評估

| 面向 | 影響說明 |
|:---|:---|
| **跨插件通訊** | 僅呼叫 `chrome_gemini_nano` 之 `WebAIGateway` 公開介面，遵守黑盒契約，不直接修改 Nano 插件原始碼 |
| **Chrome API 權限** | Phase 3 新增 `chrome.idle` 監聽，`chrome_scrumclock/public/manifest.json` 已補全 `"idle"` 權限 |
| **Storage Schema** | `InboxTriageModal` 批次套用循序寫入，`pendingIdleAuditNotification` 供閒置通知浮層消費後清除，無破壞性變更 |
| **Background Service Worker** | `kanbanAuditor` 在 `background.ts` 中透過 `chrome.idle.onStateChanged` 事件驅動，無常駐計時器負擔 |
| **UI 衝突風險** | `BoardView.tsx` 與 `EndOfDayReview.tsx` 注入均保持既有 DnD 事件與送出流程正常運作 |

---

## 5. 驗收標準

- [x] **功能驗收 (Phase 2)**：Inbox Triage 按鈕可成功呼叫 Nano 並顯示 Diff 視窗；Task Decomposition 按鈕可產出 3~4 個 Checklist 步驟。
- [x] **離線驗證**：全部調用 Web AI 本機端能力，斷網下仍可正常執行推論與彙整。
- [x] **chrome.idle 權限**：`chrome_scrumclock/public/manifest.json` 已確認含 `"idle"` 權限。
- [x] **核心規範**：修改符合 Chrome Extension Manifest V3 規範（背景 Service Worker 非持續性、訊息傳遞安全）。
- [x] **Shadow DOM / CSP**：新增 UI 元件無樣式洩漏與 CSP 違規。
- [x] **除錯清理**：移除所有多餘測試與除錯代碼。
- [x] **SSOT 閉環**：L1（兩份 SKILL.md）+ L2（SCRUMCLOCK_README.md）骨架回寫完成。
- [ ] **L4 任務封存歸檔**：待使用者確認後封存至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**：`npm run build` 通過無報錯，前端各元件正常打包。

---

## 6. AI 簽到區與會話接力

> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-10-07] ID: `596ccec6-0f9b-4c7c-8298-10bba5eda4f5` (Gate 1 初始化建檔)
> - [2026-10-07] ID: `bae8ff7e-df1f-49fa-b1fe-665d0d4c5285` (Phase 1 執行完成)
> - [2026-10-07] ID: `0a698247-8225-42cc-b405-8393b140c7a7` (Phase 2 執行完成)
> - [2026-10-07] ID: `6d1e8e9e-a589-4f5f-9e42-190d89c784d8` (Phase 3 執行完成與 SSOT 閉環)

