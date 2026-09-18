import { ActiveTabScrapeMode, CarouselProgress } from '../types';

export interface ActiveTabScrapeOptions {
  mode?: ActiveTabScrapeMode;
  scrollSteps?: number;
  maxTraverseCount?: number;
  traverseDelayMs?: number;
  onCarouselProgress?: (progress: CarouselProgress) => void;
  shouldAbort?: () => boolean;
  targetTabId?: number;
}
