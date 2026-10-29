import { IToolManifest } from '../../types';
import { ImageScraper } from './ImageScraper';

export const imageScraperManifest: IToolManifest = {
  id: 'image-scraper',
  title: '網頁圖片爬取器',
  name: '網頁圖片爬取器',
  shortName: '圖片爬取',
  description: '抓取任意網頁（如 Flickr 相簿）或分頁圖片，支援篩選與批量下載',
  icon: '🖼️',
  category: 'media',
  badge: '熱門',
  permissions: ['downloads', 'activeTab'],
  component: ImageScraper,
};

