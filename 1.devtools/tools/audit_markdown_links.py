#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1.devtools/tools/audit_markdown_links.py
---------------------------------------
Markdown 連結、死鏈、脆弱路徑與錨點審計修復工具 (Audit Markdown Links)。

核心功能：
1. 檢測並統計三種 Markdown 連結問題：
   - Mode A (Mirror / Duplication): 鏡像連結或 file:/// 硬編碼，如 `[path](path)` 或 `[title](file:///path)`。
   - Mode B (Fragile Relative): 多層脆弱相對路徑，如 `../../.agents/rules.md`。
   - Mode C (Dead Link): 目標本地檔案不存在之死鏈。
   - Mode D (Anchor TOC): 錨點目錄與跨檔錨點標籤統計。
2. 支援安全修復 (--fix)：
   - 將鏡像重複路徑與脆弱相對路徑自動標準化為 Repo-Relative 純字串或行內代碼（如 `.agents/rules.md`）。
   - 保留外部 http/https/mailto 連結與 Markdown 圖片語法。
3. 支援安靜模式與機器可讀格式 (--quiet, --json)。

Usage:
  py 1.devtools/tools/audit_markdown_links.py
  py 1.devtools/tools/audit_markdown_links.py --quiet
  py 1.devtools/tools/audit_markdown_links.py --target GEMINI.md --fix
  py 1.devtools/tools/audit_markdown_links.py --fix
