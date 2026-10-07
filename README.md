# 🌐 Chrome Plus - 邊緣端 AI 賦能現代化擴充功能生態系 (Monorepo)

> **專案儲存庫**：`https://github.com/lmyBTC/chrome-plus-`  
> **核心架構**：Monorepo 多插件聚合、前端大腦（Chrome 130+ Web AI Matrix / Gemini Nano）+ 後端肌肉（Python 8765 微服務）、黑盒通訊契約（Contract-First）  
> **中樞 Extension ID (ScrumClock)**：`ahiihabnbjeoeneahcgbdcofncjoclcp`（固定 2048-bit RSA SPKI 公鑰，開箱即連免配置）

---

## 🧭 一、 核心哲學與架構拓撲 (Vision & Core Philosophy)

`chrome-plus-` 是一個專為**總經與量化研究員、高階知識工作者、影音學習者與技術開發者**量身打造的現代化 Chrome 擴充功能多專案工作區。

```
                              ┌──────────────────────────────────────────────┐
                              │            Chrome Plus 核心理念              │
                              └──────────────────────┬───────────────────────┘
                                                     │
         ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
         ▼                                           ▼                                           ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│     1. 100% 獨立與單向解耦      │ │   2. 前端大腦，後端肌肉 (Edge)  │ │      3. 黑盒通訊契約驅動        │
│ 每個插件皆可單獨編譯與獨立運行，│ │ 零成本、零延遲、高隱私的本地端  │ │ 跨插件不共享狀態，僅透過特定 JSON│
│ 缺失任何模組皆能優雅降級不崩潰  │ │ Gemini Nano 作為意圖分發中樞   │ │ 協定 (Contract-First) 單向傳輸  │
└─────────────────────────────────┘ └─────────────────────────────────┘ └─────────────────────────────────┘
```

---

## 📦 二、 專案目錄樹與物理拓撲 (Physical Repository Topology)

