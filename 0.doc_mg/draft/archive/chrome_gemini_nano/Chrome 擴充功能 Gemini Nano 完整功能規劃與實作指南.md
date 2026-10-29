# 🧠 Chrome Extension 內調用 Gemini Nano (Prompt API)：架構規劃、生命週期與極簡範例指南

> **定位**：為 Chrome Plus / ScrumClock 提供一份可立即落地的「本機端 Gemini Nano (Prompt API)」功能規劃、生命週期管理、防崩潰降級與完整可執行程式碼範例。
> **環境要求**：Google Chrome 128+（含 Canary / Dev / Stable）
> **適用載體**：Side Panel (`sidepanel.html`)、Popup、Offscreen Document 或 Background Service Worker

---

## 一、 功能規劃與技術架構 (Feature Planning & Architecture)

### 1.1 核心職責邊界 (Role & Responsibility)
在瀏覽器擴充功能中，Gemini Nano 不應作為長篇大論的通用百科，而應專注於**「高頻率、低延遲、高隱私」的邊緣決策與文字管線**：

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Chrome 擴充功能環境                             │
│                                                                        │
│  [當前網頁 (pulse.html / 研報)]                                        │
│          │                                                             │
│          ▼ (DOM / Selection 提取 300~1500 字元)                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 1. 偵測與適配層 (Namespace & Capabilities Detection)              │  │
│  │    - 支援 self.ai.languageModel / window.ai.languageModel        │  │
│  │    - 狀態判定: 'readily' | 'after-download' | 'no'              │  │
│  └──────────────────┬───────────────────────────────────────────────┘  │
│                     │                                                  │
│                     ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 2. 會話生命週期管理 (Session Manager & VRAM Protection)           │  │
│  │    - 單例模式 (Singleton) / 常駐會話 (Persistent Session)        │  │
│  │    - System Prompt 預載 (Persona & Output Format)                │  │
│  │    - 組件銷毀或逾時自動 session.destroy() 釋放 VRAM              │  │
│  └──────────────────┬───────────────────────────────────────────────┘  │
│                     │                                                  │
│                     ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 3. 雙軌推理與串流輸出 (Streaming & Fallback Engine)               │  │
│  │    - promptStreaming() 即時打字機效果                            │  │
│  │    - safeExtractJSON() 正則過濾 Markdown 代碼塊                  │  │
│  │    - Nano 未就緒時，無縫降級至雲端 Gemini API Key                │  │
│  └──────────────────┬───────────────────────────────────────────────┘  │
│                     │                                                  │
│                     ▼                                                  │
│         [雙語社群草稿 UI / 本地 Python 工具發布]                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 三大核心使用情境
1. **Pulse 快訊一秒轉雙語貼文**：
   - 提取部落格/快訊卡片的標題與正文，由 Nano 輸出符合 X (Twitter 英文) 與 Threads (繁中) 的純 JSON 格式。
2. **社群字數即時壓縮與去油 (Guardrail)**：
   - 英文文案超過 280 字時，Nano 進行二次無感修剪，保留核心數據。
3. **本地離線意圖路由 (Intent Router)**：
   - 判斷該篇內容屬於「總經總結」、「加密幣」還是「開發架構」，自動派發至不同的本機 Python 工具。

---

## 二、 瀏覽器前置環境配置 (Browser Prerequisites)

在撰寫程式碼前，需確保測試用的 Chrome 瀏覽器已開啟底層硬體與模型開關：

1. **啟用實驗旗標 (`chrome://flags`)**：
   - `chrome://flags/#optimization-guide-on-device-model` ➔ 選擇 **Enabled BypassPerfRequirement**（強制開啟，繞過 GPU 效能檢測）。
   - `chrome://flags/#prompt-api-for-gemini-nano` ➔ 選擇 **Enabled**。
2. **重啟瀏覽器 (Relaunch)**。
3. **檢查模型下載進度 (`chrome://components`)**：
   - 找到 **Optimization Guide On Device Model**。
   - 點擊「檢查更新 (Check for update)」，確保狀態變為 **Up-to-date**（首次下載權重檔約 1.5GB ~ 2GB）。

