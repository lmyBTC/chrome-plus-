---
title: "ScrumClock 本地 AI 強化：Zod 校驗、意圖測試與 Webhook 外部同步規劃"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-17"
deadline: "2026-07-24"
---

## 1. 目標
1. **強化 JSON 驗證**：在側欄 AI 解析與 Storage 寫入的最前端導入 Zod schema 驗證，防止本地端 LLM（Gemini Nano）輸出格式不穩定或遺漏必填欄位時將髒數據寫入 `weeklyMissions` 或 `dailyLogs`。
2. **建立 Prompt CI/CD 本地自動化測試**：架設本地端意圖測試腳本，涵蓋新增、完成、刪除任務等數十種口語語意組合，每次 Prompt 調整後皆可執行測試以預防 Regression（功能退化）。
3. **外部工作流 Webhook 自動化同步**：在 `StorageQueue` 完成寫入後，可透過設定開啟 Webhook 觸發（支援 n8n 或 GAS），將「今日戰役」或「衝刺 Log」同步至跨區域行事曆或試算表。

---

## 2. 策略與鎖定檔案
1. **Zod 驗證策略**：在專案中安裝 `zod` 套件。建立 `src/utils/ai-schemas.ts` 定義 `AIActionSchema`，嚴格限制 `intentType`（"project" | "daily_mission"）、`actionType`（"create" | "update" | "complete" | "delete"）等欄位及型別。並在 [hooks.ts](./chrome_scrumclock/src/entries/sidebar/hooks.ts) 的 `safeExtractJSON` 和 actions 執行前進行安全解析（`safeParse`）。
2. **自動化測試策略**：在 `chrome_scrumclock/tests/` 中撰寫 Node 測試腳本，利用 mock 的 `parseSession.prompt` 或實際透過遠端偵測 Port（Remote Debugging）連接已運行之 Chrome 執行本地 Nano 推理測試，覆蓋至少 30 種測試語意組合，並比對輸出 JSON 的符合率。
3. **Webhook 同步策略**：
   - 於設定面板中新增 `webhookUrl` 和 `enableWebhook` 儲存項至 `chrome.storage.local`。
   - 在 `StorageQueue` 後置加入非同步 `fetch` Webhook 發送機制，不阻塞 React UI 運作，並實作簡易的 Error boundary 防呆。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/package.json`
- `./chrome_scrumclock/src/utils/ai-helper.ts`
- `./chrome_scrumclock/src/entries/sidebar/hooks.ts`
- `./chrome_scrumclock/src/components/SettingsPanel.tsx`

---

## 3. 任務拆解

### Phase 1: 強化 JSON Payload 的驗證機制 (Zod 驗證) 狀態：`[已完成]`


### Phase 2: 建立 Prompt 的自動化測試與持續整合 (CI/CD) 狀態：`[已完成]`


### Phase 3: 日曆與外部工作流自動化同步 (Webhook) 狀態：`[已完成]`

---

## 4. 影響評估
- 引入 `zod` 會微幅增加打包後的體積（Vite 會自動優化 Treeshake，約增加數十 KB），對插件性能影響極低。
- Webhook 運作於 `StorageQueue` 的後置非同步處理中，不會對 React 前端的主線程造成阻塞。
- 此任務不涉及 Chrome Extensions 的 Manifest 權限變更，對現有功能無破壞性影響。

---

## 5. 驗收標準
- [ ] **技術指標**: 側欄 AI 輸入故意破壞格式之對話，Zod schema 能成功攔截並阻止寫入 Storage，且 UI 能顯示錯誤警示。
- [ ] **核心規範**: Webhook 採用非同步 fetch，即使外部 Webhook 伺服器斷線，本地端的任務更新與番茄鐘計時仍能完全正常運作。
- [ ] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [ ] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [ ] **插件驗證**: 執行 `npm run build` 並在 `chrome://extensions/` 重新載入，確認功能正常。

---

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-17] ID: 2723e14e-e25a-4d50-b2a0-33ed8a8cd554 (任務規劃與初始化)
> - [2026-07-17] ID: 7ebe0dcd-fd91-4c3a-abaa-2e795631bf08 (Phase 2 自動化測試開發)