```
chrome-plus-/
├── 0.doc_mg/                               # [架構文檔、技術規範與極致減耗工具庫]
│   ├── docs/                               # 核心架構與通訊契約手冊
│   │   ├── cross_plugin_contract.md        # 跨插件黑盒通訊契約 (v2.2 矩陣通訊規格)
│   │   ├── gemini_nano_advanced_exploitation_spec.md # Nano 極限潛能壓榨全景方案
│   │   ├── scrumclock_pm_gemini_nano_optimization.md # 敏捷專案管理 Nano 賦能藍圖
│   │   ├── token_efficient_repo_search_skill_spec.md # 極速精準檢索 Skill 解決方案規格
│   │   ├── token_saving_engineering_practices.md     # AI 輔助開發極致 Token 節約工程指南
│   │   └── repo_radar_ai_prompt_instructions.md      # AI 助理高信噪比專案檢索指示規範
│   ├── tasks/                              # 實作工作看板 (Kanban)
│   │   ├── task_gemini_nano_implementation_plan.md   # Nano 基礎與社群分發實作計畫 (100% 完成)
│   │   ├── task_web_ai_matrix_parallelism.md         # Web AI 專用 API 矩陣並行實作計畫 (100% 完成)
│   │   └── task_pm_gemini_nano_integration.md       # 敏捷專案管理 Nano 整合計畫 (100% 完成)
│   └── tools/                              # 本機 Python 微服務與開發肌肉層 (常駐 127.0.0.1:8765)
│       ├── main_dispatcher.py              # 本地 FastAPI 路由中樞 (社群、RSS、Obsidian、Radar)
│       ├── repo_radar.py                   # [高信噪比] 專案情報雷達 (大綱、章節切片、符號秒查、地圖)
│       ├── generate_symbol_index.py        # [Token 殺手] 全域符號與文檔導航地圖快取生成器
│       ├── code_skeleton.py                # [Token 殺手] 代碼骨架與簽名提煉器 (省 90% Token)
│       ├── compact_log.py                  # [Token 殺手] 終端編譯/測試日誌脫水過濾器
│       ├── local_dedup.py                  # 歷史發文相似度 SequenceMatcher 防重比對器
│       ├── rss_generator.py                # 靜態 RSS 2.0 (feed.xml) 自動追加與最新 30 則滾動淘汰
│       ├── social_publisher.py             # X API v2 與 Meta Threads API 直發代理 (含 Dry-Run)
│       └── markdown_archiver.py            # 本地 Obsidian YAML Frontmatter 剪藏歸檔器
│
├── chrome_scrumclock/                      # [系統中樞] 敏捷專注工作站 (React 18 + TS + Tailwind + Vite)
│   ├── src/
│   │   ├── core/ai/                        # 端側 AI 基礎設施
│   │   │   ├── nanoService.ts              # Chrome Prompt API 多命名空間適配與單例會話管理
│   │   │   ├── webAIGateway.ts             # Chrome 130+ 專用 Web AI API 矩陣中樞路由
│   │   │   ├── nanoPromptGuard.ts          # 端側小模型防崩潰引擎 (8 大預定路線 Few-shot 錨定)
│   │   │   ├── nanoIntentRouter.ts         # 全域自然語言萬能路由器 (Cmd+K 口語動作解構)
│   │   │   └── adapters/                   # 專用小模型適配器
│   │   │       ├── summarizerAdapter.ts    # ai.summarizer (Key-Points / TL;DR 雙模式摘要)
│   │   │       ├── writerAdapter.ts        # ai.writer (社群貼文初稿、格式與長度控制)
│   │   │       ├── rewriterAdapter.ts      # ai.rewriter (觀點銳化、字數縮減、在地去油)
│   │   │       └── translatorAdapter.ts    # translation API (離線神經翻譯)
│   │   ├── features/
│   │   │   ├── project-management/         # GTD 專案管理看板
│   │   │   │   ├── services/
│   │   │   │   │   ├── taskAIEngine.ts     # 專案管理 AI 引擎 (批次釐清、原子拆解、日報、WIP 防禦)
│   │   │   │   │   └── kanbanAuditor.ts    # 看板健康度審計 (WIP 飽和度、停滯卡片巡檢)
│   │   │   │   └── components/
│   │   │   │       ├── BoardView.tsx       # 看板主中控 (健康度徽章、一鍵理牌、WIP 衝突防護)
│   │   │   │       ├── InboxTriageModal.tsx# 收件匣一鍵釐清 HITL 審核視窗
│   │   │   │       └── TaskDetailDrawer.tsx# 卡片詳情抽屜 (整合 ai.writer 原子任務拆解)
│   │   │   ├── scrumclock/components/
│   │   │   │   └── EndOfDayReview.tsx      # 日終成果覆盤 (ai.summarizer 提煉 + Obsidian 落盤)
│   │   │   └── toolbox/tools/social-dispatcher/ # 社群分發工具
│   │   │       ├── SocialDispatcher.tsx    # 側欄雙欄發布審核 (X / Threads + 矩陣狀態指示)
│   │   │       └── toneShifter.ts          # 4 大原生改寫調音算子 (銳化/壓線280/去油/切Thread)
│   │   ├── content/
│   │   │   └── pulseExtractor.ts           # 針對 pulse.html 與研報的 DOM 卡片提取器
│   │   └── background.ts                   # 計時守護、DNR 網路阻擋、chrome.idle 閒置巡檢、路由派發
│   └── manifest.json                       # ScrumClock Manifest V3 配置
│
├── finance-research-clipper-oss/           # [投研採集] 財經研報與個股爬蟲 (原生 JS, 零依賴)
│   ├── dashboard.html                      # 獨立深色投研儀表板 (估值沙盒、分析師目標價)
│   └── sidepanel.html                      # 側邊欄快速查詢與當前分頁爬取 (支援一鍵推入今日戰役)
│
├── chrome_video speed plus/                # [影音學習] 影音倍速與字幕筆記採集 (Shadow DOM)
│   ├── content.js                          # 全網 HTML5 變速 (0.1x~16x) 與 A-B 循環播放
│   └── options.html                        # 支援 Alt+S 一鍵字幕提取並推送至 ScrumClock
│
├── browser-activity-monitor/               # [資安防護] 瀏覽器活動與流量監控 (原生 JS, IndexedDB)
│   ├── sidepanel.html                      # 80% 原生常駐 (封包/下載/權限) + 20% 隨選深入探針
│   └── manifest.json                       # 獨立審計版擴充功能
│
├── README.md                               # [本檔] 專案全景架構導航手冊
└── 使用說明.md                             # 終端使用者全功能中文操作指南
```

---

## 🧩 三、 四大擴充模組生態系矩陣 (Ecosystem Matrix)

| 模組名稱 | 載體型態 | 技術棧 | 領域職責 | 與其他模組的協同行為 |
| :--- | :--- | :--- | :--- | :--- |
| **ScrumClock** | New Tab, Side Panel, Popup | React 18, TypeScript, TailwindCSS, Vite | **生態系中樞**。負責敏捷衝刺、GTD 看板、Web AI 矩陣調度、社群雙語分發與本機 Python 微服務橋接。 | 接收來自各插件的 `CREATE_TASK` 契約；向本機 `:8765` 派發工具請求。 |
| **Finance Clipper** | 獨立 Dashboard, Side Panel | 原生 JS (ES6+), CSS Grid | **財經深度採集**。爬取 Google / Yahoo / Goodinfo 財務指標、分析師目標價、估值沙盒。 | 點擊「加入今日戰役」一鍵將個股研報封裝為任務，推入 ScrumClock 收件匣。 |
| **Video Speed Plus** | Content Script (Shadow DOM) | 原生 JS | **影音倍速與筆記**。YouTube 0.1x~16x 變速、A-B 段落循環、法說會影音打點。 | 按下 `Alt + S` 抽取當前時間戳字幕，直推 ScrumClock 待辦池。 |
| **Activity Monitor** | Side Panel, Background Worker | 原生 JS, IndexedDB | **網路與隱私審計**。全域網路請求、下載行為審查、Origin 敏感權限透視。 | 獨立運行，亦可內嵌於 ScrumClock 工具箱中。 |

