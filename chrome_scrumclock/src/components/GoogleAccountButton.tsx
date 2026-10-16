import React, { useState, useEffect, useRef } from 'react';
import { googleAuthClient } from '../shared/google/googleAuthClient';
import { GoogleAuthState } from '../shared/google/googleTypes';

interface GoogleAccountButtonProps {
  onNavigateSettings?: () => void;
}

export const GoogleAccountButton: React.FC<GoogleAccountButtonProps> = ({ onNavigateSettings }) => {
  const [authState, setAuthState] = useState<GoogleAuthState | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化並讀取 Google 授權狀態
  const refreshAuthState = async () => {
    try {
      const state = await googleAuthClient.getAuthState();
      setAuthState(state);
      if (state.isAuthenticated) {
        setErrorMessage(null);
      }
    } catch (err: any) {
      setAuthState({
        isAuthenticated: false,
        error: err?.message || '取得授權狀態失敗',
      });
    }
  };

  useEffect(() => {
    refreshAuthState();

    // 監聽 storage 變更（如設定頁更新了 Client ID 或授權 Token）
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && (changes['scrumclock_google_auth_state'] || changes['userSettings'])) {
        refreshAuthState();
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  // 點擊元件外部自動收合下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 執行登入
  const handleSignIn = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      await googleAuthClient.getAuthToken(true);
      await refreshAuthState();
      setIsOpen(false);
    } catch (err: any) {
      const msg = err?.message || 'Google 授權登入失敗';
      setErrorMessage(msg);
      setIsOpen(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 執行登出
  const handleSignOut = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      await googleAuthClient.signOut();
      await refreshAuthState();
      setIsOpen(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google 帳號登出失敗');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const isAuthenticated = !!authState?.isAuthenticated;
  const userEmail = authState?.userEmail;
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'G';

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* 登入按鈕 / 帳號頭像按鈕 */}
      {isAuthenticating ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-card border border-dark-border-subtle text-xs text-dark-muted cursor-wait select-none">
          <svg className="w-3.5 h-3.5 animate-spin text-primary-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-[11px]">連線中...</span>
        </div>
      ) : isAuthenticated ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title={`已登入 Google：${userEmail || '已連結'}`}
          className={`group flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full border transition-all text-xs ${
            isOpen
              ? 'bg-dark-hover border-emerald-500/60 shadow-sm shadow-emerald-950/20'
              : 'bg-dark-card hover:bg-dark-hover border-dark-border-subtle hover:border-dark-border-default'
          }`}
        >
          {/* 頭像與在線小綠點 */}
          <div className="relative w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-semibold text-[11px]">
            {userInitial}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-dark-card ring-1 ring-emerald-500/40" />
          </div>
          <span className="text-[11px] text-dark-primary font-medium max-w-[70px] truncate">
            {userEmail ? userEmail.split('@')[0] : '已登入'}
          </span>
          <svg
            className={`w-3 h-3 text-dark-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSignIn}
          title="登入 Google 帳號以啟用雲端任務與日曆同步"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-card hover:bg-dark-hover border border-dark-border-subtle hover:border-primary-500/50 text-xs text-dark-primary transition-all shadow-sm hover:shadow"
        >
          {/* Google 標誌性 4 色 SVG */}
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-[11px] font-medium text-dark-secondary hover:text-dark-primary">登入</span>
        </button>
      )}

      {/* 下拉狀態與操作選單 */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 rounded-xl bg-dark-card border border-dark-border-default shadow-2xl py-2 z-50 text-xs backdrop-blur-md">
          {/* 錯誤提示區塊 */}
          {errorMessage && (
            <div className="mx-2 mb-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] leading-relaxed">
              <div className="font-semibold flex items-center gap-1 text-red-400 mb-0.5">
                <span>⚠️</span> 授權提示
              </div>
              <div className="break-words">{errorMessage}</div>
              {onNavigateSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigateSettings();
                  }}
                  className="mt-1.5 text-xs text-primary-400 hover:text-primary-300 underline font-medium block"
                >
                  前往全域設定檢查 Client ID 配置 →
                </button>
              )}
            </div>
          )}

          {/* 帳號資訊標題 */}
          {isAuthenticated ? (
            <div className="px-3 py-2 border-b border-dark-border-subtle/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-dark-muted font-semibold">Google 帳號</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ● 已連結
                </span>
              </div>
              <p className="text-xs font-semibold text-dark-primary truncate" title={userEmail || ''}>
                {userEmail || '已授權 Google 生態'}
              </p>
            </div>
          ) : (
            <div className="px-3 py-2 border-b border-dark-border-subtle/80">
              <div className="text-[11px] font-medium text-dark-secondary">
                尚未登入 Google 帳號
              </div>
              <p className="text-[10px] text-dark-muted mt-0.5">
                登入後即可啟用 Google Tasks 與日曆自動同步。
              </p>
            </div>
          )}

          {/* 操作項目清單 */}
          <div className="pt-1 pb-1">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="w-full text-left px-3 py-2 text-dark-secondary hover:text-dark-primary hover:bg-dark-hover flex items-center gap-2 transition-colors"
                >
                  <span className="text-sm">🔄</span>
                  <span>切換帳號 / 重新授權</span>
                </button>

                {onNavigateSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigateSettings();
                    }}
                    className="w-full text-left px-3 py-2 text-dark-secondary hover:text-dark-primary hover:bg-dark-hover flex items-center gap-2 transition-colors"
                  >
                    <span className="text-sm">⚙️</span>
                    <span>Google 生態同步設定</span>
                  </button>
                )}

                <div className="my-1 border-t border-dark-border-subtle/60" />

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isAuthenticating}
                  className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                >
                  <span className="text-sm">🚪</span>
                  <span>登出 Google 帳號</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="w-full text-left px-3 py-2 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 flex items-center gap-2 font-medium transition-colors"
                >
                  <span className="text-sm">🔑</span>
                  <span>立即登入 Google 帳號</span>
                </button>

                {onNavigateSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigateSettings();
                    }}
                    className="w-full text-left px-3 py-2 text-dark-secondary hover:text-dark-primary hover:bg-dark-hover flex items-center gap-2 transition-colors"
                  >
                    <span className="text-sm">⚙️</span>
                    <span>全域設定 / Client ID</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
