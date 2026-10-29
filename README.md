# 🌐 Chrome Plus - 邊緣端 AI 賦能現代化擴充功能生態系 (Monorepo)

> **專案儲存庫**：`https://github.com/lmyBTC/chrome-plus-`  
> **核心架構**：Monorepo 多插件聚合、前端大腦（Chrome 130+ Web AI Matrix / Gemini Nano）+ 後端肌肉（Python 8765 微服務）、黑盒通訊契約（Contract-First）  
> **中樞 Extension ID (PK+)**：`ahiihabnbjeoeneahcgbdcofncjoclcp`（固定 2048-bit RSA SPKI 公鑰，開箱即連免配置）

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
│   ├── docs/                               # 核心架構、規範與中央 SSOT 地圖
│   │   ├── index-ssot.md                   # [中央導航] 全域 SSOT 地圖與文檔總覽
│   │   ├── spec-cross-plugin-contract.md   # 跨插件黑盒通訊契約 (v2.2 矩陣通訊規格)
│   │   ├── spec-dev-standards.md           # 網頁與 Chrome 插件開發技術標準 (SSOT)
│   │   ├── guide-token-optimization.md     # 全域 Token 節約與工程減耗指南 (SSOT)
│   │   ├── guide-skills-synergy.md         # 三大技能綜效流程指南 (token-saver / task-protocol / repo-radar)
│   │   ├── guide-task-manager.md           # 任務協議管理與 4-Gate 研發流程規範 (SSOT)
│   │   ├── spec-google-ecosystem.md        # Google 生態雙軌串接規格書 (SSOT)
│   │   ├── spec-versioning.md              # 全專案版本號管理與發布合規規範 (SSOT)
│   │   ├── guide-repo-radar.md             # AI 助理高信噪比專案檢索指示規範
│   │   ├── guide-gas-deployment.md         # GAS 部署與雲端同步操作指南
│   │   ├── matrix-analyst-friction.md      # 投研員高頻工作流摩擦力與落地場景矩陣
│   │   └── matrix-pm-friction.md           # 專案經理衝刺工作流摩擦力矩陣
│   ├── tasks/                              # 實作工作看板與任務生命週期 (Kanban & Lifecycle)
│   │   ├── task_template_v2.md             # 標準任務卡生命週期模板
│   │   └── archive/                        # 已結案歷史任務封存歸檔 (依模組分類)
│   └── draft/                              # 待提煉之各插件演進草稿與備忘
│
├── 1.devtools/                             # [自動化工具鏈與合規審計體系]
│   ├── overview-devtools.md                # [模組首頁] DevTools 工具箱架構與指令手冊
│   └── tools/
│       ├── audit_suite.py                  # 全自動一鍵端對端合規與隔離審計套件 (Gate 3 核心)
│       ├── audit_ssot.mjs                  # 全域 SSOT 單一真理源與命名規範審計器
│       ├── audit_manifests.py              # 全專案 Manifest V3 合規審計工具
│       ├── audit_plugin_isolation.py       # 多插件實體檔案與引用隔離性審計防線
│       ├── audit_markdown_links.py         # Markdown 連結與死鏈靜態掃描器
│       ├── doc_cross_ref.py                # 文檔交叉引用與斷鏈審計工具
│       ├── version_manager.py              # 全專案版本號自動化管理與同步 CLI 工具
│       ├── task_cli.py                     # 任務生命週期管理工具 (初始化/封存歸檔)
│       ├── repo_radar.py                   # [高信噪比] 專案情報雷達 (大綱、章節切片、符號秒查、地圖)
│       ├── generate_symbol_index.py        # [Token 殺手] 全域符號與文檔導航地圖快取生成器
│       ├── code_skeleton.py                # [Token 殺手] 代碼骨架與簽名提煉器 (省 90% Token)
│       └── compact_log.py                  # [Token 殺手] 終端編譯/測試日誌脫水過濾器
│
├── chrome_pk/                              # [系統中樞] PK+ 敏捷專注工作站 (React 18 + TS + Tailwind + Vite)
│   ├── overview-pk.md                      # [模組首頁] PK+ 規格與架構總覽手冊
│   ├── docs/                               # PK+ 專屬技術規格與流程圖 (13 份)
│   ├── src/
│   │   ├── core/ai/                        # 端側 AI 基礎設施 (NanoService, WebAIGateway, PromptGuard)
│   │   ├── features/                       # 敏捷看板、日終覆盤、社群分發、工具箱
│   │   └── background.ts                   # 計時守護、DNR 網路阻擋、chrome.idle 巡檢
│   └── manifest.json                       # PK+ Manifest V3 配置
│
├── chrome_gemini_nano/                     # [邊緣推論] Gemini Nano Prompt API 本地推論與調音中樞
│   ├── overview-nano.md                    # [模組首頁] Gemini Nano 獨立擴充模組規格總覽
│   ├── docs/                               # spec-nano-core.md
│   ├── tools/                              # 本機 Python 微服務與後端肌肉層 (常駐 127.0.0.1:8765)
│   │   └── main_dispatcher.py              # 本地 FastAPI 路由中樞 (社群、RSS、Obsidian、Radar)
│   ├── src/                                # Prompt API 呼叫封裝、調音算子原型
│   ├── sidepanel.html                      # 側邊欄調音中樞與推論測試介面
│   └── manifest.json                       # 獨立 Gemini Nano 擴充套件設定 (Chrome 128+)
│
├── finance-research-clipper-oss/           # [投研採集] 財經研報與個股爬蟲 (原生 JS, 零依賴)
│   ├── overview-clipper.md                 # [模組首頁] 投研採集與估值沙盒規格總覽
│   ├── docs/                               # Clipper 專屬技術規格 (5 份)
│   ├── dashboard.html                      # 獨立深色投研儀表板 (估值沙盒、分析師目標價)
│   └── sidepanel.html                      # 側邊欄快速查詢與當前分頁爬取 (支援一鍵推入今日戰役)
│
├── chrome_video speed plus/                # [影音學習] 影音倍速與字幕筆記採集 (Shadow DOM)
│   ├── overview-vidspeed.md                # [模組首頁] 影音倍速與字幕筆記採集規格總覽
│   ├── content.js                          # 全網 HTML5 變速 (0.1x~16x) 與 A-B 循環播放
│   └── options.html                        # 支援 Alt+S 一鍵字幕提取並推送至 PK+
│
├── browser-activity-monitor/               # [資安防護] 瀏覽器活動與流量監控 (原生 JS, IndexedDB)
│   ├── overview-actmon.md                  # [模組首頁] 瀏覽器活動與流量監控規格總覽
│   ├── docs/                               # spec-actmon-tab-interceptor.md
│   ├── sidepanel.html                      # 80% 原生常駐 (封包/下載/權限) + 20% 隨選深入探針
│   └── manifest.json                       # 獨立審計版擴充功能
│
├── GEMINI.md                               # [最高憲法] 專案行為準則與 Gate 門禁規範
├── README.md                               # [本檔] 專案全景架構導航手冊
└── guide-user-manual.md                    # 終端使用者全功能中文操作指南
```

---

## 🧩 三、 五大擴充模組生態系矩陣 (Ecosystem Matrix)

| 模組名稱 | 載體型態 | 技術棧 | 領域職責 | 與其他模組的協同行為 |
| :--- | :--- | :--- | :--- | :--- |
| **[PK+ (Power Kit)](chrome_pk/overview-pk.md)** | New Tab, Side Panel, Popup | React 18, TypeScript, TailwindCSS, Vite | **生態系中樞**。負責敏捷衝刺、GTD 看板、Web AI 矩陣調度、社群雙語分發與本機 Python 微服務橋接。 | 接收來自各插件的 `CREATE_TASK` 契約；向本機 `:8765` 派發工具請求。 |
| **[Gemini Nano](chrome_gemini_nano/overview-nano.md)** | Side Panel, Background Worker | 原生 JS / TypeScript, Chrome Prompt API | **端側 AI 與調音中樞**。Chrome 128+ 原生 Prompt API 本地邊緣推論、社群調音算子操練、全域口語指令測試與本機 `:8765` 微服務連動。 | 獨立純粹邊緣 AI 操練與測試場域；提供調音 Prompt 原型並與後端肌肉層協同。 |
| **[Finance Clipper](finance-research-clipper-oss/overview-clipper.md)** | 獨立 Dashboard, Side Panel | 原生 JS (ES6+), CSS Grid | **財經深度採集**。爬取 Google / Yahoo / Goodinfo 財務指標、分析師目標價、估值沙盒。 | 點擊「加入今日戰役」一鍵將個股研報封裝為任務，推入 PK+ 收件匣。 |
| **[Video Speed Plus](chrome_video speed plus/overview-vidspeed.md)** | Content Script (Shadow DOM) | 原生 JS | **影音倍速與筆記**。YouTube 0.1x~16x 變速、A-B 段落循環、法說會影音打點。 | 按下 `Alt + S` 抽取當前時間戳字幕，直推 PK+ 待辦池。 |
| **[Activity Monitor](browser-activity-monitor/overview-actmon.md)** | Side Panel, Background Worker | 原生 JS, IndexedDB | **網路與隱私審計**。全域網路請求、下載行為審查、Origin 敏感權限透視。 | 獨立運行，亦可內嵌於 PK+ 工具箱中。 |

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

## 🛠️ 五、 開發者工具鏈、合規審查與版本管理 (Developer Tooling & Compliance)

本專案內建一套專為 AI Assistant 與開發者打造的「確定性（Deterministic）腳本庫」，嚴禁使用 LLM 暴力全文掃描，並提供一鍵合規與版本自動化管理工具：

| 工具腳本 | 核心指令 / 用法 | 解決痛點 | 效益與職責 |
| :--- | :--- | :--- | :--- |
| **`audit_suite.py`** | `npm run audit:suite`<br>`py 1.devtools/tools/audit_suite.py` | 需手動分別執行多項審計指令之痛點 | **全自動一鍵端對端審計**：整合 6 大門禁（Manifest V3、插件隔離性、死鏈、交叉參照、Token 預算、SSOT 規範），CI/CD 守門必備 |
| **`audit_ssot.mjs`** | `npm run audit:ssot`<br>`node 1.devtools/tools/audit_ssot.mjs` | SSOT 真理源缺漏、未納入索引之孤島文檔、非標準命名 | 全域 SSOT 單一真理源與 5 大分類前綴命名合規審計 (Gate 3 核心) |
| **`audit_manifests.py`** | `npm run audit:manifests`<br>`py 1.devtools/tools/audit_manifests.py` | Manifest V3 欄位遺漏、CSP 違規、版本號格式錯誤 | Chrome Web Store 上架前合規自動審計 |
| **`audit_plugin_isolation.py`** | `npm run audit:isolation`<br>`py 1.devtools/tools/audit_plugin_isolation.py` | 跨插件跨目錄代碼污染、未授權外部檔案依賴 | 嚴格多插件實體檔案與引用隔離性審計防線 |
| **`doc_cross_ref.py`** | `py 1.devtools/tools/doc_cross_ref.py` | 文檔連結失效、錨點無效、孤島文檔未清理 | 全專案 Markdown 交叉參照與斷鏈自動修復建議 |
| **`version_manager.py`** | `npm run version:list`<br>`npm run version:bump`<br>`py 1.devtools/tools/version_manager.py bump minor --all` | 多插件版本號不一致、手動改錯 Manifest 格式 | MV3 合規 SemVer 自動遞增與雙向同步 |
| **`task_cli.py`** | `npm run task:init`<br>`npm run task:archive` | 手動搬移與管理任務檔案耗時繁瑣 | 任務生命週期自動化管理（模板初始化、歸檔封存） |
| **`repo_radar.py`** | `py 1.devtools/tools/repo_radar.py map`<br>`py 1.devtools/tools/repo_radar.py section <file> -H "章節"`<br>`py 1.devtools/tools/repo_radar.py symbol <Name>` | 解決盲目全檔讀取與反覆 grep 找檔案的浪費 | 檢索階段節省 **90% ~ 98%** Tokens |
| **`generate_symbol_index.py`** | `py 1.devtools/tools/generate_symbol_index.py` | 產出全專案 `<10KB` 的 `.repo_index.json` 快取地圖 | 代碼定位 **0 毫秒**、不到 20 tokens |
| **`code_skeleton.py`** | `npm run skeleton <file>`<br>`py 1.devtools/tools/code_skeleton.py <file>` | 掏空實作主體，僅保留 TypeScript/Python 介面與簽名 | 查詢依賴時節省 **85% ~ 95%** Tokens |
| **`compact_log.py`** | `npm run build 2>&1 \| py 1.devtools/tools/compact_log.py` | 過濾千行 node_modules 堆疊，僅保留致命報錯行號 | 除錯階段節省 **75% ~ 90%** 上下文 |

---

## 🚀 六、 快速啟動指引 (Quick Start)

### 1. 啟動本機微服務中樞 (後端肌肉)
```bash
# 安裝 Python 依賴
pip install fastapi uvicorn requests

