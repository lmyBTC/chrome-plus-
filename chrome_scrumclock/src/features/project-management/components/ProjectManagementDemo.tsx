import React, { useState } from 'react';

type Tab = 'taskPool' | 'inbox' | 'sprintLogs';

export const ProjectManagementDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('taskPool');

  // 假資料 (Mock Data) 模擬 Google Sheet
  const taskPoolData = [
    { id: 'TSK-001', title: '完成 API 架構設計', status: 'TODO', priority: 'P1', notes: '', created: '2026-05-30 09:00', completed: '-' },
    { id: 'TSK-002', title: '修改 Quick Capture 表單欄位', status: 'DONE', priority: 'P2', notes: '已新增 Adapter 選項', created: '2026-05-29 14:00', completed: '2026-05-30 11:30' },
    { id: 'TSK-003', title: '準備週報材料', status: 'TODO', priority: 'P1', notes: '', created: '2026-05-30 09:15', completed: '-' },
    { id: 'TSK-004', title: '優化 CSS Theme', status: 'IN_PROGRESS', priority: 'P3', notes: '', created: '2026-05-28 10:00', completed: '-' },
  ];

  const inboxData = [
    { id: 'INBOX-001', text: '下週記得跟 Max 確認資安規範', context: 'https://github.com/company/repo', created: '2026-05-30 11:15', processed: false },
    { id: 'INBOX-002', text: '行銷團隊想要加一個 tooltip 功能', context: 'Slack message', created: '2026-05-30 13:42', processed: false },
  ];

  const sprintLogsData = [
    { logId: 'LOG-001', taskId: 'TSK-002', duration: 25, result: '改完了 QuickCapture UI，準備串接 API', timestamp: '2026-05-30 10:25' },
    { logId: 'LOG-002', taskId: 'TSK-002', duration: 25, result: 'API 串接測試通過，已提交 PR', timestamp: '2026-05-30 11:30' },
    { logId: 'LOG-003', taskId: 'TSK-001', duration: 25, result: '梳理了現有架構圖', timestamp: '2026-05-30 14:00' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-8 font-sans">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">專案管理儀表板</h1>
          <p className="text-gray-500 mt-2">模擬 Gemini 與 Scrumclock 的單一資料庫 (Google Sheet 結構)</p>
        </div>
        <div className="text-sm px-4 py-2 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-100 flex items-center gap-2">
          <span>✨</span>
          <span>Powered by Gemini 規劃大腦</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
        <button
          onClick={() => setActiveTab('taskPool')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'taskPool' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🗂️ 任務池 (Task Pool)
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'inbox' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📥 收件匣 (Inbox)
        </button>
        <button
          onClick={() => setActiveTab('sprintLogs')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'sprintLogs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⏱️ 番茄鐘日誌 (Sprint Logs)
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {activeTab === 'taskPool' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Task ID</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Execution Notes</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {taskPoolData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{row.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{row.title}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${
                        row.status === 'DONE' ? 'bg-green-100 text-green-700' :
                        row.status === 'TODO' ? 'bg-gray-100 text-gray-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        row.priority === 'P1' ? 'bg-red-50 text-red-600 border border-red-100' :
                        'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}>
                        {row.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 italic max-w-[200px] truncate" title={row.notes}>{row.notes || '-'}</td>
                    <td className="px-6 py-4 text-xs">{row.created}</td>
                    <td className="px-6 py-4 text-xs">{row.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'inbox' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4 w-1/2">Captured Text</th>
                  <th className="px-6 py-4">Context URL</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4">Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inboxData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{row.id}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{row.text}</td>
                    <td className="px-6 py-4 text-blue-500 hover:underline cursor-pointer">{row.context}</td>
                    <td className="px-6 py-4 text-xs">{row.created}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        row.processed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {row.processed ? 'TRUE' : 'FALSE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'sprintLogs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Log ID</th>
                  <th className="px-6 py-4">Task ID</th>
                  <th className="px-6 py-4">Duration (Mins)</th>
                  <th className="px-6 py-4 w-1/2">Sprint Result</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sprintLogsData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{row.logId}</td>
                    <td className="px-6 py-4 font-mono text-blue-600 bg-blue-50/50 rounded">{row.taskId}</td>
                    <td className="px-6 py-4 font-semibold">{row.duration}</td>
                    <td className="px-6 py-4 text-gray-800">{row.result}</td>
                    <td className="px-6 py-4 text-xs">{row.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6 text-sm text-blue-800">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <span>ℹ️</span> 關於此展示頁面
        </h3>
        <p className="opacity-90 leading-relaxed">
          這個頁面是 <strong>Google Sheet 結構</strong> 的前端視覺化展示。在真實的工作流中，您可以將 Gemini Web App 連結至您的 Google Sheet，由 AI 直接幫您整理 Inbox、分配 Priority 並建立 Task。
          而 Scrumclock 會每天早上讀取 Task Pool，並在番茄鐘結束時將結果寫入 Sprint Logs 供 Gemini 後續分析。
        </p>
      </div>
    </div>
  );
};
