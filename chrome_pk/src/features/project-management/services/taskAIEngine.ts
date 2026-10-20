/**
 * taskAIEngine.ts - 專案管理專屬 Web AI 邊緣智能調度引擎
 *
 * 職責：
 * 1. triageInboxItems          - 收件匣批次語意釐清 (Inbox Triage)
 * 2. decomposeTask             - 宏觀任務原子化拆解 (Task Decomposition)
 * 3. generateDailyReviewSummary - 日終成果彙總 (Daily Review Digest)
 * 4. analyzeWIPConflict / evaluateWIPConflict - 心流在製品衝突審查 (WIP Conflict Defender)
 *
 * @related ../../../../core/ai/webAIGateway.ts   (黑盒橋接層，嚴禁跨插件修改)
 * @related ../../../../core/ai/nanoPromptGuard.ts (四層防崩潰與預定路線腳本引擎)
 * @related ../types.ts                            (WeeklyMission / GTDStatus)
 */

import { WebAIGateway } from '@/core/ai/webAIGateway';
import { NanoPromptGuard } from '@/core/ai/nanoPromptGuard';
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

/** 相容別名 */
export type SubtaskDecomposition = SubtaskProposal;

export interface WIPConflictAnalysis {
  hasConflict: boolean;
  warningMessage: string;
  suggestedAction: 'proceed' | 'defer-to-next' | 'shelve-to-someday';
}

// ─── TaskAIEngine 主體 ───────────────────────────────────────────────────────

export class TaskAIEngine {
  private static instance: TaskAIEngine;
  private readonly gateway = WebAIGateway.getInstance();
  private readonly promptGuard = NanoPromptGuard.getInstance();

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
   * 透過 NanoPromptGuard 執行防退化 Few-shot 路線，回傳結構化建議。
   *
   * @param items WeeklyMission[]（status === 'inbox' 或 undefined）
   * @returns     TaskTriageProposal[]（對應 items 的 id）
   */
  public async triageInboxItems(items: WeeklyMission[]): Promise<TaskTriageProposal[]> {
    if (!items || items.length === 0) return [];

    // 僅傳送最低限度欄位，節省 Nano 上下文 Token
    const simplifiedItems = items.map((i) => ({
      id: i.id,
      title: i.text,
      notes: (i.notes || '').slice(0, 100),
    }));

    const guarded = await this.promptGuard.executeSafeInference(
      async (systemPrompt, userPrompt) => {
        return await this.gateway.writeDraft(
          userPrompt,
          { tone: 'formal', format: 'plain-text', length: 'medium' },
          systemPrompt
        );
      },
      {
        scenario: 'INBOX_TRIAGE',
        rawInput: JSON.stringify(simplifiedItems),
      }
    );

    try {
      const match = guarded.text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('無法萃取有效 JSON 陣列');

      const parsed = JSON.parse(match[0]) as TaskTriageProposal[];
      const validResults = parsed.filter((p) => p && p.id && p.id !== 'fallback');

      if (validResults.length > 0) {
        return validResults;
      }
      throw new Error('未萃取出針對特定任務的建議');
    } catch {
      // 瞬時 Fallback 兜底：為每個輸入項目提供高品質啟發式預設建議
      return items.map((i) => ({
        id: i.id,
        recommendedStatus: 'next-action' as GTDStatus,
        recommendedPomodoros: 1,
        tags: ['@Focus'],
        reason: '系統預設推薦為下一步行動',
      }));
    }
  }

  // ── 2. 宏觀任務原子化拆解 (Task Decomposition) ──────────────────────────

