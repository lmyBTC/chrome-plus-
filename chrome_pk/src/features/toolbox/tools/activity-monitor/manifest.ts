import { IToolManifest } from '../../types';
import { ActivityMonitor } from './index';

export const activityMonitorManifest: IToolManifest = {
  id: 'activity-monitor',
  title: '瀏覽行為監控器',
  name: '瀏覽行為監控器',
  shortName: '行為監控',
  description: '實時審查網頁敏感權限（鏡頭、定位、剪貼簿）與 API 存取風險',
  icon: '🛡️',
  category: 'security',
  badge: '安全',
  permissions: ['tabs', 'management'],
  component: ActivityMonitor,
};

