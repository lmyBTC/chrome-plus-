# 🛡️ ScrumClock Web AI 防崩潰腳本引擎技術規格書 (NanoPromptGuard Spec)

> [!IMPORTANT]
> **SSOT 規格文件**：本文檔定義 `chrome_scrumclock` 插件針對本機端側小模型 (Gemini Nano 1.8B~3B) 的防崩潰防禦機制與 Prompt 路由體系。所有對 `taskAIEngine.ts` 與邊緣 AI 相關之擴充皆必須遵循本規範。

---

## 1. 背景與技術痛點 (Background & Problem)

本機端側小模型 (Gemini Nano) 具備零伺服器延遲、完全離線保護隱私等巨大優勢，但在 1.8B~3B 參數量級下，存在以下固有退化風險：
1. **極短輸入機率坍縮 (Starvation Collapse)**：當使用者輸入少於 20 字元（如「修 bug」、「買牛奶」）時，端側模型易發生注意力機率發散或坍縮。
2. **退化輸出 (Output Degradation)**：小模型在語意飢餓或溫度漂移時，可能僅回傳單一標點（如「。」、「？」）或單一 Emoji（如「🥰」、「👍」），甚至輸出空白或長度 $\le 3$ 的無意義片段。
3. **格式漂移 (JSON Drift)**：在複雜結構化任務（如 Checklist 拆解）中，容易破壞 JSON 語法或遺漏必要欄位。

---

## 2. 四層防禦體系架構 (4-Tier Defense Architecture)

`NanoPromptGuard` 採用四層漸進式過濾架構，確保前端業務呼叫在任何端側異常下均能 100% 獲得結構化且符合 UX 預期的結果：

```
[原始使用者輸入]
      │
      ▼
┌──────────────────────────────────────────┐
│ Layer 1: 饑餓偵測層 (Starvation Detector) │ ── (長度 < 20 字元注入工程指引補全上下文)
└──────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│ Layer 2: Few-shot 錨定 (Anchored Routing)│ ── (英文 System 骨架 + 繁中 Few-shot 約束)
└──────────────────────────────────────────┘
      │
      ▼ (調用 WebAIGateway / Gemini Nano)
┌──────────────────────────────────────────┐
│ Layer 3: 退化審查 (Degradation Inspector)│ ── (長度 <= 3、純標點/Emoji 正則攔截)
└──────────────────────────────────────────┘
      │
      ▼ (若未通過審查或 API 報錯)
┌──────────────────────────────────────────┐
│ Layer 4: 瞬時 Fallback 兜底 (0 延遲返回)  │ ── (保證有效結構化物件，UI 永不崩潰)
└──────────────────────────────────────────┘
```

### 2.1 Layer 1: 饑餓偵測層 (Starvation Detector)
- **判定閾值**：`trimmedText.length < 20`
- **防禦手段**：保留原始需求，自動拼接補全指引：
  `"（注意：此輸入字數極少，請以專業敏捷工程師視角，將其視為重要技術待辦，補充完整實作脈絡並給出精準具體的輸出）"`。

### 2.2 Layer 2: Few-shot 錨定路線 (Anchored Routing)
- **原則**：端側小模型對英文指令遵循度最佳，但需輸出高品質繁體中文。
- **作法**：System Prompt 採用精確英文結構規範，搭配具體繁體中文 Few-shot 範例（含輸入與預期輸出），固定小模型的注意力權重。

### 2.3 Layer 3: 輸出退化審查防線 (Degradation Inspector)
- **正則判準**：
  ```typescript
  // 檢查長度過短或純標點符號/空白/表情符號
  const punctuationOrEmojiOnly = /^[\s\p{P}\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;
  const isTooShort = rawOutput.length <= 3;
  const isMeaningless = punctuationOrEmojiOnly.test(rawOutput);
  ```
- **處置**：若判定退化，立即短路棄用模型輸出，轉入 Layer 4。

### 2.4 Layer 4: 瞬時 Fallback 兜底 (Instant Fallback Provider)
- 根據調用場景（`TaskScenario`）即時構造標準業務資料回傳，維持 0 毫秒延遲中斷防護：
  - `TASK_DECOMPOSITION`：回傳包含 3 項具體步驟的子項目清單。
  - `INBOX_TRIAGE`：回傳 `category: 'ACTIONABLE_TASK'` 及可執行標籤。
  - `PROGRESS_SUMMARY`：回傳標準結構化完成戰報。
  - `WIP_CONFLICT_CHECK`：回傳無心流衝突安全通過評估。

---

## 3. 業務場景適配矩陣 (Scenarios Matrix)

| 場景識別碼 (`TaskScenario`) | 業務入口 (`taskAIEngine.ts`) | 錨定預期輸出 | Fallback 策略 |
| :--- | :--- | :--- | :--- |
| `TASK_DECOMPOSITION` | `decomposeTask` | JSON: `{ subtasks: TaskSubtask[] }` | 拆解為「需求釐清與定義邊界」、「核心邏輯實作」、「驗收測試與除錯」3 步驟 |
| `PROGRESS_SUMMARY` | `generateDailyReviewSummary` | 結構化 Markdown（今日完成、進行中、明日衝刺） | 提取已完成任務標題產出標準進度戰報 |
| `INBOX_TRIAGE` | `triageInboxItems` | JSON: `{ categorized: Array }` | 自動指派優先級 `P2`、專案 `收件匣待整理` |
| `WIP_CONFLICT_CHECK` | `analyzeWIPConflict` | JSON: `{ hasConflict, conflictSeverity, advice }` | `hasConflict: false`，標記心流切換注意提醒 |

---

## 4. 模組位置與引用準則

- **核心服務位置**：`src/core/ai/nanoPromptGuard.ts`
- **匯出物件**：單例 `nanoPromptGuard`
- **整合實例**：`src/features/project-management/services/taskAIEngine.ts` 內部封裝之 `safeExecuteWithFallback` 函數
- **合規性要求**：
  1. 嚴禁在此服務內引入任何外部插件代碼，維持 ScrumClock 插件自治。
  2. 嚴禁在此服務內引入全域狀態或非純函式副作用，確保單元測試性。
