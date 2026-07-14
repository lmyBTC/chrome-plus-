---
title: "將專案替換至 GitHub chrome-plus- 倉庫"
plugin: "global"
status: "規劃中"
created: "2026-07-14"
deadline: "2026-07-14"
---

## 1. 目標
將當前本地的專案（Chrome Plus Project 包含三個子插件及文檔管理結構）作為一個全新的 Git 倉庫，初始化並強制推送（Force Push）至 `https://github.com/lmyBTC/chrome-plus-.git`，以完全替換該遠端倉庫的現有空間位置與歷史紀錄。

## 2. 策略與鎖定檔案
- 初始化本地 Git 倉庫，設定主分支為 `main`。
- 在專案根目錄建立 `.gitignore`，防止 `node_modules` 與建置產物被提交。
- 將現有本地檔案加入 Git 暫存區並進行首次提交 (Initial commit)。
- 將遠端倉庫設定為 `origin`。
- 透過強制推送 `git push --force origin main` 替換遠端倉庫。

### 鎖定檔案 (Target Files)
- [NEW] `c:\Users\G1\00.coding workspace\chrome plus project\.gitignore`

## 3. 任務拆解

### Phase 1: 規劃與環境檢查 狀態：`[已完成]`
- [x] 任務 1.1: 檢查本地 Git 環境與目前 Git 狀態
- [x] 任務 1.2: 檢查三個子專案的結構與依賴，確認 `.gitignore` 排除規則
- [x] 任務 1.3: 撰寫 `implementation_plan.md` 並提報使用者審查

### Phase 2: 本地初始化與配置 狀態：`[進行中]`
- [x] 任務 2.1: 建立根目錄之 `.gitignore` 檔案
- [x] 任務 2.2: 在專案根目錄執行 `git init` 初始化倉庫
- [x] 任務 2.3: 將預設分支重新命名為 `main`
- [/] 任務 2.4: 執行 `git add .` 將所有符合規則的檔案加入暫存區
- [ ] 任務 2.5: 執行 `git commit -m "Initial commit of chrome plus project"` 建立首次提交

### Phase 3: 遠端關聯與強制推送 狀態：`[待辦]`
- [ ] 任務 3.1: 執行 `git remote add origin https://github.com/lmyBTC/chrome-plus-.git` 關聯遠端倉庫
- [ ] 任務 3.2: 執行 `git push -u origin main --force` 強制推送並覆蓋遠端倉庫

## 4. 影響評估
- 該操作為強制推送（`--force`），將會**永久刪除並覆蓋** GitHub 上 `https://github.com/lmyBTC/chrome-plus-.git` 的所有現有分支、歷史 Commit 記錄與代碼。在執行前必須獲得使用者明確確認。
- 由於此操作不影響代碼本身的 Chrome API 權限或 runtime 行為，因此對插件運行本身無影響。

## 5. 驗收標準
- [ ] **技術指標**: 本地專案能成功與遠端關聯，且遠端倉庫的代碼結構與本地一致。
- [ ] **核心規範**: `.gitignore` 正常運作，沒有把任何 `node_modules` 或 `dist` 等無關建置產物推送到 GitHub。
- [ ] **除錯清理**: 無額外臨時測試檔案殘留（`scratch/` 已被忽略）。
- [ ] **檔案編碼**: 確認新增的 `.gitignore` 檔案以 UTF-8 保存。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-07-14 ID: bdabbcfa-bc34-4593-ba0f-d217e42851bd (初始化)
