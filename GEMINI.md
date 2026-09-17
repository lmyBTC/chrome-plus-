# Chrome Plus Project - Agent 最高規範指令 (GEMINI.md)

> [!IMPORTANT]
> **SSOT 核心指令**：本文件為此工作區的 AI Agent 最高行為準則，啟動對話與執行任務前必須優先加載。

---

## 1. 基本行為準則
* **語言偏好**：**始終以「繁體中文」進行回應**。
* **專家與技能優先**：
  * 執行開發、重構或除錯前，必須先載入位於 [`.agents/rules.md`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/.agents/rules.md) 中定義之技能索引，並調用對應的專家技能。
  * 所有具體的 Chrome 插件開發規範、安全防禦（如 CSP、XSS、Shadow DOM）與具體工作流，由 [網頁開發與技術規範 Skill](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/.agents/skills/dev-standards/SKILL.md) 核心負責。
* **文件同步**：所有開發進度必須嚴格依照 [`task.md`](file:///C:/Users/G1/.gemini/antigravity-ide/brain/ab23bdde-9b17-4e96-9f4a-b54179205d8d/task.md) 物理同步與動態收斂。

---

## 2. Token 節省與開發效率規範
* **局部讀取與精準寫入**：
  * 對於超過 100 行之程式檔，禁止無故讀取全檔。應先使用 `grep_search` 定位，再利用 `view_file` 局部讀取（設定 `StartLine`/`EndLine`），並使用 `replace_file_content` 進行精準修改。
* **終端日誌優化**：
  * 執行終端指令時，必須優先加載 [RTK Token Saver](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/.agents/skills/token-saver/SKILL.md) 技能，使用 `rtk` 前綴包裝指令以過濾日誌並節省 Token。
* **合規審計優先**：
  * 每次修改 Manifest 或程式碼結構後，優先執行 `npm run audit:manifests` (或執行 `python 0.doc_mg/tools/audit_manifests.py`) 獲取自動化審計報告，切勿進行繁瑣的人工健康度排查。

---

## 3. 多插件隔離與 AI 邊界防禦規範 (Multi-Extension Isolation)
* **AI 視野邊界隔離（禁止跨目錄讀取無關代碼）**：
  * 當前開發特定插件（如 `finance-research-clipper-oss` 或 `chrome_scrumclock`）時，AI 只能讀寫該插件目錄之檔案，**嚴禁跨專案檢索或讀取其他無關插件的源碼**，防止 Token 浪費、上下文污染與邏輯混淆。
* **黑盒契約驅動（Contract-First）**：
  * 跨插件協同僅透過 [`0.doc_mg/docs/cross_plugin_contract.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/docs/cross_plugin_contract.md) 定義的純資料通信協定進行，將對方視為獨立黑盒子，嚴禁跨專案直接 `import/require` 或存取內部實作。
* **資料與儲存實體隔離**：
  * 各插件專屬 `chrome.storage.local` 或 `IndexedDB` 保持 100% 獨立，嚴禁共享或跨插件寫入對端資料庫。跨插件資料一律採防禦性單向只讀快照。
* **零依賴與優雅降級（Graceful Degradation）**：
  * 各插件必須保持 100% 獨立編譯、獨立發布。若對端插件未安裝或當機，核心功能不受任何影響，跨插件模組自動安全降級。

