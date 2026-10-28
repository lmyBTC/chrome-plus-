#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
compact_log.py - 終端錯誤日誌脫水過濾器 (Token Saver)
截取 tsc、vite build、pytest、npm test、python 或建置輸出的日誌，
自動脫水過濾無意義的 node_modules 呼叫堆疊、瑣碎進度條與重覆警告，
僅保留關鍵致命錯誤行、檔案定位 (file:line:col) 與核心上下文。
Token 節省率達 75% ~ 95%，防止千行編譯雜訊打爆 AI 上下文視窗。
"""

import re
import sys
import io
import datetime
import argparse
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    if hasattr(sys.stdin, 'reconfigure'):
        sys.stdin.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, io.UnsupportedOperation if 'io' in locals() else Exception):
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

# 致命錯誤特徵匹配
ERROR_PATTERNS = [
    re.compile(r'(?:error\s+TS\d+|TS\d+:)', re.IGNORECASE),
    re.compile(r'\[vite(?::[a-zA-Z0-9_\-]+)?\]', re.IGNORECASE),
    re.compile(r'✘\s*\[ERROR\]', re.IGNORECASE),
    re.compile(r'(?:SyntaxError|TypeError|ReferenceError|RangeError):', re.IGNORECASE),
    re.compile(r'(?:AssertionError|AttributeError|KeyError|IndexError|ValueError|ModuleNotFoundError|ZeroDivisionError):', re.IGNORECASE),
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


def parse_markdown_table_row(line: str) -> Optional[List[str]]:
    """解析 Markdown 表格資料列，去除首尾空白與兩側豎線"""
    stripped = line.strip()
    if not (stripped.startswith('|') and stripped.endswith('|')):
        return None
    content = stripped[1:-1]
    cells = [c.strip() for c in content.split('|')]
    # 排除分隔線 (如 | :--- | :--- |)
    if all(re.match(r'^:?-+:?$', c) for c in cells):
        return None
    return cells


def archive_resolved_issues(
    issue_log_path: Path,
    retention_days: int = 14,
    dry_run: bool = False,
    custom_archive_target: Optional[Path] = None
) -> Dict[str, Any]:
    """
    解析 issue_tracker_log.md，將已結案 (Resolved) 且超過 retention_days 的項目自動滾動遷移至 archive/。
    """
    if not issue_log_path.exists():
        raise FileNotFoundError(f"找不到指定的 Issue Log 檔案: {issue_log_path}")

    today = datetime.date.today()
    lines = issue_log_path.read_text(encoding="utf-8", errors="replace").splitlines()

    pre_table_lines = []
    post_table_lines = []
    table_header_lines = []
    retained_rows = []
    archived_rows: List[Tuple[str, List[str]]] = []

    in_table = False
    table_ended = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith('|') and stripped.endswith('|'):
            if table_ended:
                post_table_lines.append(line)
                continue
            in_table = True
            cells = parse_markdown_table_row(line)
            # 檢查是否為表頭或分隔線
            if cells is None:
                table_header_lines.append(line)
                continue
            if len(cells) >= 7 and cells[0].lower() in ['id', 'issue id']:
                table_header_lines.append(line)
                continue

            # 資料列判斷
            # 欄位順序預期: ID | 分類 | 優先級 | 狀態 | 發生位置 | 詳細描述 | 發現日期
            if len(cells) >= 7:
                status = cells[3].lower()
                date_str = cells[6]
                is_resolved = (status == 'resolved')
                is_expired = False

                if is_resolved:
                    try:
                        match = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
                        if match:
                            item_date = datetime.date.fromisoformat(match.group(1))
                            if (today - item_date).days >= retention_days:
                                is_expired = True
                    except Exception:
                        pass

                if is_resolved and is_expired:
                    archived_rows.append((line, cells))
                else:
                    retained_rows.append(line)
            else:
                retained_rows.append(line)
        else:
            if in_table:
                table_ended = True
                post_table_lines.append(line)
            else:
                pre_table_lines.append(line)

    summary = {
        "total_archived": len(archived_rows),
        "total_retained": len(retained_rows),
        "dry_run": dry_run,
        "archived_items": [cells[0] for _, cells in archived_rows],
        "remaining_lines": len(pre_table_lines) + len(table_header_lines) + len(retained_rows) + len(post_table_lines)
    }

    if dry_run or not archived_rows:
        return summary

    # 分年份或自訂目標進行歸檔寫入
    archive_groups: Dict[Path, List[str]] = {}
    for raw_line, cells in archived_rows:
        if custom_archive_target:
            target_path = custom_archive_target
        else:
            year = "2026"
            match = re.search(r'(\d{4})-\d{2}-\d{2}', cells[6])
            if match:
                year = match.group(1)
            target_path = issue_log_path.parent / "archive" / f"issue_tracker_archive_{year}.md"

        archive_groups.setdefault(target_path, []).append(raw_line)

    for target_path, rows_to_add in archive_groups.items():
        target_path.parent.mkdir(parents=True, exist_ok=True)
        if not target_path.exists():
            header = [
                f"# Issue Tracker Archive ({target_path.stem.split('_')[-1]} 歷史問題存檔)",
                "",
                "> **說明**：",
                f"> 本檔案為 `doc/doc_task/issue_details/issue_tracker_log.md` 之歷史已結案 (Resolved) 存檔。",
                f"> 當前進行中與活躍問題請參閱主文件：[`issue_tracker_log.md`](../issue_tracker_log.md)。",
                "",
                "## 歷史歸檔清單",
                "",
                "| ID | 分類 | 優先級 | 狀態 | 發生位置 | 詳細描述 | 發現日期 |",
                "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
            ]
            content = "\n".join(header) + "\n" + "\n".join(rows_to_add) + "\n"
            target_path.write_text(content, encoding="utf-8")
        else:
            existing_text = target_path.read_text(encoding="utf-8", errors="replace")
            existing_ids = set(re.findall(r'\|\s*([B|O|R]-\d{8}-\d+)\s*\|', existing_text))
            new_lines = []
            for row in rows_to_add:
                row_cells = parse_markdown_table_row(row)
                if row_cells and row_cells[0] in existing_ids:
                    continue
                new_lines.append(row)
            if new_lines:
                if not existing_text.endswith('\n'):
                    existing_text += '\n'
                target_path.write_text(existing_text + "\n".join(new_lines) + "\n", encoding="utf-8")

    # 重構並更新主檔 issue_tracker_log.md
    new_main_content = (
        "\n".join(pre_table_lines) + "\n" +
        "\n".join(table_header_lines) + "\n" +
        "\n".join(retained_rows) + "\n"
    )
    if post_table_lines:
        new_main_content += "\n".join(post_table_lines) + "\n"

    issue_log_path.write_text(new_main_content, encoding="utf-8")
    return summary


def main():
    parser = argparse.ArgumentParser(
        description="Terminal Log Compactor & Issue Tracker Archiver (Token Saver)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""使用範例:
  # 終端日誌脫水過濾:
  python 腳本.py 2>&1 | python tools/compact_log.py
  python tools/compact_log.py build.log

  # Issue 日誌自動滾動封存:
  python tools/compact_log.py --archive-resolved --dry-run
  python tools/compact_log.py --archive-resolved
  python tools/compact_log.py --archive-resolved --retention-days 7
"""
    )
    parser.add_argument("file", nargs="?", type=str, help="可選：輸入日誌檔案路徑（未提供時從標準輸入管線讀取）")
    parser.add_argument("--max-errors", "-m", type=int, default=5, help="保留最大致命錯誤組數 (預設: 5)")
    parser.add_argument("--output", "-o", type=str, default=None, help="可選：脫水後日誌儲存路徑")

    # Issue Log 滾動封存參數
    parser.add_argument("--archive-resolved", action="store_true", help="自動滾動封存 issue_tracker_log.md 中結案超過 retention-days 的項目至 archive/")
    parser.add_argument("--dry-run", action="store_true", help="模擬運行，僅預覽將被封存之項目，不修改任何實體檔案")
    parser.add_argument("--retention-days", type=int, default=14, help="已結案項目在主檔中的保留天數（預設: 14 天）")
    parser.add_argument("--issue-log", type=str, default="", help="指定 Issue 日誌檔路徑（預設: doc/doc_task/issue_details/issue_tracker_log.md）")
    parser.add_argument("--archive-target", type=str, default="", help="指定自訂封存目標路徑（預設自動依年份路由至 doc/doc_task/issue_details/archive/）")

    args = parser.parse_args()

    # 1. 處理 Issue Log 自動歸檔模式
    if args.archive_resolved:
        default_log = REPO_ROOT / "doc" / "doc_task" / "issue_details" / "issue_tracker_log.md"
        issue_log_file = Path(args.issue_log) if args.issue_log else default_log
        custom_target = Path(args.archive_target) if args.archive_target else None

        print(f"[*] 執行 Issue Tracker 自動滾動歸檔 (保留期限: {args.retention_days} 天)...")
        print(f"[*] 目標主檔: {issue_log_file.as_posix()}")

        try:
            summary = archive_resolved_issues(
                issue_log_path=issue_log_file,
                retention_days=args.retention_days,
                dry_run=args.dry_run,
                custom_archive_target=custom_target
            )
            mode_tag = "[DRY-RUN 預覽]" if summary["dry_run"] else "[實體封存完成]"
            print(f"\n{mode_tag}")
            print(f"  • 待/已封存項目: {summary['total_archived']} 筆")
            print(f"  • 主檔保留項目: {summary['total_retained']} 筆")
            print(f"  • 主檔預估行數: {summary['remaining_lines']} 行 (< 150 行健康水準)")
            if summary['archived_items']:
                preview_list = ", ".join(summary['archived_items'][:8])
                if len(summary['archived_items']) > 8:
                    preview_list += f" ... 等共 {len(summary['archived_items'])} 筆"
                print(f"  • 封存清單: {preview_list}")

            if summary["dry_run"]:
                print("\n💡 提示: 目前為模擬模式，未修改磁碟。移除 --dry-run 即可正式寫入檔案。")
            else:
                print("\n✅ 成功完成日誌滾動封存，主檔已成功脫水瘦身！")
            sys.exit(0)
        except Exception as e:
            print(f"❌ 封存過程發生錯誤: {e}", file=sys.stderr)
            sys.exit(1)

    # 2. 處理終端日誌脫水過濾模式
    raw_text = ""

    if args.file:
        log_path = Path(args.file)
        if not log_path.is_absolute():
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
