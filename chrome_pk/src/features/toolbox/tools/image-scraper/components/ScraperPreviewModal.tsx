import React, { useState } from 'react';
import { ScraperPreviewModalProps } from './types';

export const ScraperPreviewModal: React.FC<ScraperPreviewModalProps> = ({
  image,
  onClose,
  onDownloadSingle
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!image) return null;

  const isVideo = image.mediaType === 'video' || image.format === 'mp4' || image.format === 'webm';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(image.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降級處理
      alert('已複製媒體網址！');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-dark-surface border border-dark-border-strong rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border-subtle">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <h4 className="text-sm font-semibold text-dark-primary truncate max-w-md">
              {image.alt || image.url.split('/').pop()}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-dark-muted hover:text-dark-primary text-xl font-bold p-1 leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Image / Video Body */}
        <div className="flex-1 bg-black/90 p-4 flex items-center justify-center overflow-auto min-h-[300px]">
          {isVideo ? (
            <video
              src={image.url}
              poster={image.posterUrl}
              controls
              autoPlay
              className="max-h-[65vh] max-w-full rounded shadow-xl bg-black"
            />
          ) : (
            <img
              src={image.url}
              alt={image.alt || '大圖預覽'}
              className="max-h-[65vh] max-w-full object-contain rounded"
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-dark-card border-t border-dark-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-dark-secondary font-mono truncate max-w-lg">
            <span className="text-dark-muted mr-1">URL:</span>
            <a
              href={image.url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline"
            >
              {image.url}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-3 py-1.5 bg-dark-surface hover:bg-dark-hover text-dark-primary rounded border border-dark-border-subtle transition-colors cursor-pointer"
            >
              {copied ? '已複製！' : '複製網址'}
            </button>
            <button
              type="button"
              onClick={() => onDownloadSingle(image)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors cursor-pointer"
            >
              {isVideo ? '下載此影片' : '下載此圖'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
