---
name: Chrome 插件合規審計 (Chrome Compliance Auditor)
description: 自動審查 Chrome 插件的 Manifest V3 設定與 JS/TS 代碼中的安全漏洞（CSP/XSS），確保符合 Web Store 上架合規。
triggers: [安全審查, 合規檢查, manifest審計, 插件檢查, 檢查manifest, 上架檢查, 原始碼掃描, 靜態掃描]
dependencies: []
ssot_dependencies: ["0.doc_mg/dev_standards.md", "0.doc_mg/chrome_agent_optimization.md"]
---

# 專家技能：Chrome 插件合規審計 (Chrome Compliance Auditor)

你負責在開發或提交程式碼前，執行自動化的 Manifest V3 安全與合規檢查，以避免手動排查引起的 Token 浪費，並確保安全標準一致性。

## 1. 核心指南引用 (Mandatory Read)
在執行審查或修改插件代碼前，建議參閱以下 SSOT 文件：
* [`0.doc_mg/dev_standards.md`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/dev_standards.md) (MV3、Shadow DOM 樣式隔離與通訊標準)
* [`0.doc_mg/chrome_agent_optimization.md`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/chrome_agent_optimization.md) (注意事項與 Token 優化指南)

## 2. 執行工作流 (Auditor Workflow)

### Step 1: 觸發條件
* 當用戶提出「安全審查」、「檢查插件是否合規」或 Agent 修改了 `manifest.json`、`content.js`、`background.js` 後，**必須**自動加載此技能。

### Step 2: 執行自動化檢查
* 在專案根目錄下，使用 `run_command` 執行審計指令：
  ```bash
  python 0.doc_mg/tools/audit_manifests.py
  ```
  或者（如果使用 npm）：
  ```bash
  npm run audit:manifests
  ```

### Step 3: 解析報告與局部修正
* **情況 A：審計結果通過**
  * 直接回報使用者審計通過，並繼續後續開發。
* **情況 B：審計報告指出錯誤或警告**
  * **禁止**通讀所有程式碼。
  * 根據報告中提示的檔案路徑與行號，使用 `view_file` (指定 `StartLine`/`EndLine`) 局部讀取發生問題的程式碼區塊。
  * 使用 `replace_file_content` 修正後，重新執行 Step 2 進行校正，直至審計通過。

## 3. 約束條件
* **嚴禁繞過審計**：任何 Manifest 與核心 JS 代碼變更後，均需重新運行此工具以防範安全漏洞。
* **增量修正原則**：僅修復審計報告指出的錯誤位置，不得擴大修改範圍以維持專案穩定度。
