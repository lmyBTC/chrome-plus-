/**
 * taskAIEngine.ts - 專案管理專屬 Web AI 邊緣智能服務
 * 整合 Chrome 130+ WebAIGateway (ai.writer, ai.summarizer, ai.languageModel)
 * 支援收件匣批次釐清、原子任務拆解、日終戰報彙總與語意 WIP 衝突審查
 */

import { WebAIGateway } from '@/core/ai/webAIGateway';
import { GTDStatus, WeeklyMission } from '../types';

export interface TaskTriageProposal {
  id: string;
  recommendedStatus: GTDStatus;
  recommendedPomodoros: number;
  tags: string[];
  reason: string;
}

export interface SubtaskDecomposition {
  title: string;
  estimatedPomodoros: number;
}

export interface WIPConflictAnalysis {
  hasConflict: boolean;
  warningMessage: string;
  suggestedAction: 'proceed' | 'defer-to-next' | 'shelve-to-someday';
}

export class TaskAIEngine {
  private static instance: TaskAIEngine;
  private gateway = WebAIGateway.getInstance();

  private constructor() {}

  public static getInstance(): TaskAIEngine {
    if (!TaskAIEngine.instance) {
      TaskAIEngine.instance = new TaskAIEngine();
    }
    return TaskAIEngine.instance;
  }

  /**
   * 1. 收件匣批次語意釐清 (Inbox Triage)
   * 評估多張未整理的 inbox 卡片，自動推薦 GTD 狀態、情境標籤與預估番茄鐘
   */
  public async triageInboxItems(items: WeeklyMission[]): Promise<TaskTriageProposal[]> {
    if (!items || items.length === 0) return [];

    const simplifiedItems = items.map((i) => ({
      id: i.id,
      title: i.title,
      notes: (i.notes || '').slice(0, 120),
    }));

    const prompt = `
Analyze these inbox tasks for a GTD productivity board. Return strictly a valid JSON array matching this schema:
[
  {
    "id": "task_id_string",
    "recommendedStatus": "next-action" | "someday",
    "recommendedPomodoros": 1 | 2 | 4,
    "tags": ["@Code" | "@Research" | "@Admin" | "@Writing"],
    "reason": "Brief Traditional Chinese explanation (under 15 words)"
  }
]

Tasks to evaluate:
${JSON.stringify(simplifiedItems)}
`;

    try {
      // 優先調用 WebAIGateway 的專用 writer 或降級通用 prompt
      const rawResult = await this.gateway.writeDraft(
        prompt,
        { tone: 'formal', format: 'plain-text', length: 'medium' },
        'You are an expert GTD productivity and agile project coach. Classify strictly based on actionable clarity.'
      );

      const match = rawResult.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('無法從 AI 回應中萃取有效 JSON 陣列');
      
      const parsed = JSON.parse(match[0]) as TaskTriageProposal[];
      return parsed.filter((p) => p && p.id);
    } catch (e) {
      console.warn('[TaskAIEngine] 收件匣批次釐清解析失敗，使用啟發式默認規則降級:', e);
      return items.map((i) => ({
        id: i.id,
        recommendedStatus: 'next-action' as GTDStatus,
        recommendedPomodoros: 1,
        tags: ['@Focus'],
        reason: '系統默認推薦為下一步行動',
      }));
    }
  }

  /**
   * 2. 原子任務拆解 (Atomic Subtask Decomposition)
   * 調用 ai.writer 將巨型目標拆解為 3~4 個具備明確動詞與番茄鐘預算的子步驟
   */
  public async decomposeTask(taskTitle: string, context?: string): Promise<SubtaskDecomposition[]> {
    if (!taskTitle || !taskTitle.trim()) return [];

    const prompt = `
Break down this project goal into 3 to 4 concrete, actionable subtasks for a Pomodoro sprint.
Goal: "${taskTitle.trim()}"
${context ? `Context: ${context.slice(0, 300)}` : ''}

Output strictly a valid JSON array:
[
  { "title": "Action verb + specific outcome", "estimatedPomodoros": 1 | 2 }
]
`;

    try {
      const raw = await this.gateway.writeDraft(
        prompt,
        { tone: 'formal', format: 'plain-text', length: 'short' },
        'Strictly output JSON array without conversational fillers.'
      );

      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('無法從 AI 回應中萃取有效 JSON 陣列');

      const result = JSON.parse(match[0]) as SubtaskDecomposition[];
      if (Array.isArray(result) && result.length > 0) {
        return result;
      }
      throw new Error('解析結果為空陣列');
    } catch (e) {
      console.warn('[TaskAIEngine] 任務拆解失敗，使用經典敏捷三段式降級:', e);
      return [
        { title: `梳理需求與環境確認: ${taskTitle}`, estimatedPomodoros: 1 },
        { title: `核心實作與邏輯驗證: ${taskTitle}`, estimatedPomodoros: 2 },
        { title: `測試、驗收與產出歸檔: ${taskTitle}`, estimatedPomodoros: 1 },
      ];
    }
  }

