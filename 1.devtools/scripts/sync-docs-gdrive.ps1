<#
.SYNOPSIS
    將專案內所有的程式碼與文件結構化單向鏡像同步至 Google Drive 鏡像目錄
#>

param (
    [string]$TargetRoot = "C:\Users\G1\00.coding workspace\Drive_Project_Docs\Chrome_Plus",
    [switch]$DocsOnly = $false
)

$CurrentPath = $PSScriptRoot
if (Test-Path (Join-Path $CurrentPath "GEMINI.md")) {
    $ProjectRoot = (Get-Item $CurrentPath).FullName
} elseif (Test-Path (Join-Path $CurrentPath "..\..\GEMINI.md")) {
    $ProjectRoot = (Get-Item "$CurrentPath\..\..").FullName
} else {
    $ProjectRoot = (Get-Location).Path
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Chrome Plus Code & Docs Sync -> Drive_Project_Docs" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Source: $ProjectRoot"
Write-Host "Target: $TargetRoot"

if (-not (Test-Path $TargetRoot)) {
    Write-Host "Creating target directory: $TargetRoot" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $TargetRoot -Force | Out-Null
}

$ExcludeDirs = @(
    ".git",
    "node_modules",
    "dist",
    "build",
    "out",
    "coverage",
    "scratch",
    ".pytest_cache",
    ".vscode",
    ".idea",
    "keys",
    ".system_generated",
    ".tmp.drive*",
    ".drive*",
    "__pycache__",
    ".turbo"
)

$ExcludeFiles = @(
    ".env",
    ".env.*",
    "*.map",
    "*.crx",
    "*.zip",
    "*.tmp*",
    "*.log",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".tmp.driveupload*",
    "*.driveupload",
    ".DS_Store",
    "Thumbs.db",
    "Desktop.ini"
)

if ($DocsOnly) {
    Write-Host "`nSyncing Markdown (.md) files..." -ForegroundColor Yellow
    $FileTypes = @("*.md")
} else {
    Write-Host "`nSyncing all source code and docs (.ts, .tsx, .js, .jsx, .py, .json, .md, .html, .css, .yaml, .sql)..." -ForegroundColor Yellow
    $FileTypes = @("*.ts", "*.tsx", "*.js", "*.jsx", "*.py", "*.json", "*.md", "*.html", "*.css", "*.yaml", "*.yml", "*.sql")
}

& robocopy $ProjectRoot $TargetRoot $FileTypes /S /PURGE /XO /R:1 /W:1 /XD $ExcludeDirs /XF $ExcludeFiles /NDL /NJH /NJS /NP
$ExitCode = $LASTEXITCODE

if ($ExitCode -lt 8) {
    Write-Host "`n[Success] Sync completed successfully! (Exit Code: $ExitCode)" -ForegroundColor Green
    $SyncedCount = (Get-ChildItem -Path $TargetRoot -Recurse -File).Count
    Write-Host "Total files in target directory: $SyncedCount" -ForegroundColor Cyan
    Write-Host "Target: $TargetRoot" -ForegroundColor Gray
    Write-Host "Tip: Point Google Drive to this target directory. NotebookLM and Gemini can read all files directly." -ForegroundColor Green
} else {
    Write-Error "Sync encountered an error. Robocopy exit code: $ExitCode"
}

Write-Host "==================================================" -ForegroundColor Cyan