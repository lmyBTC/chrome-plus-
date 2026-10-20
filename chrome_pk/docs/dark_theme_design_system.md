# Chrome Scrum Clock - 黑暗模式 UI/UX 配色與設計系統規範

本文件為 `chrome_scrumclock` 專案提供系統化的黑暗模式（Dark Theme）配色與 UI/UX 重構設計規範，旨在將現有的淺色、硬編碼 Tailwind 樣式，重構成靈活、且具備極佳深夜專注體驗的現代暗色系設計系統。

---

## 一、 設計哲學與視覺層級 (Visual Elevation)

在黑暗模式中，為了避免純黑（`#000000`）造成的強烈對比與眼部疲勞，本系統採用**極深藍/灰（Slate-900 / Indigo-950）**作為基調，並透過**「高度海拔 (Elevation)」**概念，利用不同明度的暗色卡片背景，建立視覺上的前後層級關係。

```
[ 最底層 (Body Background) ]  -->  #090d16 (極深夜空藍)
   ↓
[ 內容容器 (Main Layout) ]    -->  #0f172a (深藍灰 Slate-900)
   ↓
[ 卡片與元件 (Cards / Popups) ] -->  #1e293b (板岩灰 Slate-800)
   ↓
[ 懸停與高亮 (Hover / Active) ] -->  #334155 (中石灰 Slate-700)
```

---

## 二、 核心色彩語意標記 (Semantic Color Tokens)

我們將色彩分為五大維度：背景、文字、邊框、狀態色與操作色。所有數值皆經過 WCAG 2.1 對比度審查，確保在暗黑背景下的閱讀易讀性（Contrast Ratio ≥ 4.5:1）。

### 1. 系統基礎色 (System Foundation)

| 語意標記 (Token) | 推薦色值 (HEX) | Tailwind 映射類別 | 應用場景描述 |
| :--- | :--- | :--- | :--- |
| **bg-base-dark** | `#0b0f19` | `bg-slate-950` | 網頁最底層背景、新分頁主背景 |
| **bg-surface-dark** | `#0f172a` | `bg-slate-900` | 主工作區容器、Sidebar 側邊欄背景 |
| **bg-card-dark** | `#1e293b` | `bg-slate-800` | 獨立任務卡片、彈出視窗、對話框 |
| **bg-hover-dark** | `#334155` | `bg-slate-700` | 元件 Hover 狀態、列表選取中狀態 |

### 2. 文字色彩階層 (Typography Levels)

| 語意標記 (Token) | 推薦色值 (HEX) | Tailwind 映射類別 | 應用場景描述 |
| :--- | :--- | :--- | :--- |
| **text-primary-dark** | `#f8fafc` | `text-slate-50` | 主要標題、強調字、按鈕白字 |
| **text-secondary-dark** | `#cbd5e1` | `text-slate-300` | 任務內容、正文、次要標題 |
| **text-muted-dark** | `#94a3b8` | `text-slate-400` | 時間戳記、輔助說明字、麵包屑 |
| **text-disabled-dark** | `#475569` | `text-slate-600` | 停用按鈕文字、未選取選單預設色 |

### 3. 邊框與分隔線 (Borders & Dividers)

| 語意標記 (Token) | 推薦色值 (HEX) | Tailwind 映射類別 | 應用場景描述 |
| :--- | :--- | :--- | :--- |
| **border-subtle-dark** | `#1e293b` | `border-slate-800` | 卡片內部微細分隔線 |
| **border-default-dark**| `#334155` | `border-slate-700` | 卡片外框、表單輸入框預設邊框 |
| **border-focus-dark**  | `#3b82f6` | `border-blue-500` | 輸入框聚焦 (Focus) 時的發光外框 |

### 4. 品牌與功能狀態色 (Accents & Status)

在黑暗模式中，狀態色應**降低飽和度，提高明度**，避免因太刺眼而產生雜訊，同時使用「發光 (Glow) 效果」替代陰影。

