// Google OAuth 模組

declare const chrome: any;

export interface AuthResult {
  token: string | null;
  error?: string;
}

export const auth = {
  // 取得授權 Token
  async login(): Promise<AuthResult> {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome?.identity) {
        const err = 'chrome.identity API 不可用（非 Chrome 擴充套件環境）';
        console.error('OAuth 登入失敗:', err);
        resolve({ token: null, error: err });
        return;
      }

      const manifest = chrome.runtime?.getManifest?.();
      const clientId = manifest?.oauth2?.client_id;
      if (!clientId || clientId.includes('YOUR_CLIENT_ID')) {
        const err = '未配置有效的 Google OAuth Client ID (manifest.json 中 client_id 仍為預設值)';
        console.warn('OAuth 登入提示:', err);
        resolve({ token: null, error: err });
        return;
      }

      chrome.identity.getAuthToken({ interactive: true }, (token: string | undefined) => {
        if (chrome.runtime.lastError) {
          const lastErr = chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError);
          console.error('OAuth 登入失敗 (chrome.runtime.lastError):', lastErr);
          resolve({ token: null, error: lastErr });
          return;
        }
        if (!token) {
          const err = '未取得 Token (使用者取消授權或視窗被封鎖)';
          console.warn('OAuth 登入失敗:', err);
          resolve({ token: null, error: err });
          return;
        }
        resolve({ token, error: undefined });
      });
    });
  },

  // 取得已快取的 Token (不強制登入)
  async getCachedToken(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token: string | undefined) => {
        if (chrome.runtime.lastError || !token) {
          resolve(null);
          return;
        }
        resolve(token);
      });
    });
  },

  // 登出並清除 Token
  async logout(): Promise<void> {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token: string | undefined) => {
        if (!chrome.runtime.lastError && token) {
          chrome.identity.removeCachedAuthToken({ token }, () => {
            console.log('已清除 cached auth token');
            // revocation request to google
            fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
              .then(() => resolve())
              .catch(() => resolve());
          });
        } else {
          resolve();
        }
      });
    });
  }
};
