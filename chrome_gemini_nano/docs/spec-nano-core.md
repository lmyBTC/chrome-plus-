# 📋 Gemini Nano Prompt API 與本機自動化業務規格 (gemini_nano_spec.md)

> [!NOTE]
> 本文檔定義 `chrome_gemini_nano` 插件中 Chrome 內建 AI (Prompt API / LanguageModel API) 的調用規範、生命週期管理與本地端 Python 工具代理介面。

---

## 1. Chrome 內建 Prompt API 規格

### 1.1 介面相容性矩陣
- **標準 API**: `window.ai.languageModel` (Chrome 128+)
- **過渡/測試版 API**: `window.ai.assistant` 或 `chrome.aiOriginTrial.languageModel`
- **能力探針 (Capabilities)**:
  - 呼叫 `languageModel.capabilities()` 取得可用性狀態：
    - `'readily'`: 模型已就緒，可立即執行推論。
    - `'after-download'`: 需先觸發下載流程，配合進度監聽。
    - `'no'`: 當前硬體不支援（例如 VRAM 不足或不支援 AVX）。

### 1.2 Session 生命週期與記憶體管理
- **工作完成後即銷毀**: 調用完成後，必須調用 `session.destroy()` 釋放本機 GPU/NPU 與 VRAM 記憶體。
- **溫度與取樣**:
  - 結構化解析與 Intent 路由：`temperature: 0.1`、`topK: 3`（確保輸出確定性）。
  - 文案創作與風格重寫：`temperature: 0.7`、`topK: 40`。

---

## 2. 社群 4 大調音算子定義 (Tone Shifter Operators)

| 算子名稱 | Prompt 指令目標 | 典型輸出樣式 |
| :--- | :--- | :--- |
| **銳化觀點 (Sharpen)** | 刪除中立廢話，提煉具攻擊性或洞察性的核心論點 | 語氣果斷、突出矛盾與核心發現 |
| **壓線字數 (Compress)** | 強制壓縮文字在 Twitter 280 字元或短文限制內 | 精煉短句、以要點符號呈現 |
| **去油去官腔 (De-fluff)** | 移除公關腔、陳腔濫調與浮誇行銷詞 | 誠實、直白、專業技術風 |
| **拆切 Thread (Split)** | 將長文智能分段為連續 3~5 則 Thread 貼文 | 帶有編號標籤 (1/n, 2/n) 與引導鉤子 |

---

## 3. 本機微服務協定規格 (FastAPI 8765)

- **基礎位址**: `http://127.0.0.1:8765`
- **CORS 設定**: 允許 `chrome-extension://*` 來源。

### 3.1 端點列表
1. `POST /api/publish`
   - **Payload**: `{ "platform": "x" | "threads" | "both", "content": string, "dry_run": boolean }`
   - **Response**: `{ "success": boolean, "post_ids": string[], "message": string }`
2. `POST /api/rss/append`
   - **Payload**: `{ "title": string, "link": string, "description": string }`
   - **Response**: `{ "success": boolean, "feed_path": string }`
3. `POST /api/dedup/check`
   - **Payload**: `{ "content": string, "threshold": number }`
   - **Response**: `{ "is_duplicate": boolean, "max_similarity": number, "matched_title": string }`
4. `POST /api/archive/markdown`
   - **Payload**: `{ "title": string, "content": string, "tags": string[], "source_url": string }`
   - **Response**: `{ "success": boolean, "file_path": string }`

---

## 4. 跨插件黑盒訊息契約與測試驗證說明

### 4.1 社群貼文分發與研報轉發協定 (`DISPATCH_SOCIAL_POST`)
遵循 `0.doc_mg/docs/cross_plugin_contract.md` 規範：
- **發送端/接收端**：支援由 ScrumClock Hub 或 FinanceClipper/VideoSpeedPlus 發送草稿至 Gemini Nano 進行分發或調音。
- **Payload 結構**：
  ```json
  {
    "protocolVersion": 2,
    "type": "DISPATCH_SOCIAL_POST",
    "payload": {
      "x_en": "string (max 1000 chars)",
      "threads_zh": "string (max 2000 chars)",
      "originalTitle": "string (max 200 chars)",
      "originalSummary": "string (max 1500 chars)",
      "sourceUrl": "string (max 500 chars)",
      "ticker": "string (max 20 chars, uppercase)",
      "tags": ["#tag1", "#tag2"],
      "sourcePlugin": "SCRUMCLOCK | FINANCE_CLIPPER",
      "createdAt": 1727856000000
    }
  }
  ```
- **容錯與降級機制**：
  1. **防腐層 (Anticorruption Sanitizer)**：發送前主動剔除 `__internal*` 私有狀態與 DOM 節點，截斷超長字串。
  2. **靜默降級 (Fault Sandbox)**：若對端插件未安裝（`chrome.runtime.lastError`），發送端捕獲異常並回傳失敗，絕不阻斷前端 UI 操作。
  3. **超時保險絲 (Timeout Guard)**：直連調用預設 4 秒超時熔斷保護。
  4. **日誌清理規範**：僅在非生產環境（Dev）輸出標準化 `[Contract Debug]` 日誌。

### 4.2 自動化驗證工模
- **測試命令**：`npm run test:contract` (執行 `chrome_scrumclock/tests/contract-cross-plugin-eval.ts`)
- **覆蓋指標**：涵蓋防腐層截斷過濾、`lastError` 攔截、逾時熔斷、寬容讀者未知欄位忽略與 Dev 日誌格式檢驗。

