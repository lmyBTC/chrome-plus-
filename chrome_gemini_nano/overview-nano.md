# 🧠 [Chrome Gemini Nano] 功能全景與精準架構索引 (AI 導航手冊)

> [!IMPORTANT]
> **AI 開發專用導航指引 (SSOT)**：
> 本文檔為 `chrome_gemini_nano` 插件之**單一真實來源索引 (SSOT)**。
> 本檔已命名為 `chrome_gemini_nano_README.md`，專門防止多專案工作區下的檔名衝突與 AI 上下文污染。
> 在執行任何功能開發、修復或重構前，**請優先查閱下述矩陣與索引**，直接鎖定目標檔案，嚴禁未經查表即對全目錄進行盲目掃描或巨石檔案全檔讀取，以最大化節省 Token。

---

## 🧭 1. 核心模組速查矩陣 (Core Modules Index)

所有前端模組皆遵循「門面匯出規範 (Barrel Pattern)」，透過 `src/index.ts` 集中對外匯出。

| 功能模組 | 核心職責 | 檔案路徑 | 專屬型別 / 依賴 | 備註 / 規格關聯 |
| :--- | :--- | :--- | :--- | :--- |
| **門面出口** | 集中導出 UI 元件、AI 服務與資料型別 | `src/index.ts` | `src/types.ts` | Barrel Export 統一入口 |
| **型別定義** | 社群草稿、調音算子狀態、Web AI 矩陣型別定義 | `src/types.ts` | `src/services/adapters/types.ts` | `SocialPostDraft`, `WebAIMatrixCapabilities` |
| **Web AI 矩陣閘道** | Chrome 130+ 多模型動態探測、分流排程與統一 VRAM 釋放 | `src/services/webAIGateway.ts` | `src/services/adapters/` | 單例中樞，管理所有原生會話 |
| **專用模型適配器** | 原生 summarizer / writer / rewriter / translation 封裝 | `src/services/adapters/` | `src/services/webAIGateway.ts` | 具備 Prompt API (NanoService) 透明降級 |
| **社群分發介面** | 側邊欄雙欄發布介面 (HITL)，支援 X 與 Threads 即時預覽、調音與直發 | `src/components/SocialDispatcher.tsx` | `lucide-react`, `src/services/` | 串接 WebAIGateway 分流產出雙語草稿 |
| **Gemini Nano 服務** | Chrome 內建 Prompt API 適配層、VRAM 生命週期管理、Temperature 溫控 | `src/services/nanoService.ts` | `window.ai` / `chrome.aiOriginTrial` | 矩陣降級通用 Prompt API 底座 |
| **萬能意圖路由器** | 自然語言指令解析器 (Cmd+K 路由)，將口語指令拆解為具體 Actions | `src/services/nanoIntentRouter.ts` | `src/services/nanoService.ts` | 支援番茄鐘、GTD、社群分發與筆記動作 |
| **內容卡片擷取器** | 網頁卡片 DOM 提取與 1500 字元截斷防爆保護 | `src/services/pulseExtractor.ts` | DOM API | 針對研報卡片與長文內容提取重點 |
| **社群調音算子** | 4 大社群調音變換：銳化觀點、壓線字數、去油去官腔、拆切 Threads | `src/services/toneShifter.ts` | `src/services/adapters/rewriterAdapter.ts` | 透過原生 RewriterAdapter 進行風格重寫 |

---

## 🛠️ 2. 本地自動化工具矩陣 (Local Automation Tools)

本地工具集中於 `tools/` 目錄，透過 FastAPI 本地微服務與檔案系統無縫協同。

| 工具腳本 | 核心職責 | 連線埠 / 協議 | 依賴模組 | 備註 |
| :--- | :--- | :--- | :--- | :--- |
| **本地中樞閘道** (`main_dispatcher.py`) | 本機 HTTP 微服務中樞，接收擴充插件指令並調度底層腳本 | `http://127.0.0.1:8765` (FastAPI) | `fastapi`, `uvicorn` | 支援 CORS，提供社群發布、RSS、去重端點 |
| **社群發布代理** (`social_publisher.py`) | 代理發布貼文至 X (Twitter) API 與 Meta Threads API | REST API / 本地 CLI | `requests`, `requests_oauthlib` | 支援 `--dry-run` 模擬測試模式 |
| **RSS 生成維護器** (`rss_generator.py`) | 維護本機 `feed.xml`，自動追加新貼文並滾動保留最新 30 則 | 本地 XML 檔案讀寫 | `xml.etree.ElementTree` | 產出標準 RSS 2.0 格式 |
| **歷史貼文去重** (`local_dedup.py`) | 貼文相似度防重比對，避免重複發表相同內容 | 相似度比對演算法 | `difflib.SequenceMatcher` | 預設門檻值 `>= 0.65` 發出防重警告 |
| **Obsidian 筆記歸檔** (`markdown_archiver.py`) | 自動格式化 Frontmatter 並保存 Markdown 筆記至知識庫 | 本地檔案系統 | `pathlib`, `re` | 自動清理非法字元，支援標籤與來源 URL |

---

## 🗺️ 3. 端到端執行管線架構 (End-to-End Pipeline)

```
[使用者 / 網頁內容 (DOM)]
          │
          ▼
   pulseExtractor.ts (卡片擷取 & 字數截斷)
          │
          ▼
   webAIGateway.ts (動態檢測 & 矩陣分流調度)
   ├── summarizerAdapter (重點提取)
   ├── writerAdapter (X 英文撰稿)
   ├── rewriterAdapter / translatorAdapter (Threads 繁中轉譯)
   └── nanoService.ts (透明降級兜底)
          │
          ▼
 toneShifter.ts (銳化 / 壓線 / 去油 / 拆串 ── 接入 RewriterAdapter)
          │
          ▼
SocialDispatcher.tsx (HITL 人機協同檢視與調整)
          │
          ▼ (HTTP POST 127.0.0.1:8765)
  main_dispatcher.py (FastAPI 路由閘道)
          ├─────────────────────────┬─────────────────────────┐
          ▼                         ▼                         ▼
  social_publisher.py       rss_generator.py          markdown_archiver.py
   (X / Threads 發布)        (feed.xml 維護)          (Obsidian 筆記保存)
          │
          ▼
    local_dedup.py
   (歷史內容防重審查)
```

---

## 🔌 4. 跨插件通訊與隔離規範

1. **多插件邊界防禦**：本插件保持完全獨立，前端代碼與本地工具均位於 `chrome_gemini_nano/` 命名空間內。
2. **通訊契約協定**：如需與 `chrome_scrumclock` 或其他擴充套件聯動，必須嚴格依循 `0.doc_mg/docs/cross_plugin_contract.md` 定義之 `DISPATCH_SOCIAL_POST` 與 `LOCAL_TOOL_PROXY` 標準訊息結構進行黑盒通訊。
3. **優雅降級機制**：若本地端 Python 微服務 (`127.0.0.1:8765`) 未啟動，前端介面需提示連線狀態，不引發致命錯誤。
