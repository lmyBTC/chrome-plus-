# Gate 1 探勘快取：技能與插件 SSOT 下沉標準化矩陣 (Probe Cache)

> 建立時間：2026-10-30
> 任務：將每個 skills 與每個插件的 SSOT 都建立下沉 doc md 記錄與管理複雜內容及組成元件

---

## 1. 五大插件 + DevTools 組成元件與下沉現況盤點

| 模組代碼 | 目錄 | 現有 docs/ 現況 | 缺漏 / 下沉目標文檔 | 複雜內容與組成元件重點 |
| :--- | :--- | :--- | :--- | :--- |
| `pk` | `chrome_pk` | 已有 13 篇 docs，但缺乏統一元件字典 | 建立 `chrome_pk/docs/spec-pk-components.md` | 8 大切片模組（Kanban, Toolbox, ActivityMonitor, GasSync 等）之 UI 元件、Hook、Store 與 Service 清單 |
| `vidspeed` | `chrome_video speed plus` | **無 docs/ 目錄**（僅有 `overview-vidspeed.md`） | 建立 `chrome_video speed plus/docs/spec-vidspeed-components.md` | Shadow DOM 注入元件、浮動速度面板、快速鍵監聽器、時間戳儲存模型 |
| `nano` | `chrome_gemini_nano` | 僅有 `spec-nano-core.md` | 建立 `chrome_gemini_nano/docs/spec-nano-components.md` | Prompt API 調度器、本地工具代理 (Tool Agent)、多階段 Pipeline、側邊欄元件 |
| `actmon` | `browser-activity-monitor` | 僅有 `spec-actmon-tab-interceptor.md` | 建立 `browser-activity-monitor/docs/spec-actmon-components.md` | 雙軌探針 (常駐監聽 + 20% 隨選探針)、權限審查儀表板、儲存模型元件 |
| `clipper` | `finance-research-clipper-oss` | 有 5 篇 spec，缺乏統一元件樹 | 建立 `finance-research-clipper-oss/docs/spec-clipper-components.md` | 浮動工具列、研報爬取核心、估值矩陣計算器、GSheets 直連元件 |
| `devtools` | `1.devtools` | 無 docs/ 目錄（僅有 `overview-devtools.md`） | 建立 `1.devtools/docs/spec-devtools-matrix.md` | 15+ 個開發者工具之組成元件、入參契約、門禁管線串接矩陣 |

---

## 2. 10 大專家技能 (Agent Skills) 下沉與 SSOT 依賴矩陣

| 技能名稱 | 技能路徑 | 現有 SSOT 依賴 | 下沉治理方案與專屬下沉 Doc |
| :--- | :--- | :--- | :--- |
| **PK+ 規格字典** | `.agents/skills/pk-core/SKILL.md` | `chrome_pk/overview-pk.md` 等 | 指向 `chrome_pk/docs/spec-pk-components.md`，SKILL.md 僅留速查索引 |
| **FinanceClipper 研報字典** | `.agents/skills/finance-clipper-core/SKILL.md` | `finance-research-clipper-oss/overview-clipper.md` 等 | 指向 `finance-research-clipper-oss/docs/spec-clipper-components.md` |
| **VideoSpeedPlus 倍速字典** | `.agents/skills/video-speed-core/SKILL.md` | `chrome_video speed plus/overview-vidspeed.md` | 指向 `chrome_video speed plus/docs/spec-vidspeed-components.md` |
| **ActivityMonitor 核心字典** | `.agents/skills/activity-monitor-core/SKILL.md` | `browser-activity-monitor/overview-actmon.md` | 指向 `browser-activity-monitor/docs/spec-actmon-components.md` |
| **GeminiNano 核心字典** | `.agents/skills/gemini-nano-core/SKILL.md` | `chrome_gemini_nano/overview-nano.md` | 指向 `chrome_gemini_nano/docs/spec-nano-components.md` |
| **任務協議管理** | `.agents/skills/task-protocol/SKILL.md` | `0.doc_mg/task_template_v2.md`, `guide-task-manager.md` | 下沉完備，維持並確認 3-Gate 與會話隔離規範 |
| **Token 節省器** | `.agents/skills/token-saver/SKILL.md` | `0.doc_mg/docs/guide-token-optimization.md` | 下沉完備，檢驗各命令包裝與骨架規格 |
| **專案情報雷達** | `.agents/skills/repo-radar/SKILL.md` | `0.doc_mg/docs/guide-repo-radar.md` | 確保 tools/repo_radar.py 之 CLI 完整契約下沉至 doc |
| **Chrome 插件合規審計** | `.agents/skills/chrome-auditor/SKILL.md` | 依賴 `spec-dev-standards.md` | 補齊專屬審計規則下沉 doc `0.doc_mg/docs/spec-chrome-auditor.md` |
| **網頁開發與技術規範** | `.agents/skills/dev-standards/SKILL.md` | `0.doc_mg/docs/spec-dev-standards.md` | 下沉完備，維持 MV3 / Shadow DOM 標準 |