# 啟動微服務 (常駐 127.0.0.1:8765)
python chrome_gemini_nano/tools/main_dispatcher.py
```

### 2. 構建並加載擴充套件 (前端大腦與五大模組)
- **PK+ (Power Kit)**：
  ```bash
  cd chrome_pk && npm install && npm run build
  ```
  於 `chrome://extensions/` 開啟「開發人員模式」，點選「載入未封裝項目」選擇 `chrome_pk/dist` 目錄。
- **Gemini Nano**：
  載入 `chrome_gemini_nano/` 目錄（Chrome 128+ 需開啟 Prompt API flag）。
- **Finance Clipper**：
  載入 `finance-research-clipper-oss/` 目錄（原生 JS 免構建）。
- **Video Speed Plus**：
  載入 `chrome_video speed plus/` 目錄（原生 JS 免構建）。
- **Activity Monitor**：
  載入 `browser-activity-monitor/` 目錄（原生 JS 免構建）。

### 3. 建置專案全域符號快取 (開發者推薦)
```bash
py 1.devtools/tools/generate_symbol_index.py
```

### 4. 版本管理與發布審核 (Release & Audit Workflow)
```bash
# 檢視所有插件版本與同步狀態
npm run version:list

# 遞增全專案 patch 版本號 (SemVer)
npm run version:bump

# 執行全域 SSOT 與文檔命名規範審計
npm run audit:ssot

# 執行全體插件 Manifest V3 上架合規審計
npm run audit:manifests

# 執行多插件代碼與資源隔離性審計
npm run audit:isolation

# 執行全自動端對端審計套件 (整合 6 大門禁：Manifest + 隔離性 + 死鏈 + 交叉參照 + Token + SSOT)
npm run audit:suite
```