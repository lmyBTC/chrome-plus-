問題描述：擴充套件稽核日誌高頻寫入與 DOM 節點過載導致效能降級1. 問題概述在執行「組件資源監視器」時，系統觸發「需優化」警告。經網路稽核日誌（bam_audit_logs.json）與效能面板分析，擴充套件在監聽背景網路事件時，因高頻串流與遙測請求引發密集的 IndexedDB 單筆寫入，加上前端日誌列表採用全量渲染機制，導致面板 DOM 節點數量快速突破流暢閾值，對套件行程造成顯著的 I/O 與渲染負載。   2. 現況數據指標（As-Is Metrics）整體狀態：需優化（模組總耗時 659.2ms，佇列積壓 1，平均延遲 0.8ms）。   DOM 節點總數：1,330 個（已觸發「DOM 節點數量過多」警示）。   JS 記憶體佔用：1.18 MB。   主要耗時模組分佈：IndexedDB 寫入：210 次，總耗時 210.8ms（平均 1.0ms/次）。   分頁狀態同步（Sync Tabs）：16 次，總耗時 186.3ms（平均 11.6ms/次）。   原生權限審查（Native Auth）：9 次，總耗時 130.4ms（平均 14.5ms/次）。   3. 根因分析（Root Cause Analysis）高頻高密度網路封包未做過濾或採樣YouTube 等串流媒體在背景播放時，會持續發送大量微小資料區塊（如 videoplayback 分塊 rn=2 至 rn=23）以及遙測心跳（watchtime、qoe、heartbeat）。   Google 內部服務（如 signaler-pa 長輪詢/WebSocket 刷新、[play.google.com/log](https://play.google.com/log)）產生連續性請求。   擴充套件無差別攔截各分頁的所有連線，導致短時間內產生大量日誌條目。   I/O 寫入缺乏快取與批次機制（Unbatched Transactions）每捕獲單一網路事件即立刻發起一次獨立的 IndexedDB 交易（Transaction），短短 4 分鐘內觸發 210 次磁碟寫入調度，佔據主模組第一大耗時。   前端渲染未引入虛擬滾動（Full DOM Rendering）UI 面板將所有捕獲的審查紀錄直接掛載於 DOM 樹上，造成節點數累積達 1,330 個，增加瀏覽器排版計算（Reflow）與繪製（Repaint）成本。   4. 影響範圍（Impact Assessment）擴充套件端（主要影響）：面板操作、清單滾動與分頁切換出現微卡頓與掉幀（Jank）。若長時間開啟（數小時以上），日誌與 DOM 節點持續線性膨脹，存在記憶體洩漏與擴充套件閃退（Crash / OOM）風險。主機與系統端（間接影響）：頻繁的磁碟 I/O 與事件調度阻礙 CPU 進入深度睡眠狀態，導致筆記型電腦異常耗電與溫度升高。對瀏覽器本體與一般分頁（如 YouTube 影音播放）的記憶體佔用影響極低，未造成直接當機。   5. 建議解決方案（Action Items）引入虛擬滾動（Virtual Scrolling）：前端改為僅渲染可視區域節點（約 15~20 筆），將總 DOM 節點數壓低至 200 個以內。   實作寫入緩衝佇列（Batch/Buffer Write）：建立記憶體緩衝區（如暫存 20 筆或防抖 1 秒聚合），改以單一 readwrite 交易批次寫入 IndexedDB，大幅降低 I/O 頻率。設定日誌過濾與黑白名單機制：增加過濾規則，預設忽略或採樣非關鍵的串流媒體分塊（googlevideo.com）與背景遙測心跳。   



針對這個套件的兩大瓶頸（**前端 DOM 膨脹**與 **後端高頻 IndexedDB 寫入**），可從以下四個維度進行具體優化與實作改造：

---

### 一、 前端渲染優化：實作虛擬滾動（Virtual Scrolling）

面板目前將 200 多筆紀錄全數渲染至 DOM 樹中（產生 1,330 個節點），需改為「視窗可見區域渲染」，將 DOM 節點數量固定在 20~30 個以內。

1. **若使用原生 JavaScript / Web Components**：
* 透過容器的 `scroll` 事件監聽滾動高度 `scrollTop`。
* 計算目前視窗可見索引區間：
```javascript
const ITEM_HEIGHT = 48; // 每個日誌項目固定高度 (px)
const VISIBLE_COUNT = Math.ceil(containerHeight / ITEM_HEIGHT);
const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2); // 上方緩衝區
const endIndex = Math.min(totalLogs.length, startIndex + VISIBLE_COUNT + 4); // 下方緩衝區

```


* 頂部與底部使用空白 `div` 或 `transform: translateY(...)` 撐開滾動條高度，容器內只掛載 `startIndex` 到 `endIndex` 的元素。


2. **快速替代方案（簡單分頁 / 上限截斷）**：
* 若暫時不重構為虛擬滾動，可先設置「固定渲染上限」（例如只保留最新 50 筆），舊資料透過「載入更多」或點擊分頁查看，直接避免節點累積。





---

### 二、 儲存層優化：IndexedDB 批次緩衝寫入（Batch Write）

目前每次網路封包抵達都啟動一次獨立的 `readwrite` Transaction（4 分鐘內高達 210 次，耗時 210.8ms），需改用「時間與數量雙觸發的批次寫入佇列」。

```javascript
class LogBatchWriter {
  constructor(db, batchSize = 30, flushInterval = 1500) {
    this.db = db;
    this.batchSize = batchSize;      // 累積達 30 筆寫入一次
    this.flushInterval = flushInterval; // 或每 1.5 秒寫入一次
    this.queue = [];
    this.timer = null;
  }

  push(logEntry) {
    this.queue.push(logEntry);
    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  async flush() {
    clearTimeout(this.timer);
    this.timer = null;
    if (this.queue.length === 0) return;

    const entriesToWrite = [...this.queue];
    this.queue = [];

    // 以單一 transaction 批次寫入多筆資料
    const tx = this.db.transaction('audit_logs', 'readwrite');
    const store = tx.objectStore('audit_logs');
    for (const item of entriesToWrite) {
      store.add(item);
    }
    await tx.done;
  }
}

```

> **效益**：將 210 次磁碟事務合併為 5~7 次批次寫入，I/O 開銷可直接降低 80%~90%。

---

### 三、 網路層優化：日誌噪音過濾（Noise Filter & Noise Gate）

從日誌可發現，大量請求屬於串流分塊（`googlevideo.com` 的 `rn=2`~`rn=23`）與心跳信號（`watchtime`、`qoe`、`netcheck.gif`），這些通常不具備單獨稽核的價值。

1. **預設靜態與媒體分塊過濾**：
* 在 background 攔截層（如 `webRequest` 或 `declarativeNetRequest`）設置過濾規則：
```javascript
const NOISY_PATTERNS = [
  /googlevideo\.com\/videoplayback/,
  /google\.com\/search\/warmup\.html/,
  /netcheck\.gif/,
  /\/player\/heartbeat/,
  /google-analytics\.com/
];

function shouldAudit(url) {
  return !NOISY_PATTERNS.some(regex => regex.test(url));
}

```




2. **UI 提供「噪音過濾開關」**：
* 面板提供「隱藏串流/遙測請求」選項，預設開啟。只有在開發者明確需要分析多媒體封包時才記錄。



---

### 四、 資料生命週期與淘汰機制（TTL & Eviction）

避免擴充套件長時間運作導致 IndexedDB 無限擴張：

* **上限保留機制（Cap Limit）**：資料庫僅保留最新的 1,000 ~ 2,000 筆稽核紀錄。
* **淘汰排程（Eviction Policy）**：
* 每次批次寫入或每 10 分鐘檢查一次紀錄總量，若超出上限，利用 IndexedDB 的 `IDBKeyRange` 批量刪除最舊的資料（FIFO）：
```javascript
// 範例：刪除超過 2000 筆以外的舊資料
const count = await store.count();
if (count > 2000) {
  const deleteCount = count - 2000;
  let cursor = await store.openCursor();
  for (let i = 0; i < deleteCount && cursor; i++) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
}

```





---

### 優化後預期成效

| 項目 | 優化前（現狀） | 優化後（預期） |
| --- | --- | --- |
| **DOM 節點數** | 1,330 個（警示狀態）

 | **< 150 個**（進入綠色健康閾值） |
| **IndexedDB 寫入耗時** | 210.8ms / 210次（平均 1.0ms/次）

 | **< 20ms / 7次**（批次寫入） |
| **面板滾動流暢度** | 易出現掉幀、輸入卡頓 | 恆定 60 FPS 順暢滾動 |
| **背景 CPU / 耗電** | 持續頻繁喚醒磁碟 I/O

 | 降低 70% 以上背景喚醒頻率 |