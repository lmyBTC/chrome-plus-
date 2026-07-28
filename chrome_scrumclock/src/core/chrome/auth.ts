// Google OAuth 模組

declare const chrome: any;

export const auth = {
  // 取得授權 Token
  async login(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: true }, (token: string | undefined) => {
        if (chrome.runtime.lastError || !token) {
          console.error('OAuth 登入失敗:', chrome.runtime.lastError);
          resolve(null);
          return;
        }
        resolve(token);
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
