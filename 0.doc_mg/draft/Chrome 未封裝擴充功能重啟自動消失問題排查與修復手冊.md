# 🛠️ Chrome 未封裝擴充功能 (Unpacked Extension) 重啟自動消失問題排查與持久化修復指南

> **適用對象**：使用 Vite / Webpack / Rollup 等前端構建工具開發 Chrome 擴充功能的開發者。  
> **痛點描述**：在 `chrome://extensions` 載入 `dist/` 目錄後，只要重新啟動 Chrome 瀏覽器，擴充功能便無故消失，必須反覆手動重新載入。

---

## 🔍 一、 核心根本原因分析 (Root Cause Analysis)

在 Chrome 的底層運作機制中，**「載入未封裝項目 (Load unpacked)」** 並不是將檔案複製到使用者的 Profile 內，而是建立一個指向該目錄的**系統路徑指標 (Directory Handle / Inode)**。

### 1. Vite 的預設清空目錄機制 (`emptyOutDir: true`)
Vite 在執行 `npm run build` 時，預設行為如下：
1. 偵測到輸出目錄 `dist/` 存在。
2. 呼叫底層系統指令**將整個 `dist/` 目錄刪除 (Delete / Unlink)**。
3. 建立一個**全新的** `dist/` 目錄並寫入編譯檔案。

### 2. 作業系統檔案系統的 Inode 重置
* 在 Windows、macOS (APFS) 及 Linux (ext4) 中，目錄被刪除重建後，其**檔案系統識別碼 (File Inode / Object ID) 會被刷新**。
* 當 Chrome 重新開機或重啟時，背景 Service 依循原有的目錄指標去尋找目錄，發現原目錄已失效，便會判定「擴充功能原始檔案已不存在」，進而**靜默卸載 (Silent Eviction)** 該未封裝插件。

---

## ⚙️ 二、 完整修改步驟 (Step-by-Step Fix)

### 步驟 1：修改 Vite 配置檔 (`vite.config.ts`)

在 `chrome_scrumclock/vite.config.ts` 的 `build` 區塊中，明確關閉 `emptyOutDir`，讓 Vite 改採「原地覆寫」而非「刪除重建」：

```typescript
// chrome_scrumclock/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // ⭐️ 關鍵設定：禁止 Vite 在打包前刪除整個 dist 資料夾
    emptyOutDir: false,
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      // 保持現有的 rollup 入口配置
    },
  },
});
```

> 💡 **補充說明**：若擔心多次構建後殘留過期檔案，可在日常使用時覆寫，僅在發布正式 Release 版本時再手動清空。

---

### 步驟 2：檢查 `package.json` 的 Script 指令

請打開 `chrome_scrumclock/package.json`，檢查 `scripts` 是否有使用 `rimraf` 或 `rm -rf` 刪除 `dist` 的前置指令：

```json
{
  "scripts": {
    // ❌ 錯誤示範：每次 build 都手動清空 dist，會導致 Inode 跑掉
    // "build": "rimraf dist && tsc && vite build",

    // ✅ 正確寫法：直接編譯覆寫
    "build": "tsc && vite build",
    "watch": "vite build --watch"
  }
}
```

---

### 步驟 3：Manifest 固定金鑰確認 (避免 ID 變動)

Chrome 判定擴充功能持久化的另一要件為 **Extension ID 是否固定**。請確保 `chrome_scrumclock/manifest.json` 包含固定的 2048-bit 公鑰（`key` 欄位），以固定 ID 為 `ahiihabnbjeoeneahcgbdcofncjoclcp`：

```json
{
  "manifest_version": 3,
  "name": "Chrome Plus - ScrumClock",
  "version": "2.5.0",
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

---

## 🧪 三、 驗證與重新綁定流程

修改完畢後，請依循以下標準作業流程 (SOP) 進行重新綁定驗證：

1. **重新編譯**：
   ```bash
   cd chrome_scrumclock
   npm run build
   ```
2. **清除舊綁定**：
   - 開啟 Chrome，前往網址列 `chrome://extensions/`。
   - 找到現有的 ScrumClock 卡片，點擊 **「移除 (Remove)」**。
3. **重新載入**：
   - 點擊左上角 **「載入未封裝項目 (Load unpacked)」**。
   - 選取 `chrome_scrumclock/dist` 資料夾。
4. **重啟測試**：
   - 完全關閉 Chrome 瀏覽器（確認系統背景工作管理員無殘留 chrome 程序）。
   - 重新啟動 Chrome 瀏覽器，打開 `chrome://extensions/`。
   - **驗證成果**：ScrumClock 插件依舊常駐，開箱即用，無需重新載入！

---

## 🌐 四、 外部環境干擾排查：Chrome Sync 帳號同步覆蓋與多實例互踢衝突

