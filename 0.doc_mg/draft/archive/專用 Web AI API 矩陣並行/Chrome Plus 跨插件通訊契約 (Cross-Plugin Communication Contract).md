<!-- STREAMING_CHUNK:Updating cross-plugin communication contract with Web AI Matrix support... -->
# 🤝 Chrome Plus 跨插件通訊契約 (Cross-Plugin Communication Contract)

> **版本**：v2.2 (Web AI Matrix Parallelism Edition)
>
> **適用架構**：Chrome Extension Manifest V3 (跨擴充功能訊息通訊 `chrome.runtime.sendMessage`)
>
> **中樞 Extension ID (ScrumClock)**：`ahiihabnbjeoeneahcgbdcofncjoclcp`
>
> **本機工具執行閘道**：`http://127.0.0.1:8765/exec`

## 1. 通訊架構與安全原則

1. **黑盒隔離 (Black-Box Isolation)**：各插件之間不共享全域變數、不直接操作對端 DOM，所有協同僅透過 `chrome.runtime.sendMessage` 發送結構化 JSON。

2. **單一中樞 (Hub-and-Spoke)**：以 `chrome_scrumclock` 為任務與排程中樞。

3. **零依賴與容錯降級 (Defensive Fallback)**：當目標插件未安裝或背景 Worker 休眠時，發起端必須捕獲 `chrome.runtime.lastError`，保證自身功能不崩潰。

4. **Web AI 矩陣並行調度 (Matrix Dispatch)**：優先調用蒸餾小模型（`ai.summarizer`, `ai.writer`, `ai.rewriter`, `ai.translator`），若未就緒自動透明降級至 `NanoService` 通用 Prompt API。

## 2. 核心 Action 協定總表

| Action 名稱 | 發送端 | 接收端 | 核心用途 | 
| ----- | ----- | ----- | ----- | 
| `CREATE_TASK` | FinanceClipper / VideoSpeed | ScrumClock | 推送個股研報或 YouTube 字幕筆記至今日焦點戰役 | 
| `GET_ACTIVE_PULSE_ITEM` | ScrumClock SidePanel | Pulse 頁面 Content Script | 擷取 `pulse.html` 卡片標題、摘要與 URL | 
| `DISPATCH_SOCIAL_POST` | 外部頁面 / Content Script | ScrumClock (SocialDispatcher) | 觸發社群貼文產生與側欄 HITL 發布審核 | 
| `EXECUTE_ROUTER_ACTION` | NanoIntentRouter | ScrumClock Background | 全域自然語言命令解析後的動作派發 | 
| `LOCAL_TOOL_PROXY` | ScrumClock | 本地 Python 閘道 (:8765) | 呼叫 RSS 更新、防重比對、社群直發與 Markdown 落盤 | 

## 3. 各協定 Payload 詳細規格

### 3.1 `DISPATCH_SOCIAL_POST` (社群發布協定 - v2.2)

```typescript
interface DispatchSocialPostPayload {
  action: "DISPATCH_SOCIAL_POST";
  source: "pulse_page" | "manual_clip" | "external_script";
  data: {
    id?: string;
    title: string;
    summary: string;
    url: string;
    tags?: string[];
    autoGenerate?: boolean; // 是否立即觸發 Web AI 矩陣平行生成
    matrixOptions?: {
      summarizerType?: "key-points" | "tl-dr";
      targetTone?: "formal" | "casual" | "neutral";
    };
  };
}
```

**接收端行為**：

1. 喚醒或聚焦 ScrumClock Side Panel。
2. 切換至 `SocialDispatcher` 工具標籤頁。
3. 填入草稿來源欄位，若 `autoGenerate: true` 則即刻由 `WebAIGateway` 調度專用 Summarizer 提煉要點並由專用 Writer 分別產出 X 與 Threads 初稿。

### 3.2 `LOCAL_TOOL_PROXY` (本機微服務執行協定)

```typescript
interface LocalToolProxyRequest {
  tool_name: "append_rss" | "check_dedup" | "publish_x" | "publish_threads" | "save_markdown";
  payload: Record<string, any>;
}
```

**支援之工具與參數**：

* `append_rss`: `{ title: string, summary: string, url: string }`
* `check_dedup`: `{ text: string, threshold?: number }`
* `publish_x`: `{ text: string, url?: string }`
* `publish_threads`: `{ text: string, url?: string }`
* `save_markdown`: `{ title: string, content: string, url?: string, tags?: string[] }`

### 3.3 `EXECUTE_ROUTER_ACTION` (萬能路由器指令協定)

```typescript
interface ExecuteRouterActionPayload {
  action: "EXECUTE_ROUTER_ACTION";
  payload: {
    type: "START_TIMER" | "STOP_TIMER" | "CREATE_TASK" | "GTD_INBOX_TRIAGE" | "ENABLE_DNR_BLOCK";
    params: {
      durationMinutes?: number;
      taskTitle?: string;
      estimatedPomodoros?: number;
      tag?: string;
      targets?: string[];
    };
  };
}
```

## 4. 錯誤處理與逾時防護 (Resilience Guidelines)

發送端標準防禦性呼叫範例：

```typescript
export async function sendCrossPluginMessage<T>(
  targetExtensionId: string,
  message: any,
  timeoutMs: number = 3000
): Promise<{ success: boolean; data?: T; error?: string }> {
  return new Promise((resolve) => {
    let hasResolved = false;
    const timer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        resolve({ success: false, error: '跨插件連線逾時 (Timeout)' });
      }
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage(targetExtensionId, message, (response) => {
        if (hasResolved) return;
        clearTimeout(timer);
        hasResolved = true;

        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve({ success: true, data: response });
        }
      });
    } catch (err: any) {
      if (!hasResolved) {
        clearTimeout(timer);
        hasResolved = true;
        resolve({ success: false, error: err?.message || '訊息發送異常' });
      }
    }
  });
}
```