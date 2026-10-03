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
- 📥 **影片字幕與筆記收集 (ScrumClock 連動)**：
  - **智慧字幕萃取**：支援動態偵測當前畫面即時字幕 (`.ytp-caption-segment`)、YouTube 逐字稿面板 (`Transcript`) 與標準 HTML5 `<track>` 字幕軌。
  - **時間戳錨定**：自動附帶影片標題與帶有目前秒數的 YouTube URL（如 `&t=120s`）。
  - **跨插件黑盒防禦傳輸**：依據 `cross_plugin_contract.md` 規範，透過防腐層白名單過濾後封裝為 `protocolVersion: 1` 的 `COLLECT_NOTE` 訊息發送至 `chrome_scrumclock`。
- ⌨️ **全域快捷鍵支援**：於 YouTube 頁面中即時切換速度與一鍵收集筆記。
- 🔄 **SPA 頁面自動適應**：利用 `MutationObserver` 監聽 YouTube SPA 路由切換與影片動態載入，保持狀態同步。
- 🔒 **最小權限原則**：僅需 `activeTab` 與 `scripting` 權限，僅在 `https://www.youtube.com/*` 網域下運作，零外部網路請求。

---

## 🧭 專案檔案架構速查 (Architecture & File Map)

| 檔案路徑 | 類型 / 職責 | 關鍵通訊與技術實作 |
| :--- | :--- | :--- |
| `manifest.json` | **擴充功能配置宣告** | Manifest V3 規範、宣告 `content_scripts` 注入目標與彈出視窗 |
| `content.js` | **頁面注入腳本 (Content Script)** | 控制 HTML5 `<video>` 的 `playbackRate`、監聽鍵盤快捷鍵、管理 A-B 循環、Shadow DOM 懸浮控制列、字幕萃取與跨插件防腐發送 |
| `popup.html` | **彈出視窗介面 (Popup UI)** | 速度選擇鈕、自訂輸入框、A-B 循環面板、ScrumClock 收集按鈕與 Extension ID 配置面板 |
| `popup.js` | **彈出視窗控制器 (Popup Logic)** | 發送訊息給 `content.js`（速度調整、循環開關、A-B 時間戳讀取、收集觸發）、連線測試與 ID 快取 |
| `icon.svg` | **向量圖示資源** | 擴充功能視覺圖示 |
| `create_icons.html` | **圖示生成輔助工具** | 可於本機開啟繪製並匯出不同解析度的 PNG 圖示 |

---

## 🛡️ 核心技術與 DOM 樣式隔離機制 (Shadow DOM Isolation)

1. **宿主樣式污染防護 (Host Style Isolation)**：
   - OSD (On-Screen Display) 控制懸浮面板與重點標記視窗 (Bookmark Modal) 必須建立在獨立的 `ShadowRoot` 內部（`element.attachShadow({ mode: 'open' })`）。
   - 所有控制器 CSS 樣式必須內嵌於 Shadow DOM，**嚴禁**全域污染宿主網頁（如 YouTube、Bilibili、Netflix）的 CSS。
2. **動態 Video 探測與生命週期監聽 (Dynamic Video Detection)**：
   - 透過 `MutationObserver` 自動監聽網頁非同步載入之 `<video>` 標籤（包含 SPA 單頁應用切換、動態廣告切換、動態換集）。
   - 對 `<video>` 進行事件代理（`play`, `ratechange`, `loadedmetadata`），保證倍速狀態持續生效與循環控制。
3. **原生無打包約束 (Vanilla JS)**：
   - 全插件維持純原生零依賴 Vanilla JS，杜絕打包工具與複雜 runtime，確保在影音平台毫秒級秒開執行。

---

## 💾 資料模型與儲存 SSOT (Storage Schema)

所有設定與書籤數據儲存於獨立之 `chrome.storage.local` 或 `chrome.storage.sync`，格式如下：

| 儲存鍵值 (Key) | 資料型態 | 預設值 / 說明 |
| :--- | :--- | :--- |
| `vsp_default_speed` | `number` | 預設播放倍速（如 `1.0`, `1.25`, `1.5`, `2.0`） |
| `vsp_speed_step` | `number` | 快捷鍵每次微調步進值（預設 `0.25`） |
| `vsp_shortcuts` | `Record<string, string>` | 快捷鍵映射表（加速、減速、時間標記、收集字幕等） |
| `vsp_site_overrides` | `Record<string, { speed: number, disabled: boolean }>` | 特定網域專屬倍速記憶 |
| `vsp_bookmarks` | `Array<VspBookmark>` | 法說會與影音時間標記儲存清單（見下方結構） |
| `scrumclockExtensionId` | `string` | 快取指定之 ScrumClock Extension ID，供跨插件通訊使用 |