---

## 三、 生產級 TypeScript 模組實作

以下為封裝好的完整模組，具備：
1. 多重命名空間適配
2. 能力檢測與下載進度回報
3. 常駐會話與 VRAM 記憶體安全銷毀
4. 串流（Streaming）與非串流雙模式
5. JSON 安全過濾

```typescript:NanoService:src/core/ai/nanoService.ts
/**
 * Chrome 內建 Gemini Nano (Prompt API) 服務封裝
 * 遵循 Chrome 128+ 標準 Draft 規範，具備降級適配與記憶體生命週期防護
 */

export type NanoAvailability = 'readily' | 'after-download' | 'no' | 'unsupported';

export interface NanoSessionOptions {
  systemPrompt?: string;
  temperature?: number;
  topK?: number;
  onDownloadProgress?: (loaded: number, total: number) => void;
}

export interface SocialPostResult {
  x_en: string;
  threads_zh: string;
}

export class NanoService {
  private static instance: NanoService;
  private activeSession: any = null;

  private constructor() {}

  public static getInstance(): NanoService {
    if (!NanoService.instance) {
      NanoService.instance = new NanoService();
    }
    return NanoService.instance;
  }

  /**
   * 1. 多命名空間探測：相容不同版本 Chrome 的 API 掛載點
   */
  public getAICore(): any {
    if (typeof self !== 'undefined' && (self as any).ai?.languageModel) {
      return (self as any).ai.languageModel;
    }
    if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
      return (window as any).ai.languageModel;
    }
    if (typeof chrome !== 'undefined' && (chrome as any).aiLanguageModel) {
      return (chrome as any).aiLanguageModel;
    }
    if (typeof (self as any).LanguageModel !== 'undefined') {
      return (self as any).LanguageModel;
    }
    return null;
  }

  /**
   * 2. 檢測模型就緒狀態
   */
  public async checkAvailability(): Promise<NanoAvailability> {
    const aiCore = this.getAICore();
    if (!aiCore) {
      return 'unsupported';
    }

    try {
      if (typeof aiCore.capabilities === 'function') {
        const caps = await aiCore.capabilities();
        return (caps.available as NanoAvailability) || 'no';
      }
      // 早期版本若具備 create 函式則視為可用
      if (typeof aiCore.create === 'function') {
        return 'readily';
      }
      return 'no';
    } catch (err) {
      console.warn('[NanoService] capabilities 檢測失敗:', err);
      return 'no';
    }
  }

  /**
   * 3. 建立或重用會話 (維持 Singleton 避免 VRAM 耗盡)
   */
  public async getOrCreateSession(options: NanoSessionOptions = {}): Promise<any> {
    if (this.activeSession) {
      return this.activeSession;
    }

    const aiCore = this.getAICore();
    if (!aiCore) {
      throw new Error('當前瀏覽器環境不支援 Chrome Prompt API');
    }

    const availability = await this.checkAvailability();
    if (availability === 'no' || availability === 'unsupported') {
      throw new Error('Gemini Nano 模型在當前設備無法使用，請檢查 flags 與 components');
    }

    const createParams: any = {
      systemPrompt: options.systemPrompt || 'You are a helpful and concise technical analyst.',
    };

    if (options.temperature !== undefined) createParams.temperature = options.temperature;
    if (options.topK !== undefined) createParams.topK = options.topK;

    // 監聽本機模型下載進度
    if (options.onDownloadProgress) {
      createParams.monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          options.onDownloadProgress?.(e.loaded, e.total);
        });
      };
    }

    this.activeSession = await aiCore.create(createParams);
    return this.activeSession;
  }

  /**
   * 4. 基礎推論
   */
  public async prompt(text: string): Promise<string> {
    const session = await this.getOrCreateSession();
    return await session.prompt(text);
  }

  /**
   * 5. 串流推論 (打字機漸進效果)
   */
  public async promptStreaming(
    text: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const session = await this.getOrCreateSession();
    const stream = session.promptStreaming(text);
    let fullText = '';

    for await (const chunk of stream) {
      fullText = chunk; // Prompt API 回傳的 chunk 通常是累計的完整文字
      onChunk(fullText);
    }
    return fullText;
  }

  /**
   * 6. 專業場景：部落格 Pulse 轉雙語社群貼文
   */
  public async generateSocialPosts(
    title: string,
    summary: string,
    url: string
  ): Promise<SocialPostResult> {
    const systemPrompt = `
