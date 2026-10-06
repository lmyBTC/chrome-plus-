<!-- nav: 相關檔案快速跳轉 ──────────────────────────────────
  Phase 1 基礎通道:
    - ./nanoService.ts          # Gemini Nano Prompt API 核心適配
    - ./main_dispatcher.py      # 本地 FastAPI 8765 路由閘道
  Phase 2 社群與 RSS:
    - ./pulseExtractor.ts       # pulse.html DOM 卡片提取器
    - ./toneShifter.ts          # 4 大調音算子 (銳化/壓線/去油/切Thread)
    - ./types.ts                # 社群草稿與調音狀態型別
    - ./SocialDispatcher.tsx    # 側邊欄 HITL 雙欄發布介面
    - ./index.ts                # 社群分發模組 Barrel Export
    - ./rss_generator.py        # RSS feed.xml 自動追加維護
    - ./local_dedup.py          # 歷史貼文語意防重比對
  Phase 3 外部發布:
    - ./social_publisher.py     # X & Threads API 發布代理
    - ./markdown_archiver.py    # Obsidian Frontmatter 歸檔
  Phase 4 路由與契約:
    - ./nanoIntentRouter.ts     # Cmd+K 自然語言萬能路由器
    - ../../docs/cross_plugin_contract.md  # 跨插件通訊契約 v2.1
  歸檔規劃文檔:
    - ../archive/gemini-nano/   # 已完成之早期規劃文件
───────────────────────────────────────────────────── -->
# 📋 Chrome Plus x Gemini Nano 落地實作工作計畫 (Task Plan)

> **專案目標**：在 `chrome_scrumclock` 擴充套件架構下，完整串聯 `pulse.html` 研報內容、本地端 Gemini Nano（Prompt API）邊緣推理、側邊欄雙欄社群發布（X / Threads）以及本機 Python 執行微服務（RSS、去重、直發、Obsidian 筆記歸檔）。
> **最新狀態**：🎉 **全部階段 100% 落地完成 (ALL PHASES COMPLETED)**

---

## 🗺️ 架構管線總覽 (Execution Pipeline)

```
[Phase 1: 基礎通道與核心 AI 服務] ✅ 已完成
  ├─ 1.1 nanoService.ts (Chrome Prompt API 多命名空間適配、VRAM 生命週期管理)
  └─ 1.2 main_dispatcher.py (本地 FastAPI 8765 路由中樞、CORS 跨域通訊)
           │
           ▼
[Phase 2: 核心功能落地 - 社群與 RSS 閉環] ✅ 已完成
  ├─ 2.1 pulseExtractor.ts (網頁卡片 DOM 提取與 1500 字元截斷)
  ├─ 2.2 types.ts & toneShifter.ts (4 大調音算子：銳化/壓線/去油/切Thread)
  ├─ 2.3 SocialDispatcher.tsx & index.ts (側欄 HITL 發布介面與 Barrel Export)
  ├─ 2.4 rss_generator.py (RSS feed.xml 自動追加與最新 30 則滾動維護)
  └─ 2.5 local_dedup.py (歷史貼文去重比對 SequenceMatcher >= 0.65 預警)
           │
           ▼
[Phase 3: 外部發布與本機持久化] ✅ 已完成
  ├─ 3.1 social_publisher.py (X & Threads API 發布代理與 Dry-Run 降級)
  └─ 3.2 markdown_archiver.py (Obsidian Frontmatter 本地歸檔與檔名過濾)
           │
           ▼
[Phase 4: 全域命令列路由器與跨插件契約整合] ✅ 已完成
  ├─ 4.1 nanoIntentRouter.ts (Cmd+K 自然語言萬能路由器與 Action 拆解)
  └─ 4.2 cross_plugin_contract.md (補充 DISPATCH_SOCIAL_POST 與 LOCAL_TOOL_PROXY 協定)
```

---

## 📝 詳細任務進度看板 (Task Breakdown & Status)

### 階段一：基礎通道與核心 AI 服務 (Phase 1) - ✅ COMPLETED
- [x] **Task 1.1**：建立 `chrome_scrumclock/src/core/ai/nanoService.ts`
- [x] **Task 1.2**：建立 `0.doc_mg/tools/main_dispatcher.py`

### 階段二：核心功能落地 - 社群與 RSS 閉環 (Phase 2) - ✅ COMPLETED
- [x] **Task 2.1**：建立 `chrome_scrumclock/src/content/pulseExtractor.ts`
- [x] **Task 2.2**：建立社群型別與調音算子 `types.ts` & `toneShifter.ts`
- [x] **Task 2.3**：建立社群分發側邊欄 UI `SocialDispatcher.tsx` & `index.ts`
- [x] **Task 2.4**：建立 `0.doc_mg/tools/rss_generator.py`
- [x] **Task 2.5**：建立 `0.doc_mg/tools/local_dedup.py`

### 階段三：外部發布與本機持久化 (Phase 3) - ✅ COMPLETED
- [x] **Task 3.1**：建立 `0.doc_mg/tools/social_publisher.py`
- [x] **Task 3.2**：建立 `0.doc_mg/tools/markdown_archiver.py`

### 階段四：全域命令列路由器與跨插件契約整合 (Phase 4) - ✅ COMPLETED
- [x] **Task 4.1**：建立 `chrome_scrumclock/src/core/ai/nanoIntentRouter.ts`
  - 自然語言口語解析（支援番茄鐘、待辦、GTD 整理、社群分發、RSS 與筆記）
  - 低溫推論（`temperature: 0.1`）與 `safeExtractJSON` 容錯解析
  - 自動拆解為標準 `actions` 陣列並向 Background 派發
- [x] **Task 4.2**：更新擴充 `0.doc_mg/docs/cross_plugin_contract.md`
  - 增補 `DISPATCH_SOCIAL_POST` 協定定義
  - 增補 `LOCAL_TOOL_PROXY` 5 大工具傳輸標準
  - 增補 `EXECUTE_ROUTER_ACTION` 萬能路由動作規範
  - 提供防禦性逾時熔斷通訊函式範例