# 🍅 [PK+] 全功能模組架構地圖與資料夾命名規範手冊 (SSOT)

> [!IMPORTANT]
> **架構維護最高準則 (Architecture SSOT)**：
> 本文檔為 `chrome_pk` (PK+ / Power Kit) 之**目錄架構、資料夾職責劃分、命名風格規範與微工具擴充協議之單一真實來源 (SSOT)**。
> 在進行任何新功能開發、組件新增或重構遷移前，必須嚴格遵守本規範，以確保大型擴充功能在持續擴張下的整潔度與可維護性。

---

## 1. 架構核心原則 (Core Architectural Principles)

1. **四層領域切片 (4-Layer Domain-Driven Slices)**：
   - 系統依職責縱向切分為：`entries/`（原生入口）、`features/`（業務領域）、`shared/`（全域基礎設施）、`types/`（全域契約）。
2. **微工具隨插即用外掛協議 (Pluggable Micro-Tools Pattern)**：
   - 工具箱 (`toolbox`) 作為微型工具的運行容器，所有子工具必須遵循自包含標準（manifest、獨立 UI、獨立邏輯），透過註冊中心無侵入掛載。
3. **就地收斂與封閉性 (Co-location & Encapsulation)**：
   - 模組內部私有的子組件 (`components/`)、服務層 (`services/`)、狀態管理 (`hooks/`)、型別 (`types.ts`) 就地封裝，禁止跨模組私自引用。
4. **門面匯出規範 (Strict Barrel Pattern)**：
   - 每個 Feature 與 Tool 必須具備 `index.ts`。外部引用一律透過 `@/features/[module]`，嚴禁深入私有路徑（如 `import ... from '@/features/a/components/b'`）。

---

## 2. 目標目錄結構全景 (Target Directory Blueprint)

