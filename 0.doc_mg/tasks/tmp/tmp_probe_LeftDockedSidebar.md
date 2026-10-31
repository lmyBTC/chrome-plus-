# Probe Cache: LeftDockedSidebar_GeminiCoexist

## 1. 現狀探勘分析
- **Chrome 原生 API 瓶頸**:
  - `chrome.sidePanel.open({ windowId })` 呼叫的是 Chrome 視窗唯一的原生 Side Panel 宿主容器。
  - Chrome 官方 Gemini 側邊欄 (Ask Gemini) 亦共用該容器。
  - 一個 Window 僅能承載一個原生 SidePanel，兩者彼此搶佔互斥，官方側欄開啟時會覆蓋 PK+，反之亦然。
- **現行進入點**:
  - `chrome_pk/src/entries/popup/main.tsx` 透過 `(chrome.sidePanel as any).open({ windowId })` 開啟原生側欄。
  - `chrome_pk/src/entries/sidebar/index.html` + `main.tsx` 為側欄 UI（含番茄鐘、ToolboxHub、AIAssistantView）。
  - `chrome_pk/src/content.ts` 目前僅掛載 `ADD_FOCUS_OVERLAY`、`REMOVE_FOCUS_OVERLAY`、`GET_CURRENT_TASKS`。
  - `chrome_pk/public/manifest.json` 中 `web_accessible_resources` 尚未開放 `src/entries/sidebar/*` 供 iframe 嵌入。

## 2. 解決方案架構 (In-Page Docked Left-Sidebar with Shadow DOM)
- 保持官方 Gemini 於視窗右側（原生 SidePanel）。
- 在 `content.ts` 注入獨立於網頁 DOM 樣式的 Shadow DOM 宿主，於視窗**左側**停靠 PK+ 側欄。
- 透過 iframe 載入 `chrome-extension://<id>/src/entries/sidebar/index.html?mode=docked`。
- 支援「推擠網頁 (Push Layout)」與「浮層覆蓋 (Floating Overlay)」，不遮蔽網頁內容。
- 快捷鍵或 Popup 一鍵呼叫，雙軌並行零衝突。

