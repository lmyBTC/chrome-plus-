@echo off
chcp 65001 >nul
echo 正在執行 Chrome Plus 文檔同步至 Google Drive...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp01.devtools\scripts\sync-docs-gdrive.ps1"
pause

