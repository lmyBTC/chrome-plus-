import { GoogleAuthState } from './googleTypes';

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email'
];

const AUTH_STORAGE_KEY = 'scrumclock_google_auth_state';

class GoogleAuthClient {
  private static instance: GoogleAuthClient;
  private currentToken: string | null = null;
  private userEmail: string | null = null;
  private expiresAt: number | null = null;
  private configuredClientId: string | null = null;
  private initializedPromise: Promise<void> | null = null;

  private constructor() {
    this.initStorageListener();
    this.ensureInitialized().catch(() => {});
  }

  public static getInstance(): GoogleAuthClient {
    if (!GoogleAuthClient.instance) {
      GoogleAuthClient.instance = new GoogleAuthClient();
    }
    return GoogleAuthClient.instance;
  }

  private initStorageListener(): void {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          if (changes.userSettings) {
            const oldId = changes.userSettings.oldValue?.googleClientId;
            const newId = changes.userSettings.newValue?.googleClientId;
            if (newId !== oldId) {
              this.configuredClientId = newId?.trim() || null;
              if (oldId && newId !== oldId) {
                this.removeCachedToken().catch(() => {});
              }
            }
          }
          if (changes[AUTH_STORAGE_KEY]) {
            const newState: GoogleAuthState | undefined = changes[AUTH_STORAGE_KEY].newValue;
            if (newState && newState.isAuthenticated && newState.token) {
              this.currentToken = newState.token;
              this.userEmail = newState.userEmail || null;
              this.expiresAt = newState.expiresAt || null;
            } else if (!newState) {
              this.currentToken = null;
              this.userEmail = null;
              this.expiresAt = null;
            }
          }
        }
      });
    }
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.initializedPromise) {
      this.initializedPromise = (async () => {
        await this.loadPersistedState();
        await this.resolveClientId();
      })();
    }
    return this.initializedPromise;
  }

  private async loadPersistedState(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }
    try {
      const res = await chrome.storage.local.get(AUTH_STORAGE_KEY);
      const state: GoogleAuthState = res[AUTH_STORAGE_KEY];
      if (state && state.isAuthenticated && state.token) {
        if (state.expiresAt && state.expiresAt - Date.now() > 60000) {
          this.currentToken = state.token;
          this.userEmail = state.userEmail || null;
          this.expiresAt = state.expiresAt;
        } else {
          await this.removeCachedToken();
        }
      }
    } catch {
      // 忽略讀取錯誤
    }
  }

  /**
   * 取得標準 Chrome OAuth2 Redirect URI
   * 格式為: https://<extension-id>.chromiumapp.org/
   */
  public getRedirectUri(): string {
    if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.getRedirectURL) {
      try {
        return chrome.identity.getRedirectURL();
      } catch {
        // fallback
      }
    }
    const extId = typeof chrome !== 'undefined' && chrome.runtime?.id ? chrome.runtime.id : 'your-extension-id';
    return `https://${extId}.chromiumapp.org/`;
  }

  /**
   * 解析並快取 Google OAuth2 Client ID
   */
  public async resolveClientId(): Promise<string | null> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const res = await chrome.storage.local.get('userSettings');
        const configuredId = res?.userSettings?.googleClientId?.trim();
        if (configuredId) {
          this.configuredClientId = configuredId;
          return configuredId;
        }
      } catch {
        // 忽略
      }
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
      const manifest = chrome.runtime.getManifest();
      const manifestClientId = manifest?.oauth2?.client_id?.trim();
      if (manifestClientId && !manifestClientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
        this.configuredClientId = manifestClientId;
        return manifestClientId;
      }
    }

    return null;
  }

  /**
   * 檢查當前擴充功能是否已配置有效的 Google OAuth Client ID
   */
  public isOAuthConfigured(): boolean {
    if (this.configuredClientId) {
      return true;
    }
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
      const manifest = chrome.runtime.getManifest();
      const clientId = manifest?.oauth2?.client_id;
      if (clientId && !clientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
        return true;
      }
    }
    return false;
  }

  public async isOAuthConfiguredAsync(): Promise<boolean> {
    const id = await this.resolveClientId();
    return !!id;
  }

  /**
   * 解析 launchWebAuthFlow 重新導向回傳的 URL，提取 access_token 與 expires_in
   */
  private parseAuthResponse(redirectUrl: string): { token: string; expiresIn: number } {
    try {
      const parsedUrl = new URL(redirectUrl);
      let hashString = parsedUrl.hash;
      if (hashString.startsWith('#')) {
        hashString = hashString.substring(1);
      }
      const hashParams = new URLSearchParams(hashString);
      const searchParams = parsedUrl.searchParams;

      const error = hashParams.get('error') || searchParams.get('error');
      const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');
      if (error) {
        if (/access_denied|consent_declined/i.test(error)) {
          throw new Error('使用者拒絕或取消授權');
        }
        throw new Error(`Google 授權失敗: ${errorDesc || error}`);
      }

      const token = hashParams.get('access_token');
      if (!token) {
        throw new Error('授權回應中未包含 access_token');
      }

      const expiresInRaw = hashParams.get('expires_in');
      const expiresIn = expiresInRaw ? parseInt(expiresInRaw, 10) : 3600;

      return { token, expiresIn: isNaN(expiresIn) ? 3600 : expiresIn };
    } catch (err: any) {
      throw new Error(`解析授權結果失敗: ${err?.message || err}`);
    }
  }

  /**
   * 透過 Google Userinfo API 取得登入者 Email
   */
  public async fetchUserEmail(token: string): Promise<string | null> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.email || null;
      }
    } catch {
      // 網路異常或權限不足時容錯
    }
    return null;
  }

  /**
   * 取得 Google OAuth Access Token
   * 優先採用 launchWebAuthFlow 流程，無縫相容動態 Client ID
   * @param interactive 是否彈出 Google 登入視窗 (預設 true)
   */
  public async getAuthToken(interactive = true): Promise<string> {
    await this.ensureInitialized();

    // 1. 若現有 Token 存在且有效 (至少還有 60 秒有效期)，直接返回快取
    if (this.currentToken && this.expiresAt && this.expiresAt - Date.now() > 60000) {
      return this.currentToken;
    }

    // 2. 獲取 Client ID
    const clientId = await this.resolveClientId();
    if (!clientId) {
      throw new Error(
        'Google OAuth2 Client ID 尚未設定。請至設定頁面輸入您的 Client ID，並確保在 GCP Console 已填入對應的重新導向網址。'
      );
    }

    if (typeof chrome === 'undefined' || !chrome.identity || !chrome.identity.launchWebAuthFlow) {
      throw new Error('當前環境不支援 chrome.identity.launchWebAuthFlow API (請確認 permissions 包含 "identity")');
    }

    const redirectUri = this.getRedirectUri();
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', DEFAULT_SCOPES.join(' '));
    if (interactive) {
      authUrl.searchParams.set('prompt', 'select_account consent');
    }

    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive
        },
        async (redirectResponseUrl) => {
          if (chrome.runtime.lastError) {
            const rawErr = chrome.runtime.lastError.message || '取得 Google 授權失敗';
            let userFriendlyMsg = rawErr;

            if (/user did not approve|canceled|cancelled|window closed/i.test(rawErr)) {
              userFriendlyMsg = 'Google 授權已取消：使用者關閉授權視窗或未允許權限。';
            } else if (/bad client id|OAuth2 client id is not configured|invalid_client/i.test(rawErr)) {
              userFriendlyMsg = 'Google OAuth2 Client ID 無效或不相符，請檢查設定與 GCP 憑證配置。';
            } else if (/redirect_uri_mismatch/i.test(rawErr)) {
              userFriendlyMsg = `重新導向網址不符！請在 GCP Console「已授權的重新導向 URI」填入：${redirectUri}`;
            } else if (/network|offline/i.test(rawErr)) {
              userFriendlyMsg = '網路連線異常，無法連線至 Google 授權伺服器。';
            }

            return reject(new Error(userFriendlyMsg));
          }

          if (!redirectResponseUrl) {
            return reject(new Error('未能取得有效的授權回應網址 (可能為靜默驗證未通過)'));
          }

          try {
            const { token, expiresIn } = this.parseAuthResponse(redirectResponseUrl);
            const expiresAt = Date.now() + expiresIn * 1000;

            this.currentToken = token;
            this.expiresAt = expiresAt;

            // 異步取得 userEmail
            const email = await this.fetchUserEmail(token);
            this.userEmail = email;

            // 持久化狀態
            const state: GoogleAuthState = {
              isAuthenticated: true,
              token,
              expiresAt,
              clientId,
              userEmail: email || undefined,
              lastAuthTime: Date.now()
            };

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: state });
            }

            resolve(token);
          } catch (err: any) {
            reject(err);
          }
        }
      );
    });
  }

  /**
   * 清除快取的 Access Token 與持久化狀態
   */
  public async removeCachedToken(): Promise<void> {
    const oldToken = this.currentToken;
    this.currentToken = null;
    this.userEmail = null;
    this.expiresAt = null;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.remove(AUTH_STORAGE_KEY);
      } catch {}
    }

    if (oldToken) {
      try {
        fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(oldToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).catch(() => {});
      } catch {}

      if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.removeCachedAuthToken) {
        chrome.identity.removeCachedAuthToken({ token: oldToken }, () => {});
      }
    }
  }

  /**
   * 取得當前 Google 授權狀態
   */
  public async getAuthState(): Promise<GoogleAuthState> {
    await this.ensureInitialized();

    if (this.currentToken && this.expiresAt && this.expiresAt - Date.now() > 60000) {
      if (!this.userEmail) {
        this.userEmail = await this.fetchUserEmail(this.currentToken);
      }
      return {
        isAuthenticated: true,
        token: this.currentToken,
        expiresAt: this.expiresAt,
        clientId: this.configuredClientId || undefined,
        userEmail: this.userEmail || undefined,
        lastAuthTime: Date.now()
      };
    }

    try {
      const token = await this.getAuthToken(false);
      return {
        isAuthenticated: true,
        token,
        expiresAt: this.expiresAt || undefined,
        clientId: this.configuredClientId || undefined,
        userEmail: this.userEmail || undefined,
        lastAuthTime: Date.now()
      };
    } catch (err: any) {
      return {
        isAuthenticated: false,
        clientId: this.configuredClientId || undefined,
        error: err?.message || '尚未授權或需要重新登入'
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
