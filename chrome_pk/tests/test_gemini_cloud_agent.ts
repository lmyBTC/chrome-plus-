/**
 * test_gemini_cloud_agent.ts - GeminiCloudAgent 單元與 Schema 驗證
 */

import { PK_TOOLS, buildContextSnapshot, GeminiCloudAgent } from '../src/core/ai/GeminiCloudAgent';
import { WeeklyMission, UserSettings } from '../src/types';

function runTests() {
  console.log('🧪 開始執行 GeminiCloudAgent 與 PK_TOOLS 測試...');

  // 1. 驗證 7 項工具宣告
  console.log('檢查 1: PK_TOOLS 工具總數與名稱驗證');
  const expectedTools = [
    'add_task',
    'split_task',
    'move_task_stage',
    'trigger_cloud_sync',
    'mark_task_done',
    'start_pomodoro_sprint',
    'generate_standup_report',
  ];

  if (PK_TOOLS.length !== 7) {
    throw new Error(`工具數量預期為 7，實際為 ${PK_TOOLS.length}`);
  }

  const toolNames = PK_TOOLS.map((t) => t.name);
  for (const exp of expectedTools) {
    if (!toolNames.includes(exp)) {
      throw new Error(`缺少預期工具宣告: ${exp}`);
    }
  }
  console.log('✅ 7 項工具宣告名稱全數正確:', toolNames.join(', '));

  // 2. 驗證個別工具 schema 欄位
  console.log('檢查 2: 工具 Schema 參數與必填項檢核');
  const addTask = PK_TOOLS.find((t) => t.name === 'add_task')!;
  if (!addTask.parameters.properties.title || !addTask.parameters.required?.includes('title')) {
    throw new Error('add_task 工具參數驗證失敗');
  }

  const splitTask = PK_TOOLS.find((t) => t.name === 'split_task')!;
  if (!splitTask.parameters.properties.subtasks || !splitTask.parameters.required?.includes('parentTitle')) {
    throw new Error('split_task 工具參數驗證失敗');
  }

  const moveTask = PK_TOOLS.find((t) => t.name === 'move_task_stage')!;
  if (!moveTask.parameters.properties.targetStage || !moveTask.parameters.required?.includes('targetStage')) {
    throw new Error('move_task_stage 工具參數驗證失敗');
  }
  console.log('✅ 核心工具參數定義與必填項檢核通過');

  // 3. 驗證 Context Snapshot 打包
  console.log('檢查 3: buildContextSnapshot 看板快照打包檢核');
  const mockMissions: WeeklyMission[] = [
    { id: 'm1', text: '完成產品規格書', isCompleted: false, status: 'in-progress', estimatedPomodoros: 2 },
    { id: 'm2', text: '學習 React Hooks', isCompleted: false, status: 'next-action', estimatedPomodoros: 1 },
    { id: 'm3', text: '閱讀財報', isCompleted: false, status: 'inbox', estimatedPomodoros: 1 },
  ];
  const mockSettings: UserSettings = {
    userName: 'Tester',
    pomodoroDuration: 25,
    breakDuration: 5,
    endOfDayReviewTime: '21:00',
    distractionSites: [],
    maxWipLimit: 3,
  };

  const snapshot = buildContextSnapshot(mockMissions, mockSettings, false);
  if (snapshot.wipLimit !== 3) {
    throw new Error(`wipLimit 預期為 3，實際為 ${snapshot.wipLimit}`);
  }
  if (snapshot.inProgressCount !== 1) {
    throw new Error(`inProgressCount 預期為 1，實際為 ${snapshot.inProgressCount}`);
  }
  if (snapshot.columns.nextActions.length !== 1 || snapshot.columns.inbox.length !== 1) {
    throw new Error('看板欄位分組數量不正確');
  }
  console.log('✅ Context Snapshot 打包驗證通過，WIP 與欄位映射正確');

  console.log('\n🎉 所有 GeminiCloudAgent 與 PK_TOOLS 測試均通過 (Exit 0)！');
}

runTests();