```text
chrome_pk/src/
├── entries/                 # [第 1 層] 瀏覽器原生物理入口層 (Extension Entrypoints)
│   ├── background/          # Background Service Worker、鬧鐘排程與外部訊息路由中心
│   │   ├── index.ts         # 主 Worker 進入點 (原 background.ts)
│   │   ├── alarmHandlers.ts # 定時鬧鐘回呼
│   │   └── externalService.ts # 跨插件黑盒訊息監聽
│   ├── content/             # 注入網頁的 Content Scripts
│   │   ├── general.ts       # 全域通用快捷鍵攔截
│   │   └── gemini.ts        # Gemini 頁面對話擷取專屬腳本 (原 geminiContent.ts)
│   ├── sidepanel/           # Chrome 原生側邊欄工作區入口 (原 entries/sidebar/)
│   ├── newtab/              # 瀏覽器新分頁主儀表板入口
│   ├── popup/               # 工具列點擊之快顯彈窗入口
│   └── options/             # 系統偏好與同步配置選項頁入口
│
├── features/                # [第 2 層] 業務領域切片層 (Domain Feature Modules)
│   ├── scrumclock/          # 【領域 1】番茄鐘衝刺計時、戰役規劃與結算回顧
│   │   ├── index.ts         # 門面出口
│   │   ├── types.ts         # 專屬領域型別
│   │   ├── contexts/        # 計時器狀態上下文 (TimerContext)
│   │   └── components/      # 衝刺與簡報視圖元件
│   ├── project-management/  # 【領域 2】GTD 專案規劃看板、收件匣與雲端同步 (整合原 dashboard)
│   │   ├── index.ts         # 門面出口
│   │   ├── types.ts         # 看板與任務型別
│   │   ├── components/      # 看板視圖 (BoardView)、卡片 (TaskCard)、抽屜 (TaskDetailDrawer)
│   │   ├── hooks/           # useProjectManagement 狀態管理
│   │   └── services/        # taskAIEngine (本地 Nano 拆解), kanbanAuditor (閒置巡檢)
│   ├── ai-sidebar/          # 【領域 3】AI 助理面板與邊緣提示詞引擎
│   │   ├── index.ts         # 門面出口
│   │   ├── components/      # AIAssistantView
│   │   ├── services/        # ai-helper, ai-prompts, ai-schemas
│   │   └── dev-tools/       # 提示詞評估腳本與除錯資源
│   ├── analytics/           # 【領域 4】工時數據分析與生產力視覺化圖表
│   ├── bookmarks/           # 【領域 5】辦公室傳送門書籤
│   ├── gemini-exporter/     # 【領域 6】Gemini 對話結構化匯出與管理
│   └── toolbox/             # 【領域 7】隨插即用微型工具箱中樞 (Micro-Toolbox Hub)
│       ├── index.ts         # 門面出口 (ToolboxHub)
│       ├── types.ts         # 工具箱協議介面 (IToolManifest 等)
│       ├── registry.ts      # ★ 工具清冊註冊中心 (動態掛載點)
│       ├── components/      # 工具箱框架 UI (選單、搜尋列、分類標籤)
│       └── tools/           # 獨立微工具模組池 (Pluggable Tools)
│           ├── script-runner/       # 隨選腳本在線編輯器與執行調度器
│           ├── image-scraper/       # 網頁圖片批次擷取器 (含 IG/輪播策略)
│           ├── subtitle-collector/  # 字幕收集與 SRT 拖放解析器
│           ├── activity-monitor/    # 瀏覽器權限即時審查與活動監控
│           └── finance-watchlist/   # 研報自選看板與標的偏離度分析
│
├── shared/                  # [第 3 層] 基礎設施與全域共用層 (Infrastructure & Shared)
│   ├── components/          # 全域無狀態原子 UI 元件 (SettingsPanel, GoogleAccountButton, Modal, Drawer)
│   ├── chrome/              # Chrome Extension API 型別安全封裝 (storage.ts, tabs.ts, scripting.ts)
│   ├── messaging/           # 跨插件通訊中樞 (outboxQueue.ts, contracts.ts)
│   ├── integrations/        # 第三方雲端生態串接 (Google OAuth, Google Tasks, GAS Webhook)
│   ├── utils/               # 跨領域純函式工具 (markdown.tsx, task-parser.ts, date.ts)
│   └── styles/              # 全域 CSS 與 Tailwind 主題變數 (index.css)
│
└── types/                   # [第 4 層] 跨領域全域公用型別 (Global Contracts)
    ├── chrome.types.ts      # 瀏覽器底層擴展型別
    └── contract.types.ts    # UniversalTaskPayload 與跨模組通訊契約
```

---

## 3. 微工具外掛架構協議 (Toolbox Pluggable Protocol)

未來若需新增任何小工具（例如：JSON 格式化工具、色彩選取器、網頁長截圖、字體偵測），一律放入 `src/features/toolbox/tools/[tool-id]/`。

### 3.1 標準微工具目錄契約
```text
src/features/toolbox/tools/[tool-id]/
├── index.ts           # 門面出口：統一導出 ToolManifest 與主視圖元件
├── manifest.ts        # 工具元數據 (ID, 名稱, 圖示, 支援視圖模式, 權限需求)
├── ToolView.tsx       # 工具主視圖容器 (需支援 isSidebar / isCompact 響應式屬性)
├── components/        # 該工具內部專用子組件 (私有)
├── services/          # 該工具業務邏輯、儲存或爬蟲邏輯 (私有)
└── types.ts           # 該工具內部資料結構 (私有)
```

### 3.2 工具元數據規範 (`manifest.ts`)
```typescript
export interface IToolManifest {
  id: string;               // 唯一工具識別碼 (如 'script-runner', 'image-scraper')
  title: string;            // 繁體中文顯示名稱
  description: string;      // 一句話功能概述
  icon: string;             // Lucide 圖示名稱 (如 'Code', 'Image', 'Activity')
  category: 'productivity' | 'dev' | 'media' | 'security';
  badge?: string;           // 標籤 (如 'New', 'Beta')
  permissions?: string[];   // 所需之 Chrome 權限提示
  component: React.ComponentType<{ isSidebar?: boolean }>;
}
```

