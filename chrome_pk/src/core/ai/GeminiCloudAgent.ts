/**
 * GeminiCloudAgent.ts - PK+ Gemini Cloud API 連接器與 Function Calling 核心
 *
 * 核心職責：
 * 1. 封裝 Gemini REST API (generativelanguage.googleapis.com)，支援直連與 SSE 串流
 * 2. 宣告 PK_TOOLS (7 項標準看板與任務操控工具) 的 Function Calling Schema
 * 3. 打包看板即時狀態 (Context Snapshot)，注入對話脈絡供 Agent 精準調度
 * 4. 嚴格遵守隱私與安全規範：API Key 不明文寫入 log，只透過 storage 讀取
 */

import { storage } from '../chrome/storage';
import { WeeklyMission, UserSettings } from '../../types';

// ==========================================
// 1. 型別宣告 (Types)
// ==========================================

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<
      string,
      {
        type: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
        description?: string;
        enum?: string[];
        items?: any;
        properties?: any;
      }
    >;
    required?: string[];
  };
}

export interface FunctionCallResult {
  name: string;
  args: Record<string, any>;
}

export interface AgentResponse {
  text: string;
  functionCalls?: FunctionCallResult[];
  rawResponse?: any;
}

export interface WorkspaceContextSnapshot {
  currentView?: string;
  wipLimit: number;
  inProgressCount: number;
  columns: {
    nextActions: Array<{ id: string; title: string; estimatedPomodoros?: number; priority?: string }>;
    inProgress: Array<{ id: string; title: string; estimatedPomodoros?: number; priority?: string }>;
    inbox: Array<{ id: string; title: string }>;
  };
  todayCoreBattles?: Array<{ missionId: string; title: string }>;
  timerRunning?: boolean;
  syncState?: {
    googleTasksLastSync?: string;
  };
}

export interface SendMessageOptions {
  apiKey?: string;
  model?: string;
  tools?: GeminiFunctionDeclaration[];
  contextSnapshot?: WorkspaceContextSnapshot;
  history?: Array<{ role: 'user' | 'model'; content: string }>;
  onToken?: (token: string) => void;
  enableFunctionCalling?: boolean;
}

// ==========================================
// 2. PK_TOOLS Function Calling Schema (7 大工具)
// ==========================================

export const PK_TOOLS: GeminiFunctionDeclaration[] = [
  {
    name: 'add_task',
    description: '在 PK+ 看板中新增任務卡片或待辦事項。',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: '任務名稱 / 具體行動描述',
        },
        priority: {
          type: 'STRING',
          enum: ['P0', 'P1', 'P2', 'P3'],
          description: '優先級別：P0(緊急且重要/阻礙項)、P1(高)、P2(中)、P3(低)',
        },
        estimatedPomodoros: {
          type: 'INTEGER',
          description: '預估番茄鐘數（每番茄鐘 25 分鐘，預設 1）',
        },
        destination: {
          type: 'STRING',
          enum: ['inbox', 'next-action', 'in-progress'],
          description: '放置目標欄位，預設為 next-action（下一步行動）',
        },
        notes: {
          type: 'STRING',
          description: '補充細節備註或執行指南',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'split_task',
    description: '將大型或抽象任務拆解為多個可執行的子任務或番茄鐘衝刺卡片。',
    parameters: {
      type: 'OBJECT',
      properties: {
        parentTaskId: {
          type: 'STRING',
          description: '欲拆解的現有母任務 ID（若已知）',
        },
        parentTitle: {
          type: 'STRING',
          description: '欲拆解的母任務名稱',
        },
        subtasks: {
          type: 'ARRAY',
          description: '拆解出的子任務列表',
          items: {
            type: 'OBJECT',
            properties: {
              title: {
                type: 'STRING',
                description: '子任務名稱（具體行動導向）',
              },
              estimatedPomodoros: {
                type: 'INTEGER',
                description: '該子任務預估番茄數',
              },
              priority: {
                type: 'STRING',
                enum: ['P0', 'P1', 'P2', 'P3'],
                description: '子任務優先級',
              },
            },
            required: ['title'],
          },
        },
      },
      required: ['parentTitle', 'subtasks'],
    },
  },
  {
    name: 'move_task_stage',
    description: '移動看板中任務卡片的狀態階段（流轉至下一步行動、進行中或完成等），移入 in-progress 時會嚴格執行 WIP 守門。',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskId: {
          type: 'STRING',
          description: '欲移動的任務 ID（若已知）',
        },
        taskTitle: {
          type: 'STRING',
          description: '欲移動的任務名稱（若無 ID 則以名稱比對）',
        },
        targetStage: {
          type: 'STRING',
          enum: ['inbox', 'next-action', 'in-progress', 'done', 'someday'],
          description: '目標階段：inbox(收件匣), next-action(下一步行動), in-progress(進行中), done(已完成), someday(未來也許)',
        },
      },
      required: ['targetStage'],
    },
  },
  {
    name: 'trigger_cloud_sync',
    description: '手動觸發雙向雲端同步（Google Tasks 雙向同步或 Google Sheets 備份）。',
    parameters: {
      type: 'OBJECT',
      properties: {
        target: {
          type: 'STRING',
          enum: ['google_tasks', 'sheets', 'all'],
          description: '欲觸發同步的目標服務',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'mark_task_done',
    description: '將指定的任務卡片標記為已完成 (Done)。',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskId: {
          type: 'STRING',
          description: '欲完成的任務 ID',
        },
        taskTitle: {
          type: 'STRING',
          description: '欲完成的任務名稱（模糊匹配）',
        },
      },
    },
  },
  {
    name: 'start_pomodoro_sprint',
    description: '啟動番茄鐘衝刺專注計時器，可鎖定特定任務開始倒數。',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskId: {
          type: 'STRING',
          description: '衝刺任務 ID',
        },
        taskTitle: {
          type: 'STRING',
          description: '衝刺任務名稱',
        },
        durationMinutes: {
          type: 'INTEGER',
          description: '專注時長（分鐘，預設 25）',
        },
      },
    },
  },
  {
    name: 'generate_standup_report',
    description: '根據看板進行中卡片、今日完成記錄與下一步行動，生成敏捷站會三問或衝刺總結。',
    parameters: {
      type: 'OBJECT',
      properties: {
        scope: {
          type: 'STRING',
          enum: ['today', 'weekly'],
          description: '報告涵蓋範圍',
        },
      },
    },
  },
];

