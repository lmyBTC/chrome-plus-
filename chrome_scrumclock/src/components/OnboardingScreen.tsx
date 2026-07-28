import React, { useState } from 'react';

interface OnboardingScreenProps {
  onLogin: () => Promise<void>;
  onSkip: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onLogin, onSkip }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginClick = async () => {
    setIsLoggingIn(true);
    await onLogin();
    setIsLoggingIn(false);
  };

  return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center relative overflow-hidden">
      {/* 裝飾背景 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-lg p-10 bg-dark-card border border-dark-border-subtle rounded-3xl shadow-2xl shadow-slate-950/50 backdrop-blur-xl text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-4xl">🍅</span>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4 tracking-wide">
            24 小時人生重啟系統
          </h1>
          <p className="text-dark-secondary text-base leading-relaxed">
            單一任務焦點、背景雙向同步，<br/>打造無干擾的深度工作環境。
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLoginClick}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 px-6 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all transform active:scale-95 disabled:opacity-70"
          >
            {isLoggingIn ? (
              <span className="animate-spin text-xl">⏳</span>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            )}
            {isLoggingIn ? '登入中...' : '使用 Google 帳號登入'}
          </button>
          
          <div className="text-sm text-dark-muted mt-2 mb-4">
            啟用完整雙向同步 (Google Tasks / Calendar)
          </div>

          <button
            onClick={onSkip}
            className="w-full text-dark-secondary hover:text-white px-6 py-3 rounded-xl font-medium transition-colors hover:bg-dark-hover"
          >
            先不用，使用本地單機模式
          </button>
        </div>
      </div>
    </div>
  );
};
