import { IToolManifest } from '../../types';
import { SubtitleCollector } from './SubtitleCollector';

export const subtitleCollectorManifest: IToolManifest = {
  id: 'subtitle-collector',
  title: '影片字幕收集器',
  name: '影片字幕收集器',
  shortName: '字幕收集',
  description: '檢視並管理跨插件收集的影音字幕與筆記，支援時間戳跳轉與任務轉化',
  icon: '🎬',
  category: 'media',
  badge: '影音',
  permissions: ['storage'],
  component: SubtitleCollector,
};