"""

import os
import sys
import re
import json
import io
import argparse
import urllib.parse
from pathlib import Path

# 強制標準輸出為 UTF-8，解決 Windows 控制台編碼問題
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
elif sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except Exception:
        pass

# 專案根目錄 (1.devtools/tools/.. -> 1.devtools/.. -> chrome-plus-)
REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# 正則表達式定義
# 排除圖片 (以 ! 開頭)
LINK_PATTERN = re.compile(r'(?<!\!)\[(`?)([^\]`]+)\1\]\(([^)]+)\)')
ANCHOR_PATTERN = re.compile(r'^\s*-\s+\[.*?\]\(#.*?\)')
PAGE_ANCHOR_IN_LINK = re.compile(r'#([^\s)]+)')

# 略過目錄
IGNORE_DIRS = {
    'archive', 'node_modules', '.git', 'dist', 'vendor',
    'tmp', 'used', 'scratch', '.pytest_cache', '.vscode', '.gemini'
}


def normalize_to_repo_path(file_path: Path, target_link: str) -> str:
    """將相對檔案路徑轉換為相對於 Repo 根目錄的標準路徑 (使用 forward slash)。"""
    clean_target = target_link.split('#')[0].strip()
    if not clean_target:
        return target_link

    # 處理 file:/// 協議 (可包含 URL 編碼如 %20)
    if clean_target.startswith('file:///'):
        unquoted = urllib.parse.unquote(clean_target[8:])
        # Windows 路徑處理: 移除開頭斜線 (如 /c:/... -> c:/...)
        if len(unquoted) > 3 and unquoted[0] == '/' and unquoted[2] == ':':
            unquoted = unquoted[1:]
        try:
            resolved = Path(unquoted).resolve()
            return resolved.relative_to(REPO_ROOT).as_posix()
        except Exception:
            return unquoted.replace('\\', '/')

    # 如果已經是相對於根目錄存在的檔案路徑
    if (REPO_ROOT / clean_target).exists():
        try:
            return (REPO_ROOT / clean_target).resolve().relative_to(REPO_ROOT).as_posix()
        except Exception:
            pass

    # 如果是絕對路徑或以斜線開頭
    if clean_target.startswith('/') or clean_target.startswith('\\'):
        rel = clean_target.lstrip('/\\')
        return rel.replace('\\', '/')

    # 相對於當前檔案所在目錄解析
    try:
        resolved = (file_path.parent / clean_target).resolve()
        repo_rel = resolved.relative_to(REPO_ROOT).as_posix()
        return repo_rel
    except Exception:
        return clean_target.replace('\\', '/')


def is_target_file_exists(file_path: Path, target_link: str) -> bool:
    """檢查本地鏈結目標檔案是否存在。"""
    clean_target = target_link.split('#')[0].strip()
    if not clean_target:
        return True

    # 處理 file:///
    if clean_target.startswith('file:///'):
        unquoted = urllib.parse.unquote(clean_target[8:])
        if len(unquoted) > 3 and unquoted[0] == '/' and unquoted[2] == ':':
            unquoted = unquoted[1:]
        p = Path(unquoted)
        return p.exists()

    # 嘗試相對於當前檔案路徑
    rel_to_file = (file_path.parent / clean_target).resolve()
    if rel_to_file.exists():
        return True

    # 嘗試相對於專案根目錄
    rel_to_root = (REPO_ROOT / clean_target).resolve()
    if rel_to_root.exists():
        return True

    return False


def audit_file(file_path: Path, fix: bool = False):
    """審計單一 Markdown 檔案，可選是否修復。"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return None

    lines = content.splitlines(keepends=True)
    redundant_items = []
    dead_items = []
    anchor_items = []
    modified_lines = []
    file_modified = False

    in_code_block = False
    for line_idx, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('```'):
            in_code_block = not in_code_block
            modified_lines.append(line)
            continue

        if in_code_block:
            modified_lines.append(line)
            continue

        def replace_link(match):
            nonlocal file_modified
            full_match = match.group(0)
            text = match.group(2).strip()
            link = match.group(3).strip()

            # 忽略行內程式碼段中的匹配 (例如 `[foo](bar)`)
            prefix = line[:match.start()]
            if prefix.count('`') % 2 == 1:
                return full_match

            # 外部網址 (http, https, mailto, ftp)
            if link.startswith(('http://', 'https://', 'mailto:', 'ftp://')):
                return full_match

            # 純錨點 (#...) - TOC 或頁內導航
            if link.startswith('#'):
                anchor_items.append({
                    "line": line_idx,
                    "match": full_match,
                    "text": text,
                    "anchor": link
                })
                return full_match

            # 解析標準根目錄相對路徑
            repo_link = normalize_to_repo_path(file_path, link)

            # 檢查死鏈 (Dead Link)
            if not is_target_file_exists(file_path, link):
                dead_items.append({
                    "line": line_idx,
                    "match": full_match,
                    "text": text,
                    "link": link,
                    "resolved": repo_link
                })

            # 判斷是否包含跨檔錨點 (file.md#anchor)
            has_cross_anchor = '#' in link and not link.startswith('#')
            if has_cross_anchor:
                anchor_items.append({
                    "line": line_idx,
                    "match": full_match,
                    "text": text,
                    "anchor": link,
                    "type": "cross_file_anchor"
                })

            # 判斷是否鏡像重複或脆弱相對路徑
            clean_text = text.replace('\\', '/').strip()
            is_mirror = (
                clean_text == link
                or clean_text == repo_link
                or link.endswith(clean_text)
                or clean_text.endswith(Path(link.split('#')[0]).name)
                or 'file:///' in link
            )
            is_fragile = '../' in link or '..\\' in link

            if is_mirror or is_fragile:
                redundant_items.append({
                    "line": line_idx,
                    "match": full_match,
                    "text": text,
                    "link": link,
                    "resolved": repo_link,
                    "type": "mirror" if is_mirror else "fragile"
                })
                if fix:
                    file_modified = True
                    target_name = Path(link.split('#')[0]).name
                    clean_name = Path(clean_text).name
                    is_pure_path_text = (
                        clean_text == link
                        or clean_text == repo_link
                        or clean_text == target_name
                        or clean_name == target_name
                        or clean_text.endswith(('.md', '.html', '.js', '.json', '.py', '.css', '.ts'))
                    )
                    if is_pure_path_text:
                        return f"`{repo_link}`"
                    else:
                        anchor_suffix = ''
                        if '#' in link:
                            anchor_suffix = '#' + link.split('#', 1)[1]
                        return f"[{text}]({repo_link}{anchor_suffix})"

            return full_match

        new_line = LINK_PATTERN.sub(replace_link, line)
        modified_lines.append(new_line)

    if fix and file_modified:
        with open(file_path, 'w', encoding='utf-8', newline='') as f:
            f.writelines(modified_lines)

    try:
        rel_path = file_path.relative_to(REPO_ROOT).as_posix()
    except Exception:
        rel_path = str(file_path).replace('\\', '/')

    return {
        "file": rel_path,
        "redundant_links": redundant_items,
        "dead_links": dead_items,
        "anchor_toc_count": len(anchor_items),
        "anchor_details": anchor_items,
        "fixed": file_modified if fix else False
    }


def scan_dir_md_files(base_dir: Path):
    """高效遞迴掃描目錄，主動跳過忽略目錄。"""
    md_list = []
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for f in files:
            if f.lower().endswith('.md'):
                md_list.append(Path(root) / f)
    return md_list


