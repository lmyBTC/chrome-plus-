---
title: "全插件 Manifest 固定公鑰 (key) 配置與 Extension ID 鎖定"
plugin: "global"
status: "已完成"
created: "2026-10-08"
deadline: "2026-10-08"
---

## 1. 目標
落實手冊「解法 2：在 `manifest.json` 中配置固定公鑰 (`key`)」，對工作區內所有 Chrome 擴充功能插件進行固定 Public Key 審計與補齊，確保未封裝插件在 Chrome 重啟、跨版本（Stable / Canary）或路徑變更時 Extension ID 恆定不變，徹底解決插件自動消失或儲存路徑錯位問題。

## 2. 策略與鎖定檔案

### 審計現狀分析
1. `browser-activity-monitor/manifest.json`: 已配置 key（Extension ID: `kjnoegggihncdaimlgfccccogghjapgn`）
2. `chrome_scrumclock/public/manifest.json`: 已配置 key（Extension ID: `ahiihabnbjeoeneahcgbdcofncjoclcp`）
3. `chrome_video speed plus/manifest.json`: 已配置 key（Extension ID: `dhdnogmjajghbdcgdccicpkfljmcoieg`）
4. `finance-research-clipper-oss/manifest.json`: 已配置 key（Extension ID: `imnnkgiglcbjknfbkdfocdhoookkipji`）
5. `chrome_gemini_nano/manifest.json`: **已補齊 key**（Extension ID: `ejookehegbdmnkohfllcblcnjbgahgke`）。

### 鎖定檔案 (Target Files)
- `./1.devtools/keys/manifest_keys.json`
- `./chrome_gemini_nano/manifest.json`
- `./chrome_scrumclock/public/manifest.json` (審計驗證)
- `./browser-activity-monitor/manifest.json` (審計驗證)
- `./chrome_video speed plus/manifest.json` (審計驗證)
- `./finance-research-clipper-oss/manifest.json` (審計驗證)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/gemini-nano-core/SKILL.md` (輕量任務豁免)
- [ ] L2 插件導航：`./chrome_gemini_nano/README.md` (輕量任務豁免)
- [ ] L3 業務規格：無
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 密鑰生成與集中登記 狀態：`[完成]`
### Phase 2: Manifest 注入與全域合規驗證 狀態：`[完成]`
### Phase 3: 驗收與任務歸檔 狀態：`[完成]`
- [x] 任務 3.1: 驗收防呆核對
    - [x] 檢查所有插件 manifest 語法有效性
    - [x] 執行 L4 任務歸檔至 `0.doc_mg/tasks/archive/global/`

## 4. 影響評估
- 本次改動僅在 `manifest.json` 補齊 `"key"` 欄位，不影響任何插件既有業務邏輯、權限宣告或 CSP。
- `chrome_gemini_nano` 加入固定 key 後，在 Chrome 開發者模式重新載入時將產生固定的擴充功能 ID。

## 5. 驗收標準
- [x] **核心規範**: 工作區內全部 5 個插件均宣告有效之 `"key"` 欄位，Extension ID 全面固定。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **集中索引**: `1.devtools/keys/manifest_keys.json` 完整收錄 5 個插件之公鑰與 Extension ID。
- [x] **工具審計**: 執行 `python 1.devtools/tools/audit_manifests.py` 通過所有檢查無報錯。
- [x] **SSOT 閉環**: 輕量任務豁免 (L1~L3 豁免，完成 L4 歸檔)。
- [x] **L4 任務封存歸檔**: 任務完成後依協議移動至 `0.doc_mg/tasks/archive/global/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - 2026-10-08 ID: 66043eac-c907-4c2c-9fa2-b1b93ee719f0 (初始化 Gate 1 任務藍圖)
> - 2026-10-08 ID: 2a5de7b0-2afe-443c-8dfe-5444891c538a (執行完成 Phase 1: 密鑰生成與集中登記)
> - 2026-10-08 ID: 40b14428-bb47-42fa-b7e9-c5f39d2da713 (執行完成 Phase 2: Manifest 注入與全域合規驗證)
> - 2026-10-08 ID: 26f3e94d-6040-4a1d-a0a4-9baf7f8f2381 (執行完成 Phase 3: 驗收防呆核對與 L4 封存歸檔)
>
> **結案狀態**: 本任務所有 Phase 與驗收項目全數通過，已完成 L4 歸檔封存。
