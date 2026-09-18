import { useEffect } from 'react';

/**
 * 右鍵選單擷取文字監聽 Hook
 */
export function useContextMenuSync(onPendingTextReceived: (pendingData: any) => void) {
  useEffect(() => {
    chrome.storage.local.get('pendingAnalyzeText', (result) => {
      if (result.pendingAnalyzeText) {
        onPendingTextReceived(result.pendingAnalyzeText);
      }
    });

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && changes.pendingAnalyzeText?.newValue) {
        onPendingTextReceived(changes.pendingAnalyzeText.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [onPendingTextReceived]);
}