You are a senior tech/quant researcher and social media strategist.
Analyze the provided blog update and output strictly valid JSON with this exact schema:
{
  "x_en": "Concise, sharp, analytical English post for X. 3-4 bullets. High signal. Ends with URL.",
  "threads_zh": "Conversational, engaging Taiwanese Traditional Chinese (繁體中文) post for Threads. Natural paragraph breaks. Ends with an open question and URL."
}
Do not include markdown code block syntax (like \`\`\`json). Just return raw JSON.
`;

    // 為確保特定 System Prompt 生效，可重新初始化單次會話
    this.destroySession();
    const session = await this.getOrCreateSession({
      systemPrompt,
      temperature: 0.3, // 低溫保持結構穩定
    });

    const userQuery = `
Title: ${title}
Content: ${summary}
Source URL: ${url}
`;

    const rawResponse = await session.prompt(userQuery);
    return this.safeExtractJSON<SocialPostResult>(rawResponse);
  }

  /**
   * 7. 正則過濾與 JSON 容錯解析 (防止 Nano 夾帶廢話)
   */
  private safeExtractJSON<T>(text: string): T {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('未在模型輸出中找到 JSON 區塊');
      }
      return JSON.parse(match[0]) as T;
    } catch (e) {
      console.error('[NanoService] JSON 解析失敗，原始文字為:', text);
      throw new Error(`模型輸出格式不符: ${(e as Error).message}`);
    }
  }

  /**
   * 8. 記憶體釋放：主動銷毀會話，釋放顯卡 VRAM
   */
  public destroySession(): void {
    if (this.activeSession) {
      try {
        this.activeSession.destroy();
      } catch (err) {
        console.warn('[NanoService] 銷毀會話時發生微小異常:', err);
      } finally {
        this.activeSession = null;
      }
    }
  }
}
```

---

## 四、 在 React Side Panel 元件中的完整調用範例

在 `chrome_scrumclock` 側邊欄（或獨立分頁）中直接引入此服務：

```tsx:SocialDispatcher:src/sidepanel/components/SocialDispatcher.tsx
import React, { useState, useEffect } from 'react';
import { NanoService, NanoAvailability, SocialPostResult } from '@/core/ai/nanoService';

