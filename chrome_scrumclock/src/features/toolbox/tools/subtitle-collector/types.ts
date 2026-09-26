export interface CapturedSubtitleNote {
  id: string;
  title: string;
  url: string;
  currentTime?: string;
  text: string;
  source: string;
  type: string; // 'subtitle' | 'note' | string
  tags: string[];
  createdAt: string;
}

export type SubtitleFilterType = 'all' | 'subtitle' | 'note';

export interface SubtitleFilterState {
  keyword: string;
  selectedTag: string;
  typeFilter: SubtitleFilterType;
}

export interface SubtitleCollectorStats {
  total: number;
  subtitles: number;
  notes: number;
  tagsCount: number;
}
