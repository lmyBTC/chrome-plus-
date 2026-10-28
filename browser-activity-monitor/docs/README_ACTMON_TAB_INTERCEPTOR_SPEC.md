# 🛡️ Browser Activity Monitor - 分頁攔截與黑名單管理業務規格 (AM-04 Spec)

> [!IMPORTANT]
> **SSOT 業務規格文檔 (L3)**：
> 本文檔為 `browser-activity-monitor` 之分頁攔截器（Tab Trap Interceptor）與黑名單管理控制台（Management Console）之單一業務真理源（SSOT）。

---

## 1. 模組定位與功能概述

分頁攔截器（AM-04）旨在解決使用者瀏覽網頁時遭遇的惡意彈窗、未經使用者明確手勢觸發之非同步彈窗（Tab Trap）、以及廣告跳轉分頁。
本模組提供雙層攔截引擎（Background Service Worker 物理關閉 + Content Script 頁面點擊與 `window.open` 覆寫），並結合專屬管理控制台（Options Page）提供靈活的黑名單規則配置。

---

## 2. 儲存模型與 Schema (Chrome Storage Local)

本模組使用 `chrome.storage.local` 進行規則與配置之持久化，鍵名定義如下：

### 2.1 儲存鍵名 (Storage Keys)

| 鍵名 | 類型 | 說明 |
| :--- | :--- | :--- |
| `bam_tab_blacklist_rules` | `Array<BlacklistRule>` | 黑名單規則清單 |
| `bam_tab_interceptor_config` | `InterceptorConfig` | 攔截器全域配置 |
| `bam_tab_interceptor_stats` | `InterceptorStats` | 累計與今日攔截計數統計 |

### 2.2 規則資料結構 (BlacklistRule Schema)

```typescript
interface BlacklistRule {
  id: string;               // 唯一 ID，如 "rule_1728100000000_abc"
  domain: string;           // 網域名稱（純小寫），如 "*.popunder.com" 或 "badsite.com"
  pattern: string;          // 比對特徵字串
  matchMode: 'wildcard' | 'exact'; // 比對模式：萬用字元 (*.) 或 完全匹配
  action: 'close';          // 處置動作，目前預設為即刻關閉分頁
  enabled: boolean;         // 規則啟用狀態
  createdAt: number;        // 建立時間戳記 (Epoch ms)
  updatedAt: number;        // 最後更新時間戳記 (Epoch ms)
  notes?: string;           // 自訂備註與備註標籤
}
```

### 2.3 配置資料結構 (InterceptorConfig)

```typescript
interface InterceptorConfig {
  enabled: boolean;         // 總防護開關 (預設: true)
  blockOpenerTabs: boolean; // 是否啟用手勢關聯彈窗阻斷 (預設: true)
  maxLogsCount: number;     // 最近攔截歷史佇列上限 (預設: 100)
}
```

---

## 3. 比對引擎運作機制

1. **萬用字元比對 (Wildcard Mode)**：
   - 規則以 `*.` 開頭（如 `*.popunder.com`）：自動覆蓋所有子網域及根網域（`a.b.popunder.com`、`popunder.com` 皆命中）。
   - 一般字串：自動進行後綴子網域或正規化比對。
2. **完全匹配 (Exact Mode)**：
   - 必須完全相符於 URL 主機名稱（例如 `ad.badsite.com` 僅匹配該特定子網域，不擴及其他子網域）。
3. **白名單與關鍵鏈路豁免 (Exemptions)**：
   - 包含常見 OAuth 登入（Google, GitHub, Microsoft, Apple 等）及金流閘道（Stripe, PayPal 等），杜絕正常商務操作誤殺。

---

## 4. 管理控制台架構 (Management Console / Options Page)

管理控制台註冊於 `manifest.json` 的 `options_ui`，支援在獨立新分頁開啟：

- **入口路徑**：`management/index.html`
- **設計規範**：遵循科技深色漸層主題、Glassmorphism 卡片、無依賴純原生 HTML/CSS/JS (ES Module)。
- **核心功能**：
  1. **總開關控制**：即時切換 `bam_tab_interceptor_config.enabled`。
  2. **數據指標看板**：總規則數、啟用中規則數、累計攔截次數、預設處置動作。
  3. **規則 CRUD**：新增網域、編輯備註與模式、一鍵開關切換、單筆刪除與批次清空。
  4. **搜尋與動態過濾**：關鍵字即時比對、模式過濾（全部/萬用/完全）、狀態過濾（全部/啟用/停用）。
  5. **JSON 匯入與匯出**：一鍵匯出規範格式 JSON 備份檔；支援拖曳/上傳或直接貼上 JSON 文本，包含語法校驗與衝突覆蓋防護。

---

## 5. 資料同步機制與死鎖防護

- **雙向即時同步**：
  - Sidepanel 與 Management Console 各自獨立運行。
  - 當任何一方更新 `chrome.storage.local`，各端透過 `chrome.storage.onChanged` 監聽回調更新記憶體模型並重新渲染 UI。
- **死鎖防護底線**：
  - `onChanged` 事件處理常式**僅更新本地 UI 與記憶體快取**，嚴禁在回調中再次呼叫 `chrome.storage.local.set`，確保零無限遞迴寫入與死鎖風險。

---

## 6. 使用者入口整合

1. **Sidepanel 頂部 Header**：提供「⚙️ 開啟管理中心」圖示按鈕，調用 `chrome.runtime.openOptionsPage()`。
2. **Sidepanel Tab Trap 控制台**：
   - 右側快捷按鈕：點擊即可跳轉至黑名單管理控制台。
   - 黑名單清單標題：提供「管理中心 ↗」直達連結。
3. **Chrome 擴充功能右鍵選單**：支援透過 Chrome 官方選項按鈕隨時開啟。
