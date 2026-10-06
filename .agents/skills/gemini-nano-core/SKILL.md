---
name: GeminiNano 核心規格與本機 AI 字典 (GeminiNano Core Spec)
description: 定義 chrome_gemini_nano 插件之核心定位、Prompt API 邊緣推論、本地工具代理架構與深層 SSOT 導航。
triggers: [gemini-nano, gemini nano, prompt api, 本地ai, 社群調音, pulse, 萬能路由, chrome_gemini_nano]
dependencies: []
ssot_dependencies: ["chrome_gemini_nano/chrome_gemini_nano_README.md", "chrome_gemini_nano/docs/gemini_nano_spec.md", "0.doc_mg/docs/cross_plugin_contract.md"]
---

# 專家技能：GeminiNano 核心規格與本機 AI 字典 (GeminiNano Core Spec)

本技能為 `chrome_gemini_nano` 插件之輕量調用索引。所有詳細模組矩陣、Prompt API 規範與本地自動化工具已沉澱至專屬 SSOT 文檔。

## 1. 核心定位與技術棧 (Tech Stack)
* **目錄路徑**: `chrome_gemini_nano/`
* **技術棧**: React 18 + TypeScript (前端) + Python FastAPI (本機微服務 8765 埠) (MV3)
* **核心依賴**: Chrome 內建 Prompt API (`window.ai.languageModel`)、Lucide React

## 2. 關鍵入口架構 (Key Entrypoints)
* `src/index.ts`: 核心模組門面統一出口 (Barrel Export)
* `src/components/SocialDispatcher.tsx`: 側邊欄 HITL 雙欄社群發布視圖 (X / Threads)
* `src/services/nanoService.ts`: Chrome Prompt API 適配層與 VRAM 生命週期管理
* `src/services/nanoIntentRouter.ts`: 自然語言口語解析路由器 (Cmd+K 萬能路由)
* `src/services/toneShifter.ts`: 4 大社群調音算子 (銳化/壓線/去油/切Thread)
* `src/services/pulseExtractor.ts`: 網頁卡片 DOM 提取與 1500 字元截斷
* `tools/main_dispatcher.py`: 本機 FastAPI 8765 路由閘道微服務

## 3. 邊界防禦與隔離禁忌 (Hard Rules)
1. **禁止跨插件掃描**: 嚴禁讀取或檢索其他插件目錄（如 `chrome_scrumclock`、`finance-research-clipper-oss`）之內部原始碼。
2. **黑盒契約通訊**: 跨插件協同僅透過 `0.doc_mg/docs/cross_plugin_contract.md` 定義之標準訊息結構（`DISPATCH_SOCIAL_POST`、`LOCAL_TOOL_PROXY`）。
3. **記憶體釋放保證**: 每次調用 Nano Prompt API 建立之 session，在工作完成後必須明確呼叫 `session.destroy()` 釋放本機 VRAM。
4. **優雅降級**: 本地端 Python 工具未啟動時，前端介面需顯示溫和提示，嚴禁中斷核心流程。

## 4. 深層 SSOT 導航 (Deep Reference)
* **完整功能矩陣、端到端執行管線與本地工具索引**: 詳見 `chrome_gemini_nano/chrome_gemini_nano_README.md`
* **Prompt API 與本地微服務 API 規格**: 詳見 `chrome_gemini_nano/docs/gemini_nano_spec.md`
