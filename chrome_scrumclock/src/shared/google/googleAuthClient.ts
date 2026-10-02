import { GoogleAuthState } from './googleTypes';

class GoogleAuthClient {
  private static instance: GoogleAuthClient;
  private currentToken: string | null = null;
  private userEmail: string | null = null;

  private constructor() {}

  public static getInstance(): GoogleAuthClient {
    if (!GoogleAuthClient.instance) {
      GoogleAuthClient.instance = new GoogleAuthClient();
    }
    return GoogleAuthClient.instance;
  }

  /**
   * 取得 Google OAuth Access Token
   * @param interactive 是否彈出 Google 登入視窗 (預設 true)
   */
  public async getAuthToken(interactive = true): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.getAuthToken) {
        return reject(new Error('當前環境不支援 chrome.identity API (請確認權限宣告)'));
      }

      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError) {
          const err = chrome.runtime.lastError.message || '取得 Google 授權失敗';
          return reject(new Error(err));
        }

        if (!token) {
          return reject(new Error('未能取得有效的 Google Access Token'));
        }

        this.currentToken = token;
        resolve(token);
      });
    });
  }

  /**
   * 清除快取的 Access Token (例如 Token 失效或登出時使用)
   */
  public async removeCachedToken(): Promise<void> {
    const token = this.currentToken;
    if (!token) return;

    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.removeCachedAuthToken) {
        chrome.identity.removeCachedAuthToken({ token }, () => {
          this.currentToken = null;
          this.userEmail = null;
          resolve();
        });
      } else {
        this.currentToken = null;
        this.userEmail = null;
        resolve();
      }
    });
  }

  /**
   * 取得當前 Google 授權狀態
   */
  public async getAuthState(): Promise<GoogleAuthState> {
    try {
      const token = await this.getAuthToken(false);
      let email = this.userEmail;

      if (!email && token) {
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            email = data.email || undefined;
            this.userEmail = email;
          }
        } catch {
          // 忽略 userinfo 失敗
        }
      }

      return {
        isAuthenticated: true,
        token,
        userEmail: email || undefined,
        lastAuthTime: Date.now()
      };
    } catch (err: any) {
      return {
        isAuthenticated: false,
        error: err?.message || '尚未授權'
      };
    }
  }

  /**
   * 登出 Google 帳戶並撤銷本地 Token 快取
   */
  public async signOut(): Promise<void> {
    await this.removeCachedToken();
  }
}

export const googleAuthClient = GoogleAuthClient.getInstance();