def collect_markdown_files(targets=None):
    """蒐集待掃描之 Markdown 檔案。"""
    files = []
    if targets:
        for t in targets:
            p = REPO_ROOT / t
            if p.is_file() and p.suffix.lower() == '.md':
                files.append(p)
            elif p.is_dir():
                files.extend(scan_dir_md_files(p))
        return sorted(list(set(files)), key=lambda x: str(x))

    # 預設掃描全專案活躍 Markdown 檔案
    # 1. 根目錄檔案
    for df in ['GEMINI.md', 'AGENTS.md', 'README.md']:
        p = REPO_ROOT / df
        if p.is_file():
            files.append(p)

    # 2. 遞迴全 Repo 掃描（自動跳過 IGNORE_DIRS）
    files.extend(scan_dir_md_files(REPO_ROOT))

    # 排序並去除重複項
    unique_files = sorted(list(set(files)), key=lambda x: str(x))
    return unique_files


def main():
    parser = argparse.ArgumentParser(description="Markdown 連結、死鏈與錨點審計修復工具")
    parser.add_argument("--scan", action="store_true", default=True, help="執行掃描 (預設)")
    parser.add_argument("--fix", action="store_true", help="自動修復鏡像與脆弱路徑")
    parser.add_argument("--target", nargs="*", help="指定目標檔案或目錄 (相對 Repo Root)")
    parser.add_argument("--quiet", action="store_true", help="靜態模式，僅回傳簡要統計")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式輸出")

    args = parser.parse_args()

    md_files = collect_markdown_files(args.target)
    total_files = len(md_files)
    total_redundant = 0
    total_dead = 0
    total_anchors = 0
    affected_files = 0
    fixed_files = 0

    results = []
    for f in md_files:
        res = audit_file(f, fix=args.fix)
        if not res:
            continue
        r_count = len(res["redundant_links"])
        d_count = len(res["dead_links"])
        a_count = res["anchor_toc_count"]
        if r_count > 0 or d_count > 0 or a_count > 0:
            affected_files += 1
            total_redundant += r_count
            total_dead += d_count
            total_anchors += a_count
            if res.get("fixed"):
                fixed_files += 1
            results.append(res)

    summary = {
        "total_files_scanned": total_files,
        "affected_files": affected_files,
        "total_redundant_links": total_redundant,
        "total_dead_links": total_dead,
        "total_anchor_tocs": total_anchors,
        "fixed_files": fixed_files if args.fix else 0,
        "status": "clean" if (total_redundant == 0 and total_dead == 0) else "needs_cleanup"
    }

    if args.json:
        output_data = {
            "summary": summary,
            "details": results if not args.quiet else []
        }
        print(json.dumps(output_data, ensure_ascii=False, indent=2))
        return 0

    if args.quiet:
        fix_str = f", fixed_files={fixed_files}" if args.fix else ""
        print(f'{{"status":"{summary["status"]}","files":{total_files},"affected":{affected_files},"redundant":{total_redundant},"dead":{total_dead},"anchors":{total_anchors}{fix_str}}}')
        return 0

    # 人類可讀輸出
    print("=" * 60)
    print("Chrome Plus - Markdown 連結與錨點審計報告")
    print("=" * 60)
    print(f"掃描檔案數: {total_files}")
    print(f"發現異常檔案數: {affected_files}")
    print(f"冗餘鏡像/脆弱路徑: {total_redundant}")
    print(f"死鏈數量 (Dead Links): {total_dead}")
    print(f"頁內錨點與目錄: {total_anchors}")
    if args.fix:
        print(f"已自動修復檔案數: {fixed_files}")
    print("-" * 60)

    for item in results[:15]:
        has_issue = len(item["redundant_links"]) > 0 or len(item["dead_links"]) > 0
        if not has_issue:
            continue
        print(f"\n[檔案] {item['file']}")
        for link in item["redundant_links"][:3]:
            print(f"  Line {link['line']} (冗餘): {link['match']} -> `{link['resolved']}` ({link['type']})")
        if len(item["redundant_links"]) > 3:
            print(f"  ... 另有 {len(item['redundant_links']) - 3} 個冗餘連結")
        for dead in item["dead_links"][:3]:
            print(f"  Line {dead['line']} [死鏈!]: {dead['match']} (路徑不存在)")
        if len(item["dead_links"]) > 3:
            print(f"  ... 另有 {len(item['dead_links']) - 3} 個死鏈")

    if len(results) > 15:
        print(f"\n... 以及其他 {len(results) - 15} 個檔案。")

    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