export const SocialDispatcher: React.FC = () => {
  const [nanoStatus, setNanoStatus] = useState<NanoAvailability>('unsupported');
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  
  // 貼文草稿狀態 (可手動二次編輯)
  const [xPost, setXPost] = useState('');
  const [threadsPost, setThreadsPost] = useState('');

  const nano = NanoService.getInstance();

  useEffect(() => {
    // 檢查本地 AI 能力
    nano.checkAvailability().then(setNanoStatus);

    return () => {
      // 離開頁面時銷毀會話，釋放 VRAM
      nano.destroySession();
    };
  }, []);

  // 1. 抓取當前活動分頁 (如 pulse.html) 並呼叫 Nano
  const handleCaptureAndGenerate = async () => {
    setLoading(true);
    setDownloadProgress(null);

    try {
      // 取得當前 Tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('找不到作用中的分頁');

      // 向 Content Script 請求擷取內容 (或直接執行腳本抽取)
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const title = document.querySelector('h1, h2')?.textContent || document.title;
          const content = document.querySelector('article, main, .pulse-card')?.textContent || document.body.innerText;
          return {
            title: title.trim(),
            summary: content.slice(0, 1500).trim(),
            url: window.location.href,
          };
        },
      });

      const pageData = results[0]?.result;
      if (!pageData) throw new Error('無法擷取頁面文字');

      // 呼叫 Gemini Nano
      const posts: SocialPostResult = await nano.generateSocialPosts(
        pageData.title,
        pageData.summary,
        pageData.url
      );

      setXPost(posts.x_en);
      setThreadsPost(posts.threads_zh);
    } catch (err: any) {
      console.error(err);
      alert(`生成失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. 發布動作
  const handleShareToX = () => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(xPost)}`;
    window.open(url, '_blank');
  };

  const handleShareToThreads = () => {
    // 複製到剪貼簿並開啟 Threads
    document.execCommand('copy');
    navigator.clipboard?.writeText(threadsPost);
    window.open('https://www.threads.net/', '_blank');
  };

  return (
    <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-4 max-w-lg mx-auto">
      {/* 狀態指示燈 */}
      <div className="flex items-center justify-between text-xs border-b border-slate-700 pb-2">
        <span className="font-semibold text-slate-400">本地 AI 狀態:</span>
        <span className={`px-2 py-0.5 rounded-full font-mono ${
          nanoStatus === 'readily' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'
        }`}>
          {nanoStatus === 'readily' ? '🟢 Gemini Nano 就緒' : `🟡 狀態: ${nanoStatus}`}
        </span>
      </div>

      {downloadProgress !== null && (
        <div className="text-xs text-indigo-400">
          模型正在本地下載中: {(downloadProgress * 100).toFixed(1)}%
        </div>
      )}

      {/* 抓取按鈕 */}
      <button
        onClick={handleCaptureAndGenerate}
        disabled={loading || nanoStatus !== 'readily'}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 font-medium rounded-lg transition-all shadow-md flex items-center justify-center space-x-2"
      >
        {loading ? <span>⚡ 本地 Nano 推理中...</span> : <span>📢 捕捉當前 Pulse 並產出貼文</span>}
      </button>

      {/* 雙欄編輯區 (Human-in-the-Loop) */}
      <div className="space-y-4 pt-2">
        {/* X 貼文區塊 */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>X (Twitter) - 英文版</span>
            <span className={xPost.length > 280 ? 'text-rose-400' : 'text-slate-400'}>
              {xPost.length} / 280 字元
            </span>
          </div>
          <textarea
            value={xPost}
            onChange={(e) => setXPost(e.target.value)}
            rows={4}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            placeholder="點擊上方按鈕自動生成 X 貼文..."
          />
          <button
            onClick={handleShareToX}
            disabled={!xPost}
            className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-semibold rounded"
          >
            一鍵帶入 X (Web Intent)
          </button>
        </div>

        {/* Threads 貼文區塊 */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Threads - 繁體中文版</span>
            <span>{threadsPost.length} 字</span>
          </div>
          <textarea
            value={threadsPost}
            onChange={(e) => setThreadsPost(e.target.value)}
            rows={5}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            placeholder="點擊上方按鈕自動生成 Threads 貼文..."
          />
          <button
            onClick={handleShareToThreads}
            disabled={!threadsPost}
            className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-semibold rounded"
          >
            複製繁中草稿並開啟 Threads
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 五、 開發除錯與踩坑清單 (Gotchas & Best Practices)

1. **VRAM 佔用與記憶體洩漏**：
   - 每呼叫一次 `ai.languageModel.create()` 就會在 GPU/RAM 建立一個會話上下文。**切勿在 React render loop 或每打一個字就重複 create**。
   - 務必在組件 unmount 時呼叫 `session.destroy()`。
2. **Context Window 限制**：
   - Gemini Nano 的輸入上限通常在 1,024 ~ 4,096 Tokens 左右。餵入文章時，必須先在前端使用 `content.slice(0, 1500)` 做字元截斷，防止觸發崩潰。
3. **JSON 輸出不穩定**：
   - 輕量級模型有時會夾帶 ````json ```` Markdown 標記，因此在程式碼中必須使用正則運算式 `text.match(/\{[\s\S]*\}/)` 進行防禦性過濾，再傳遞給 `JSON.parse`。
4. **多語系指令穩定度**：
   - 儘量使用英文撰寫 System Prompt（即使要求產出繁體中文），Nano 對英文指令的遵循度與精準度明顯優於非英語指令。