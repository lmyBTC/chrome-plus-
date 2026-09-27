import { CapturedSubtitleNote } from '../types';

export interface SrtItem {
  id: number;
  startTime: string; // 例如 "00:01:23,456" 或 "00:01:23"
  endTime: string;
  text: string;
}

/**
 * 將 SRT 時間格式 "HH:MM:SS,mmm" 或 "HH:MM:SS.mmm" 格式化為簡潔的時間字串 "HH:MM:SS" 或 "MM:SS"
 */
export function formatSrtTime(timeStr: string): string {
  if (!timeStr) return '';
  const cleanTime = timeStr.trim().replace(',', '.');
  const [timePart] = cleanTime.split('.');
  if (!timePart) return cleanTime;

  const parts = timePart.split(':');
  if (parts.length === 3 && parts[0] === '00') {
    return `${parts[1]}:${parts[2]}`;
  }
  return timePart;
}

/**
 * 解析標準 SRT 格式字串為結構化 SrtItem 陣列
 */
export function parseSrt(content: string): SrtItem[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // 去除 UTF-8 BOM 並統一換行符為 \n
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const items: SrtItem[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    let index = 0;
    let srtId = items.length + 1;

    // 若第一行為純數字序號
    if (/^\d+$/.test(lines[0])) {
      srtId = parseInt(lines[0], 10);
      index = 1;
    }

    if (index >= lines.length) continue;

    // 時間戳行：00:00:01,000 --> 00:00:04,000
    const timeMatch = lines[index].match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})/);
    if (!timeMatch) {
      continue;
    }

    const startTime = timeMatch[1];
    const endTime = timeMatch[2];
    const textLines = lines.slice(index + 1);

    // 清理常見 HTML 樣式標籤 (如 <i>, <b>, <font>)
    const cleanText = textLines
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (cleanText) {
      items.push({
        id: srtId,
        startTime,
        endTime,
        text: cleanText
      });
    }
  }

  return items;
}

/**
 * 將解析後的 SrtItem 轉換為 SubtitleCollector 所使用的 CapturedSubtitleNote 格式
 */
export function convertSrtToCapturedNotes(
  items: SrtItem[],
  fileName?: string
): CapturedSubtitleNote[] {
  const baseTitle = fileName ? fileName.replace(/\.[^/.]+$/, '') : '本地 SRT 字幕';
  const now = new Date().toISOString();

  return items.map((item, idx) => ({
    id: `srt-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    title: baseTitle,
    url: '',
    currentTime: formatSrtTime(item.startTime),
    text: item.text,
    source: 'local_srt',
    type: 'subtitle',
    tags: ['#SRT匯入'],
    createdAt: now
  }));
}