| 狀態 (Status) | 推薦色值 (Light) | 黑暗適配值 (Dark) | 語意調整細節 |
| :--- | :--- | :--- | :--- |
| **Primary (品牌色)** | `#3b82f6` | `#60a5fa` (Blue-400) | 調亮藍色，提高在深色背景下的對比度。 |
| **Success (成功)** | `#16a34a` | `#4ade80` (Green-400) | 用於完成的任務、已通關番茄鐘。 |
| **Warning (警告)** | `#d97706` | `#fbbf24` (Amber-400) | 用於倒數計時暫停、待回顧提醒。 |
| **Error / Danger (危險)** | `#dc2626` | `#f87171` (Red-400) | 用於放棄番茄鐘、刪除任務、離線錯誤。 |
| **Accent (紫色專注)** | `#7c3aed` | `#a78bfa` (Purple-400) | 用於 AI 協作助理相關高亮、閃電捕捉。 |

---

## 三、 元件 UI/UX 色彩對照表 (Component Specifications)

### 1. 敏捷番茄鐘 (Scrum Clock Flow)
- **每日任務簡報 (Daily Mission Briefing)**:
  - 任務輸入框背景改用 `bg-slate-800`，邊框 `border-slate-700`，聚焦時呈現藍色發光 `shadow-lg shadow-blue-500/10`。
  - 「從 Google Tasks 匯入」按鈕使用 `bg-slate-800/80` 代替白底，輔以 `border-slate-700` 邊框與綠色圖標。
- **番茄鐘計時器 (Sprint Pomodoro)**:
  - 計時大圓環採用細線霓虹配色：專注期為 `#60a5fa` 發光外框，休息期為 `#4ade80` 發光外框。
  - 倒數數字採用等寬字體並標記 `text-slate-50`，背景加入微弱的藍色漸層底（`bg-gradient-to-b from-slate-900 to-slate-950`）。
- **今日回顧 (EndOfDay Review)**:
  - 回顧卡片（每日核心戰役）改為 `bg-slate-800`，星級評分按鈕由淺灰改為 `hover:bg-slate-700` 及亮金色黃星。

### 2. 專案管理 (Project Management Board)
- **看板背景**:
  - 看板列 (Columns) 如待辦、進行中、已完成改為 `bg-slate-900/60`，減少純色填充，呈現輕透的玻璃擬態（Glassmorphism）質感。
  - 拖拽卡片（Draggable Cards）預設使用 `bg-slate-800`，在拖拽時 (active) 改為 `bg-slate-700` 並呈現微弱外發光 `shadow-md shadow-blue-500/10` |

### 3. 全域設定 (Settings Panel)
- **區塊設計**:
  - 設定面板主要卡片為 `bg-slate-800/80` 搭配 `backdrop-blur-md`。
  - 輸入欄位統一改為 `#0f172a` (底色) 與 `#334155` (邊框) 的配對，去除任何白底。
  - 切換開關 (Switch) 關閉時為 `bg-slate-700`，開啟時為 `bg-primary-500`。

---

## 四、 Tailwind CSS 配置與重構實作指南

為了讓程式碼更具備維護性，建議未來在代碼重構中採用以下方案：

### Step 1: 宣告 CSS 自定義變數 (`src/index.css`)
在 CSS 頂層宣告配色變數，方便未來一鍵更換多個黑暗/微光主題：

```css
:root {
  /* 黑暗主題變數 */
  --color-bg-base: #0b0f19;
  --color-bg-surface: #0f172a;
  --color-bg-card: #1e293b;
  --color-bg-hover: #334155;
  
  --color-text-primary: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #94a3b8;
  
  --color-border-default: #334155;
  --color-border-subtle: #1e293b;
}
```

### Step 2: 在 `tailwind.config.js` 中擴展主題
將自定義變數綁定到 TailwindCSS 的名稱中：

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        dark: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          card: 'var(--color-bg-card)',
          hover: 'var(--color-bg-hover)',
        },
      }
    }
  }
}
```

### Step 3: 重構 React 元件中的類別
在後續的 React 代碼重構中，依照語意系統替換淺色硬編碼類別：
- 原本：`<div className="bg-white border border-gray-100 p-6 rounded-xl">`
- 變更為：`<div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-slate-800 p-6 rounded-xl">`（或若要完全轉為純黑暗模式，可直接替換為 `bg-dark-card border-dark-subtle`）。
