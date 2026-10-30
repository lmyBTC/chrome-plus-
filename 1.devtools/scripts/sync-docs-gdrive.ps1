<#
.SYNOPSIS
    將專案內所有的 Markdown (.md) 文件結構化單向鏡像同步至 Drive_Project_Docs
#>

param (
    [string]$TargetRoot = "C:\Users\G1\00.coding workspace\Drive_Project_Docs\Chrome_Plus"
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
Write-Host "Chrome Plus Docs Sync -> Drive_Project_Docs" -ForegroundColor Cyan
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
    "*.tmp*",
    ".tmp.driveupload*",
    "*.driveupload",
    ".DS_Store",
    "Thumbs.db",
    "Desktop.ini"
)

Write-Host "`nSyncing Markdown (.md) files..." -ForegroundColor Yellow

# 直接呼叫 robocopy
& robocopy $ProjectRoot $TargetRoot *.md /S /PURGE /XO /R:1 /W:1 /XD $ExcludeDirs /XF $ExcludeFiles /NDL /NJH /NJS /NP
$ExitCode = $LASTEXITCODE

if ($ExitCode -lt 8) {
    Write-Host "`nSync Completed Successfully! (Exit Code: $ExitCode)" -ForegroundColor Green
    $MdFiles = Get-ChildItem -Path $TargetRoot -Filter "*.md" -Recurse -File
    Write-Host "Total Markdown Files synced: $($MdFiles.Count)" -ForegroundColor Cyan
    Write-Host "Target Path: $TargetRoot" -ForegroundColor Gray
    Write-Host "Tip: You can now map/sync Drive_Project_Docs with Google Drive or load into NotebookLM." -ForegroundColor Green
} else {
    Write-Error "Sync encountered an error. Robocopy exit code: $ExitCode"
}

Write-Host "==================================================" -ForegroundColor Cyan