# YouTube Speed Plus (Video Speed Plus) 組成元件規格字典

> 文件路徑：`chrome_video speed plus/docs/spec-vidspeed-components.md`  
> 模組代號：`vidspeed`  
> 架構規範：Manifest V3、零打包 Vanilla JS、Shadow DOM 物理隔離

---

## 1. 架構概述與設計原則

Video Speed Plus 專注於影音研報與 YouTube 播放控制，核心架構具備以下特性：
* **零構建與即載即用**：不依賴任何編譯或打包工具，直接以純原生 JavaScript (ES Modules / Vanilla JS) 運行於瀏覽器中。
* **Shadow DOM 樣式隔離底線**：所有注入到 YouTube 宿主網頁的 UI 元素，一律封裝於 `#shadow-root (open)` 內部，杜絕外部 CSS 洩漏或污染宿主網頁樣式。
* **SPA 路由感知**：針對 YouTube 單頁應用程式 (SPA) 特性，主動監聽導航與 DOM 變化，確保影片切換時控制器不失效。

---

## 2. 組成元件清單 (Component Inventory)

### 2.1 注入與懸浮容器 (Injected UI Containers)
* **`ShadowHostContainer` (`shadowHost`)**
  * 實體位置：`content.js`
  * 職責：作為宿主 DOM 節點掛載於 YouTube 頁面（例如標題列下方或播放器旁）。
  * 隔離機制：調用 `attachShadow({ mode: 'open' })` 產生 `shadowRoot`，內部掛載獨立樣式 `<style>` 與按鈕 DOM。
* **`FloatingSpeedBar` (浮動速度控制條)**
  * 實體位置：`content.js`
  * 職責：呈現預設倍速快捷按鈕 (1.0x, 1.25x, 1.5x, 1.75x, 2.0x, 2.5x, 3.0x) 與自訂步進按鈕。
  * 狀態同步：監聽 `<video>` 之 `ratechange` 事件並即時更新高亮狀態。
* **`LoopControlOverlay` (A-B 循環指示器)**
  * 實體位置：`content.js`
  * 職責：即時顯示當前 A 點、B 點時間戳與已循環次數 / 最大循環次數。

### 2.2 核心探針與控制器 (Core Probes & Controllers)
* **`VideoElementDetector` (`findVideoElement`)**
  * 選擇器矩陣：`['video', '#movie_player video', '.html5-video-player video', 'video[src]']`
  * 降級容錯：若初始化未探測到節點，自動啟動 `MutationObserver` 進行非同步節點探測。
* **`TitleObserver` (`observeTitleAndInject`)**
  * 職責：監聽 `#title h1` 或 YouTube 標題容器，當影片切換時重新定位並掛載快捷按鈕。
* **`LoopEngine` (`handleTimeUpdate`)**
  * 狀態模型：`isLooping`, `loopStart`, `loopEnd`, `maxLoopCount`, `currentLoopCount`
  * 機制：當 `currentTime >= loopEnd` 且符合次數約束時，精確觸發 `currentTime = loopStart` 回彈。
* **`HotkeyInterceptor` (鍵盤快捷鍵攔截器)**
  * 職責：監聽全域 `keydown` 事件，支援自訂步進微調、A-B 打點快捷鍵。
  * 防衝突：若當前焦點位於 `INPUT`, `TEXTAREA` 或 `contenteditable` 容器時自動忽略。

### 2.3 彈窗控制面板 (Extension Popup)
* **`PopupController` (`popup.js` / `popup.html`)**
  * 核心功能：
    1. 當前標籤頁影片狀態檢測與連線探針。
    2. 滑桿與數值輸入框雙向綁定 (0.1x ~ 16.0x 精細調速)。
    3. A-B 循環設定面板（起訖點手動輸入與重設）。
    4. ScrumClock / 跨插件連線連動設定開關。

---

## 3. 資料與通訊模型 (Data & Messaging Model)

### 3.1 本地儲存模型 (Chrome Storage Local)
```json
{
  "vidspeed_default_rate": 1.0,
  "vidspeed_hotkeys": {
    "speedUp": "KeyD",
    "speedDown": "KeyS",
    "resetSpeed": "KeyR",
    "setPointA": "KeyQ",
    "setPointB": "KeyW",
    "toggleLoop": "KeyE"
  },
  "vidspeed_ui_settings": {
    "showFloatingBar": true,
    "theme": "dark"
  }
}
```

### 3.2 訊息傳遞協定 (Runtime Message Passing)
* **`SET_SPEED`**: Popup 發送至 Content Script，傳入 `{ rate: number }`，即時更新 `video.playbackRate`。
* **`SET_LOOP_POINTS`**: 設定 `{ loopStart: number, loopEnd: number, maxCount: number }`。
* **`GET_VIDEO_STATUS`**: 查詢當前播放速率、影片總時長與播放位置。
* **`NOTIFY_SCRUM_CLOCK`**: 發送時間打點與影片標題至 ScrumClock 或研報採集器。

