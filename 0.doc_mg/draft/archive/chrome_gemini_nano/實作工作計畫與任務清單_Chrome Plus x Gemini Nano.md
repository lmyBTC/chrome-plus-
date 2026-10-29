# 📋 Chrome Plus x Gemini Nano 實作工作計畫與任務清單 (Implementation Work Plan)

> **目標**：依照架構文件規劃，分四個階段建立前端 TypeScript 模組（Chrome Extension 中台）與本機 Python 微服務工具庫，完整打通「Pulse 快訊擷取 ➔ Gemini Nano 調音與意圖路由 ➔ HITL 審核 ➔ 本機 Python 執行（RSS / 社群發布 / 筆記歸檔）」之自動化閉環。

---

## 🧭 四大里程碑階段 (Phased Milestones)

```
[Phase 1: 基礎通道與核心 AI 服務]
  ├─ 1.1 nanoService.ts (Chrome 側邊欄 AI 基礎設施)
  └─ 1.2 main_dispatcher.py (本地 Python 輕量服務閘道)
           │
           ▼
[Phase 2: 核心功能落地 - 社群與 RSS 閉環]
  ├─ 2.1 pulseExtractor.ts (網頁卡片 DOM 提取)
  ├─ 2.2 types.ts & toneShifter.ts (4 大調音算子)
  ├─ 2.3 SocialDispatcher.tsx & index.ts (側欄 HITL 發布介面)
  ├─ 2.4 rss_generator.py (RSS feed.xml 自動追加維護)
  └─ 2.5 local_dedup.py (歷史貼文去重比對)
           │
           ▼
[Phase 3: 外部發布與本機持久化]
  ├─ 3.1 social_publisher.py (X & Threads API 發布代理)
  └─ 3.2 markdown_archiver.py (Obsidian Frontmatter 本地歸檔)
           │
           ▼
[Phase 4: 全域命令列路由器與跨插件契約整合]
  ├─ 4.1 nanoIntentRouter.ts (Cmd+K 自然語言萬能路由器)
  └─ 4.2 cross_plugin_contract.md (補充 DISPATCH_SOCIAL_POST 協定)
```

---

## 📝 詳細任務進度看板 (Task Breakdown & Status)

### 階段一：基礎通道與核心 AI 服務 (Phase 1)
- [ ] **Task 1.1**：建立 `chrome_scrumclock/src/core/ai/nanoService.ts`
  - 命名空間多重遞補 (`self.ai.languageModel` ~ `LanguageModel`)
  - 單例模式與 `destroySession()` VRAM 安全防護
  - `prompt()` 與 `promptStreaming()` 雙模式封裝
  - `safeExtractJSON<T>()` 正則過濾 Markdown 代碼塊
- [ ] **Task 1.2**：建立 `0.doc_mg/tools/main_dispatcher.py`
  - 基於 FastAPI / Uvicorn 打造本地常駐服務 (`127.0.0.1:8765`)
  - 支援 CORS 跨域允許 `chrome-extension://*`
  - 實作 `POST /exec` 統一路由分發與錯誤回傳機制

### 階段二：核心功能落地 - 社群與 RSS 閉環 (Phase 2)
- [ ] **Task 2.1**：建立 `chrome_scrumclock/src/content/pulseExtractor.ts`
  - DOM 選擇器適配 `.pulse-card`、`article`、`main`
  - 1500 字元上限截斷防 Token 爆框
  - 監聽 `GET_ACTIVE_PULSE_ITEM` 訊息
- [ ] **Task 2.2**：建立社群型別與調音算子
  - `chrome_scrumclock/src/features/toolbox/tools/social-dispatcher/types.ts`
  - `chrome_scrumclock/src/features/toolbox/tools/social-dispatcher/toneShifter.ts`（觀點銳化、字數壓線 280、在地去油、Thread 切割）
- [ ] **Task 2.3**：建立社群分發側邊欄 UI
  - `chrome_scrumclock/src/features/toolbox/tools/social-dispatcher/SocialDispatcher.tsx`
  - `chrome_scrumclock/src/features/toolbox/tools/social-dispatcher/index.ts`（Barrel 門面匯出）
- [ ] **Task 2.4**：建立 `0.doc_mg/tools/rss_generator.py`
  - 解析現有 `feed.xml`、動態插入最新文章項目
  - 自動修剪保留最新 30 則，輸出標準 RFC-822 時間
- [ ] **Task 2.5**：建立 `0.doc_mg/tools/local_dedup.py`
  - 讀取 `data/social_history.json`
  - 利用字串相似度（SequenceMatcher / 核心論點比對）判斷重複門檻（$\ge 0.65$）

### 階段三：外部發布與本機持久化 (Phase 3)
- [ ] **Task 3.1**：建立 `0.doc_mg/tools/social_publisher.py`
  - X API v2 發布推文實作（含 Dry-run 降級）
  - Threads Graph API 兩階段容器發布（Create Container ➔ Publish）
- [ ] **Task 3.2**：建立 `0.doc_mg/tools/markdown_archiver.py`
  - 自動生成 YAML Frontmatter（日期、標籤、來源網址）
  - 檔案名稱非法字元過濾並寫入本地指定目錄（Obsidian / Markdown Vault）

### 階段四：全域命令列路由器與跨插件契約整合 (Phase 4)
- [ ] **Task 4.1**：建立 `chrome_scrumclock/src/core/ai/nanoIntentRouter.ts`
  - 自然語言輸入解析為複合行動陣列（`ParsedCommand`）
  - 極低溫（`temperature: 0.1`）維持結構化 JSON 輸出
  - 支援 `START_TIMER`、`CREATE_TASK`、`DISPATCH_SOCIAL` 等意圖
- [ ] **Task 4.2**：更新擴充 `0.doc_mg/docs/cross_plugin_contract.md`
  - 定義 `DISPATCH_SOCIAL_POST` 跨插件協定 Payload 規格與資料欄位