import React from 'react';
import { ScrapedImage } from '../types';
import { ScraperImageListProps } from './types';

export const ScraperImageList: React.FC<ScraperImageListProps> = ({
  images,
  onToggleImage,
  onPreviewImage,
  onDownloadSingle
}) => {
  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-dark-muted bg-dark-card rounded-xl border border-dark-border-subtle">
        沒有符合目前篩選條件的圖片，請嘗試放寬尺寸或格式限制。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {images.map((img, index) => {
        const isVideo = img.mediaType === 'video' || img.format === 'mp4' || img.format === 'webm';
        const thumbSrc = isVideo ? (img.posterUrl || img.url) : img.url;

        return (
          <div
            key={img.id}
            onClick={e => onToggleImage(img.id, index, e)}
            className={`group relative bg-dark-card border rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-200 flex flex-col ${
              img.selected
                ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                : 'border-dark-border-subtle hover:border-dark-border-strong opacity-80 hover:opacity-100'
            }`}
          >
            {/* 縮圖預覽容器 */}
            <div className="relative aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={thumbSrc}
                alt={img.alt || (isVideo ? `影片 ${index + 1}` : `圖片 ${index + 1}`)}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={e => {
                  // 載入失敗時降級顯示
                  (e.target as HTMLImageElement).src = img.rawUrl;
                }}
              />

              {/* 影片中央播放小圖示 */}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white text-sm shadow-md group-hover:scale-110 transition-transform">
                    ▶
                  </div>
                </div>
              )}

              {/* 勾選標籤與已存標籤 */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                    img.selected
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-black/60 border border-white/50 text-transparent'
                  }`}
                >
                  ✓
                </div>
                {img.isDownloaded && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600/90 text-white border border-emerald-400/40 shadow-sm flex items-center gap-0.5">
                    <span>✓</span>
                    <span>已存</span>
                  </span>
                )}
              </div>

              {/* 畫質 / 格式徽章 */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1 ${
                    isVideo
                      ? 'bg-purple-600/90 text-white border border-purple-400/40 shadow-sm'
                      : 'bg-black/70 text-white'
                  }`}
                >
                  {isVideo && <span>🎥</span>}
                  <span>{img.format}</span>
                </span>
                {img.isHighResUpgrade && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/90 text-black">
                    HD
                  </span>
                )}
              </div>

              {/* 懸浮放大 / 下載動作按鈕群 */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  title="放大檢視"
                  onClick={e => {
                    e.stopPropagation();
                    onPreviewImage(img);
                  }}
                  className="p-2 bg-black/70 hover:bg-black text-white rounded-full transition-transform hover:scale-110 cursor-pointer"
                >
                  🔍
                </button>
                <button
                  type="button"
                  title={img.isDownloaded ? '已存過，點擊重新下載' : '單張下載'}
                  onClick={e => {
                    e.stopPropagation();
                    onDownloadSingle(img);
                  }}
                  className={`p-2 rounded-full transition-transform hover:scale-110 text-white cursor-pointer ${
                    img.isDownloaded ? 'bg-slate-700 hover:bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {img.isDownloaded ? '💾' : '⬇️'}
                </button>
              </div>
            </div>

            {/* 底部卡片資訊 */}
            <div className="p-2.5 flex flex-col gap-1 text-[11px] bg-dark-card border-t border-dark-border-subtle/50">
              <span className="text-dark-primary truncate font-medium" title={img.alt || img.url}>
                {img.alt || `相片 #${index + 1}`}
              </span>
              <span className="text-dark-muted font-mono truncate text-[10px]" title={img.url}>
                {img.url.split('/').pop()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