### 3.3 註冊中心 (`registry.ts`)
在 `src/features/toolbox/registry.ts` 集中宣告陣列：
```typescript
import { scriptRunnerManifest } from './tools/script-runner';
import { imageScraperManifest } from './tools/image-scraper';
import { subtitleCollectorManifest } from './tools/subtitle-collector';
import { activityMonitorManifest } from './tools/activity-monitor';
import { financeWatchlistManifest } from './tools/finance-watchlist';

export const TOOL_REGISTRY: IToolManifest[] = [
  scriptRunnerManifest,
  imageScraperManifest,
  subtitleCollectorManifest,
  activityMonitorManifest,
  financeWatchlistManifest,
];
```
> **優勢**：當新增工具時，只需在 `registry.ts` 登記一筆，側邊欄與新分頁的 `ToolboxHub` 便會自動呈現卡片與路由分發，無需修改任何 UI 佈局代碼。

---

## 4. 命名規範體系 SSOT (Naming Conventions)

| 標的類別 | 命名規則 | 正確範例 | 錯誤/嚴禁範例 |
| :--- | :--- | :--- | :--- |
| **資料夾目錄** | `kebab-case` (全小寫連字號) | `script-runner/`<br>`project-management/` | `ScriptRunner/`<br>`projectManagement/` |
| **React 元件檔案** | `PascalCase.tsx` | `ScriptRunner.tsx`<br>`BoardView.tsx` | `scriptRunner.tsx`<br>`board-view.tsx` |
| **業務服務與單例** | `camelCase.ts` (搭配角色後綴) | `scriptExecutionService.ts`<br>`googleAuthClient.ts` | `ScriptService.ts`<br>`google_auth.ts` |
| **自訂 Hooks** | `useCamelCase.ts` (一律 `use` 開頭) | `useTimerSync.ts`<br>`useProjectManagement.ts` | `timerHook.ts`<br>`UseAISession.ts` |
| **型別定義檔案** | `*.types.ts` 或 `types.ts` | `task.types.ts`<br>`types.ts` | `TaskInterface.ts`<br>`type.ts` |
| **常數與配置設定** | `*.constants.ts` / `*.config.ts` | `presets.ts`<br>`shortcuts.constants.ts` | `Const.ts`<br>`CONFIG.ts` |
| **模組門面檔案** | `index.ts` | `index.ts` | `main.ts` (非入口點勿用) |

---

## 5. 新增功能擴充 3 步作業流程 (Expansion SOP)

當未來面臨新需求時，開發者依循以下 SOP 快速就位：

1. **Step 1：層級定位判定**
   - 具有獨立工作流程、全域導航與複雜狀態的旗艦功能？ ➔ 在 `src/features/` 下建立領域目錄。
   - 屬於實用小工具、轉換器、分析輔助或隨選功能？ ➔ 在 `src/features/toolbox/tools/` 下建立微工具目錄（或使用一鍵鷹架生成器）。
2. **Step 2：一鍵鷹架或自包含範式 (Self-Containment)**
   - **推薦方式 (一鍵鷹架)**：使用 `py 1.devtools/tools/scaffold_tool.py --plugin chrome_pk --id <tool-id> --name "<顯示名稱>" --category <分類>`，將自動生成四件套並掛載至 `registry.ts`。
   - **手動方式**：建立該目錄的 `manifest.ts`、`{PascalName}View.tsx`、`index.ts` 與 `types.ts`，並就地封裝私有邏輯。
   - 確保不向外部暴露任何未經 `index.ts` 導出的內部組件或工具函式。
