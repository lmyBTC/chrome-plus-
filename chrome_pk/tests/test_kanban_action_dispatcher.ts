/**
 * test_kanban_action_dispatcher.ts - 看板指令分發器與 WIP 守門單元驗證
 */

import { KanbanActionDispatcher, AIActionCall } from '../src/features/project-management/services/kanbanActionDispatcher';
import { WeeklyMission } from '../src/types';

// Mock chrome storage environment if not present
if (typeof (globalThis as any).chrome === 'undefined') {
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: async () => ({}),
        set: async () => {},
      },
    },
    runtime: {
      sendMessage: () => {},
    },
  };
}

async function runTests() {
  console.log('🧪 開始執行 KanbanActionDispatcher 與 WIP 守門單元測試...');

  // 1. 測試 WIP 守門機制（任務 3.1 核心指標：模擬 WIP=3/3 時拒絕移入 in-progress）
  console.log('\n--- 檢查 1: WIP 守門限制 (WIP=3/3 時阻擋 move_task_stage) ---');
  const mockMissionsWIP: WeeklyMission[] = [
    { id: 'm1', text: '正在寫 API 介面', isCompleted: false, status: 'in-progress', estimatedPomodoros: 2 },
    { id: 'm2', text: '正在重構 CSS 模組', isCompleted: false, status: 'in-progress', estimatedPomodoros: 1 },
    { id: 'm3', text: '正在審查 PR', isCompleted: false, status: 'in-progress', estimatedPomodoros: 1 },
    { id: 'm4', text: '待處理的新需求', isCompleted: false, status: 'next-action', estimatedPomodoros: 2 },
  ];

  const moveCall: AIActionCall = {
    name: 'move_task_stage',
    args: {
      taskId: 'm4',
      targetStage: 'in-progress',
    },
  };

  const wipResult = await KanbanActionDispatcher.dispatch(moveCall, {
    missions: mockMissionsWIP,
    wipLimit: 3,
  });

  if (wipResult.success) {
    throw new Error('❌ WIP 守門失效：WIP 滿載 (3/3) 時不應允許移入 in-progress！');
  }

  if (!wipResult.warning || !wipResult.warning.includes('WIP 限制守門警告')) {
    throw new Error(`❌ WIP 警告訊息不符預期: ${JSON.stringify(wipResult)}`);
  }

  console.log('✅ WIP 滿額阻擋成功，回傳警告訊息:', wipResult.warning);

  // 2. 測試破壞性操作守門 (mark_task_done 未帶 confirmed: true 時應回傳 requireConfirm)
  console.log('\n--- 檢查 2: 破壞性操作確認守門 (mark_task_done requireConfirm 攔截) ---');
  const doneUnconfirmedCall: AIActionCall = {
    name: 'mark_task_done',
    args: {
      taskId: 'm1',
      taskTitle: '正在寫 API 介面',
    },
  };

  const doneResult = await KanbanActionDispatcher.dispatch(doneUnconfirmedCall, {
    missions: mockMissionsWIP,
  });

  if (doneResult.success || !doneResult.requireConfirm || doneResult.confirmData?.action !== 'mark_task_done') {
    throw new Error(`❌ 未確認的 mark_task_done 應回傳 requireConfirm: true: ${JSON.stringify(doneResult)}`);
  }
  console.log('✅ 破壞性操作成功攔截，取得確認信號:', doneResult.confirmData);

  // 帶上 confirmed: true 確認執行
  const doneConfirmedCall: AIActionCall = {
    name: 'mark_task_done',
    args: {
      taskId: 'm1',
      confirmed: true,
    },
  };
  const confirmedResult = await KanbanActionDispatcher.dispatch(doneConfirmedCall, {
    missions: mockMissionsWIP,
  });
  if (!confirmedResult.success) {
    throw new Error('❌ 帶有 confirmed: true 的 mark_task_done 應執行成功');
  }
  console.log('✅ 確認後完成任務執行成功:', confirmedResult.message);

  // 3. 測試 add_task 功能
  console.log('\n--- 檢查 3: 新增任務 (add_task) ---');
  const addCall: AIActionCall = {
    name: 'add_task',
    args: {
      title: '研讀 Gemini Nano 技術白皮書',
      priority: 'P1',
      estimatedPomodoros: 3,
      destination: 'next-action',
    },
  };
  const addResult = await KanbanActionDispatcher.dispatch(addCall, {
    missions: [...mockMissionsWIP],
  });
  if (!addResult.success || !addResult.data?.id) {
    throw new Error(`❌ add_task 執行失敗: ${JSON.stringify(addResult)}`);
  }
  console.log('✅ add_task 執行成功:', addResult.message);

  // 4. 測試 split_task 拆解為 Checklist
  console.log('\n--- 檢查 4: 任務拆解 (split_task) ---');
  const splitCall: AIActionCall = {
    name: 'split_task',
    args: {
      parentTaskId: 'm2',
      parentTitle: '正在重構 CSS 模組',
      subtasks: [
        { title: '提取共用主題色彩變數', estimatedPomodoros: 1 },
        { title: '設定 Tailwind 斷點配置', estimatedPomodoros: 1 },
      ],
    },
  };
  const splitResult = await KanbanActionDispatcher.dispatch(splitCall, {
    missions: [...mockMissionsWIP],
  });
  if (!splitResult.success || splitResult.data?.subtasksCount !== 2) {
    throw new Error(`❌ split_task 執行失敗: ${JSON.stringify(splitResult)}`);
  }
  console.log('✅ split_task 拆解成功:', splitResult.message);

  // 5. 測試 generate_standup_report
  console.log('\n--- 檢查 5: 站會日報生成 (generate_standup_report) ---');
  const reportCall: AIActionCall = {
    name: 'generate_standup_report',
    args: { scope: 'today' },
  };
  const reportResult = await KanbanActionDispatcher.dispatch(reportCall, {
    missions: mockMissionsWIP,
  });
  if (!reportResult.success || !reportResult.data?.reportText.includes('敏捷站會日報')) {
    throw new Error(`❌ generate_standup_report 執行失敗: ${JSON.stringify(reportResult)}`);
  }
  console.log('✅ generate_standup_report 產出成功:\n' + reportResult.data.reportText);

  console.log('\n🎉 所有 KanbanActionDispatcher 單元測試均全數通過 (Exit 0)！');
}

runTests().catch((e) => {
  console.error('❌ 測試失敗:', e);
  process.exit(1);
});

