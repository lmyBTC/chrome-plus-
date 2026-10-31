/**
 * test_phase5_ui_integration.ts - Phase 5 UI 增強（Action Report、WIP 橫幅、破壞性操作確認）邏輯驗證
 */

import { KanbanActionDispatcher } from '../src/features/project-management/services/kanbanActionDispatcher';
import { WeeklyMission, UserSettings } from '../src/types';

// 模擬 chrome storage 環境
const mockStorage: Record<string, any> = {};
(global as any).chrome = {
  storage: {
    local: {
      get: async (keys: any) => {
        if (typeof keys === 'string') {
          return { [keys]: mockStorage[keys] };
        }
        if (Array.isArray(keys)) {
          const res: Record<string, any> = {};
          keys.forEach((k) => (res[k] = mockStorage[k]));
          return res;
        }
        return { ...mockStorage };
      },
      set: async (items: Record<string, any>) => {
        Object.assign(mockStorage, items);
      },
      remove: async (keys: any) => {
        const arr = Array.isArray(keys) ? keys : [keys];
        arr.forEach((k) => delete mockStorage[k]);
      },
    },
  },
  runtime: {
    sendMessage: () => {},
  },
};

async function runPhase5IntegrationTest() {
  console.log('🧪 開始執行 Phase 5: Action Report、WIP 橫幅與確認 Modal 整合驗證...\n');

  // 初始化看板卡片
  const initialMissions: WeeklyMission[] = [
    { id: 't1', text: '研讀架構文件', status: 'in-progress', isCompleted: false, createdAt: '2026-10-31', priority: 'P1' },
    { id: 't2', text: '編寫單元測試', status: 'in-progress', isCompleted: false, createdAt: '2026-10-31', priority: 'P2' },
    { id: 't3', text: '審核 PR 流程', status: 'in-progress', isCompleted: false, createdAt: '2026-10-31', priority: 'P2' },
    { id: 't4', text: '待重構模組', status: 'next-action', isCompleted: false, createdAt: '2026-10-31', priority: 'P2' },
  ];
  mockStorage['weeklyMissions'] = initialMissions;
  mockStorage['userSettings'] = { wipLimit: 3 };

  // ==========================================
  // 檢驗 1: WIP 衝突時的警告橫幅資料結構
  // ==========================================
  console.log('--- 檢驗 1: WIP 衝突與警告橫幅 (WIP Over-limit Warning) ---');
  const wipMoveCall = {
    name: 'move_task_stage',
    args: { taskId: 't4', targetStage: 'in-progress' },
  };

  const wipResult = await KanbanActionDispatcher.dispatch(wipMoveCall, {
    missions: mockStorage['weeklyMissions'],
    wipLimit: 3,
  });

  if (wipResult.success === false && wipResult.warning && wipResult.warning.includes('WIP 限制守門警告')) {
    console.log('✅ WIP 衝突成功攔截，具備 warning 欄位供橘色橫幅顯示:');
    console.log(`   [Warning Banner]: ${wipResult.warning}`);
  } else {
    throw new Error('❌ WIP 衝突未正確輸出 warning 欄位！');
  }

  // ==========================================
  // 檢驗 2: Action Report 訊息結構包裝
  // ==========================================
  console.log('\n--- 檢驗 2: Action Report 訊息包裝 (split_task 成果呈現) ---');
  const splitCall = {
    name: 'split_task',
    args: {
      parentTaskId: 't4',
      subtasks: [
        { title: '分析現有相依性', estimatedPomodoros: 1 },
        { title: '抽離共用邏輯', estimatedPomodoros: 2 },
      ],
    },
  };

  const splitResult = await KanbanActionDispatcher.dispatch(splitCall, {
    missions: mockStorage['weeklyMissions'],
  });

  if (splitResult.success && splitResult.actionName === 'split_task') {
    const actionReportMsg = {
      role: 'action_report',
      content: splitResult.message,
      actionName: splitResult.actionName,
      warning: splitResult.warning,
      success: splitResult.success,
    };
    console.log('✅ split_task 成功產生 Action Report 訊息物件:');
    console.log(`   [Role]: ${actionReportMsg.role}`);
    console.log(`   [Action]: ${actionReportMsg.actionName}`);
    console.log(`   [Content]: ${actionReportMsg.content}`);
  } else {
    throw new Error('❌ split_task Action Report 產出失敗！');
  }

  // ==========================================
  // 檢驗 3: 破壞性操作確認 Modal 攔截與兩階段執行
  // ==========================================
  console.log('\n--- 檢驗 3: 破壞性操作確認 Modal 流程 (Mark Done / Delete) ---');
  const destructiveCall = {
    name: 'mark_task_done',
    args: { taskId: 't1' },
  };

  // 第一階段：Dispatcher 攔截並回傳 requireConfirm
  const stage1Result = await KanbanActionDispatcher.dispatch(destructiveCall, {
    missions: mockStorage['weeklyMissions'],
  });

  if (stage1Result.requireConfirm && stage1Result.confirmData) {
    console.log('✅ 第一階段攔截成功：回傳 requireConfirm: true，觸發確認 Modal');
    console.log(`   [Modal Title]: ${stage1Result.message}`);
    console.log(`   [Confirm Details]: ${stage1Result.confirmData.details}`);

    // 第二階段：模擬使用者在 Modal 點擊「確認執行」
    const confirmedCall = {
      name: stage1Result.confirmData.action,
      args: stage1Result.confirmData.args,
    };

    const stage2Result = await KanbanActionDispatcher.dispatch(confirmedCall, {
      missions: mockStorage['weeklyMissions'],
    });

    if (stage2Result.success && stage2Result.actionName === 'mark_task_done') {
      console.log('✅ 第二階段執行成功：使用者點擊確認後正式完成任務');
      console.log(`   [Done Message]: ${stage2Result.message}`);
    } else {
      throw new Error('❌ 確認後執行失敗！');
    }
  } else {
    throw new Error('❌ 破壞性操作未被 requireConfirm 攔截！');
  }

  console.log('\n🎉 Phase 5 UI 增強與確認 Modal 整合測試全部通過 (Exit 0)！');
}

runPhase5IntegrationTest().catch((err) => {
  console.error('\n❌ 測試失敗:', err);
  process.exit(1);
});
