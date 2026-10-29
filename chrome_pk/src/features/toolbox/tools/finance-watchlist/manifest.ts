import { IToolManifest } from '../../types';
import { WatchListWidget } from '../../../finance-integration';

export const financeWatchlistManifest: IToolManifest = {
  id: 'finance-watchlist',
  title: '投研自選看板',
  name: '投研自選看板',
  shortName: '投研看板',
  description: '載入 Clipper 快照與華爾街目標價偏離程度，聯動深度研究番茄鐘',
  icon: '📈',
  category: 'finance',
  badge: '投研',
  permissions: ['storage'],
  component: WatchListWidget,
};
