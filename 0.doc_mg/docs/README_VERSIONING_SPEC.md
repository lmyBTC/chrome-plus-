# Chrome Plus 全專案版本號管理規範 (Versioning Specification)

> [!IMPORTANT]
> **SSOT 業務與工具規格**：本文件定義全工作區 Chrome 擴充功能與模組之版本號命名規範、雙向同步機制以及發布自動化操作 SOP。所有版本異動皆應透過版本管理工具執行，以確保 Manifest V3 與 Chrome Web Store 審查合規。

---

## 1. Chrome 擴充功能版本號規範 (MV3 Compliance)

根據 Google Chrome Web Store 官方規範，`manifest.json` 中的 `version` 欄位具有嚴格的格式限制：

1. **格式結構**：必須由 **1 到 4 個以句點分隔的整數**組成（例如 `1`、`1.0`、`1.0.0`、`1.0.0.1`）。
2. **數值邊界**：每個整數必須介於 `0` 到 `65535` 之間（含）。
3. **前導零限制**：數值大於 0 時**不得含有前導零**（例如 `1.01` 為非法格式，應為 `1.1`）。
4. **比較順序**：Chrome 依據整數序列由左至右依序比對大小（如 `1.0.0.1` > `1.0.0`）。
5. **使用者展示版本 (`version_name`)**：若需標註 `beta`、`rc` 或日期等字串，應配置於可選的 `version_name` 欄位（例如 `"version_name": "1.0.0-beta"`），`version` 欄位則必須保持純數字格式。

---

## 2. 雙軌版本同步機制 (Manifest & Package.json)

工作區內包含兩類插件：
- **編譯型插件**（如 `chrome_scrumclock`）：同時具備 `manifest.json` 與 `package.json`。
- **原生零構建型插件**（如 `finance-research-clipper-oss`、`chrome_video speed plus`、`browser-activity-monitor`）：主要以 `manifest.json` 作為唯一版本真相源。

### 同步守則
- **主要真相源 (Primary Source)**：`manifest.json` 為擴充功能的核心標準。
- **次要同步源 (Secondary Source)**：若插件目錄下存在 `package.json`，版本號必須保持完全一致。
- **語意化版本 (SemVer)**：一般預設採用三段式版本號 `MAJOR.MINOR.PATCH`（例如 `1.0.0`）。當需要修復緊急熱修復時可啟用第 4 組數字。

---

## 3. 自動化版本管理工具 (`version_manager.py`)

為避免手動修改多個檔案導致格式錯誤或版本脫鉤，專案於 `1.devtools/tools/version_manager.py` 實作了自動化管理工具。

### 3.1. 常用指令一覽

| 指令 | 說明 | 範例 |
| :--- | :--- | :--- |
| `npm run version:list` | 檢視所有插件的當前版本與同步狀態 | `npm run version:list` |
| `npm run version:bump` | 遞增所有插件的 patch 版本 | `npm run version:bump` |
| `python 1.devtools/tools/version_manager.py bump minor --all` | 全專案遞增 minor 版本 | 升級次版號 (如 1.0.0 -> 1.1.0) |
| `python 1.devtools/tools/version_manager.py bump patch --plugin chrome_scrumclock` | 僅遞增單一指定插件 | 僅更新指定目錄下的版號 |
| `python 1.devtools/tools/version_manager.py set 1.2.0 --plugin <name>` | 設定具體指定版本號 | 支援單一或 `--all` 批次設定 |
| `--dry-run` 參數 | 預覽變更，不實際寫入檔案 | `npm run version:bump -- --dry-run` |

### 3.2. 操作流程範例

#### 情境 A：全專案發布小幅更新 (Patch Release)
```bash
# 1. 預檢各插件狀態
npm run version:list

# 2. 模擬執行確認變更結果
python 1.devtools/tools/version_manager.py bump patch --all --dry-run

# 3. 正式遞增並同步檔案
python 1.devtools/tools/version_manager.py bump patch --all

# 4. 驗證 Manifest V3 合規性
npm run audit:manifests
```

#### 情境 B：單獨發布單一插件 (如 chrome_video speed plus)
```bash
# 1. 指定插件進行 minor 升級
python 1.devtools/tools/version_manager.py bump minor --plugin "chrome_video speed plus"

# 2. 檢查狀態確認同步
npm run version:list
```

---

## 4. 上架發布合規檢查清單 (Pre-release Checklist)

在將擴充功能打包並提交至 Chrome Web Store 審查前，必須依序通過以下檢驗：

- [ ] 執行 `npm run version:list` 確認版本號符合預期且無不同步警告。
- [ ] 執行 `npm run audit:manifests` 確認所有插件 `manifest.json` 符合 MV3 規範。
- [ ] 若為編譯型專案，已執行 `npm run build` 完成最新生產環境構建。
- [ ] 檔案皆以 **UTF-8 (無 BOM)** 保存。
- [ ] 驗證版本號大於 Chrome Web Store 上已發布的現有版本。