  /**
   * 將大型目標拆解為 3~4 個可在 25 分鐘內落地的原子步驟。
   * 透過 NanoPromptGuard 執行防退化 Few-shot 路線與防崩潰 Fallback。
   *
   * @param taskTitle  任務標題（WeeklyMission.text）
   * @param context    選填：關聯網址或額外背景說明
   * @returns          SubtaskProposal[]（3~4 項，各含預估番茄鐘數）
   */
  public async decomposeTask(
    taskTitle: string,
    context?: string
  ): Promise<SubtaskProposal[]> {
    if (!taskTitle || !taskTitle.trim()) return [];

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

    // 優先嘗試解析 JSON 陣列（若模型返回 JSON 結構）
    try {
      const jsonMatch = resultText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title) {
          return parsed.map((p) => ({
            title: String(p.title || '').trim(),
            estimatedPomodoros: Number(p.estimatedPomodoros) || 1,
          }));
        }
      }
    } catch {
      // 忽略 JSON 解析異常，改走條列式文字解析
    }

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
      { title: `梳理需求與環境確認：${taskTitle}`, estimatedPomodoros: 1 },
      { title: `核心實作與邏輯驗證：${taskTitle}`, estimatedPomodoros: 2 },
      { title: `測試、驗收與產出歸檔：${taskTitle}`, estimatedPomodoros: 1 },
    ];
  }

  // ── 3. 日終成果彙總 (Daily Review Digest) ───────────────────────────────

  /**
   * 彙整今日完成任務與實耗番茄鐘，由 NanoPromptGuard 執行防退化日終總結提煉。
   *
   * @param completedTasks 今日已完成的 WeeklyMission 陣列
   * @param spentPomodoros 今日實際投入的番茄鐘總數
   * @param reflections    選填：反思亮點與遭遇阻礙
   * @returns              Markdown 格式的繁體中文日終總結
   */
  public async generateDailyReviewSummary(
    completedTasks: WeeklyMission[],
    spentPomodoros: number,
    reflections?: { highlights?: string; lessons?: string }
  ): Promise<string> {
    if (!completedTasks || completedTasks.length === 0) {
      return '今日尚無完成任務紀錄。請先完成至少一個任務再生成日終回顧。';
    }

    const taskSummary = completedTasks
      .map((t) => `- ${t.text} (實耗: ${t.spentPomodoros || 1}🍅)`)
      .join('\n');

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
          {
            type: 'key-points',
            format: 'markdown',
            length: 'medium',
          },
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

  // ── 4. 心流上下文衝突審查 (WIP Conflict Defender) ─────────────────────────

  /**
   * 針對當前進行中任務與候選新任務進行語意心流切換衝突審查
   *
   * @param currentTask   當前進行中任務（WeeklyMission 或任務標題字串）
   * @param candidateTask 候選新增或切換任務（WeeklyMission 或任務標題字串）
   * @returns             WIPConflictAnalysis
   */
  public async analyzeWIPConflict(
    currentTask: WeeklyMission | string,
    candidateTask: WeeklyMission | string
  ): Promise<WIPConflictAnalysis> {
    const currentText = typeof currentTask === 'string' ? currentTask : currentTask.text;
    const candidateText = typeof candidateTask === 'string' ? candidateTask : candidateTask.text;

    if (!currentText || !candidateText) {
      return { hasConflict: false, warningMessage: '', suggestedAction: 'proceed' };
    }

    const guarded = await this.promptGuard.executeSafeInference(
      async (systemPrompt, userPrompt) => {
        return await this.gateway.writeDraft(
          userPrompt,
          { tone: 'casual', format: 'plain-text', length: 'short' },
          systemPrompt
        );
      },
      {
        scenario: 'WIP_CONFLICT_CHECK',
        rawInput: candidateText,
        contextText: currentText,
      }
    );

    try {
      const match = guarded.text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('無法萃取 JSON');
      return JSON.parse(match[0]) as WIPConflictAnalysis;
    } catch {
      return {
        hasConflict: true,
        warningMessage: '目前正在衝刺核心焦點，建議先完成進行中任務。',
        suggestedAction: 'defer-to-next',
      };
    }
  }

  /**
   * 批次評估多個進行中任務與新進入任務之 WIP 衝突
   *
   * @param incomingTask           欲新增或啟動之任務
   * @param currentInProgressTasks 目前已在 in-progress 狀態之任務清單
   * @returns                      WIPConflictAnalysis
   */
  public async evaluateWIPConflict(
    incomingTask: WeeklyMission,
    currentInProgressTasks: WeeklyMission[]
  ): Promise<WIPConflictAnalysis> {
    if (!currentInProgressTasks || currentInProgressTasks.length === 0) {
      return { hasConflict: false, warningMessage: '', suggestedAction: 'proceed' };
    }

    const currentTitles = currentInProgressTasks.map((t) => t.text).join('、');
    const analysis = await this.analyzeWIPConflict(currentTitles, incomingTask);

    // 結合數量限制規則 (WIP 軟性上限為 3)
    if (currentInProgressTasks.length >= 3 && !analysis.hasConflict) {
      return {
        hasConflict: true,
        warningMessage: `目前已有 ${currentInProgressTasks.length} 項任務進行中，建議先完成當前焦點再啟動新任務。`,
        suggestedAction: 'defer-to-next',
      };
    }

    return analysis;
  }
}

