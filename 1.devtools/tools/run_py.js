#!/usr/bin/env node
/**
 * 跨平台 Python 工具統一調度器 (Cross-Platform Python Runner)
 * 解決 Windows 環境下 Python 直譯器名稱歧義 (py vs python vs python3)
 * 以及 npm run script 跨平台參數轉發問題。
 */

const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("❌ 未指定要執行的 Python 腳本！\n用法: node 1.devtools/tools/run_py.js <script.py> [args...]");
  process.exit(1);
}

const scriptPath = args[0];
const scriptArgs = args.slice(1);

// 跨平台 Python 直譯器優先級偵測
const interpreters = process.platform === 'win32'
  ? ['py', 'python', 'python3']
  : ['python3', 'python', 'py'];

let executed = false;
let exitCode = 1;

for (const py of interpreters) {
  try {
    const res = spawnSync(py, [scriptPath, ...scriptArgs], { stdio: 'inherit' });
    if (!res.error && res.status !== 9009) { // 9009 是 Windows command not found
      executed = true;
      exitCode = res.status ?? 0;
      break;
    }
  } catch (err) {
    // 嘗試下一個直譯器
  }
}

if (!executed) {
  console.error(`❌ 未找到可用的 Python 直譯器 (已嘗試: ${interpreters.join(', ')})`);
  process.exit(1);
}

process.exit(exitCode);