// ==========================================
// 3. 上下文打包器 (Context Snapshot Builder)
// ==========================================

export function buildContextSnapshot(
  missions: WeeklyMission[] = [],
  settings?: UserSettings,
  timerRunning = false
): WorkspaceContextSnapshot {
  const wipLimit = settings?.maxWipLimit || 3;

  const nextActions = missions
    .filter((m) => m.status === 'next-action' || (!m.status && !m.isCompleted))
    .slice(0, 15)
    .map((m) => ({
      id: m.id,
      title: m.text,
      estimatedPomodoros: m.estimatedPomodoros || 1,
      priority: m.priority || 'P2',
    }));

  const inProgress = missions
    .filter((m) => m.status === 'in-progress')
    .map((m) => ({
      id: m.id,
      title: m.text,
      estimatedPomodoros: m.estimatedPomodoros || 1,
      priority: m.priority || 'P1',
    }));

  const inbox = missions
    .filter((m) => m.status === 'inbox')
    .slice(0, 10)
    .map((m) => ({
      id: m.id,
      title: m.text,
    }));

  return {
    currentView: 'PK+ 敏捷專案看板',
    wipLimit,
    inProgressCount: inProgress.length,
    columns: {
      nextActions,
      inProgress,
      inbox,
    },
    timerRunning,
  };
}

// ==========================================
// 4. Gemini Cloud Agent 類別與主呼叫接口
// ==========================================

export class GeminiCloudAgent {
  private static readonly API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

  /**
   * 發送對話請求至 Gemini Cloud API，支援 SSE 串流與 Function Calling
   */
  static async sendMessage(prompt: string, options: SendMessageOptions = {}): Promise<AgentResponse> {
    // 1. 取得設定值（若未傳入則由 storage 讀取）
    const userSettings = await storage.getUserSettings();
    const apiKey = (options.apiKey || userSettings.geminiApiKey || '').trim();
    const model = (options.model || userSettings.geminiModel || 'gemini-2.0-flash').trim();
    const enableFC = options.enableFunctionCalling ?? (userSettings.enableFunctionCalling !== false);

    if (!apiKey) {
      throw new Error('未設定 Gemini API Key，請至「設定 ➔ AI & 同步」輸入 Google AI Studio 申請之金鑰。');
    }

    // 2. 構建 System Instruction 與上下文
    const systemPrompt = this.buildSystemPrompt(options.contextSnapshot);

    // 3. 準備工具集
    const tools = enableFC ? (options.tools || PK_TOOLS) : [];

    // 4. 構建歷史紀錄與目前訊息
    const contents: any[] = [];
    if (options.history && options.history.length > 0) {
      for (const h of options.history) {
        contents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const requestBody: any = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.3,
      },
    };

    if (tools.length > 0) {
      requestBody.tools = [
        {
          functionDeclarations: tools,
        },
      ];
    }

    // 5. 決定是否使用 SSE 串流
    if (options.onToken) {
      return this.sendStreamingRequest(model, apiKey, requestBody, options.onToken);
    } else {
      return this.sendStandardRequest(model, apiKey, requestBody);
    }
  }

