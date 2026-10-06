/**
 * SocialDispatcher - 側邊欄 Human-in-the-Loop (HITL) 社群分發與調音介面
 * 整合 Chrome 130+ Web AI API 矩陣 (WebAIGateway)、專用 Rewriter 調音與本地 Python 8765 閘道
 */

import React, { useState, useEffect } from 'react';
import { WebAIGateway, WebAIMatrixCapabilities } from '@/core/ai/webAIGateway';
import { ToneShifter } from './toneShifter';
import { SocialPostDraft, ToneShiftMode, DedupCheckResult } from './types';

const LOCAL_GATEWAY = 'http://127.0.0.1:8765/exec';

export const SocialDispatcher: React.FC = () => {
  const [matrixCaps, setMatrixCaps] = useState<WebAIMatrixCapabilities>({
    languageModel: 'unsupported',
    summarizer: 'unsupported',
    writer: 'unsupported',
    rewriter: 'unsupported',
    translator: 'unsupported'
  });
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>('');
  
  // 草稿狀態
  const [draft, setDraft] = useState<SocialPostDraft>({
    x_en: '',
    threads_zh: '',
    originalTitle: '',
    originalSummary: '',
    sourceUrl: ''
  });

  // 去重預警狀態
  const [dedupWarning, setDedupWarning] = useState<DedupCheckResult | null>(null);
  // 調音處理中狀態
  const [shiftingMode, setShiftingMode] = useState<ToneShiftMode | null>(null);

  const gateway = WebAIGateway.getInstance();
  const toneShifter = ToneShifter.getInstance();

  useEffect(() => {
    gateway.checkMatrixCapabilities().then((caps) => {
      setMatrixCaps(caps);
    });

    return () => {
      gateway.destroyAllSessions();
      toneShifter.destroy();
    };
  }, []);

  /**
   * 1. 從分頁抽取資料，經由 WebAIGateway 執行分發
   */
  const handleExtractAndGenerate = async () => {
    setLoading(true);
    setActionMessage('正在讀取分頁 DOM 資料...');
    setDedupWarning(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('找不到作用中的瀏覽器分頁');

      let pageData: any = null;
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_ACTIVE_PULSE_ITEM' });
        if (response?.success) {
          pageData = response.data;
        }
      } catch (_e) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const titleEl = document.querySelector('h1, h2, .card-title');
            const contentEl = document.querySelector('article, main, .pulse-card') || document.body;
            return {
              title: titleEl?.textContent?.trim() || document.title,
              summary: contentEl?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 1500) || '',
              url: window.location.href
            };
          }
        });
        pageData = results[0]?.result;
      }

      if (!pageData || !pageData.summary) {
        throw new Error('未能在目前頁面擷取到有效文字');
      }

      setActionMessage('⚡ Web AI API 矩陣平行推論中 (Summarizer + Writer)...');

      // 步驟 1: 專用 Summarizer 提煉核心觀點 Key-points
      const keyPoints = await gateway.summarizeText(pageData.summary, {
        type: 'key-points',
        format: 'markdown',
        length: 'short'
      });

      // 步驟 2: 專用 Writer 生成 X 英文草稿
      const xPrompt = `Write an analytical English post for X based on this: Title: "${pageData.title}". Key Points: ${keyPoints}. End with the URL: ${pageData.url}`;
      const xDraft = await gateway.writeDraft(xPrompt, {
        tone: 'formal',
        format: 'plain-text',
        length: 'short'
      });

      // 步驟 3: 專用 Writer 生成 Threads 繁中社群貼文
      const threadsPrompt = `根據此研報撰寫適合 Threads 的台灣繁體中文貼文，語氣自然誠懇，帶出核心反常識觀點並結尾提問引導討論：標題「${pageData.title}」，重點：${keyPoints}，附上連結：${pageData.url}`;
      const threadsDraft = await gateway.writeDraft(threadsPrompt, {
        tone: 'casual',
        format: 'plain-text',
        length: 'medium'
      });

      const newDraft: SocialPostDraft = {
        x_en: xDraft.trim(),
        threads_zh: threadsDraft.trim(),
        originalTitle: pageData.title,
        originalSummary: pageData.summary,
        sourceUrl: pageData.url
      };
      setDraft(newDraft);

      // 步驟 4: 本機去重比對
      setActionMessage('🔍 比對本機近 50 篇歷史貼文...');
      checkLocalDedup(newDraft.x_en);
      setActionMessage('✅ 雙語草稿生成完成 (Web AI Matrix)');
    } catch (err: any) {
      console.error(err);
      setActionMessage(`❌ 生成失敗: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkLocalDedup = async (text: string) => {
    try {
      const res = await fetch(LOCAL_GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: 'check_dedup',
          payload: { text, threshold: 0.65 }
        })
      });
      if (res.ok) {
        const data: DedupCheckResult = await res.json();
        if (data.is_duplicate) {
          setDedupWarning(data);
        } else {
          setDedupWarning(null);
        }
      }
    } catch (_err) {
      // 本地服務未開時保持非阻塞靜默
    }
  };

  const handleToneShift = async (mode: ToneShiftMode, target: 'x' | 'threads') => {
    const text = target === 'x' ? draft.x_en : draft.threads_zh;
    if (!text) return;

    setShiftingMode(mode);
    try {
      const result = await toneShifter.shift(mode, text);
      if (target === 'x') {
        setDraft((prev) => ({ ...prev, x_en: result.shifted }));
      } else {
        setDraft((prev) => ({ ...prev, threads_zh: result.shifted }));
      }
      setActionMessage(`✨ 完成調音 [${mode}]`);
    } catch (err: any) {
      setActionMessage(`⚠️ 調音失敗: ${err.message}`);
    } finally {
      setShiftingMode(null);
    }
  };

  // 發布到 X (Web Intent 模式)
  const handlePublishXIntent = () => {
    const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(draft.x_en)}`;
    window.open(intentUrl, '_blank');
  };

  // 發布到 Threads (複製並開啟)
  const handlePublishThreadsWeb = () => {
    navigator.clipboard?.writeText(draft.threads_zh);
    setActionMessage('📋 已複製繁中草稿至剪貼簿！正在開啟 Threads...');
    window.open('https://www.threads.net/', '_blank');
  };

  // 一鍵更新至本地 RSS (feed.xml)
  const handleAppendRSS = async () => {
    if (!draft.originalTitle) {
      setActionMessage('⚠️ 請先擷取文章內容再執行 RSS 更新');
      return;
    }

    setActionMessage('正在寫入本機 dist/feed.xml...');
    try {
      const res = await fetch(LOCAL_GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: 'append_rss',
          payload: {
            title: draft.originalTitle,
            summary: draft.originalSummary.slice(0, 300),
            url: draft.sourceUrl
          }
        })
      });
      const data = await res.json();
      setActionMessage(data.message || '✅ RSS 更新成功');
    } catch (err: any) {
      setActionMessage(`❌ RSS 更新失敗: ${err.message}`);
    }
  };

  const xLength = draft.x_en.length;
  const isOver280 = xLength > 280;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-4 space-y-4 overflow-y-auto select-none">
      {/* 頂部狀態列與 Web AI 矩陣指示器 */}
      <div className="border-b border-slate-800 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-indigo-400 via-sky-400 to-purple-400 bg-clip-text text-transparent">
              📢 Social Dispatcher
            </span>
            <span className="text-[10px] text-slate-500 font-mono">v2.5 (Matrix)</span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs">
            <span className={`w-2 h-2 rounded-full ${matrixCaps.languageModel === 'readily' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-400 text-[11px] font-mono">
              LM: {matrixCaps.languageModel}
            </span>
          </div>
        </div>

        {/* 專用 API 矩陣徽章列 */}
        <div className="flex flex-wrap gap-1 text-[10px] font-mono">
          <span className={`px-1.5 py-0.5 rounded border ${matrixCaps.summarizer === 'readily' ? 'bg-emerald-950 border-emerald-800 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
            Sum:{matrixCaps.summarizer === 'readily' ? 'OK' : matrixCaps.summarizer}
          </span>
          <span className={`px-1.5 py-0.5 rounded border ${matrixCaps.writer === 'readily' ? 'bg-emerald-950 border-emerald-800 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
            Writer:{matrixCaps.writer === 'readily' ? 'OK' : matrixCaps.writer}
          </span>
          <span className={`px-1.5 py-0.5 rounded border ${matrixCaps.rewriter === 'readily' ? 'bg-emerald-950 border-emerald-800 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
            Rewriter:{matrixCaps.rewriter === 'readily' ? 'OK' : matrixCaps.rewriter}
          </span>
          <span className={`px-1.5 py-0.5 rounded border ${matrixCaps.translator === 'readily' ? 'bg-emerald-950 border-emerald-800 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
            Trans:{matrixCaps.translator === 'readily' ? 'OK' : matrixCaps.translator}
          </span>
        </div>
      </div>

      {/* 抓取觸發按鈕 */}
      <button
        onClick={handleExtractAndGenerate}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-xs font-semibold rounded-lg shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
      >
        {loading ? (
          <span className="animate-pulse">⚡ Web AI 矩陣推論中 (Summarizer ➔ Writer)...</span>
        ) : (
          <span>🎯 擷取當前頁面 Pulse ➔ 產出雙語貼文</span>
        )}
      </button>

      {/* 操作即時訊息反饋 */}
      {actionMessage && (
        <div className="text-[11px] text-indigo-300 bg-indigo-950/40 border border-indigo-900/50 rounded px-2.5 py-1.5 font-mono">
          {actionMessage}
        </div>
      )}

      {/* 去重警告通知 */}
      {dedupWarning && (
        <div className="text-xs bg-rose-950/60 border border-rose-800/80 text-rose-300 p-2.5 rounded-lg space-y-1">
          <div className="font-bold flex items-center space-x-1">
            <span>⚠️ 歷史貼文重複預警 (相似度: {(dedupWarning.similarity * 100).toFixed(0)}%)</span>
          </div>
          <div className="text-[11px] text-rose-200/80 line-clamp-2">
            "{dedupWarning.matched_sample}"
          </div>
        </div>
      )}

      {/* 雙欄編輯區 (HITL) */}
      <div className="space-y-4 pt-1">
        {/* X (Twitter) 編輯卡片 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-sky-400 flex items-center space-x-1">
              <span>X (Twitter) - 英文版</span>
            </span>
            <span className={`font-mono text-[11px] font-bold ${isOver280 ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`}>
              {xLength} / 280
            </span>
          </div>

          <textarea
            value={draft.x_en}
            onChange={(e) => setDraft({ ...draft, x_en: e.target.value })}
            rows={5}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-sans leading-relaxed"
            placeholder="點擊上方按鈕自動生成 X 高信噪比貼文..."
          />

          {/* 調音算子快捷工具列 (Powered by RewriterAdapter) */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              onClick={() => handleToneShift('sharpen', 'x')}
              disabled={!draft.x_en || shiftingMode !== null}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[10px] text-slate-300 rounded border border-slate-700"
            >
              🪄 觀點銳化
            </button>
            <button
              onClick={() => handleToneShift('fit280', 'x')}
              disabled={!draft.x_en || shiftingMode !== null}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[10px] text-sky-300 rounded border border-slate-700"
            >
              ✂️ 壓線 280
            </button>
            <button
              onClick={() => handleToneShift('splitThread', 'x')}
              disabled={!draft.x_en || shiftingMode !== null}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[10px] text-purple-300 rounded border border-slate-700"
            >
              🧵 切 Thread
            </button>
          </div>

          <button
            onClick={handlePublishXIntent}
            disabled={!draft.x_en}
            className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-xs font-semibold rounded text-white shadow-sm mt-1 transition-colors"
          >
            一鍵帶入 X (Web Intent)
          </button>
        </div>

        {/* Threads 編輯卡片 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-purple-400">
              Threads - 繁體中文版
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {draft.threads_zh.length} 字
            </span>
          </div>

          <textarea
            value={draft.threads_zh}
            onChange={(e) => setDraft({ ...draft, threads_zh: e.target.value })}
            rows={6}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
            placeholder="點擊上方按鈕自動生成 Threads 交流貼文..."
          />

          {/* Threads 調音工具列 */}
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={() => handleToneShift('dejargon', 'threads')}
              disabled={!draft.threads_zh || shiftingMode !== null}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[10px] text-amber-300 rounded border border-slate-700"
            >
              🇹🇼 在地去油
            </button>
          </div>

          <button
            onClick={handlePublishThreadsWeb}
            disabled={!draft.threads_zh}
            className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-xs font-semibold rounded text-white shadow-sm mt-1 transition-colors"
          >
            複製繁中草稿並開啟 Threads
          </button>
        </div>
      </div>

      {/* 底部本機生態輔助工具列 */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500">本機生態操作:</span>
        <button
          onClick={handleAppendRSS}
          disabled={!draft.originalTitle}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] text-slate-300 rounded border border-slate-700 transition-colors"
        >
          📰 一鍵追加至 feed.xml
        </button>
      </div>
    </div>
  );
};