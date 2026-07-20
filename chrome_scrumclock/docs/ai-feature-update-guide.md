# 🤖 Scrumclock AI 專案更新說明手冊 (Feature Update Guide for AI)

> [!IMPORTANT]  
> **核心準則 (SSOT)**：當你在本專案中執行「功能重新定義」、「名稱變更」或「功能範圍調整」時，**絕對不能只修改程式碼**。本專案高度重視架構文件與 README 的同步率。請務必遵循以下檢查清單，確保所有相關檔案都同步更新。

---

## 📋 功能更新必備檢查清單 (Update Checklist)

當接收到使用者要求修改特定功能 (例如：將「寫作助理」改為「專案助理」) 時，AI 代理 (Agent) 必須執行全局搜尋 (`grep_search`)，並涵蓋以下四大層級的檔案更新：

### 1. 程式碼邏輯層 (Source Code)
*   **元件與 UI 文案 (`src/**/*.tsx`)**：
    *   尋找功能按鈕、Tooltips、Placeholder 等 UI 顯示的文字，確保文案一致。
    *   *範例路徑*：`src/core/layout/MainLayout.tsx`
*   **系統提示詞與核心邏輯 (`src/**/*.ts`, `src/**/*.tsx`)**：
    *   若功能定義改變（例如 AI 角色轉換），必須更新與之對應的 System Prompt 或業務邏輯參數。
    *   *範例路徑*：`src/features/ai-sidebar/components/AISidebar.tsx`

### 2. 核心說明文件 (README)
*   **`docs/README.md`**：
    *   **專案介紹與亮點**：確認首頁的簡介是否仍然符合更新後的功能定義。
    *   **功能清單 (Features)**：修改對應功能的段落描述。
    *   **架構設計特點**：如果該功能有特殊設計（如 Canvas 隔離），確保說明文字與新名詞吻合。

### 3. 架構與流程圖 (Architecture & Flowcharts)
本專案使用 Mermaid 與 HTML 渲染流程圖，更改功能時必須**雙向同步更新**以下兩份檔案：
*   **`docs/workflow-flowchart.md` (Markdown 原始碼)**：
    *   更新 Mermaid 流程圖中的節點名稱、元件說明 (如 `AISidebar["AISidebar.tsx <br/>(AI 專案助理)"]`)。
    *   更新目錄樹 (`tree`) 的中文註解。
*   **`docs/workflow-flowchart.html` (網頁呈現版)**：
    *   更新 HTML 結構中的分頁按鈕文字 (`<button class="tab-btn">`)。
    *   更新註解 (`<!-- TAB X: ... -->`) 與表格的步驟說明 (`<td>...</td>`)。
    *   更新任何功能解說區塊（如 `<div class="tip-box">` 裡面的敘述）。

### 4. 任務狀態同步 (Task Protocol)
*   **`task.md`**：
    *   請始終遵守 `Task Protocol Management`，將此次「功能更新與文件同步」記錄於物理任務看板中，並確保狀態最終收斂與封存。

---

## 🛠️ 推薦工具與執行流程建議
1.  **步驟一：全局檢索 (`grep_search`)**
    *   使用關鍵字（例如舊名稱 `寫作助理`）進行精確或正則搜尋，範圍包含 `src/` 與 `docs/`。
    *   建議啟用 `MatchPerLine: true` 來獲得具體的行數與內容。
2.  **步驟二：精準讀寫 (`view_file` & `replace_file_content`)**
    *   不要整份檔案讀寫，請先利用 `view_file` (帶入 `StartLine` 與 `EndLine`) 取得上下文。
    *   針對多個不連續片段，善用 `multi_replace_file_content` 一次性更新。
3.  **步驟三：文件雙向驗證**
    *   修改完 `src/` 程式碼後，**強制要求自己去檢查 `docs/README.md`、`docs/workflow-flowchart.md` 與 `docs/workflow-flowchart.html`**，這是本專案最容易遺漏的地方。

> [!TIP]  
> 每次修改完成後，主動告知使用者已同步了哪些層次的文件（原始碼、README、流程圖），以展現你對專案全局一致性的掌控力。
