# 🎬 [VideoSpeed] YouTube Speed Plus - 影片播放速度與 A-B 循環控制 (AI 導航手冊)

> [!IMPORTANT]
> **AI 開發專用導航指引 (SSOT)**：
> 本文檔為 `chrome_video speed plus` (YouTube Speed Plus) 之**單一真實來源說明與架構手冊 (SSOT)**。
> 本檔已命名為 `VIDEOSPEED_README.md`，專門防止多專案工作區下的檔名衝突與 AI 上下文污染。
> 修改或維護前，請直接鎖定目標檔案，切勿讀取錯誤插件之腳本。

---

## 🌟 核心功能亮點 (Key Features)

- ⚡ **極速與微調變速**：支援預設 0.25x ~ 3x 快速切換按鈕，並支援自訂輸入 **0.1x 到 16x** 超寬幅播放速度。
- 🔁 **多功能循環播放**：
  - **整片循環**：自訂連續播放次數（填入 0 代表無限次循環）。
  - **A-B 段落精準循環**：支援手動輸入秒數或點擊按鈕一鍵擷取當前播放時間作為「起點 (A)」與「終點 (B)」，並在區間內重複播放。
- ⌨️ **全域快捷鍵支援**：於 YouTube 頁面中即時切換速度。
- 🔄 **SPA 頁面自動適應**：利用 `MutationObserver` 監聽 YouTube SPA 路由切換與影片動態載入，保持狀態同步。
- 🔒 **最小權限原則**：僅需 `activeTab` 與 `scripting` 權限，僅在 `https://www.youtube.com/*` 網域下運作，零外部網路請求。

---

## 🧭 專案檔案架構速查 (Architecture & File Map)

| 檔案路徑 | 類型 / 職責 | 關鍵通訊與技術實作 |
| :--- | :--- | :--- |
| [`manifest.json`](manifest.json) | **擴充功能配置宣告** | Manifest V3 規範、宣告 `content_scripts` 注入目標與彈出視窗 |
| [`content.js`](content.js) | **頁面注入腳本 (Content Script)** | 控制 HTML5 `<video>` 的 `playbackRate`、監聽鍵盤快捷鍵、管理 A-B 循環定時檢測 |
| [`popup.html`](popup.html) | **彈出視窗介面 (Popup UI)** | 速度選擇鈕、自訂輸入框、A-B 循環設定輸入面板 |
| [`popup.js`](popup.js) | **彈出視窗控制器 (Popup Logic)** | 發送訊息給 `content.js`（速度調整、循環開關、A-B 時間戳讀取） |
| [`icon.svg`](icon.svg) | **向量圖示資源** | 擴充功能視覺圖示 |
| [`create_icons.html`](create_icons.html) | **圖示生成輔助工具** | 可於本機開啟繪製並匯出不同解析度的 PNG 圖示 |

---

## ⌨️ 鍵盤快捷鍵映射 (Keyboard Shortcuts)

在 YouTube 影片播放頁面中，可使用以下鍵盤快捷鍵快速變速：

| 快捷鍵組合 | 功能說明 |
| :--- | :--- |
| `Ctrl + Shift + 1` | 切換為 **1.0x** 正常速度 |
| `Ctrl + Shift + 2` | 切換為 **2.0x** 倍速 |
| `Ctrl + Shift + 3` | 切換為 **3.0x** 倍速 |
| `Ctrl + Shift + 4` | 切換為 **4.0x** 倍速 |
| `Ctrl + Shift + 5` | 切換為 **5.0x** 倍速 |

---

## 🛠️ 安裝與本機載入說明

1. 開啟 Chrome 瀏覽器，網址列輸入 `chrome://extensions/` 開啟擴充功能管理。
2. 開啟右上角的「**開發人員模式**」。
3. 點擊「**載入未封裝項目**」。
4. 選擇本專案目錄 `chrome_video speed plus`。
5. 前往任何 YouTube 影片頁面即可開始使用。

---

## 🔍 疑難排解 (Troubleshooting)

- **速度設定或按鍵無反應**：
  - 確認當前頁面包含 HTML5 影片元素 (`<video>`)。
  - YouTube 為單頁應用 (SPA)，若影片切換後失去響應，重新整理頁面一次即可重新掛載監聽。
- **A-B 循環跳轉偏差**：
  - 終點時間必須大於起點時間。
  - HTML5 影片在某些編碼格式下 seek 會有微小關鍵影格 (Keyframe) 差異，屬正常現象。
