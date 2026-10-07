/**
 * taskAIEngine.ts - 專案管理專屬 Web AI 邊緣智能調度引擎
 *
 * 職責：
 * 1. triageInboxItems  - 收件匣批次語意釐清 (Inbox Triage)
 * 2. decomposeTask     - 宏觀任務原子化拆解 (Task Decomposition)
 * 3. generateDailyReviewSummary - 日終成果彙總 (Daily Review Digest)
 *
 * @related ../../../../core/ai/webAIGateway.ts  (黑盒橋接層，嚴禁跨插件修改)
 * @related ../types.ts                           (WeeklyMission / GTDStatus)
 */

import { WebAIGateway } from '@/core/ai/webAIGateway';
import { WeeklyMission, GTDStatus } from '../../../types';

// ─── 公開型別 ───────────────────────────────────────────────────────────────

export interface TaskTriageProposal {
  /** 對應 WeeklyMission.id */
  id: string;
  /** Nano 建議的 GTD 狀態 */
  recommendedStatus: GTDStatus;
  /** 建議的番茄鐘預估數 */
  recommendedPomodoros: number;
  /** 自動貼上的情境標籤 */
  tags: string[];
  /** 簡短繁體中文解釋 */
  reason: string;
}

export interface SubtaskProposal {
  title: string;
  estimatedPomodoros: number;
}

// ─── TaskAIEngine 主體 ───────────────────────────────────────────────────────

export class TaskAIEngine {
  private static instance: TaskAIEngine;
  private readonly gateway = WebAIGateway.getInstance();

  private constructor() {}

  public static getInstance(): TaskAIEngine {
    if (!TaskAIEngine.instance) {
      TaskAIEngine.instance = new TaskAIEngine();
    }
    return TaskAIEngine.instance;
  }

  // ── 1. 收件匣批次語意釐清 (Inbox Triage) ────────────────────────────────

  /**
   * 傳入 inbox 狀態的 WeeklyMission 陣列，
   * 由 Nano 逐一評估並批次回傳結構化建議。
   *
   * @param items WeeklyMission[]（status === 'inbox' 或 undefined）
   * @returns     TaskTriageProposal[]（對應 items 的 id）
   */
  public async triageInboxItems(items: WeeklyMission[]): Promise<TaskTriageProposal[]> {
    if (items.length === 0) return [];

    // 僅傳送最低限度欄位，節省 Nano 上下文 Token
    const simplifiedItems = items.map((i) => ({
      id: i.id,
      title: i.text,                          // WeeklyMission 主文字欄位為 .text
      notes: (i.notes || '').slice(0, 100),
    }));

    const prompt = `
Analyze these inbox tasks for a GTD productivity board. Return strictly valid JSON array matching schema:
[
  {
    "id": "task_id_string",
    "recommendedStatus": "next-action" | "someday",
    "recommendedPomodoros": 1 | 2 | 4,
    "tags": ["@Code" | "@Research" | "@Admin" | "@Writing"],
    "reason": "Brief Traditional Chinese explanation (max 30 characters)"
  }
]
Tasks to evaluate:
${JSON.stringify(simplifiedItems)}
`;

    const rawResult = await this.gateway.writeDraft(prompt, {
      tone: 'formal',
      format: 'plain-text',
    });

    try {
      const match = rawResult.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('無法萃取 JSON 陣列');
      return JSON.parse(match[0]) as TaskTriageProposal[];
    } catch (e) {
      console.warn('[TaskAIEngine] 收件匣批次釐清解析失敗:', e);
      return [];
    }
  }

  // ── 2. 宏觀任務原子化拆解 (Task Decomposition) ──────────────────────────

  /**
   * 將一個大型目標拆解為 3~4 個可在 25 分鐘內落地的原子步驟。
   *
   * @param taskTitle  任務標題（WeeklyMission.text）
   * @param context    選填：關聯網址或額外背景說明
   * @returns          SubtaskProposal[]（3~4 項，各含預估番茄鐘數）
   */
  public async decomposeTask(
    taskTitle: string,
    context?: string
  ): Promise<SubtaskProposal[]> {
    const prompt = `
Break down this project goal into 3 to 4 concrete, actionable subtasks for a Pomodoro sprint.
Goal: "${taskTitle}"
${context ? `Context: ${context}` : ''}

Rules:
- Each subtask must start with a clear action verb (梳理 / 實作 / 驗證 / 撰寫 / 整合).
- Each subtask must be completable within 1-2 Pomodoros (25-50 minutes).
- Output strictly valid JSON array only. No markdown code blocks.

[
  { "title": "動詞開頭的具體步驟", "estimatedPomodoros": 1 }
]
`;

    const raw = await this.gateway.writeDraft(prompt, {
      tone: 'formal',
      format: 'plain-text',
    });

    try {
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('無法萃取 JSON 陣列');
      return JSON.parse(match[0]) as SubtaskProposal[];
    } catch (e) {
      console.warn('[TaskAIEngine] 任務拆解失敗，使用備援預設值:', e);
      // 優雅降級：提供合理的預設 2 步驟（比完全失敗好）
      return [
        { title: `梳理與規劃：${taskTitle}`, estimatedPomodoros: 1 },
        { title: `實作與驗收：${taskTitle}`, estimatedPomodoros: 2 },
      ];
    }
  }

  // ── 3. 日終成果彙總 (Daily Review Digest) ───────────────────────────────

  /**
   * 彙整今日完成任務與實耗番茄鐘，由 Nano 提煉 High-Signal 日終總結。
   *
   * @param completedTasks 今日已完成的 WeeklyMission 陣列
   * @param spentPomodoros 今日實際投入的番茄鐘總數
   * @returns              Markdown 格式的繁體中文日終總結
   */
  public async generateDailyReviewSummary(
    completedTasks: WeeklyMission[],
    spentPomodoros: number
  ): Promise<string> {
    if (completedTasks.length === 0) {
      return '今日尚無完成任務紀錄。請先完成至少一個任務再生成日終回顧。';
    }

    const taskSummary = completedTasks
      .map((t) => `- ${t.text} (${t.spentPomodoros || 1}🍅)`)
      .join('\n');

    const textToSummarize = `
Today total focused: ${spentPomodoros} Pomodoros.
Completed Missions:
${taskSummary}
`;

    return await this.gateway.summarizeText(
      textToSummarize,
      {
        type: 'key-points',
        format: 'markdown',
        length: 'short',
      },
      '請以激勵且精確的繁體中文提供今日生產力總結，包含今日戰功、潛在延宕與明日優先建議三部分。'
    );
  }
}
