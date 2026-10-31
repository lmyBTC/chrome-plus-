<!-- cross-ref:auto ─────────────────────
  本檔: spec-cross-plugin-contract.md
  交叉引用:
    - ./spec-official-gemini-bridge.md      [GEMINI_OFFICIAL_SYNC, INJECT_TO_OFFICIAL_GEMINI]
    - ./spec-google-ecosystem.md            [EXPORT_TO_SHEETS, CREATE_DOC_REPORT]
───────────────────── cross-ref:end -->
# Chrome 多插件工作區：跨插件通訊解耦與防禦性架構規範 (Cross-Plugin Decoupling & Defensive Contract)

> **版本**：v2.4.0 (Official Gemini Bi-directional Bridge)  
> **核心願景**：各 Chrome 擴充功能保持「100% 獨立編譯、獨立發布、自治運行」。跨插件合作僅透過原生直連純資料通訊協議 (Pure Data Contract)，任一插件的單獨重構、新增欄位或版本不一致，絕不牽連其他插件。

---

## 1. 獨立自治原則 (Zero-Coupling Autonomy)

1. **實體工程完全解耦**：
   - `chrome_pk`：TypeScript + React 18 + Vite。
   - `chrome_gemini_nano`：原生 JS / Chrome Prompt API / Content Bridge。
   - `finance-research-clipper-oss`：原生 Vanilla JS 零構建。
   - **0 依賴**：嚴禁跨專案 `import / require`。
2. **運行期單向隔離 (Fault Sandbox)**：
   - 任一插件未安裝或崩潰，其他插件之核心功能仍 100% 正常運作。

---

## 2. 寬容讀者模式 (Tolerant Reader Pattern)

1. **發送端：資料防腐層 (Anticorruption Sanitizer)**：發送前白名單消毒，過濾私有屬性（如 `__custom_state`、DOM 節點、未序列化物件）。
2. **接收端：未知欄位自動忽略 (Ignore Unknown Fields)**：只解析白名單欄位，收到額外欄位靜默忽略，絕不拋出 `TypeError`。
3. **型別安全降級 (Defensive Fallback)**：對陣列與字串強制驗證 (`Array.isArray` / `typeof === 'string'`)，資料缺失時兜底降級，不中斷 UI。

---

## 3. 靜態金鑰與擴充功能 ID 恆定對照表 (Static Extension Keys)

所有插件於 `manifest.json` 配置 2048-bit RSA SPKI 公開金鑰，使本地與發布環境 Extension ID 恆定：

| 插件代號 (Plugin) | 專案目錄 | 恆定 Extension ID | 角色定位 |
| :--- | :--- | :--- | :--- |
| **PK+ (ScrumClock)** | `chrome_pk/` | `ahiihabnbjeoeneahcgbdcofncjoclcp` | 核心宿主與能力中樞 (Hub) |
| **FinanceClipper** | `finance-research-clipper-oss/` | `imnnkgiglcbjknfbkdfocdhoookkipji` | 財務投研採集子插件 (Spoke) |
| **VideoSpeedPlus** | `chrome_video speed plus/` | `dhdnogmjajghbdcgdccicpkfljmcoieg` | 影片倍速與字幕採集子插件 (Spoke) |
| **ActivityMonitor** | `browser-activity-monitor/` | `kjnoegggihncdaimlgfccccogghjapgn` | 瀏覽器行為監控子插件 (Spoke) |
| **GeminiNano** | `chrome_gemini_nano/` | `(選用直連/外部動態對接)` | 本機 AI 邊緣推論與官方橋接子插件 (Spoke) |

---

## 4. 業務擴充協議規格

*(前略：6.1 ~ 6.10 節維持通用任務、番茄鐘專注廣播、社群分發與 Google 生態對接標準...)*

### 6.11 官方 Gemini 側欄對話雙向同步協定 (v2.4)

#### A. 官方對話流入中樞 (`GEMINI_OFFICIAL_SYNC`)
- **發送端**：`chrome_gemini_nano` (`geminiOfficialBridge.js`) ➔ **接收端**：`chrome_pk` (`OfficialGeminiConnector.ts`)
- **請求格式**：
```json
{
  "protocolVersion": 2,
  "type": "GEMINI_OFFICIAL_SYNC",
  "payload": {
    "sessionId": "gemini-session-1730260000",
    "role": "user",
    "text": "請針對台積電資本支出給出關鍵分析",
    "modelName": "Flash-Lite",
    "source": "OFFICIAL_GEMINI_SIDEPANEL",
    "referencedTabs": [
      { "title": "TSMC 2026Q3 法說會", "url": "https://..." }
    ],
    "timestamp": 1730260000000
  }
}
```
- **響應格式**：`{ "success": true, "ack": true, "message": "已成功記錄至 PK+ 歷史對話池" }`

#### B. 成果回拋官方側欄輸入框 (`INJECT_TO_OFFICIAL_GEMINI`)
- **發送端**：`chrome_pk` ➔ **接收端**：`chrome_gemini_nano` (`geminiOfficialBridge.js`)
- **請求格式**：
```json
{
  "protocolVersion": 2,
  "type": "INJECT_TO_OFFICIAL_GEMINI",
  "payload": {
    "text": "【來自 PK+ 估值沙盒之結論】目標價為 $150，請接續草擬研究簡報。",
    "autoSubmit": true,
    "contextSource": "FINANCE_CLIPPER",
    "timestamp": 1730260010000
  }
}
```
- **響應格式**：`{ "success": true, "ack": true, "submitted": true }`
- **超時與熔斷**：發送端配置 4 秒超時保險絲，未收到回應自動降級將內容存入剪貼簿，並向使用者彈出輕量提示。