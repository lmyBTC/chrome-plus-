/**
 * NanoIntentRouter - 全域自然語言萬能路由器
 * 藉由本地 Gemini Nano (Prompt API) 實施極速 (150ms)、零延遲、極低溫的意圖分類與複合動作解構
 * 支援 Cmd+K 命令列、側邊欄口語對話與快速鍵觸發
 *
 * @related ../../chrome_gemini_nano_README.md  (核心模組導航)
 * @related ./nanoService.ts                   (上游: AI 會話生命週期提供者)
 * @related ../../0.doc_mg/docs/cross_plugin_contract.md (契約: EXECUTE_ROUTER_ACTION)
 */

import { NanoService } from './nanoService';

export type SystemIntent =
  | 'START_TIMER'
  | 'STOP_TIMER'
  | 'CREATE_TASK'
  | 'GTD_INBOX_TRIAGE'
  | 'DISPATCH_SOCIAL'
  | 'APPEND_RSS'
  | 'SAVE_MARKDOWN'
  | 'UNKNOWN';

export interface ActionStep {
  type: string;
  params: Record<string, any>;
}

export interface ParsedCommandResult {
  intent: SystemIntent;
  confidence: number;
  rawInput: string;
  actions: ActionStep[];
  feedbackMessage: string;
}

export class NanoIntentRouter {
  private static instance: NanoIntentRouter;
  private nano = NanoService.getInstance();

  private constructor() {}

  public static getInstance(): NanoIntentRouter {
    if (!NanoIntentRouter.instance) {
      NanoIntentRouter.instance = new NanoIntentRouter();
    }
    return NanoIntentRouter.instance;
  }

  /**
   * 自然語言口語轉換為結構化動作列表
   * 範例輸入：「專注 45 分鐘比特幣研報，擋掉社群網站」
   */
  public async parseNaturalCommand(userInput: string): Promise<ParsedCommandResult> {
    if (!userInput || !userInput.trim()) {
      return {
        intent: 'UNKNOWN',
        confidence: 0,
        rawInput: userInput,
        actions: [],
        feedbackMessage: '請輸入口語指令'
      };
    }

    const cleanInput = userInput.trim();

    const systemPrompt = `
You are the master intent classifier and system automation router for Chrome Plus / ScrumClock.
Analyze user natural language command and decompose it strictly into valid JSON matching this schema:
{
  "intent": "START_TIMER" | "STOP_TIMER" | "CREATE_TASK" | "GTD_INBOX_TRIAGE" | "DISPATCH_SOCIAL" | "APPEND_RSS" | "SAVE_MARKDOWN" | "UNKNOWN",
  "confidence": number (0.0 to 1.0),
  "feedback": "Short Chinese or English feedback message describing what will be executed",
  "actions": [
    {
      "type": "ACTION_TYPE_STRING",
      "params": {
        "key": "value"
      }
    }
  ]
}

Classification Rules:
1. "START_TIMER": When user mentions starting pomodoro, sprint, focus duration (e.g., "專注 30 分鐘", "開個番茄鐘", "讀研報 25m").
   - Action type: "START_TIMER", params: { "durationMinutes": number, "taskTitle": string, "blockDistraction": boolean }
2. "STOP_TIMER": When user wants to cancel, pause, stop or reset timer ("暫停衝刺", "停止計時").
3. "CREATE_TASK": When user wants to add todo/task ("新增待辦", "提醒我買牛奶", "加入任務池").
   - Action type: "CREATE_TASK", params: { "title": string, "estimatedPomodoros": number, "tag": string }
4. "GTD_INBOX_TRIAGE": When user wants to clean or clarify inbox ("整理收件匣", "一鍵釐清", "Inbox Zero").
5. "DISPATCH_SOCIAL": When user mentions publishing, generating social posts, X, Twitter, Threads ("把這篇轉發到 X", "發推文", "社群分發").
6. "APPEND_RSS": When user mentions updating RSS, feed.xml ("更新 RSS", "加入 feed").
7. "SAVE_MARKDOWN": When user mentions saving note, Obsidian, markdown clipping ("存入筆記", "存到 Obsidian").
8. "UNKNOWN": If input does not match any productivity or publishing operation.

Never output markdown code blocks. Output pure JSON only.
`;

    try {
      this.nano.destroySession();
      const session = await this.nano.getOrCreateSession({
        systemPrompt,
        temperature: 0.1 // 低溫保證結構化與分類穩定
      });

      const rawResponse = await session.prompt(cleanInput);
      const parsed = this.nano.safeExtractJSON<any>(rawResponse);

      return {
        intent: (parsed.intent as SystemIntent) || 'UNKNOWN',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
        rawInput: cleanInput,
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        feedbackMessage: parsed.feedback || '指令已解析'
      };
    } catch (err: any) {
      console.warn('[NanoIntentRouter] 自然語言解析失敗，降級為收件匣捕捉:', err);
      // 容錯降級：直接作為快速待辦捕捉
      return {
        intent: 'CREATE_TASK',
        confidence: 0.5,
        rawInput: cleanInput,
        actions: [
          {
            type: 'CREATE_TASK',
            params: {
              title: cleanInput,
              estimatedPomodoros: 1,
              tag: '@QuickCapture'
            }
          }
        ],
        feedbackMessage: '無法辨識特定指令，已轉入收件匣待辦'
      };
    }
  }

  /**
   * 執行解析出來的 Action 清單，發布至 Chrome Runtime
   */
  public async executeParsedActions(result: ParsedCommandResult): Promise<{ executed: number; errors: string[] }> {
    const errors: string[] = [];
    let executed = 0;

    for (const action of result.actions) {
      try {
        await chrome.runtime.sendMessage({
          action: 'EXECUTE_ROUTER_ACTION',
          payload: action
        });
        executed++;
      } catch (err: any) {
        errors.push(`執行失敗 [${action.type}]: ${err.message}`);
      }
    }

    return { executed, errors };
  }
}
