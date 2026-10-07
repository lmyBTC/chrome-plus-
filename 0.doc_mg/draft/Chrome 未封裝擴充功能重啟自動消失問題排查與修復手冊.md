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