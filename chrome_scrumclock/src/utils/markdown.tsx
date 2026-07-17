import React from 'react';

const renderInlineStyles = (str: string) => {
  // 處理 **粗體** 和 `行內程式碼`
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-900/60 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-800/80">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

/**
 * 支援 React 安全渲染的輕量級 Markdown 解析器 (100% 免疫 XSS)
 */
export function parseMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  let inList = false;
  const listItems: string[] = [];
  const nodes: React.ReactNode[] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`list-${key}`} className="list-disc pl-5 my-2 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm text-slate-300">
              {renderInlineStyles(item)}
            </li>
          ))}
        </ul>
      );
      listItems.length = 0;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    // 處理無序清單
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(trimmed.slice(2));
      return;
    } else {
      if (inList) {
        flushList(idx);
        inList = false;
      }
    }

    // 處理標題
    if (trimmed.startsWith('### ')) {
      nodes.push(<h3 key={idx} className="text-base font-bold text-slate-100 mt-4 mb-2">{renderInlineStyles(trimmed.slice(4))}</h3>);
    } else if (trimmed.startsWith('## ')) {
      nodes.push(<h2 key={idx} className="text-lg font-bold text-slate-100 mt-5 mb-3 border-b border-slate-800 pb-1">{renderInlineStyles(trimmed.slice(3))}</h2>);
    } else if (trimmed.startsWith('# ')) {
      nodes.push(<h1 key={idx} className="text-xl font-bold text-slate-100 mt-6 mb-4">{renderInlineStyles(trimmed.slice(2))}</h1>);
    } else if (trimmed.startsWith('```')) {
      // 簡單跳過程式碼標籤
      return;
    } else if (trimmed) {
      nodes.push(
        <p key={idx} className="text-sm text-slate-300 leading-relaxed my-2">
          {renderInlineStyles(trimmed)}
        </p>
      );
    } else {
      nodes.push(<div key={idx} className="h-2" />);
    }
  });

  if (inList) {
    flushList(lines.length);
  }

  return <div className="gemini-html-content">{nodes}</div>;
}
