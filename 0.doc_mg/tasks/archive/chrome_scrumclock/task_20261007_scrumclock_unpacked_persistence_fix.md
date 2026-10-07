---
title: "ScrumClock 未封裝擴充功能重啟持久化修復"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-07"
deadline: "2026-10-07"
---

## 1. 目標
修復 Chrome 載入未封裝之 ScrumClock 插件後，瀏覽器重啟時插件自動消失無故卸載的問題。核心原因為 Vite 構建時預設清空目錄 (`emptyOutDir: true`) 導致檔案系統 Inode 被刷新，Chrome 背景 Service 判定原始目錄失效而觸發靜默卸載 (Silent Eviction)。

## 2. 策略與鎖定檔案

依據排查手冊進行修復：
1. 於 `chrome_scrumclock/vite.config.ts` 的 `build` 區塊中配置 `emptyOutDir: false`，維持「原地覆寫」機制，保護 Inode 穩定性。
2. 驗證 `package.json` 無 `rimraf dist` 等非預期刪除指令（已確認為 `tsc && vite build`，符合規範）。
3. 驗證 `public/manifest.json` 固定金鑰已存在（已確認包含固定 public key）。
4. 執行 `npm run build` 驗證構建輸出正常。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/vite.config.ts`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md`
- [ ] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md`
- [ ] L3 業務規格：`./chrome_scrumclock/docs/feature-spec.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: Vite 配置修復與構建覆寫驗證 狀態：`[已完成]`
- [x] 任務 1.1: 修正 `chrome_scrumclock/vite.config.ts`
    - [x] 於 `build` 物件內明確加入 `emptyOutDir: false`
- [x] 任務 1.2: 構建驗證
    - [x] 於 `chrome_scrumclock` 執行 `npm run build` 確認編譯成功且 `dist/` 正常產出

## 4. 影響評估
此修改僅調整 Vite 打包時對 `outDir` (`dist`) 的檔案系統處理方式（由刪除目錄重建改為原地覆寫檔案），不影響任何業務代碼、元件邏輯、Chrome API 權限或 Content Script 注入行為。

## 5. 驗收標準
- [x] **技術指標**: `vite.config.ts` 明確設定 `build.emptyOutDir: false`。
- [x] **核心規範**: 編譯指令 `npm run build` 順利通過，輸出產物完整。
- [x] **除錯清理**: 無額外測試程式碼殘留。
- [x] **檔案編碼**: 修改之檔案以 UTF-8 保存。
- [x] **SSOT 閉環**: [x] [N/A] 輕量任務豁免。
- [x] **L4 任務封存歸檔**: 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: `dist/` 構建完成，提供使用者瀏覽器重啟持久化測試步驟。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-07 ID: d787c684-f653-4141-8bd8-e511707e6146 (初始化)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261007_scrumclock_unpacked_persistence_fix.md，開始執行 Phase 1
> ```
