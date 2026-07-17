/**
 * 正則解析 AI 回覆中的任務清單與番茄鐘數量
 * 匹配格式如：
 * - 任務名稱 (2 🍅)
 * * 任務名稱 2 🍅
 * - 任務名稱 2 個番茄鐘
 */
export function parseTasksFromText(text: string): { title: string; estimatedPomodoros: number }[] {
  const lines = text.split('\n');
  const tasks: { title: string; estimatedPomodoros: number }[] = [];
  
  const regex = /(?:-|\*)\s*(.*?)\s*(?:\((\d+)\s*🍅\)|(\d+)\s*🍅|(\d+)\s*個番茄鐘)/;
  
  lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
      const title = match[1].trim();
      const pomodoros = parseInt(match[2] || match[3] || match[4] || '1');
      if (title && !isNaN(pomodoros)) {
        tasks.push({ title, estimatedPomodoros: pomodoros });
      }
    }
  });

  if (tasks.length === 0) {
    // 降級匹配只要有清單列表與 🍅
    const altRegex = /(?:-|\*)\s*([^🍅]*?)\s*(\d+)?\s*🍅/;
    lines.forEach(line => {
      const match = line.match(altRegex);
      if (match) {
        const title = match[1].trim();
        const pomodoros = parseInt(match[2] || '1');
        if (title) {
          tasks.push({ title, estimatedPomodoros: pomodoros });
        }
      }
    });
  }

  return tasks;
}
