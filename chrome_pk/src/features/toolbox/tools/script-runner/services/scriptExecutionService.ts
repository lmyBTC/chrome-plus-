import { ScriptRunResult, ScriptExecutionLog } from '../types';

/**
 * 檢查 URL 是否為 Chrome 不允許注入腳本的受保護頁面
 */
export function isRestrictedUrl(url?: string): boolean {
  if (!url) return true;
  const restrictedProtocols = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'devtools://',
    'about:',
    'view-source:',
    'chrome-search://'
  ];
  return restrictedProtocols.some(proto => url.startsWith(proto));
}

/**
 * 取得當前活躍分頁
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    throw new Error('當前環境未支援 Chrome Extension Tabs API');
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    throw new Error('未找到活躍的分頁，請先切換至欲執行的網頁分頁');
  }

  if (isRestrictedUrl(tab.url)) {
    throw new Error(`無法在受保護的系統頁面 (${tab.url || '未知頁面'}) 注入腳本，請切換至一般網站頁面`);
  }

  return tab;
}

/**
 * 在當前活躍分頁執行自訂 JavaScript 腳本
 */
export async function executeScriptOnActiveTab(
  code: string,
  options?: { timeoutMs?: number }
): Promise<ScriptRunResult> {
  const startTime = performance.now();
  const executedAt = Date.now();

  try {
    const tab = await getActiveTab();
    const tabId = tab.id!;
    const tabUrl = tab.url;
    const tabTitle = tab.title;

    if (!code || !code.trim()) {
      return {
        success: false,
        error: '腳本代碼不可為空',
        logs: [],
        executionTimeMs: 0,
        executedAt,
        tabId,
        tabUrl,
        tabTitle
      };
    }

    if (typeof chrome === 'undefined' || !chrome.scripting) {
      throw new Error('當前環境未支援 Chrome Scripting API');
    }

    // 透過 chrome.scripting.executeScript 注入執行
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId },
      args: [code.trim()],
      func: async (scriptSource: string) => {
        const capturedLogs: Array<{ level: 'info' | 'warn' | 'error' | 'success'; message: string; timestamp: number }> = [];
        const origLog = console.log;
        const origWarn = console.warn;
        const origError = console.error;

        const serializeArg = (arg: any): string => {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        };

        console.log = (...args: any[]) => {
          capturedLogs.push({
            level: 'info',
            message: args.map(serializeArg).join(' '),
            timestamp: Date.now()
          });
          origLog(...args);
        };

        console.warn = (...args: any[]) => {
          capturedLogs.push({
            level: 'warn',
            message: args.map(serializeArg).join(' '),
            timestamp: Date.now()
          });
          origWarn(...args);
        };

        console.error = (...args: any[]) => {
          capturedLogs.push({
            level: 'error',
            message: args.map(serializeArg).join(' '),
            timestamp: Date.now()
          });
          origError(...args);
        };

        try {
          // 動態構建非同步評估容器 (透過 AsyncFunction 原型構造器安全調用，相容 MV3 靜態 CSP 規範)
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          const wrappedBody = scriptSource.includes('return') ? scriptSource : `return (${scriptSource});`;
          const evaluator = AsyncFunction(wrappedBody);

          const result = await evaluator();
          return {
            success: true,
            result: result !== undefined ? result : '腳本執行完成 (無回傳值)',
            logs: capturedLogs
          };
        } catch (err: any) {
          return {
            success: false,
            error: err?.message || String(err),
            logs: capturedLogs
          };
        } finally {
          console.log = origLog;
          console.warn = origWarn;
          console.error = origError;
        }
      }
    });

    const executionTimeMs = Math.round(performance.now() - startTime);

    if (!injectionResults || injectionResults.length === 0) {
      return {
        success: false,
        error: '分頁未回傳任何執行結果',
        logs: [],
        executionTimeMs,
        executedAt,
        tabId,
        tabUrl,
        tabTitle
      };
    }

    const payload = injectionResults[0].result as {
      success: boolean;
      result?: any;
      error?: string;
      logs: ScriptExecutionLog[];
    };

    return {
      success: payload.success,
      result: payload.result,
      error: payload.error,
      logs: payload.logs || [],
      executionTimeMs,
      executedAt,
      tabId,
      tabUrl,
      tabTitle
    };
  } catch (err: any) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      error: err?.message || String(err),
      logs: [
        {
          level: 'error',
          message: `執行異常: ${err?.message || String(err)}`,
          timestamp: Date.now()
        }
      ],
      executionTimeMs,
      executedAt
    };
  }
}

