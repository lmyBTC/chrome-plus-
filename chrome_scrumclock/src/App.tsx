import React, { useState, useEffect } from 'react';
import { TimerProvider, DailyMissionBriefing, SprintPomodoro, EndOfDayReview } from './features/scrumclock';
import { AnalyticsDashboard } from './features/analytics';
import { BookmarksHub } from './features/bookmarks';
import { ProjectManagementDemo } from './features/project-management';
import { QuickCapture } from './features/scrumclock/components/QuickCapture';
import { storage } from './core/chrome/storage';
import { offlineQueue } from './core/api/offlineQueue';
import { MainLayout } from './core/layout/MainLayout';
import { CommandPalette } from './core/layout/CommandPalette';
import { ToolView } from './core/layout/Sidebar';
import { AISidebar } from './features/ai-sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { InstallDocs } from './components/InstallDocs';
import { GeminiManager } from './features/gemini-exporter';
import { auth } from './core/chrome/auth';
import { OnboardingScreen } from './components/OnboardingScreen';

type AppState = 'briefing' | 'sprint' | 'review' | 'completed';
type ViewState = 'flow' | 'analytics';

function App() {
  // 處理 Quick Capture 小視窗模式
  const isQuickMode = new URLSearchParams(window.location.search).get('quick') === 'true';

  const [currentView, setCurrentView] = useState<ToolView>('scrumclock');
  const [currentState, setCurrentState] = useState<AppState>('briefing');
  const [isLoading, setIsLoading] = useState(true);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSkippedLogin, setIsSkippedLogin] = useState(false);

  useEffect(() => {
    // 檢查登入狀態
    auth.getCachedToken().then(token => {
      setIsAuthenticated(!!token);
      checkCurrentState();
    });
    
    // 註冊全域快捷鍵 Ctrl+Shift+K (或 Cmd+Shift+K)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsAISidebarOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const checkCurrentState = async () => {
    try {
      // 嘗試清空離線佇列
      offlineQueue.flush().catch(console.warn);

      const todayLog = await storage.getTodayLog();
      const userSettings = await storage.getUserSettings();
      
      // 檢查是否已完成今日規劃
      if (todayLog.coreBattles.length === 0) {
        setCurrentState('briefing');
      } else if (todayLog.review) {
        setCurrentState('completed');
      } else {
        // 檢查是否到了回顧時間
        const now = new Date();
        const reviewTime = new Date();
        const [hours, minutes] = userSettings.endOfDayReviewTime.split(':');
        reviewTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (now >= reviewTime) {
          setCurrentState('review');
        } else {
          setCurrentState('sprint');
        }
      }
    } catch (error) {
      console.error('檢查狀態失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBriefingComplete = () => {
    setCurrentState('sprint');
  };

  const handleSprintComplete = () => {
    setCurrentState('review');
  };

  const handleReviewComplete = () => {
    setCurrentState('completed');
  };

  if (isLoading || isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-base">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // 登入處理
  const handleLogin = async () => {
    const token = await auth.login();
    if (token) {
      setIsAuthenticated(true);
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    setIsAuthenticated(false);
    setIsSkippedLogin(false);
  };

  // 番茄鐘專屬的主畫面流
  const renderScrumclockFlow = () => {
    if (currentState === 'briefing') return <DailyMissionBriefing onComplete={handleBriefingComplete} />;
    if (currentState === 'sprint') return <SprintPomodoro onComplete={handleSprintComplete} />;
    if (currentState === 'review') return <EndOfDayReview onComplete={handleReviewComplete} />;
    if (currentState === 'completed') return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-dark-primary mb-4">今日循環已完成</h1>
          <p className="text-dark-secondary mb-8">恭喜你完成了今天的規劃、衝刺與回顧！</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
          >
            重新開始
          </button>
        </div>
      </div>
    );
  };

  if (isQuickMode) {
    return <QuickCapture />;
  }

  return (
    <CommandPalette onNavigate={(view) => setCurrentView(view as ToolView)}>
      <TimerProvider>
        <div className="flex flex-row h-screen w-screen overflow-hidden">
          <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
            <MainLayout 
              currentView={currentView} 
              onViewChange={setCurrentView}
              isAISidebarOpen={isAISidebarOpen}
              onToggleAISidebar={() => setIsAISidebarOpen(!isAISidebarOpen)}
              onLogout={isAuthenticated ? handleLogout : undefined}
            >
              {currentView === 'scrumclock' && renderScrumclockFlow()}
              {currentView === 'projects' && <ProjectManagementDemo />}
              {currentView === 'bookmarks' && <BookmarksHub />}
              {currentView === 'analytics' && <AnalyticsDashboard />}
              {currentView === 'gemini' && <GeminiManager />}
              {currentView === 'settings' && (
                <SettingsPanel 
                  onNavigateToDocs={() => setCurrentView('docs')} 
                  isAuthenticated={isAuthenticated}
                  onLogin={handleLogin}
                  onLogout={handleLogout}
                />
              )}
              {currentView === 'docs' && <InstallDocs />}
            </MainLayout>
          </div>
          <AISidebar isOpen={isAISidebarOpen} onClose={() => setIsAISidebarOpen(false)} />
        </div>
      </TimerProvider>
    </CommandPalette>
  );
}

export default App; 