  /**
   * 3. 日終戰果總結 (Daily Review Digest)
   * 調用 ai.summarizer (Key-Points 模式) 提煉今日成就、延宕黑洞與明日優先序
   */
  public async generateDailyReviewSummary(
    completedTasks: WeeklyMission[],
    spentPomodoros: number,
    reflections?: { highlights?: string; lessons?: string }
  ): Promise<string> {
    const taskSummary = completedTasks.length > 0
      ? completedTasks.map((t) => `- ${t.title} (實耗: ${t.spentPomodoros || 1}🍅)`).join('\n')
      : '今日無已標記完成之卡片。';

    const textToSummarize = `
今日專注總計: ${spentPomodoros} 個番茄鐘 (${spentPomodoros * 25} 分鐘)
已完成任務清單:
${taskSummary}
${reflections?.highlights ? `個人亮點記錄: ${reflections.highlights}` : ''}
${reflections?.lessons ? `遇到的阻礙/教訓: ${reflections.lessons}` : ''}
`;

    try {
      return await this.gateway.summarizeText(
        textToSummarize,
        { type: 'key-points', format: 'markdown', length: 'medium' },
        'Provide a sharp, motivating, and highly actionable daily review report in Traditional Chinese (繁體中文).'
      );
    } catch (e) {
      console.warn('[TaskAIEngine] 日終摘要生成失敗，使用本機模板降級:', e);
      return `### 🍅 今日專注戰報\n- **總工時**: 共投入 ${spentPomodoros} 🍅 專注時長。\n- **核心收穫**: 圓滿落地 ${completedTasks.length} 項戰役。\n- **明日建議**: 檢視收件匣，延續專注動能。`;
    }
  }

  /**
   * 4. 語意 WIP 衝突評估 (Context-Switching Defender)
   * 評估新拖入的卡片是否與當前進行中任務存在高度心流領域衝突
   */
  public async evaluateWIPConflict(
    incomingTask: WeeklyMission,
    currentInProgressTasks: WeeklyMission[]
  ): Promise<WIPConflictAnalysis> {
    if (!currentInProgressTasks || currentInProgressTasks.length === 0) {
      return { hasConflict: false, warningMessage: '', suggestedAction: 'proceed' };
    }

    const currentTitles = currentInProgressTasks.map((t) => t.title).join('、');
    const prompt = `
User is currently working on: [${currentTitles}].
User attempts to start new task: "${incomingTask.title}".
Analyze whether switching context now introduces severe cognitive friction.

Output strictly JSON:
{
  "hasConflict": boolean,
  "warningMessage": "A concise friendly warning in Traditional Chinese (繁體中文)",
  "suggestedAction": "proceed" | "defer-to-next" | "shelve-to-someday"
}
`;

    try {
      const raw = await this.gateway.writeDraft(
        prompt,
        { tone: 'casual', format: 'plain-text', length: 'short' }
      );
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('無法萃取 JSON');
      return JSON.parse(match[0]) as WIPConflictAnalysis;
    } catch (_err) {
      // 降級為純數量檢查
      return {
        hasConflict: currentInProgressTasks.length >= 3,
        warningMessage: `目前已有 ${currentInProgressTasks.length} 項任務進行中，建議先完成當前焦點再啟動新任務。`,
        suggestedAction: currentInProgressTasks.length >= 3 ? 'defer-to-next' : 'proceed',
      };
    }
  }
}