3. **Step 3：無侵入掛載與註冊**
   - 若為微工具，確認 `src/features/toolbox/registry.ts` 已完成引入並加入 `TOOL_REGISTRY`（鷹架會自動完成；亦可執行 `sync_toolbox_registry.py` 自動校驗與同步）。
   - 執行架構審查 `py 1.devtools/tools/audit_arch_boundary.py --plugin chrome_pk --compact` 驗證合規。
   - 啟動開發伺服器驗證，完畢即完成擴充。

---

## 6. 漸進式重構遷移路徑 (Migration Milestones)

- **Phase 1 (目錄收斂與消除雙胞胎)**：
  - 將 `src/dashboard/components/` 整合併入 `src/features/project-management/components/board/`。
  - 將 Toolbox 內舊版 activity-monitor 移除，統一橋接至全功能 `src/features/activity-monitor/`。
- **Phase 2 (工具箱微模組化與註冊器建立)**：
  - 於 `src/features/toolbox/` 建立標準 `registry.ts` 與 `manifest.ts` 規範。
  - 將 `finance-integration` 以微工具形式重構掛入 `toolbox/tools/finance-watchlist/`。
- **Phase 3 (基礎層整理與路徑別名固化)**：
  - 將散落的 `core/`、`services/` 按職責收斂至 `shared/`。
  - 確保所有跨模組匯入皆遵循 `@/features/*` 與 `@/shared/*` 別名。

---

## 7. 工具鏈自動化與架構防腐指令 (Devtools & Boundary Audits)

為維護四層架構完整性與微工具外掛生態的純淨度，本專案提供專屬自動化工具鏈（位於 `1.devtools/tools/`）：

### 7.1 微工具一鍵鷹架生成器 (`scaffold_tool.py`)
自動生成微工具標準 4 件套（`manifest.ts`、`ToolView.tsx`、`index.ts`、`types.ts`）並自動寫入 `registry.ts`：
```bash
# 生成新微工具
py 1.devtools/tools/scaffold_tool.py --plugin chrome_pk --id json-formatter --name "JSON 格式化工具" --category dev --icon Braces

# 預覽生成檔案與掛載更動 (Dry-Run)
py 1.devtools/tools/scaffold_tool.py --plugin chrome_pk --id json-formatter --dry-run

# 卸載並還原微工具與註冊表
py 1.devtools/tools/scaffold_tool.py --plugin chrome_pk --id json-formatter --remove
```

### 7.2 領域架構防腐與 Barrel 門面審查器 (`audit_arch_boundary.py`)
嚴格審查單插件內部四層領域架構，杜絕跨 Feature 私有穿透與底層反向依賴：
```bash
# 審查指定插件架構邊界 (Exit 0 / 1 門禁)
py 1.devtools/tools/audit_arch_boundary.py --plugin chrome_pk --compact

# 防腐三大規則：
# 1. RULE_ARCH_SHARED_PURITY: shared/ 與 core/ 嚴禁反向引用 features/
# 2. RULE_ARCH_BARREL_PENETRATION: 跨 feature 引用僅允許透過 @/features/<feat> 之 index.ts 門面
# 3. RULE_ARCH_MICRO_TOOL_ISOLATION: 各微工具 tools/<id>/ 彼此獨立隔離，嚴禁私有交叉引用
```

### 7.3 微工具清冊自動審驗與同步器 (`sync_toolbox_registry.py`)
確保實體微工具目錄與 `registry.ts` 註冊表 100% 同步且 Manifest 協議合規：
```bash
# 唯讀審驗清冊一致性
py 1.devtools/tools/sync_toolbox_registry.py --plugin chrome_pk --compact

# 一鍵重新掃描所有微工具並自動生成乾淨的 registry.ts
py 1.devtools/tools/sync_toolbox_registry.py --plugin chrome_pk --fix
```
（註：以上審查器均已整合入 `audit_suite.py` 全域自動化門禁）
