#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
compact_log.py - 終端錯誤日誌脫水過濾器 (Token Saver)
截取 tsc、vite build、pytest、npm test 或建置輸出的日誌，
自動脫水過濾無意義的 node_modules 呼叫堆疊、瑣碎進度條與重覆警告，
僅保留關鍵致命錯誤行、檔案定位 (file:line:col) 與核心上下文。
Token 節省率達 75% ~ 95%，防止千行編譯雜訊打爆 AI 上下文視窗。
"""

import re
import sys
import argparse
from pathlib import Path
from typing import List

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent

# 致命錯誤特徵匹配
ERROR_PATTERNS = [
    re.compile(r'(?:error\s+TS\d+|TS\d+:)', re.IGNORECASE),
    re.compile(r'\[vite(?::[a-zA-Z0-9_\-]+)?\]', re.IGNORECASE),
    re.compile(r'✘\s*\[ERROR\]', re.IGNORECASE),
    re.compile(r'(?:SyntaxError|TypeError|ReferenceError|RangeError):', re.IGNORECASE),
    re.compile(r'(?:AssertionError|AttributeError|KeyError|IndexError|ValueError|ModuleNotFoundError):', re.IGNORECASE),
    re.compile(r'Traceback\s*\(most\s+recent\s+call\s+last\):', re.IGNORECASE),
    re.compile(r'(?:^|\s)(?:FAILED|FAIL)\s+'),
    re.compile(r'(?:Build\s+failed|Internal\s+server\s+error|Module\s+build\s+failed):', re.IGNORECASE),
    re.compile(r'^\s*Error:', re.IGNORECASE),
]

# 原始碼檔案定位特徵匹配 (file:line:col 或 file(line,col) 或 Python File "...", line X)
FILE_LOC_PATTERNS = [
    re.compile(r'([a-zA-Z0-9_\-\./\\]+\.(?:ts|tsx|js|jsx|py|json|html|css)):(\d+)(?::(\d+))?'),
    re.compile(r'File\s+"([^"]+\.(?:py|ts|js))",\s+line\s+(\d+)', re.IGNORECASE),
    re.compile(r'([a-zA-Z0-9_\-\./\\]+\.(?:ts|tsx|js|jsx))\s*\((\d+),(\d+)\)'),
]


def is_error_header(line: str) -> bool:
    return any(pattern.search(line) for pattern in ERROR_PATTERNS)


def is_file_location(line: str) -> bool:
    return any(pattern.search(line) for pattern in FILE_LOC_PATTERNS)


def compact_log_text(raw_log: str, max_errors: int = 5) -> str:
    lines = raw_log.splitlines()
    filtered_lines: List[str] = []
    error_count = 0

    capture_context = False
    context_countdown = 0

    for line in lines:
        stripped = line.strip()

        # 1. 嚴格過濾 node_modules 與虛擬環境雜訊堆疊
        if "node_modules" in line or ".venv" in line or "__pycache__" in line:
            # 即使包含錯誤，若是 node_modules 內部的遞迴報錯通常對業務修復無助，略過
            continue

        # 2. 過濾純空白或純裝飾性線條
        if re.match(r'^[=\-_*#]{5,}$', stripped):
            continue

        # 3. 檢查是否命中錯誤行或原始碼檔案定位行
        if is_error_header(line) or is_file_location(line):
            filtered_lines.append(line)
            capture_context = True
            context_countdown = 3  # 保留錯誤後續 3 行關鍵上下文（代碼指示行、指針箭頭等）
            error_count += 1
            if error_count >= max_errors * 3:
                filtered_lines.append(f"\n... [⚠️ 達到上限 {max_errors} 條錯誤，其餘雜訊已截斷以保護 Token] ...")
                break
        elif capture_context and context_countdown > 0:
            filtered_lines.append(line)
            context_countdown -= 1
        elif ("warning" in line.lower() or "warn" in line.lower()) and error_count < 2:
            # 僅在尚未捕捉到大量錯誤時，保留前 1~2 條警告
            filtered_lines.append(line)

    if not filtered_lines:
        # 若未命中任何常規報錯（可能建置成功或輸出格式特殊），截取前 20 行與最後 5 行
        if len(lines) <= 25:
            return raw_log.strip()
        head = "\n".join(lines[:15])
        tail = "\n".join(lines[-10:])
        return f"{head}\n\n... [中段省略] ...\n\n{tail}"

    return "\n".join(filtered_lines)


def main():
    parser = argparse.ArgumentParser(
        description="Terminal Log Compactor - 終端錯誤日誌脫水過濾器，節省 80%~95% Token",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="使用範例:\n  npm run build 2>&1 | python 1.devtools/tools/compact_log.py\n  python 1.devtools/tools/compact_log.py build.log"
    )
    parser.add_argument("file", nargs="?", type=str, help="可選：輸入日誌檔案路徑（未提供時從標準輸入管線讀取）")
    parser.add_argument("--max-errors", "-m", type=int, default=5, help="保留最大致命錯誤組數 (預設: 5)")
    parser.add_argument("--output", "-o", type=str, default=None, help="可選：脫水後日誌儲存路徑")
    args = parser.parse_args()

    raw_text = ""

    # 1. 讀取輸入源
    if args.file:
        log_path = Path(args.file)
        if not log_path.is_absolute():
            # 支援相對於根目錄或當前目錄
            if (REPO_ROOT / log_path).exists():
                log_path = REPO_ROOT / log_path
            else:
                log_path = Path.cwd() / log_path

        if not log_path.exists():
            print(f"❌ 日誌檔案不存在: {log_path}", file=sys.stderr)
            sys.exit(1)
        try:
            raw_text = log_path.read_text(encoding="utf-8", errors="ignore")
        except Exception as e:
            print(f"❌ 讀取日誌失敗: {e}", file=sys.stderr)
            sys.exit(1)
    elif not sys.stdin.isatty():
        # 從 pipe 讀取
        try:
            raw_text = sys.stdin.read()
        except Exception as e:
            print(f"❌ 讀取標準輸入失敗: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(0)

    if not raw_text.strip():
        print("/* ⚠️ 輸入日誌為空 */")
        sys.exit(0)

    compacted = compact_log_text(raw_text, max_errors=args.max_errors)
    orig_chars = len(raw_text)
    comp_chars = len(compacted)
    savings = (1 - (comp_chars / max(1, orig_chars))) * 100

    header = (
        f"/* 🧹 終端日誌已脫水: 原始 {orig_chars} 字元 ➔ 精簡 {comp_chars} 字元 "
        f"(減少 ~{savings:.1f}% 雜訊) */\n"
    )
    result = header + compacted

    if args.output:
        out_path = Path(args.output)
        if not out_path.is_absolute():
            out_path = REPO_ROOT / out_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(result, encoding="utf-8")
        print(f"✅ 脫水日誌已寫入: {out_path.as_posix()}")
    else:
        print(result)


if __name__ == "__main__":
    main()
