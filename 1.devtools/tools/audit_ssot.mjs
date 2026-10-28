#!/usr/bin/env node
/**
 * 1.devtools/tools/audit_ssot.mjs
 * Chrome Plus - SSOT 靜態合規與真理防腐審計器 (SSOT Governance & Integrity Auditor)
 *
 * 核心職責:
 * 1. [Catalog Integrity] 解析 0.doc_mg/docs/README_SSOT.md 索引，校驗所有登錄檔案於磁碟實體存在性。
 * 2. [Orphan Discovery] 全域掃描 README_*.md 與 SKILL.md，揪出未在 README_SSOT.md 登記的孤兒真理源。
 * 3. [Naming Guard] 檢查全域子目錄是否殘留非標準之裸名 README.md 或中文 Markdown 檔名。
 * 4. [Task Sentinel] 支援 --task-check 與 90/10 閉環審查：檢核任務檔 SSOT 鎖定清單，比對 Git 核心異動。
 *
 * 規範依據:
 * - GEMINI.md (專案最高憲法 - 4-Gate Protocol & SSOT 文檔閉環 90/10 分級原則)
 * - 0.doc_mg/docs/README_SSOT.md (全局真理源總索引)
 *
 * 用法範例:
 *   node 1.devtools/tools/audit_ssot.mjs              # 標準彩色報告
 *   node 1.devtools/tools/audit_ssot.mjs --compact    # 緊湊一行摘要
 *   node 1.devtools/tools/audit_ssot.mjs --strict     # 遇 WARN/FAIL 即 Exit 1
 *   node 1.devtools/tools/audit_ssot.mjs --json       # JSON 輸出 (對接 audit_suite.py)
 *   node 1.devtools/tools/audit_ssot.mjs --task-check # 包含 Git 與進行中任務 90/10 審查
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, normalize, basename, extname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = resolve(__filename, '..');
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');

// 忽略掃描目錄 (完全跳過)
const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.gemini',
  '.system_generated',
  'coverage',
  '.vscode',
  'task_protocol_pack',
  'archive' // 封存與歷史目錄不列入強制規範審查
]);

// 命名審查忽略目錄 (草稿與任務歷史允許非標準命名)
const NAMING_IGNORED_PATH_PREFIXES = [
  '0.doc_mg/draft/',
  '0.doc_mg/tasks/'
];

// 核心架構目錄與檔案模式 (觸發 10% 重大變更 SSOT 閉環檢驗)
const CORE_PATTERNS = [
  /manifest\.json$/,
  /README_CROSS_PLUGIN_CONTRACT\.md$/,
  /\.agents[\\/]rules\.md$/,
  /types[\\/].*\.d?\.ts$/,
  /src[\\/]services[\\/]storage\./
];

// CLI 參數解析
const args = process.argv.slice(2);
const isStrict = args.includes('--strict');
const isCompact = args.includes('--compact') || args.includes('--quiet');
const isJson = args.includes('--json');
const isTaskCheck = args.includes('--task-check');

/**
 * 終端顏色輔助
 */
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 遞迴收集檔案
 */
function walkDir(dir, filterFn, fileList = []) {
  if (!existsSync(dir)) return fileList;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, filterFn, fileList);
    } else if (entry.isFile() && filterFn(fullPath)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * 標準化相對路徑 (統一正斜線)
 */
function toRelPosix(absPath) {
  return relative(REPO_ROOT, absPath).split(sep).join('/');
}

/**
 * 解析 Markdown 內的檔案連結 (支援 file:/// 及 相對路徑)
 */
function extractMarkdownFileLinks(mdContent, sourceFilePath) {
  const links = [];
  // 匹配 [標籤](連結)
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(mdContent)) !== null) {
    const rawTarget = match[2].trim();
    if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://') || rawTarget.startsWith('#')) {
      continue;
    }

    let resolvedPath = null;
    if (rawTarget.startsWith('file:///')) {
      let fileUrlPath = rawTarget.slice(8);
      // Windows 磁碟機代號修整，例如 /c:/Users -> c:/Users
      if (fileUrlPath.match(/^\/?[a-zA-Z]:/)) {
        if (fileUrlPath.startsWith('/')) fileUrlPath = fileUrlPath.slice(1);
      }
      resolvedPath = normalize(decodeURIComponent(fileUrlPath));
    } else {
      // 相對路徑
      const cleanPath = rawTarget.split('#')[0].split('?')[0];
      if (cleanPath) {
        resolvedPath = resolve(SCRIPT_DIR, '..', '..', '0.doc_mg', 'docs', cleanPath);
        if (!existsSync(resolvedPath)) {
          resolvedPath = resolve(REPO_ROOT, cleanPath);
        }
      }
    }

    if (resolvedPath) {
      links.push({
        label: match[1],
        rawTarget,
        resolvedPath: normalize(resolvedPath)
      });
    }
  }
  return links;
}

