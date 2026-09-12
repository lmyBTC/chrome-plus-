# Image Scraper 開發與除錯工具庫 (Dev Tools)

本資料夾存放開發與除錯 `image-scraper` 功能期間所使用的實驗性腳本、測試 API 請求與離線 HTML 樣本，供開發者除錯使用，不會被 Vite 打包至正式產物中。

## 檔案清單說明
- `test_ig.js`: Node.js 環境下的 Instagram 網址與 HTML 解析邏輯驗證腳本。
- `test_ig_video.js`: Instagram DASH 串流與官方 `browser_native_hd_url` MP4 影音提取探測腳本。
- `test_ig_api.js`: Instagram GraphQL / API 請求格式與回應探測腳本。
- `parse_ig.js`: Instagram 原始碼的正則過濾與圖片連結提取腳本。
- `parse_og.js`: Open Graph (og:image) 標籤提取與測試腳本。
- `scan_ig_scripts.js`: 掃描 Instagram 內嵌 `<script>` 標籤並擷取 JSON 結構的探測腳本。
- `scratch_ig.html`: Instagram 離線抓取之 DOM 樣本，用於離線除錯與解析器單元測試。
