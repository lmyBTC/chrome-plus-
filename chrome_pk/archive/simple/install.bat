@echo off
echo ========================================
echo 每日循環儀表板 Chrome 插件安裝腳本
echo ========================================
echo.

echo 正在檢查檔案...
if not exist "manifest.json" (
    echo 錯誤：找不到 manifest.json 檔案
    pause
    exit /b 1
)

if not exist "icon.svg" (
    echo 錯誤：找不到 icon.svg 檔案
    pause
    exit /b 1
)

if not exist "background.js" (
    echo 錯誤：找不到 background.js 檔案
    pause
    exit /b 1
)

if not exist "content.js" (
    echo 錯誤：找不到 content.js 檔案
    pause
    exit /b 1
)

if not exist "index.html" (
    echo 錯誤：找不到 index.html 檔案
    pause
    exit /b 1
)

if not exist "popup.html" (
    echo 錯誤：找不到 popup.html 檔案
    pause
    exit /b 1
)

if not exist "options.html" (
    echo 錯誤：找不到 options.html 檔案
    pause
    exit /b 1
)

echo 所有必要檔案都存在！
echo.

echo 安裝步驟：
echo 1. 開啟 Chrome 瀏覽器
echo 2. 在網址列輸入：chrome://extensions/
echo 3. 開啟右上角的「開發人員模式」
echo 4. 點擊「載入未封裝項目」
echo 5. 選擇此資料夾：%CD%
echo 6. 完成安裝！
echo.

echo 如果遇到圖示問題，請：
echo 1. 開啟 create_icons.html 檔案
echo 2. 生成並下載 PNG 圖示
echo 3. 將 PNG 檔案放在此資料夾中
echo 4. 重新載入插件
echo.

pause 