### 1. 常見情境與痛點現象
在本機同時運行多個 Chrome 實例（例如 **Chrome 正式版** 與 **Chrome Canary**），或在不同電腦上登入同一個 Google 帳號時：
* 在 Chrome Canary 載入未封裝插件後，重新啟動或切換到 Chrome 正式版，插件突然消失或被禁用；
* 反之在正式版載入，Canary 啟動後又把插件沖掉，兩邊出現**反覆互踢、只能二選一安裝 (互相排斥)** 的怪現象。

### 2. 核心根本原因剖析 (Root Cause)
1. **Chrome Sync 的擴充功能狀態雙向覆蓋 (Tombstone & State Ping-Pong)**：
   * 當開啟 Google 帳號的「同步所有內容」或「擴充功能同步」時，雲端會維護該帳號的擴充功能狀態。
   * **未封裝擴充功能（Unpacked）雖然不會同步本機代碼檔案，但其 Extension ID 狀態（啟用/停用/刪除標記）會隨帳號偏好設定進行雲端同步**。
   * 若使用者曾在一側移除過該插件，雲端便會產生「刪除標記 (Tombstone)」，當另一側啟動向雲端拉取時，就會判定本機未封裝項目已被使用者卸載，進而執行**靜默卸載 (Silent Eviction)**。
2. **Extension ID 未固定或殘留舊隨機 ID 造成路徑搶佔衝突**：
   * 若未封裝插件曾以無 key 形式載入過，瀏覽器會記錄舊的隨機 ID。
   * 當新版配置了固定公鑰後，若瀏覽器的 `Secure Preferences` 未徹底清理舊隨機 ID，就會出現「同一個本機目錄路徑被兩個不同的 Extension ID 同時登記」的致命衝突，導致 Chrome 安全校驗失敗而自動丟棄。
3. **使用者設定檔 (Profile) 狀態競態**：
   * 多實例同步時，`Preferences` 內的擴充功能狀態 (`extensions.pinned_extensions`、`extensions.toolbar` 等) 發生雲端競態覆蓋。

---

## 🔬 五、 實戰案例深度剖析：為什麼同帳號下會「互相排斥」？

### 💡 痛點現象對照
在同時登入同一 Google 帳號的 **Chrome 正式版** 與 **Chrome Canary** 中：
* ❌ **衝突組**：`PK+ (Power Kit)`、`YouTube Speed Plus` 會出現互相排斥、只能裝一個的排斥現象。
* ✅ **正常組**：`Finance Research Clipper`、`Chrome Plus - Gemini Nano` 卻能安然共存，完全沒有互踢問題。

### 📊 關鍵差異與根本原因對比矩陣

| 維度指標 | ❌ 衝突組 (`PK+` / `YouTube Speed Plus`) | ✅ 正常組 (`Finance Clipper` / `Gemini Nano`) | 底層機制與排斥原因深入剖析 |
| :--- | :--- | :--- | :--- |
| **1. 雙瀏覽器設定檔中的「幽靈 ID」殘留** | **Chrome 正式版存在雙重綁定或舊 ID 殘留**<br>• Speed Plus 在正式版存在舊隨機 ID (`egchfa...`) 與固定 ID (`dhdnog...`) **同時指向同一個資料夾路徑**。<br>• PK+ 曾由 `scrumclock` 重構更名為 `chrome_pk`，正式版中仍殘留舊 ID。 | **兩端設定檔乾淨無衝突**<br>• Gemini Nano 為後期開發，且限制高版本 Chrome (128+)，從未在正式版留下歷史隨機 ID。<br>• Finance Clipper 早期便完成固定公鑰注入，無歷史隨機 ID 殘留。 | **檔案路徑唯一性約束**：Chrome 底層資料庫 (`Secure Preferences`) 嚴格禁止同一個實體目錄被多個 Extension ID 同時綁定。當正式版殘留舊隨機 ID 時，新固定 ID 在另一側登入同步時便會引發 HMAC 校驗衝突或路徑搶佔，導致一側被強迫卸載。先前清理工具預設只跑了 Canary，正式版成了「未清理的盲區」。 |
| **2. 雲端同步刪除標記 (Tombstone) 競態** | **曾歷經反覆「手動移除 ➔ 重新載入」**<br>• 在重構或排查過程中，曾在某個 Chrome 實例中點擊過「垃圾桶/移除」。<br>• Google Sync 將「移除該 ID」視為帳號雲端意圖並傳播。 | **未在雲端留下無效刪除標記**<br>• 兩端均未頻繁經歷跨版本的刪除與重新登記操作。 | **雲端覆蓋互踢**：當 Canary 載入固定 ID 插件時，正式版向雲端拉取到先前記錄的「卸載/停用」狀態，正式版把本地插件幹掉並同步回雲端；Canary 下次同步又被雲端幹掉，形成「只能活一個」的互踢乒乓效應。 |
| **3. Manifest 全域排他性與權限宣告** | **具備強排他性或全域宣告**<br>• **PK+** 宣告了 `chrome_url_overrides: { newtab }`（新分頁覆蓋在帳號同步中極敏感且互斥），且帶有未配置合法金鑰的 `oauth2: { client_id: "YOUR_GOOGLE_CLIENT_ID..." }`，登入 Google 帳號時直接觸發 Identity 驗證異常。<br>• 兩者皆宣告了全域 `content_scripts`。 | **完全無排他性全域攔截**<br>• 兩者 **完全沒有宣告 `content_scripts`**。<br>• 僅使用隨選主動型介面（`action`、`side_panel`、`activeTab`），不攔截預設頁面、不搶佔背景分頁。 | **帳號級全域設定衝突**：`newtab` 覆蓋權受 Google 帳號偏好同步管轄，當兩台 Chrome 的 newtab 來源版本不一致時容易引發設定重置；而無效的 OAuth2 Client ID 在登入 Google 帳號時更會引發帳號安全機制的連鎖剔除。 |

