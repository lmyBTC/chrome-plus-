import { IToolManifest } from './types';
import { scriptRunnerManifest } from './tools/script-runner';
import { imageScraperManifest } from './tools/image-scraper';
import { subtitleCollectorManifest } from './tools/subtitle-collector';
import { activityMonitorManifest } from './tools/activity-monitor';
import { financeWatchlistManifest } from './tools/finance-watchlist';

export const TOOL_REGISTRY: IToolManifest[] = [
  scriptRunnerManifest,
  imageScraperManifest,
  subtitleCollectorManifest,
  activityMonitorManifest,
  financeWatchlistManifest,
];

export const getToolManifest = (id: string): IToolManifest | undefined => {
  // 兼容舊版 ID (如 'finance-research' -> 'finance-watchlist')
  const resolvedId = id === 'finance-research' ? 'finance-watchlist' : id;
  return TOOL_REGISTRY.find((tool) => tool.id === resolvedId);
};

