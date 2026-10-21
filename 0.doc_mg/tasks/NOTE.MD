上次實作了
| **運作機制** | 插件發送 HTTPS POST 呼叫個人專屬 GAS Web App，GAS 透過內建 Apps Script 服務操作 Sheets/Docs/Calendar/Drive | 插件使用 `chrome.identity.getAuthToken` 取得 OAuth Token，客戶端直接發起 REST API 呼叫 Google Workspace APIs |

為什麼我在pk+中沒有看到相關按鈕或介面功能

優化finance-research-clipper-oss的檔案結構以及資料夾結構 提升開發效率