  /**
   * SSE 串流呼叫
   */
  private static async sendStreamingRequest(
    model: string,
    apiKey: string,
    body: any,
    onToken: (token: string) => void
  ): Promise<AgentResponse> {
    const url = `${this.API_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Cloud API 錯誤 (${response.status}): ${this.extractErrorMessage(errText)}`);
    }

    if (!response.body) {
      throw new Error('瀏覽器不支援 ReadableStream 或未收到伺服器回應體。');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    const functionCalls: FunctionCallResult[] = [];
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const parts = parsed?.candidates?.[0]?.content?.parts || [];

          for (const part of parts) {
            if (part.text) {
              fullText += part.text;
              onToken(part.text);
            }
            if (part.functionCall) {
              functionCalls.push({
                name: part.functionCall.name,
                args: part.functionCall.args || {},
              });
            }
          }
        } catch (e) {
          // 寬容處理局部未閉合 JSON 分片
        }
      }
    }

    return {
      text: fullText,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
    };
  }

  /**
   * 標準非串流呼叫
   */
  private static async sendStandardRequest(
    model: string,
    apiKey: string,
    body: any
  ): Promise<AgentResponse> {
    const url = `${this.API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Cloud API 錯誤 (${response.status}): ${this.extractErrorMessage(errText)}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];

    let fullText = '';
    const functionCalls: FunctionCallResult[] = [];

    for (const part of parts) {
      if (part.text) {
        fullText += part.text;
      }
      if (part.functionCall) {
        functionCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args || {},
        });
      }
    }

    return {
      text: fullText,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      rawResponse: data,
    };
  }

  /**
   * 構建包含即時看板快照的 System Prompt
   */
  private static buildSystemPrompt(snapshot?: WorkspaceContextSnapshot): string {
    let contextStr = '';
    if (snapshot) {
      contextStr = `\n【當前看板即時快照】\n` +
        `- 進行中 (In Progress): ${snapshot.inProgressCount} / WIP 上限 ${snapshot.wipLimit} 項\n` +
        `- In Progress 卡片: ${JSON.stringify(snapshot.columns.inProgress.map(c => ({ id: c.id, title: c.title })))}\n` +
        `- Next Actions 卡片 (${snapshot.columns.nextActions.length} 項): ${JSON.stringify(snapshot.columns.nextActions.slice(0, 5).map(c => ({ id: c.id, title: c.title })))}\n` +
        `- 計時器狀態: ${snapshot.timerRunning ? '衝刺專注中' : '閒置'}\n`;
    }

    return (
      `你是一個高度專業的 PK+ (Power Kit) 敏捷專案管理與 GTD 個人助理兼指揮官。\n` +
      `你的核心任務是協助使用者管理日常任務、推進敏捷看板、執行番茄鐘衝刺與雙向雲端同步。\n\n` +
      `【行為守則】\n` +
      `1. 當使用者的意圖涉及新增、拆解、推進、完成任務、啟動番茄鐘或觸發同步時，你必須優先調用提供的工具 (Function Calling)，精準填入參數。\n` +
      `2. 始終遵守在製品限制 (WIP Limit)：進行中任務上限為 ${snapshot?.wipLimit || 3} 個。若使用者欲將新任務推入進行中但已達上限，需提醒使用者先推進既有任務。\n` +
      `3. 若使用者只是詢問問題或討論，請以繁體中文給予簡潔、結構化、專業的建議。\n` +
      `4. 拆解任務 (split_task) 時，請根據敏捷小步快跑原則，拆解為 2~4 個 25 分鐘番茄鐘即可完成的具體行動。\n` +
      contextStr
    );
  }

  /**
   * 解析 API 錯誤訊息，過濾潛在機敏資訊
   */
  private static extractErrorMessage(errText: string): string {
    try {
      const parsed = JSON.parse(errText);
      return parsed?.error?.message || errText.slice(0, 150);
    } catch {
      return errText.slice(0, 150);
    }
  }
}

