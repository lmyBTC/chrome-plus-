# Task Protocol 效能瓶頸分析與鬆綁優化實證報告 (2026-10-13)

> **文件狀態**：正式技術審計報告  
> **數據來源**：本地 IDE 會話軌跡日誌 (`C:/Users/G1/.gemini/antigravity-ide/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`)  
> **觸發背景**：自實施 `../../tasks/archive/global/task_20261013_global_task_protocol_v2_upgrade.md` (Task Protocol v3.1) 後，使用者反饋 Agent 回覆速度顯著變慢且頻繁卡頓。

---

## 1. 執行摘要 (Executive Summary)

本報告針對本地 512 個歷史會話中、Task Protocol v3.1 升級前後（10/10~10/12 vs 10/13 今日）的調用數據進行了深度解析。

**核心發現**：
1. **工具往返次數暴增 300% ~ 1200%**：今日 ScrumClock 看板優化任務（會話 `424c9f5c`）中，用戶發起單一指令，Agent 背景連續發起了 **109 次工具呼叫**（升級前平均僅 8 ~ 30 次）。
2. **通訊 I/O 阻塞成為最大時間黑洞**：單次工具調用往返延遲約 1.5 ~ 2 秒，109 次工具調用累計產生 **約 218 秒（超過 3.5 分鐘）的純本機通訊與進程排隊等待**。
3. **「極致探勘窄化」引發反向切香腸效應**：強制限制 20~30 行微觀讀取，導致 Agent 讀取單一 800 行檔案（`BoardView.tsx`）時連續發起 15 次 `view_file`，造成反向 Token 與時間浪費。
4. **「≤ 10 行局部替換」導致微操作碎片化**：單次替換平均僅 13.4 行（頻繁出現 2~5 行微片段），加劇了工具往返次數與 Context 滾雪球。

---

## 2. 實證數據挖掘與對比 (Empirical Metrics)

### 2.1 升級前後指標對比表

| 量化指標 | 升級前 (10/10 ~ 10/12 代表性會話) | 升級後 (10/13 今日會話 `424c9f5c`) | 變化幅度 | 瓶頸診斷 |
| :--- | :--- | :--- | :--- | :--- |
| **單回合工具調用總數** | 8 ~ 30 次 | **109 次** | **+300% ~ +1200%** | 工具鏈嚴重過密，I/O 阻塞 |
| **`view_file` 次數** | 6 ~ 9 次 | **65 次** | **+700%** | 極致窄化迫使切片讀取 |
| **每次 `view_file` 平均行數** | 50 ~ 150 行 | **27.1 行** | **-75%** | 單次視野過窄，喪失全域語意 |
| **`replace_file_content` 次數** | 3 ~ 5 次 | **18 次** | **+350%** | 硬限制導致頻繁碎片化替換 |
| **單次替換行數分布** | 30 ~ 60 行 (完整邏輯區塊) | **平均 13.4 行** (多為 2~5 行微片段) | 碎片化 | 每改幾行即產生 1 次工具往返 |
| **單指令純通訊耗時估算** | 約 15 ~ 45 秒 | **約 160 ~ 220 秒** | **延遲暴增 4~5 倍** | 體感嚴重「卡頓、轉圈」 |

### 2.2 典型碎片化調用軌跡 (節錄自 `424c9f5c`)

```text
# 切香腸式讀檔 (讀取同一檔案被切碎為連續十幾次調用)
Step 15. view_file | BoardView.tsx | L615-L645 (30行)
Step 16. view_file | BoardView.tsx | L675-L715 (40行)
Step 17. view_file | BoardView.tsx | L740-L770 (30行)
Step 18. view_file | BoardView.tsx | L790-L825 (35行)
Step 19. view_file | BoardView.tsx | L860-L890 (30行)

# 碎片化替換 (改動幾行就發起一次獨立工具調用)
Step 82. replace_file_content | BoardView.tsx | L1053-L1058 (5行)
Step 87. replace_file_content | useProjectManagement.ts | L768-L770 (2行)
Step 89. replace_file_content | types.ts | L52-L54 (2行)
Step 91. replace_file_content | ProjectManagementDemo.tsx | L216-L219 (3行)
Step 93. replace_file_content | TaskPoolTab.tsx | L40-L43 (3行)
Step 95. replace_file_content | TaskPoolTab.tsx | L357-L360 (3行)
```

---

## 3. 根本原因剖析 (Root Cause Analysis)

### 3.1 規則反向優化陷阱 (Penny Wise, Pound Foolish)
為節省單次 Token 而實施的極端窄化規則（強制 20~30 行），未將「工具調用往返的固定通訊與 Context 注入成本」納入考量。每次工具調用產生的 System Prompt、參數包裝與進程切換開銷，遠遠超過了一次讀取 100 行代碼所增加的少許 Token。

### 3.2 狀態同步乒乓效應 (State Synchronization Ping-Pong)
規範要求「每步驟實體同步任務檔打勾」，導致 Agent 在修改業務代碼與編輯 `task.md` 之間反覆橫跳。這不僅打斷了 LLM 對代碼上下文的專注力，也使 IDE 文件儲存與磁碟 I/O 頻率翻倍。

### 3.3 儀式過載 (Ceremonial Overhead)
對於日常常態任務（UI 響應式優化、卡片合併功能），強制填寫「全流程工具鏈強制檢核矩陣」與「事前驗屍 (Pre-Mortem)」，導致任務檔體積膨脹，在每次回話中佔用 2,000~4,000 Token，大幅拉長模型推論的 首字延遲 (TTFT)。

---

## 4. 鬆綁優化策略與具體標準 (Relaxation Blueprint)

| 鬆綁維度 | 現行嚴格規範 (v3.1) | 鬆綁優化標準 (v3.2) | 預期量化效益 |
| :--- | :--- | :--- | :--- |
| **檔案讀取視窗** | 強制 20~30 行微觀讀取 | 放寬至 **80 ~ 150 行**（以完整函式/組件為單位） | `view_file` 調用次數減少 **65% ~ 75%** |
| **代碼替換上限** | 硬性限制單次 ≤ 10 行 | 放寬至 **≤ 50 ~ 80 行**（確保錨定區塊唯一即可） | 替換工具調用次數減少 **60%** |
| **任務檔同步頻率** | 每動一步程式碼即時打勾 | **Phase 結尾批次打勾**（階段代碼驗收後最後一動同步） | 消除代碼與任務檔之間的乒乓切換 |
| **儀式結構分級** | 所有任務皆須填寫工具矩陣與驗屍 | **90% 常態任務全面豁免**，僅涉及跨插件架構變更才需填寫 | 任務檔減少 50% 冗餘 Token，推論延遲顯著下降 |
| **錨定機制** | 靜態絕對行號錨定 (容易漂移) | 改採**「語意區塊錨定」**（函數名、介面名、唯一字串） | 杜絕代碼修改後的行號漂移與反覆重勘 |

---

## 5. 相關追蹤
- 執行任務檔：`0.doc_mg/tasks/task_20261013_global_task_protocol_v3_2_relaxation.md`
- 預計更新 SSOT：
  - `.agents/rules.md`
  - `.agents/skills/task-protocol/SKILL.md`
  - `0.doc_mg/task_template_v2.md`
  - `GEMINI.md`
