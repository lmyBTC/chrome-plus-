import { GeminiMessage, GeminiConversation } from '../types';

export type { GeminiMessage, GeminiConversation };


/**
 * 將對話資料轉換為 Markdown 格式
 */
export function convertToMarkdown(conversation: GeminiConversation): string {
  let md = `# ${conversation.title}\n\n`;
  md += `* 擷取時間: ${new Date(conversation.timestamp).toLocaleString()}\n`;
  md += `* 來源連結: [Gemini App](https://gemini.google.com/app/${conversation.id})\n\n`;
  md += `---\n\n`;

  conversation.messages.forEach((msg) => {
    if (msg.role === 'user') {
      md += `### 👤 User\n\n${msg.content}\n\n`;
    } else {
      md += `### 🤖 Gemini\n\n${msg.content}\n\n`;
    }
    md += `---\n\n`;
  });

  return md;
}

/**
 * 觸發下載
 */
export function triggerDownload(filename: string, content: string, mimeType: string = 'text/markdown') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  if (typeof chrome !== 'undefined' && chrome.downloads) {
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, () => {
      URL.revokeObjectURL(url);
    });
  } else {
    // 網頁版測試退路
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
