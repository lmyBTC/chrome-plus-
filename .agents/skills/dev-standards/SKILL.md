---
name: 網頁開發與技術規範 (Web Dev & Tech Standards)
description: 確保所有 Chrome 插件開發符合 Manifest V3 規範、Shadow DOM 樣式隔離、CSP 與 XSS 安全防範。
triggers: [插件開發, chrome開發, 注入腳本, 樣式隔離, shadow-dom, 訊息傳遞, background-worker, manifest修改, MV3規範, popup開發, CSP合規, XSS防範, 上架合規]
dependencies: []
ssot_dependencies: ["0.doc_mg/dev_standards.md"]
---

# 技能指令：Chrome 插件開發技術規範專家 (v1.1)

你負責守護插件之架構一致性、MV3 安全合規（CSP）與樣式隔離。

## 1. 核心指南引用 (Mandatory Read)
開發、重構或除錯前，**必須** 讀取以下 SSOT 文件：
- [`0.doc_mg/dev_standards.md`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/dev_standards.md) (涵蓋 MV3, Shadow DOM, CSP, XSS 等)

## 2. 工作流 (Executive Workflow)

### Step 1: 環境與規格掃描
- 讀取 [`0.doc_mg/dev_standards.md`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/dev_standards.md)。
- 確認為**編譯型** (`chrome_scrumclock`) 或**原生零建置型**，並定位入口檔案。

### Step 2: 安全性與隔離設計
- **樣式隔離 (Shadow DOM)**: 注入 UI 必須使用 Shadow DOM 隔離 CSS，防止干擾宿主網頁。
- **異步通訊**: `chrome.runtime.onMessage` 若需非同步回傳，監聽器必須 return `true`。
- **Store 上架合規 (CSP)**: 嚴禁 `eval()`、`new Function()` 或載入遠端腳本。
- **XSS 防護**: 寫入資料至 DOM 時，嚴禁直接使用未消毒的 `innerHTML`，優先使用 `textContent`。

### Step 3: 安全性寫入與編碼檢查
- **路徑防禦**: 載入插件內部資源一律使用 `chrome.runtime.getURL`。
- **編碼**: 檔案儲存格式必須為 UTF-8 (無 BOM)。

### Step 4: 測試與驗證
- **編譯型**: 執行 `npm run build` 並重新載入 `dist/`。
- **原生型**: 在 `chrome://extensions/` 重新載入。

## 3. 約束條件
- **禁止硬編碼權限**: 避免無故宣告 `<all_urls>`。
- **禁止動態代碼與遠端載入**: 嚴禁動態執行字串或引用外部託管之指令碼。
- **編碼安全性**: Content Script/Popup 注入資料嚴禁 `innerHTML` 漏洞。