### VspBookmark 實體結構
```typescript
interface VspBookmark {
  id: string;               // 唯一標識符（如 timestamp 隨機碼）
  videoId: string;          // YouTube Video ID
  videoTitle: string;       // 影片標題
  url: string;              // 帶秒數的時間戳記跳轉 URL (&t=Xxs)
  timeSeconds: number;      // 影片播放當前秒數
  timeFormatted: string;    // 格式化時間戳 (如 02:15)
  note: string;             // 投研重點備註
  createdAt: string;        // ISO 8601 建立時間
}
```

---

## ⌨️ 鍵盤快捷鍵映射 (Keyboard Shortcuts)

在 YouTube 影片播放頁面中，可使用以下鍵盤快捷鍵快速變速或收集字幕（在留言區、搜尋框等輸入焦點時自動停用，避免干擾）：

| 快捷鍵組合 | 功能說明 |
| :--- | :--- |
| `Alt + [` | **⚡ 全螢幕步進微調減速 0.25x (範圍 0.1x ~ 16.0x)** |
| `Alt + ]` | **⚡ 全螢幕步進微調加速 0.25x (範圍 0.1x ~ 16.0x)** |
| `Alt + M` | **📌 全螢幕免彈窗快捷標記當前時間戳至書籤庫** |
| `Alt + B` 或 `Ctrl + Shift + B` | **⏱️ 開啟法說會影音時間戳記重點輸入視窗 (Bookmark Modal)** |
| `Alt + S` 或 `Ctrl + Shift + S` | **📥 一鍵收集當前時間戳字幕與影片資訊至 ScrumClock 收集箱** |
| `Ctrl + Shift + 1` | 切換為 **1.0x** 正常速度 |
| `Ctrl + Shift + 2` | 切換為 **2.0x** 倍速 |
| `Ctrl + Shift + 3` | 切換為 **3.0x** 倍速 |
| `Ctrl + Shift + 4` | 切換為 **4.0x** 倍速 |
| `Ctrl + Shift + 5` | 切換為 **5.0x** 倍速 |

---

## ⏱️ 法說會影音時間戳打點與 Markdown 導出 (Timestamp Bookmarks)

- 📌 **時間戳秒級錨定**：按下 `Alt + B` 或點擊控制面板，即時抓取 HTML5 `<video>` 當前播放秒數、時間戳字串 (`02:15`) 與帶秒數之 YouTube 連結 (`&t=135s`)。
- 📝 **純淨 Shadow DOM 輸入框**：以高斯模糊面板提供專注文字輸入框，支援 `Enter` 快速儲存、`Esc` 關閉，樣式與宿主網頁 100% 物理隔離。
- 📊 **儲存與管理**：儲存於 `chrome.storage.local` 之 `vsp_bookmarks`，依影片與時間戳記排序。Popup 介面支援點擊時間戳記自動跳轉影片播放進度 (`seekToTime`)。
- 📋 **標準 Markdown 格式化匯出**：一鍵產生相容 Obsidian Dataview 與 YAML Frontmatter 之專業投研筆記，支援剪貼簿複製與 `.md` 檔案下載。

---

## 🔌 跨插件協定整合 (Cross-Plugin Integration)

本插件依據 `0.doc_mg/docs/cross_plugin_contract.md` 與 `chrome_scrumclock` 進行純資料黑盒通訊：
- **協定類型**：`COLLECT_NOTE` (protocolVersion: 1)
- **發送內容**：
  - `source`: `'video_speed_plus'`
  - `title`: 影片標題 (最高 200 字元)
  - `url`: 帶秒數的時間戳記連結 (最高 500 字元)
  - `currentTime`: 時間戳記字串 (如 `01:23` 或 `01:02:15`)
  - `text`: 萃取之即時字幕或逐字稿段落 (最高 20,000 字元)
  - `tags`: 標籤陣列（如 `['#影片學習', '#YouTube']`）
  - `type`: `'subtitle'` | `'transcript'` | `'video_timestamp'`
- **容錯與降級機制**：
  - 連線超時時間設為 6 秒。
  - 當 ScrumClock 未安裝或未指定 Extension ID 時，透過浮動 Notification 顯示友善提示，保證本插件主體功能不受任何影響。

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
- **傳送至 ScrumClock 提示「未設定 Extension ID」或「無法連線」**：
  - 請於 Chrome 擴充功能清單 (`chrome://extensions/`) 複製 ScrumClock 的 ID。
  - 開啟 VideoSpeedPlus Popup 視窗，於「📥 ScrumClock 收集器」欄位貼上並點擊「儲存」與「測試」。