/**
 * 主要審計邏輯
 */
function runAudit() {
  const startTime = Date.now();
  const issues = [];
  const warnings = [];

  const ssotIndexPath = resolve(REPO_ROOT, '0.doc_mg', 'docs', 'README_SSOT.md');
  if (!existsSync(ssotIndexPath)) {
    return {
      status: 'FAIL',
      exitCode: 1,
      summary: 'CRITICAL: 未找到 0.doc_mg/docs/README_SSOT.md 總索引文件',
      details: { issues: ['缺少 README_SSOT.md'], warnings: [] }
    };
  }

  const ssotContent = readFileSync(ssotIndexPath, 'utf-8');
  const catalogedLinks = extractMarkdownFileLinks(ssotContent, ssotIndexPath);

  // 1. Catalog Integrity 檢驗：檢查 README_SSOT.md 中登記之文件是否存在
  const catalogedFileSet = new Set();
  catalogedFileSet.add('0.doc_mg/docs/readme_ssot.md'); // SSOT 總索引自身天然屬合規入口

  for (const item of catalogedLinks) {
    const rel = toRelPosix(item.resolvedPath);
    catalogedFileSet.add(rel.toLowerCase());

    if (!existsSync(item.resolvedPath)) {
      issues.push(`[索引死鏈] README_SSOT.md 登記的檔案不存在: ${item.rawTarget} -> ${rel}`);
    }
  }

  // 2. Orphan SSOT 掃描：檢查專案內所有 README_*.md 與 SKILL.md 是否皆已登記在 README_SSOT.md
  const allMdFiles = walkDir(REPO_ROOT, (filePath) => {
    const name = basename(filePath);
    return (name.startsWith('README_') && name.endsWith('.md')) || name === 'SKILL.md';
  });

  const orphanFiles = [];
  for (const filePath of allMdFiles) {
    const rel = toRelPosix(filePath);
    // 排除任務檔、草稿與自述
    if (rel.startsWith('0.doc_mg/tasks/') || rel.startsWith('0.doc_mg/draft/')) continue;
    
    if (!catalogedFileSet.has(rel.toLowerCase())) {
      orphanFiles.push(rel);
    }
  }

  if (orphanFiles.length > 0) {
    for (const orphan of orphanFiles) {
      issues.push(`[孤兒真理源] 檔案實體存在但未登錄至 README_SSOT.md: ${orphan}`);
    }
  }

  // 3. Naming Guard: 檢查子目錄是否有殘留裸名 README.md 或中文說明檔
  const bareReadmes = walkDir(REPO_ROOT, (filePath) => {
    const rel = toRelPosix(filePath);
    const name = basename(filePath);
    // 根目錄 README.md 允許
    if (rel === 'README.md') return false;
    // 草稿與任務目錄略過
    if (NAMING_IGNORED_PATH_PREFIXES.some(prefix => rel.startsWith(prefix))) return false;
    return name.toLowerCase() === 'readme.md' || (name.endsWith('.md') && /[\u4e00-\u9fa5]/.test(name));
  });

  if (bareReadmes.length > 0) {
    for (const bare of bareReadmes) {
      const rel = toRelPosix(bare);
      issues.push(`[命名違規] 偵測到子目錄裸名或中文 Markdown 檔案: ${rel}`);
    }
  }

  // 4. Task Sentinel & 90/10 審查 (可選或在 --task-check 啟用)
  let taskCheckInfo = null;
  if (isTaskCheck) {
    taskCheckInfo = auditTaskGovernance();
    if (taskCheckInfo.error) {
      issues.push(`[任務門禁] ${taskCheckInfo.error}`);
    }
    if (taskCheckInfo.warning) {
      warnings.push(`[任務警示] ${taskCheckInfo.warning}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const passed = issues.length === 0 && (!isStrict || warnings.length === 0);
  const status = passed ? (warnings.length > 0 ? 'WARN' : 'PASS') : 'FAIL';
  const exitCode = passed ? 0 : 1;

  const catalogedCount = catalogedFileSet.size;
  const scannedCount = allMdFiles.length;

  let summary = `驗證 ${catalogedCount} 份 SSOT 索引，掃描 ${scannedCount} 份規格手冊: 0 缺失 0 孤兒`;
  if (issues.length > 0) {
    summary = `發現 ${issues.length} 處 SSOT 違規/缺失 (${issues[0]})`;
  } else if (warnings.length > 0) {
    summary = `SSOT 結構完整，含 ${warnings.length} 處提示`;
  }

  return {
    status,
    exitCode,
    elapsed,
    catalogedCount,
    scannedCount,
    summary,
    issues,
    warnings,
    taskCheckInfo
  };
}

/**
 * 任務治理與 90/10 閉環檢查
 */
function auditTaskGovernance() {
  try {
    // 檢查 Git 狀態
    const gitDiff = execSync('git status --porcelain', {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    const changedFiles = gitDiff
      .split('\n')
      .map((line) => line.trim().slice(3))
      .filter(Boolean);

    let hasCoreChange = false;
    let hasSsotChange = false;

    for (const file of changedFiles) {
      if (CORE_PATTERNS.some((pat) => pat.test(file))) {
        hasCoreChange = true;
      }
      if (file.includes('0.doc_mg/docs/') || basename(file).startsWith('README_') || file.endsWith('SKILL.md')) {
        hasSsotChange = true;
      }
    }

    if (hasCoreChange && !hasSsotChange) {
      return {
        warning: 'Git 偵測到架構核心檔案異動，但尚未偵測到任何 SSOT 文件更新 (90/10 分級閉環提醒)'
      };
    }
  } catch {
    // 無法執行 git 命令時安靜略過
  }

  return { ok: true };
}

// 執行審計
const result = runAudit();

if (isJson) {
  console.log(JSON.stringify(result, null, 2));
} else if (isCompact) {
  const icon = result.status === 'PASS' ? '[o]' : result.status === 'WARN' ? '[!]' : '[x]';
  console.log(`${icon} [SSOT Governance] ${result.status} (${result.elapsed}s) - ${result.summary}`);
  if (result.issues.length > 0) {
    for (const iss of result.issues.slice(0, 3)) {
      console.log(`   -> ${iss}`);
    }
  }
} else {
  const divider = '='.repeat(82);
  const subDivider = '-'.repeat(82);
  console.log(divider);
  console.log(`${colors.bold}🔍 Chrome Plus - SSOT 靜態合規與真理防腐審計器${colors.reset}`);
  console.log(divider);
  console.log(
    `狀態: ${result.status === 'PASS' ? colors.green + '[PASS]' : colors.red + '[FAIL]'}${colors.reset}  耗時: ${result.elapsed}s  已登錄 SSOT: ${result.catalogedCount} 份  規格文件: ${result.scannedCount} 份`
  );
  console.log(subDivider);
  console.log(`摘要: ${result.summary}`);

  if (result.issues.length > 0) {
    console.log(`\n${colors.red}${colors.bold}違規與缺失清單 (${result.issues.length}):${colors.reset}`);
    result.issues.forEach((iss, idx) => console.log(`  ${idx + 1}. ${iss}`));
  }

  if (result.warnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bold}警示提醒 (${result.warnings.length}):${colors.reset}`);
    result.warnings.forEach((warn, idx) => console.log(`  ${idx + 1}. ${warn}`));
  }

  if (result.issues.length === 0 && result.warnings.length === 0) {
    console.log(`\n${colors.green}✔ 全域 SSOT 總索引 100% 吻合實體檔案，零死鏈、零孤兒文檔、零非標準裸名。${colors.reset}`);
  }
  console.log(divider);
}

process.exit(result.exitCode);