---

## 🛠️ 六、 解決方案與防禦策略 (Step-by-Step Resolution)

### 解法 1：雙向徹底清理正式版與 Canary 的「幽靈 ID」（⭐️ 當前首要操作）
先前的清理工具僅處理了 Canary 目錄，請對 **Chrome 正式版** 也執行清理，釋放被舊隨機 ID 霸佔的實體路徑：

```powershell
# 1. 徹底關閉 Chrome 正式版與 Chrome Canary
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. 清理 Chrome 正式版的 Secure Preferences 幽靈 ID 殘留
python 1.devtools/tools/clean_ghost_extensions.py --path "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Secure Preferences" --apply

# 3. 再次確認 Chrome Canary 亦維持乾淨
python 1.devtools/tools/clean_ghost_extensions.py --apply
```

---

### 解法 2：關閉 Chrome Sync 中的「擴充功能」與「偏好設定」同步（⭐️ 最推薦，根本切斷雲端互踢）
未發布的本機開發插件不需要也不應該參與雲端同步，關閉兩側同步可徹底杜絕 Tombstone 覆蓋：
1. 分別開啟 **Chrome 正式版** 與 **Chrome Canary**。
2. 前往網址：`chrome://settings/syncSetup/advanced`（或右上角頭像 ➔「同步功能和 Google 服務」➔「管理同步項」）。
3. 將同步設定切換為 **「自訂同步 (Customize sync)」**。
4. **取消勾選「擴充功能 (Extensions)」** 與 **「設定/偏好設定 (Settings/Preferences)」**。
5. 兩側 Chrome 皆完成設定後，雲端不再傳播未封裝 ID 的刪除或停用指令。

---

### 解法 3：修正 PK+ 的 Manifest 潛在排他雷區
若在開發測試期間無需立即使用 Google Tasks / Calendar 整合，可暫時註解或移除 `chrome_pk/public/manifest.json` 中無效的 `oauth2` 假 Client ID，避免登入 Google 帳號時觸發 Identity API 報錯防護：

```json
// chrome_pk/public/manifest.json
// 💡 註解或移除未授權的預設 oauth2 假字串
// "oauth2": {
//   "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
//   "scopes": [...]
// },
```

---

### 解法 4：終極自動化常駐 — 使用 `--load-extension` 啟動參數 (⭐️ 100% 物理常駐，免疫任何同步干擾)
透過 Chrome 原生 CLI 參數 `--load-extension`，在瀏覽器啟動時強制掛載插件目錄，即使設定檔被同步干擾，啟動瞬間也會強制載入：

1. **本專案 5 款插件之啟動指令範例**：
   ```cmd
   start "" "%LOCALAPPDATA%\Google\Chrome SxS\Application\chrome.exe" --load-extension="c:\Users\G1\00.coding workspace\chrome plus project\browser-activity-monitor,c:\Users\G1\00.coding workspace\chrome plus project\chrome_gemini_nano,c:\Users\G1\00.coding workspace\chrome plus project\finance-research-clipper-oss,c:\Users\G1\00.coding workspace\chrome plus project\chrome_pk\dist,c:\Users\G1\00.coding workspace\chrome plus project\chrome_video speed plus"
   ```
2. **快捷捷徑設定**：
   - 在桌面「Chrome Canary」或「Google Chrome」捷徑上按右鍵 ➔ **內容** ➔ **目標 (Target)**。
   - 在原本的執行檔路徑後方空一格，貼上 `--load-extension="路徑1,路徑2,..."`。

---

### 解法 5：開發環境使用獨立 Profile（環境物理隔離）
* 在專門用於開發測試的 Chrome 實例（如 Canary）建立**獨立本機 Profile**（不登入主力 Google 帳號，或登入專用的開發者測試帳號）。
* 徹底杜絕主力個人帳號在日常瀏覽時的雲端同步干擾。