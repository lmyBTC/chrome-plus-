/**
 * taskAIEngine.ts - 專案管理專屬 Web AI 邊緣智能服務
 * 整合 Chrome 130+ WebAIGateway (ai.writer, ai.summarizer, ai.languageModel)
 * 支援收件匣批次釐清、原子任務拆解、日終戰報彙總與語意 WIP 衝突審查
 */

import { WebAIGateway } from '@/core/ai/webAIGateway';
import { NanoPromptGuard } from '@/core/ai/nanoPromptGuard';
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
  private promptGuard = NanoPromptGuard.getInstance();

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
   * 2. 原子任務拆解 (Atomic Subtask Decomposition) - 已升級 NanoPromptGuard 防崩潰路線
   */
  public async decomposeTask(taskTitle: string, context?: string): Promise<SubtaskDecomposition[]> {
    if (!taskTitle || !taskTitle.trim()) return [];

    // 透過 NanoPromptGuard 執行安全路由與防退化推論
    const guarded = await this.promptGuard.executeSafeInference(
      async (systemPrompt, userPrompt) => {
        return await this.gateway.writeDraft(
          userPrompt,
          { tone: 'formal', format: 'plain-text', length: 'medium' },
          systemPrompt
        );
      },
      {
        scenario: 'TASK_DECOMPOSITION',
        rawInput: taskTitle,
        contextText: context,
      }
    );

    const resultText = guarded.text;

    // 解析條列式文字為子任務陣列
    const lines = resultText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l));

    if (lines.length > 0) {
      return lines.map((line) => {
        const cleanTitle = line
          .replace(/^[-*]\s*(\[[ xX]?\])?\s*/, '')
          .replace(/^\d+\.\s*/, '')
          .replace(/\(預估.*?\)/, '')
          .replace(/\(\d+🍅\)/, '')
          .trim();

        // 提取番茄鐘數 (若有標記 1🍅 或 2🍅)
        const pomoMatch = line.match(/(\d+)🍅/);
        const pomodoros = pomoMatch ? parseInt(pomoMatch[1], 10) : 1;

        return {
          title: cleanTitle || line,
          estimatedPomodoros: pomodoros,
        };
      });
    }

    // 兜底退化保障
    return [
      { title: `梳理需求與環境確認: ${taskTitle}`, estimatedPomodoros: 1 },
      { title: `核心實作與邏輯驗證: ${taskTitle}`, estimatedPomodoros: 2 },
      { title: `測試、驗收與產出歸檔: ${taskTitle}`, estimatedPomodoros: 1 },
    ];
  }

  /**
   * 3. 日終戰果總結 (Daily Review Digest) - 已升級 NanoPromptGuard 防崩潰路線
   */
  public async generateDailyReviewSummary(
    completedTasks: WeeklyMission[],
    spentPomodoros: number,
    reflections?: { highlights?: string; lessons?: string }
  ): Promise<string> {
    const taskSummary = completedTasks.length > 0
      ? completedTasks.map((t) => `- ${t.title} (實耗: ${t.spentPomodoros || 1}🍅)`).join('\n')
      : '今日無已標記完成之卡片。';

    const inputData = `
總專注時間: ${spentPomodoros} 顆番茄 (${spentPomodoros * 25} 分鐘)
完成戰役清單:
${taskSummary}
${reflections?.highlights ? `反思亮點: ${reflections.highlights}` : ''}
${reflections?.lessons ? `遭遇阻礙: ${reflections.lessons}` : ''}
`.trim();

    const guarded = await this.promptGuard.executeSafeInference(
      async (systemPrompt, userPrompt) => {
        return await this.gateway.summarizeText(
          userPrompt,
          { type: 'key-points', format: 'markdown', length: 'medium' },
          systemPrompt
        );
      },
      {
        scenario: 'PROGRESS_SUMMARY',
        rawInput: inputData,
      }
    );

    return guarded.text;
  }

  /**
   * 4. 語意 WIP 衝突評估 (Context-Switching Defender)
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