@echo off
echo 每日循環儀表板 - 安裝腳本
echo ================================

echo 正在安裝依賴套件...
npm install

if %errorlevel% neq 0 (
    echo 安裝依賴失敗，請檢查 Node.js 是否已安裝
    pause
    exit /b 1
)

echo 正在建置專案...
npm run build

if %errorlevel% neq 0 (
    echo 建置失敗，請檢查程式碼
    pause
    exit /b 1
)

echo.
echo 建置完成！請按照以下步驟安裝 Chrome 插件：
echo.
echo 1. 打開 Chrome 瀏覽器
echo 2. 在網址列輸入：chrome://extensions/
echo 3. 開啟右上角的「開發人員模式」
echo 4. 點擊「載入未封裝項目」
echo 5. 選擇此資料夾中的 dist 資料夾
echo.
echo 安裝完成後，新分頁將顯示每日循環儀表板
echo.

pause 