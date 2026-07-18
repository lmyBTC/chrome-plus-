import { z } from 'zod';

export const AIActionSchema = z.discriminatedUnion('isAction', [
  // 意圖不符合時的判定 schema
  z.object({
    isAction: z.literal(false),
  }),
  // 意圖符合時的完整欄位 schema
  z.object({
    isAction: z.literal(true),
    intentType: z.enum(['project', 'daily_mission']),
    actionType: z.enum(['create', 'update', 'complete', 'delete']),
    targetName: z.string().min(1, '目標名稱不可為空'),
    progressPercent: z.number().int().min(0).max(100).default(0),
    statusSummary: z.string().default(''),
    estimatedPomodoros: z.number().int().min(1).default(1),
  }),
]);

export type AIAction = z.infer<typeof AIActionSchema>;
