import { IToolManifest } from '../../types';
import { ScriptRunner } from './ScriptRunner';

export const scriptRunnerManifest: IToolManifest = {
  id: 'script-runner',
  title: '隨選腳本執行器',
  name: '隨選腳本執行器',
  shortName: '腳本執行',
  description: '注入預設腳本（如 PikPak 分享爬蟲）或在線自訂代碼，獲取執行結果與匯出',
  icon: '⚡',
  category: 'dev',
  badge: '強效',
  permissions: ['scripting', 'activeTab'],
  component: ScriptRunner,
};

