/**
 * kanbanAuditor.ts - 看板健康度評估與超期停滯分析器
 * 負責掃描進行中 (in-progress) 與下一步行動 (next-action) 中超過閾值之停滯卡片，
 * 計算 WIP 飽和度、停滯率，並產出殭屍任務自動降級推薦
 */

import { GTDStatus, WeeklyMission } from '../types';

export interface StalledCardItem {
  task: WeeklyMission;
  stalledDays: number;
  currentStatus: GTDStatus;
  suggestedAction: 'downgrade-to-someday' | 'archive' | 'breakdown';
  reason: string;
}

export interface KanbanHealthReport {
  timestamp: string;
  totalCards: number;
  inProgressCount: number;
  wipLimit: number;
  isWipExceeded: boolean;
  stalledCount: number;
  stalledRatio: number; // 0.0 ~ 1.0
  healthScore: number; // 0 ~ 100
  stalledCards: StalledCardItem[];
  recommendations: string[];
}

export class KanbanAuditor {
  private static instance: KanbanAuditor;

  private constructor() {}

  public static getInstance(): KanbanAuditor {
    if (!KanbanAuditor.instance) {
      KanbanAuditor.instance = new KanbanAuditor();
    }
    return KanbanAuditor.instance;
  }

  /**
   * 計算卡片距離上次更新已停滯的天數
   */
  private calculateStalledDays(task: WeeklyMission, nowMs: number): number {
    const rawTime = (task as any).updatedAt || (task as any).createdAt || (task as any).timestamp;
    if (!rawTime) return 0;

    const taskTime = typeof rawTime === 'number' ? rawTime : new Date(rawTime).getTime();
    if (isNaN(taskTime)) return 0;

    const diffMs = nowMs - taskTime;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * 審計整個看板狀態，產出健康度評估指標
   * @param missions 當前所有週任務 / 看板卡片清單
   * @param wipLimit 在製品上限 (預設 3)
   * @param stallThresholdDays 停滯天數閾值 (預設 5 天)
   */
  public auditBoard(
    missions: WeeklyMission[],
    wipLimit: number = 3,
    stallThresholdDays: number = 5
  ): KanbanHealthReport {
    const now = Date.now();
    const activeTasks = missions.filter(
      (m) => m.status === 'in-progress' || m.status === 'next-action'
    );

    const inProgressTasks = missions.filter((m) => m.status === 'in-progress');
    const inProgressCount = inProgressTasks.length;
    const isWipExceeded = inProgressCount > wipLimit;

    const stalledCards: StalledCardItem[] = [];

    // 掃描活躍欄位中停滯的卡片
    for (const task of activeTasks) {
      const days = this.calculateStalledDays(task, now);
      if (days >= stallThresholdDays) {
        let suggestedAction: 'downgrade-to-someday' | 'archive' | 'breakdown' = 'downgrade-to-someday';
        let reason = `卡片在【${task.status}】狀態已停滯 ${days} 天未更新。`;

        if (task.status === 'in-progress' && days >= 7) {
          suggestedAction = 'downgrade-to-someday';
          reason += ' 長期卡在進行中會嚴重損耗心流，建議退回 Someday 或拆解。';
        } else if (task.estimatedPomodoros && task.estimatedPomodoros >= 4) {
          suggestedAction = 'breakdown';
          reason += ' 預估番茄鐘過大 (>=4🍅)，容易引發啟動拖延，建議切成子步驟。';
        }

        stalledCards.push({
          task,
          stalledDays: days,
          currentStatus: task.status as GTDStatus,
          suggestedAction,
          reason,
        });
      }
    }

    const activeCount = activeTasks.length || 1;
    const stalledRatio = Math.min(1.0, stalledCards.length / activeCount);

    // 健康評分演算法：滿分 100
    // 超出 WIP 扣 25 分，每 10% 停滯扣 8 分
    let healthScore = 100;
    if (isWipExceeded) {
      healthScore -= Math.min(30, (inProgressCount - wipLimit) * 15);
    }
    healthScore -= Math.round(stalledRatio * 40);
    healthScore = Math.max(0, Math.min(100, healthScore));

    const recommendations: string[] = [];
    if (isWipExceeded) {
      recommendations.push(
        `⚠️ 進行中卡片 (${inProgressCount} 項) 已超過 WIP 限制 (${wipLimit} 項)，建議暫停開啟新任務。`
      );
    }
    if (stalledCards.length > 0) {
      recommendations.push(
        `🧹 偵測到 ${stalledCards.length} 張卡片超過 ${stallThresholdDays} 天未推進，建議進行一鍵理牌。`
      );
    }
    if (healthScore >= 85) {
      recommendations.push('✨ 看板流轉極為健康，心流專注度維持頂尖狀態！');
    }

    return {
      timestamp: new Date().toISOString(),
      totalCards: missions.length,
      inProgressCount,
      wipLimit,
      isWipExceeded,
      stalledCount: stalledCards.length,
      stalledRatio: Math.round(stalledRatio * 100) / 100,
      healthScore,
      stalledCards,
      recommendations,
    };
  }

  /**
   * 產出自動降級建議批次 (供 background.ts 或一鍵整理使用)
   */
  public generateZombieDowngradePlan(missions: WeeklyMission[]): Array<{ id: string; targetStatus: GTDStatus }> {
    const report = this.auditBoard(missions, 3, 5);
    return report.stalledCards
      .filter((c) => c.suggestedAction === 'downgrade-to-someday')
      .map((c) => ({
        id: c.task.id,
        targetStatus: 'someday' as GTDStatus,
      }));
  }
}