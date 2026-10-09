@echo off
chcp 65001 >nul
echo ========================================================
echo  啟動 Chrome Canary 並自動常駐掛載 5 款未封裝擴充功能
echo ========================================================

:: 取得專案根目錄絕對路徑
set "ROOT_DIR=%~dp0..\.."
pushd "%ROOT_DIR%"
set "PROJECT_ROOT=%CD%"
popd

:: 組合 5 款插件之絕對路徑（逗號分隔）
set "EXT_PATHS=%PROJECT_ROOT%\browser-activity-monitor,%PROJECT_ROOT%\chrome_gemini_nano,%PROJECT_ROOT%\finance-research-clipper-oss,%PROJECT_ROOT%\chrome_scrumclock\dist,%PROJECT_ROOT%\chrome_video speed plus"

:: Chrome Canary 預設安裝路徑
set "CANARY_EXE=%LOCALAPPDATA%\Google\Chrome SxS\Application\chrome.exe"

if not exist "%CANARY_EXE%" (
    echo [警告] 找不到 Chrome Canary 預設安裝路徑：%CANARY_EXE%
    echo 請確認是否已安裝 Chrome Canary，或手動修改本腳本中的 CANARY_EXE 變數。
    pause
    exit /b 1
)

echo 正在啟動 Chrome Canary...
echo 掛載插件清單：
echo 1. Browser Activity Monitor
echo 2. Chrome Plus - Gemini Nano
echo 3. Finance Research Clipper
echo 4. Power Kit (ScrumClock)
echo 5. YouTube Video Speed Plus
echo.

start "" "%CANARY_EXE%" --load-extension="%EXT_PATHS%"

echo 啟動完成！
timeout /t 3 >nul
