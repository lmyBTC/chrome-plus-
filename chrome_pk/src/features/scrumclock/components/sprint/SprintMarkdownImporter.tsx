import React, { useState } from 'react';
import { CoreBattle, WeeklyMission } from '../../../../types';

interface SprintMarkdownImporterProps {
  onImportSuccess: (newMissions: WeeklyMission[], newBattles: CoreBattle[]) => Promise<void>;
}

export const parseMarkdownMissions = (markdownText: string): { newMissions: WeeklyMission[]; newBattles: CoreBattle[] } => {
  const lines = markdownText.split('\n');
  const newMissions: WeeklyMission[] = [];
  const newBattles: CoreBattle[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let isCompleted = false;
    let text = trimmed;

    // 1. 匹配有 checkbox 的清單，例如: - [ ] 任務名稱 或 - [x] 任務名稱
    const checkboxMatch = trimmed.match(/^\s*[-*+]\s*\[([ xX/])\]\s*(.*)$/);
    // 2. 匹配普通無序列表清單，例如: - 任務名稱 或 * 任務名稱
    const bulletMatch = trimmed.match(/^\s*[-*+]\s+(.*)$/);

    if (checkboxMatch) {
      isCompleted = checkboxMatch[1].toLowerCase() === 'x';
      text = checkboxMatch[2];
    } else if (bulletMatch) {
      text = bulletMatch[1];
    }

    // 3. 解析時間區間，例如: (時間: 10:00-11:00) 或 (10:00-11:00)
    let committedTime = '09:00-10:00';
    const timeMatch = text.match(/(?:\(|（|\[|時間:\s*|Time:\s*)([0-2]\d:[0-5]\d\s*-\s*[0-2]\d:[0-5]\d)(?:\)|）|\])/i);
    
    if (timeMatch) {
      committedTime = timeMatch[1];
      text = text.replace(timeMatch[0], '').trim();
    }

    // 建立任務識別 ID
    const missionId = `import-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`;
    newMissions.push({
      id: missionId,
      text: text,
      isCompleted: isCompleted
    });

    newBattles.push({
      missionId: missionId,
      committedTime: committedTime
    });
  });

  return { newMissions, newBattles };
};

export const SprintMarkdownImporter: React.FC<SprintMarkdownImporterProps> = ({ onImportSuccess }) => {
  const [showImportArea, setShowImportArea] = useState(false);
  const [importText, setImportText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImport = async () => {
    if (!importText.trim()) {
      alert('請輸入 Markdown 格式任務');
      return;
    }

    const { newMissions, newBattles } = parseMarkdownMissions(importText);

    if (newMissions.length === 0) {
      alert('未辨識出有效的條列任務');
      return;
    }

    try {
      setIsSubmitting(true);
      await onImportSuccess(newMissions, newBattles);
      setImportText('');
      setShowImportArea(false);
      alert(`成功匯入 ${newMissions.length} 個任務！`);
    } catch (error) {
      console.error('匯入任務失敗:', error);
      alert('匯入任務失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showImportArea) {
    return (
      <div className="mt-6 border-t border-dark-border-subtle pt-4">
        <button
          onClick={() => setShowImportArea(true)}
          className="w-full py-2 bg-dark-surface hover:bg-dark-hover border border-dashed border-dark-border-default rounded-lg text-sm text-dark-secondary transition-colors flex items-center justify-center space-x-1"
        >
          <span>📥 批次匯入 Markdown 任務</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-dark-border-subtle pt-4">
      <div className="bg-dark-surface rounded-lg p-4 border border-dark-border-default">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-dark-primary">📥 貼上 Markdown 任務列表</h3>
          <button
            onClick={() => setShowImportArea(false)}
            className="text-xs text-dark-muted hover:text-dark-primary"
          >
            收合
          </button>
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={`請貼入 Markdown 格式條列任務，例如：\n- [ ] 任務名稱 A (10:00-11:00)\n- [x] 已完成任務 B (13:00-14:00)\n- 普通任務 C`}
          className="w-full p-3 bg-dark-card border border-dark-border-default text-dark-primary rounded-lg text-sm font-mono mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={5}
          disabled={isSubmitting}
        />
        <div className="flex space-x-2 justify-end">
          <button
            onClick={() => setShowImportArea(false)}
            disabled={isSubmitting}
            className="px-3 py-1.5 bg-dark-hover hover:bg-dark-card border border-dark-border-default text-dark-secondary rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={isSubmitting}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-md shadow-blue-950/40 disabled:opacity-50"
          >
            {isSubmitting ? '匯入中...' : '確認匯入'}
          </button>
        </div>
      </div>
    </div>
  );
};
