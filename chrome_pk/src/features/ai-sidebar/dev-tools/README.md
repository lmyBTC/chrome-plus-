# AI Sidebar 開發與評估工具庫 (Dev-Tools)

本目錄作為 `ai-sidebar` 與 AI 核心模組之內部測試、除錯與提示詞評估說明收整。

## 1. 關聯測試工具
- **提示詞評估腳本**：`chrome_scrumclock/tests/prompt-eval.ts`
  - 核心功能：透過 Puppeteer 啟動 Chromium 驗證 Prompt 解析正確率與 Action Schema 生成品質。
  - 涵蓋案例：每週專案建立與進度更新、每日任務新增與狀態變更、一般對話意圖過濾等。

## 2. 核心關聯模組
- 提示詞範本：`src/utils/ai-prompts.ts`
- 動作結構綱要：`src/utils/ai-schemas.ts`
- AI 輔助核心：`src/utils/ai-helper.ts`
- 側邊欄互動視圖：`src/features/ai-sidebar/components/AISidebar.tsx`
