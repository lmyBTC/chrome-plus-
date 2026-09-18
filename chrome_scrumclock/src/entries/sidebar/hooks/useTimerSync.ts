import { useState, useEffect } from 'react';

/**
 * 計時器狀態同步 Hook
 */
export function useTimerSync(onSprintReviewTrigger: (sprint: any) => void) {
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    chrome.storage.local.get('activeTimer', (result) => {
      if (result.activeTimer) {
        setActiveTimer(result.activeTimer);
      }
    });

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && changes.activeTimer) {
        setActiveTimer(changes.activeTimer.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let timerId: any = null;
    if (activeTimer && activeTimer.state === 'running' && activeTimer.endTime) {
      const updateTime = () => {
        const remaining = Math.max(0, activeTimer.endTime - Date.now());
        setTimeLeft(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(timerId);
          onSprintReviewTrigger(activeTimer.sprint);
        }
      };
      updateTime();
      timerId = setInterval(updateTime, 1000);
    } else if (activeTimer && activeTimer.state === 'paused') {
      setTimeLeft(Math.ceil((activeTimer.timeLeft || 0) / 1000));
    } else if (activeTimer && activeTimer.state === 'break' && activeTimer.endTime) {
      const updateTime = () => {
        const remaining = Math.max(0, activeTimer.endTime - Date.now());
        setTimeLeft(Math.ceil(remaining / 1000));
        if (remaining <= 0) {
          clearInterval(timerId);
        }
      };
      updateTime();
      timerId = setInterval(updateTime, 1000);
    } else {
      setTimeLeft(0);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [activeTimer]);

  return { activeTimer, timeLeft };
}