---

## ⚡ 四、 Chrome 130+ Web AI 矩陣與防崩潰技術

專案徹底解耦傳統「所有任務塞給通用 Prompt API」的低效模式，全面對接 Chrome 原生蒸餾小模型：

```
                              ┌──────────────────────────────────────────────┐
                              │            WebAIGateway (中樞路由)            │
                              └──────────────────────┬───────────────────────┘
                                                     │
         ┌───────────────────┬───────────────────────┼───────────────────────┐
         ▼                   ▼                       ▼                       ▼
┌─────────────────┐ ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  ai.summarizer  │ │    ai.writer    │     │   ai.rewriter   │     │   translation   │
│ 原生 Key-points │ │ 社群初稿、格式與│     │ 觀點銳化、壓線  │     │ 離線神經翻譯，  │
│ TL;DR，快 2~3 倍│ │ 長度精準控制    │     │ 280、在地去油   │     │ 雙向轉譯不跑版  │
└─────────────────┘ └─────────────────┘     └─────────────────┘     └─────────────────┘
         │                   │                       │                       │
         └───────────────────┴───────────┬───────────┴───────────────────────┘
                                         ▼ (API 未就緒時透明降級)
                            ┌────────────────────────┐
                            │ NanoPromptGuard 引擎   │
                            │ 8 大預定路線 Few-shot   │
                            │ 徹底消除「。」與「🥰」  │
                            └────────────────────────┘
```

1. **防小模型退化 (NanoPromptGuard)**：
   - 解決端側 1.8B~3B 小模型因「輸入饑餓 (< 20 字)」導致的 EOS 崩潰（回覆單一標點或 Emoji）。
   - 導入「**英文 System Prompt 骨架 + 繁中 Few-shot 錨定 + 瞬時模板兜底**」，全面覆蓋原子拆解、日終總結、收件匣分類、調音、靈感潤飾、研報獵犬、字幕轉清單與 WIP 衝突審查 8 大場景。
2. **全域自然語言命令 (NanoIntentRouter)**：
   - 支援 `Cmd+K` 或側欄輸入口語（例：「*專注 45 分鐘比特幣研報，擋掉社群網站*」），150ms 內解析為標準 Action 陣列派發給 Background。

---

## 🛠️ 五、 開發者極致節省 Token 工具鏈 (Repo Radar Suite)

本專案內建一套專為 AI Assistant 與開發者打造的「確定性（Deterministic）腳本庫」，嚴禁使用 LLM 暴力全文掃描：

| 工具腳本 | 核心指令 / 用法 | 解決痛點 | 預期減耗效益 |
| :--- | :--- | :--- | :--- |
| **`repo_radar.py`** | `python 0.doc_mg/tools/repo_radar.py map`<br>`python 0.doc_mg/tools/repo_radar.py section <file> -H "章節"`<br>`python 0.doc_mg/tools/repo_radar.py symbol <Name>` | 解決盲目全檔讀取與反覆 grep 找檔案的浪費 | 檢索階段節省 **90% ~ 98%** Tokens |
| **`generate_symbol_index.py`** | `python 0.doc_mg/tools/generate_symbol_index.py` | 產出全專案 `<10KB` 的 `.repo_index.json` 快取地圖 | 代碼定位 **0 毫秒**、不到 20 tokens |
| **`code_skeleton.py`** | `python 0.doc_mg/tools/code_skeleton.py <file>` | 掏空實作主體，僅保留 TypeScript/Python 介面與簽名 | 查詢依賴時節省 **85% ~ 95%** Tokens |
| **`compact_log.py`** | `npm run build 2>&1 \| python 0.doc_mg/tools/compact_log.py` | 過濾千行 node_modules 堆疊，僅保留致命報錯行號 | 除錯階段節省 **75% ~ 90%** 上下文 |

---

## 🚀 六、 快速啟動指引 (Quick Start)

### 1. 啟動本機微服務中樞 (後端肌肉)
```bash
# 安裝 Python 依賴
pip install fastapi uvicorn requests

# 啟動微服務 (常駐 127.0.0.1:8765)
python 0.doc_mg/tools/main_dispatcher.py
```

### 2. 構建並加載 ScrumClock (前端大腦)
```bash
cd chrome_scrumclock
npm install
npm run build

# 載入擴充套件：
# 打開 Chrome -> 進入 chrome://extensions/ -> 開啟「開發人員模式」 -> 點擊「載入未封裝項目」 -> 選擇 chrome_scrumclock/dist 目錄
```

### 3. 建置專案全域符號快取 (開發者推薦)
```bash
python 0.doc_mg/tools/generate_symbol_index.py
```