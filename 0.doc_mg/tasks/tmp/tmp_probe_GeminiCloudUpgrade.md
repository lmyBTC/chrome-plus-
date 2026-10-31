# 探勘快取：GeminiCloudUpgrade_OfficialBridgeUI (Gate 1 Cache)

- 日期：2026-10-31
- 插件目標：`chrome_pk`

## 1. 現狀代碼架構骨架 (Code Skeleton)
- `chrome_pk/src/entries/sidebar/main.tsx`:
  - 側欄主架構，含 `AIAssistantView` 與 `ToolboxHub`。
- `chrome_pk/src/entries/sidebar/components/AIAssistantView.tsx`:
  - 核心對話 UI，現依賴 `useAISession`。
- `chrome_pk/src/entries/sidebar/hooks/useAISession.ts`:
  - 呼叫 `getAICore()`, `checkAiCapabilities()`, `executeNanoInference()`，完全綁定本機 Chrome AI (Prompt API / Gemini Nano)。
- `chrome_pk/src/utils/ai-helper.ts`:
  - 封裝 `executeNanoInference`，缺乏雲端 Gemini API 呼叫能力。
- `chrome_pk/src/core/ai/OfficialGeminiConnector.ts`:
  - 官方 Gemini 側欄雙向橋接接收端，已實作 `handleSync` 寫入 `geminiConversations`，並具備 `injectToOfficialGemini` 接口，但 UI 未呈現與串接。

## 2. 改造藍圖規劃
1. **AI 核心升級 (Cloud Gemini Engine)**:
   - 擴充 `ai-helper.ts`，增加雲端 Gemini API（`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`）。
   - 在 storage 中儲存 `geminiApiKey` 與 `aiProvider: 'cloud' | 'nano'`。
   - `useAISession` 智慧分流：雲端模式優先，無 API Key 或無網路時可切換本機 Nano。
2. **官方側欄對話串流與任務轉化 UI (Official Bridge UI)**:
   - 在 `AIAssistantView` 建立雙軌檢視（「AI 助理」與「官方側欄同步」）。
   - 監聽 `geminiConversations` 變更，即時呈現右側官方對話。
   - 提供「⚡ 一鍵轉為核心戰役/衝刺任務」、「📥 存入 GTD 待辦」、「🔄 回拋至右側官方輸入框」。

