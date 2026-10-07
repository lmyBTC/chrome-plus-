/**
 * kanbanAuditor.ts - 背景看板健康度評估與殭屍任務巡檢器
 *
 * 職責：
 * 1. auditBoard       - 掃描 in-progress / next-action 超期卡片，計算健康指標
 * 2. getStaleMissions - 篩選超過指定天數未更新的卡片（主力巡檢邏輯）
 *
 * 設計原則（MV3 相容）：
 * - 純同步計算，不直接呼叫 Nano API（確保 Service Worker 事件驅動相容）
 * - 由 background.ts 透過 chrome.idle.onStateChanged 排程觸發
 * - 若需 AI 加持（殭屍任務語意分析），由 background.ts 呼叫 TaskAIEngine 處理
 *
 * @related ./taskAIEngine.ts                (上層 AI 服務，可協同使用)
 * @related ../../../../background.ts        (下游消費者：閒置期排程觸發)
 * @related ../../../types/index.ts          (WeeklyMission / GTDStatus)
 */

import { WeeklyMission, GTDStatus } from '../../../types';

// ─── 公開型別 ───────────────────────────────────────────────────────────────

export interface KanbanHealthReport {
  /** 掃描時的 ISO 時間戳 */
  auditedAt: string;
  /** WIP（在製品）飽和度：實際 in-progress 數量 / WIP 限制 */
  wipSaturation: number;
  /** 停滯任務比率：超期卡片數 / 全部進行中卡片數 */
  staleRatio: number;
  /** 超期（停滯）卡片清單 */
  staleCards: StaleMissionInfo[];
  /** 健康等級 */
  healthGrade: 'healthy' | 'warning' | 'critical';
}

export interface StaleMissionInfo {
  id: string;
  text: string;
  status: GTDStatus;
  /** 距最後更新天數 */
  staleDays: number;
  /** 建議降級動作 */
  suggestedAction: 'move_to_someday' | 'delete_if_expired' | 'review';
}

// ─── 目標欄位（僅巡查「進行中」與「待辦」）────────────────────────────────
const AUDITED_STATUSES: GTDStatus[] = ['in-progress', 'next-action'];

// ─── KanbanAuditor 主體 ──────────────────────────────────────────────────────

export class KanbanAuditor {
  private static instance: KanbanAuditor;

  private constructor() {}

  public static getInstance(): KanbanAuditor {
    if (!KanbanAuditor.instance) {
      KanbanAuditor.instance = new KanbanAuditor();
    }
    return KanbanAuditor.instance;
  }

  // ── 核心：看板健康度評估 ────────────────────────────────────────────────

  /**
   * 掃描整個任務池，計算看板健康度與停滯任務清單。
   *
   * @param missions     所有 WeeklyMission（含各 GTD 狀態）
   * @param wipLimit     WIP 限制（預設 3）
   * @param staleDayThreshold 超過幾天未更新視為停滯（預設 5 天）
   * @returns            KanbanHealthReport
   */
  public auditBoard(
    missions: WeeklyMission[],
    wipLimit = 3,
    staleDayThreshold = 5
  ): KanbanHealthReport {
    const now = Date.now();
    const inProgressCards = missions.filter(
      (m) => m.status === 'in-progress' && !m.isCompleted
    );

    const staleCards = this.getStaleMissions(missions, staleDayThreshold, now);

    const wipSaturation = wipLimit > 0 ? inProgressCards.length / wipLimit : 0;
    const staleRatio =
      inProgressCards.length > 0
        ? staleCards.filter((c) => c.status === 'in-progress').length /
          inProgressCards.length
        : 0;

    const healthGrade = this._computeHealthGrade(wipSaturation, staleRatio);

    return {
      auditedAt: new Date(now).toISOString(),
      wipSaturation,
      staleRatio,
      staleCards,
      healthGrade,
    };
  }

  // ── 工具：篩選停滯任務 ──────────────────────────────────────────────────

  /**
   * 從任務池中篩選超過 staleDayThreshold 天未更新的卡片。
   * 僅掃描 in-progress 與 next-action 欄位（已完成/someday 不納入）。
   *
   * @param missions           所有任務
   * @param staleDayThreshold  停滯天數門檻
   * @param nowMs              當前時間戳（毫秒）
   * @returns                  StaleMissionInfo[]
   */
  public getStaleMissions(
    missions: WeeklyMission[],
    staleDayThreshold: number,
    nowMs: number = Date.now()
  ): StaleMissionInfo[] {
    const MS_PER_DAY = 86_400_000;
    const stale: StaleMissionInfo[] = [];

    for (const m of missions) {
      // 只審查目標欄位，跳過已完成任務
      if (!AUDITED_STATUSES.includes(m.status as GTDStatus)) continue;
      if (m.isCompleted) continue;

      // 以 completedAt（不適用） → createdAt → 無時間戳（視為初始建立當天）判斷
      const referenceTime = m.createdAt
        ? new Date(m.createdAt).getTime()
        : nowMs - staleDayThreshold * MS_PER_DAY; // 無時間戳視為剛好觸達閾值邊界

      const staleDays = Math.floor((nowMs - referenceTime) / MS_PER_DAY);
      if (staleDays < staleDayThreshold) continue;

      stale.push({
        id: m.id,
        text: m.text,
        status: m.status as GTDStatus,
        staleDays,
        suggestedAction: this._suggestAction(m, staleDays),
      });
    }

    // 最久停滯的優先排序
    return stale.sort((a, b) => b.staleDays - a.staleDays);
  }

  // ── 私有：健康等級判斷 ──────────────────────────────────────────────────

  private _computeHealthGrade(
    wipSaturation: number,
    staleRatio: number
  ): 'healthy' | 'warning' | 'critical' {
    if (wipSaturation >= 1.5 || staleRatio >= 0.5) return 'critical';
    if (wipSaturation >= 1.0 || staleRatio >= 0.25) return 'warning';
    return 'healthy';
  }

  // ── 私有：停滯建議動作 ──────────────────────────────────────────────────

  private _suggestAction(
    mission: WeeklyMission,
    staleDays: number
  ): StaleMissionInfo['suggestedAction'] {
    // 若有關聯 ticker 或 url，時效性較強，超過 10 天建議標為過期刪除
    if (staleDays > 10 && (mission.ticker || mission.url)) {
      return 'delete_if_expired';
    }
    // 停滯 7 天以上建議降至 someday
    if (staleDays >= 7) {
      return 'move_to_someday';
    }
    return 'review';
  }
}
