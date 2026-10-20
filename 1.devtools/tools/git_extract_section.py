#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1.devtools/tools/git_extract_section.py
---------------------------------------
Chrome Plus 專案之 Git 歷史章節抽取工具 (Git Section Extractor)。
跨 Git commit 歷史快速精準抽取指定檔案之特定章節/段落 (Markdown / HTML)，
杜絕長歷史探勘或重構比對時全檔 checkout 的 Token 消耗與干擾。

核心特色：
1. 零第三方依賴：純 Python 標準庫，結合本機 git CLI。
2. Windows / PowerShell 相容：自動處理 UTF-8 編碼與路徑正斜線轉換。
3. 語意邊界精準擷取：支援 Markdown 標題層級感知與 HTML section/heading 抽取。
4. 整合 Token 估算：即時計算抽取片段之 Token 消耗，並支援長度預警截斷與落盤 (--out)。
"""

import argparse
import io
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# 強制標準輸出為 UTF-8，解決 Windows 下控制台亂碼問題
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
elif sys.stdout.encoding != "utf-8":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    except Exception:
        pass

# 定位工具目錄與專案根目錄
TOOLS_DIR = Path(__file__).resolve().parent


def find_repo_root() -> Path:
    """動態尋找專案根目錄 (以 .git 或 GEMINI.md 為錨點)"""
    curr = TOOLS_DIR
    for _ in range(5):
        if (curr / ".git").exists() or (curr / "GEMINI.md").exists() or (curr / "0.doc_mg").exists():
            return curr
        curr = curr.parent
    return TOOLS_DIR.parent.parent


REPO_ROOT = find_repo_root()

if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

# 引入本專案 SSOT Token 估算器
try:
    from token_estimator import estimate_tokens
except ImportError:
    def estimate_tokens(text: str) -> int:
        cjk_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
        non_cjk_words = len(re.findall(r'[a-zA-Z0-9_\-]+', text))
        return int(cjk_chars * 1.5 + non_cjk_words * 1.3)


def _extract_markdown_section(
    file_path: Path,
    lines: List[str],
    target_heading: str,
    max_lines: Optional[int] = None
) -> Dict[str, Any]:
    """從 Markdown 內容行中擷取指定標題區塊，遇到同級或更高層級標題時停止"""
    found = False
    target_level = 0
    section_lines = []
    start_line = 0

    clean_target = target_heading.strip().lower()

    for idx, line in enumerate(lines, start=1):
        h_match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if h_match:
            current_level = len(h_match.group(1))
            current_title = h_match.group(2).strip()

            if not found:
                if clean_target in current_title.lower():
                    found = True
                    target_level = current_level
                    start_line = idx
                    section_lines.append(line)
            else:
                if current_level <= target_level:
                    break
                else:
                    section_lines.append(line)
        elif found:
            section_lines.append(line)

    if not found:
        return {"error": f"在 {file_path.name} 中找不到包含「{target_heading}」的標題"}

    total_section_lines = len(section_lines)
    is_truncated = False

    if max_lines and max_lines > 0 and total_section_lines > max_lines:
        is_truncated = True
        truncated_lines = section_lines[:max_lines]
        truncated_lines.append(
            f"\n... [⚠️ 預警截斷：本章節長度為 {total_section_lines} 行，已超過 {max_lines} 行安全上限。]"
        )
        content = "\n".join(truncated_lines).strip()
    else:
        content = "\n".join(section_lines).strip()

    try:
        rel_name = str(file_path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        rel_name = str(file_path).replace("\\", "/")

    return {
        "file": rel_name,
        "heading": target_heading,
        "start_line": start_line,
        "end_line": start_line + len(section_lines) - 1,
        "line_count": min(total_section_lines, max_lines) if (max_lines and max_lines > 0) else total_section_lines,
        "total_lines": total_section_lines,
        "truncated": is_truncated,
        "tokens": estimate_tokens(content),
        "content": content
    }


def _extract_html_section(
    file_path: Path,
    lines: List[str],
    target: str,
    max_lines: Optional[int] = None
) -> Dict[str, Any]:
    """精準截取 HTML 檔案章節或 Section 區塊"""
    clean_target = target.strip().lower()
    norm_target = re.sub(r'[\s\-_]+', '', clean_target)

    h_start_re = re.compile(r'<(h[1-6])\b([^>]*)>(.*)', re.IGNORECASE)
    h_single_re = re.compile(r'<(h[1-6])\b([^>]*)>(.*?)</\1>', re.IGNORECASE)
    sec_id_re = re.compile(r'<section\b[^>]*\bid=["\']([^"\']+)["\']', re.IGNORECASE)

    start_line = None
    target_tag = None
    target_level = None

    for idx, line in enumerate(lines, start=1):
        line_lower = line.lower()
        norm_line = re.sub(r'[\s\-_]+', '', line_lower)

        # 1. 檢測單行標題 <h1..6>
        m_single = h_single_re.search(line)
        if m_single:
            tag = m_single.group(1).lower()
            lvl = int(tag[1])
            if clean_target in line_lower or (norm_target and norm_target in norm_line):
                start_line = idx
                target_tag = tag
                target_level = lvl
                break

        # 2. 檢測多行標題開頭
        m_start = h_start_re.search(line)
        if m_start:
            tag = m_start.group(1).lower()
            lvl = int(tag[1])
            combined_header = line
            for lookahead in range(idx, min(idx + 5, len(lines))):
                combined_header += " " + lines[lookahead]
                if f"</{tag}>" in lines[lookahead].lower():
                    break
            comb_lower = combined_header.lower()
            comb_norm = re.sub(r'[\s\-_]+', '', comb_lower)
            if clean_target in comb_lower or (norm_target and norm_target in comb_norm):
                start_line = idx
                target_tag = tag
                target_level = lvl
                break

        # 3. 檢測 section id
        m_sec = sec_id_re.search(line)
        if m_sec:
            sec_id = m_sec.group(1)
            norm_sec = re.sub(r'[\s\-_]+', '', sec_id.lower())
            if clean_target in sec_id.lower() or (norm_target and norm_target in norm_sec):
                start_line = idx
                target_tag = "section"
                target_level = 2
                break

    if not start_line:
        return {"error": f"在 {file_path.name} 中找不到包含「{target}」的 HTML 區塊或標題"}

    # 尋找結束行
    section_lines = []

    for idx in range(start_line - 1, len(lines)):
        curr_line = lines[idx]
        line_num = idx + 1

        if line_num > start_line:
            if target_tag and target_tag.startswith("h"):
                m_h = re.search(r'<(h[1-6])\b', curr_line, re.IGNORECASE)
                if m_h:
                    curr_lvl = int(m_h.group(1)[1])
                    if target_level is not None and curr_lvl <= target_level:
                        break
                if target_level is not None and target_level <= 2 and re.search(r'<section\b[^>]*\bid=', curr_line, re.IGNORECASE):
                    break
            elif target_tag == "section":
                if re.search(r'</section>', curr_line, re.IGNORECASE):
                    section_lines.append(curr_line)
                    break
                elif re.search(r'<section\b[^>]*\bid=', curr_line, re.IGNORECASE):
                    break

        section_lines.append(curr_line)

    total_section_lines = len(section_lines)
    is_truncated = False
    if max_lines and max_lines > 0 and total_section_lines > max_lines:
        is_truncated = True
        truncated_lines = section_lines[:max_lines]
        truncated_lines.append(
            f"\n... [⚠️ 預警截斷：本 HTML 區塊長度為 {total_section_lines} 行，已超過 {max_lines} 行安全上限。]"
        )
        content = "\n".join(truncated_lines).strip()
    else:
        content = "\n".join(section_lines).strip()

    try:
        rel_name = str(file_path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        rel_name = str(file_path).replace("\\", "/")

    return {
        "file": rel_name,
        "heading": target,
        "start_line": start_line,
        "end_line": start_line + len(section_lines) - 1,
        "line_count": min(total_section_lines, max_lines) if (max_lines and max_lines > 0) else total_section_lines,
        "total_lines": total_section_lines,
        "truncated": is_truncated,
        "tokens": estimate_tokens(content),
        "content": content
    }


def get_file_content_from_git(commit: str, file_path_str: str) -> List[str]:
    """使用 git show <commit>:<file> 讀取歷史源代碼"""
    p = Path(file_path_str)
    if p.is_absolute():
        try:
            p = p.relative_to(REPO_ROOT)
        except ValueError:
            pass
    git_path = str(p).replace("\\", "/")

    cmd = ["git", "show", f"{commit}:{git_path}"]
    proc = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True)
    if proc.returncode != 0:
        err_msg = proc.stderr.decode("utf-8", errors="replace").strip()
        print(f"❌ 無法在 commit [{commit}] 找到檔案 {git_path}: {err_msg}", file=sys.stderr)
        sys.exit(1)

    raw_text = proc.stdout.decode("utf-8", errors="replace")
    return raw_text.splitlines()


def extract_git_section(
    commit: str,
    file_path_str: str,
    target: str,
    max_lines: Optional[int] = None
) -> Dict[str, Any]:
    """跨 Git commit 歷史提取指定檔案的章節"""
    lines = get_file_content_from_git(commit, file_path_str)
    p = Path(file_path_str)
    suffix = p.suffix.lower()

    if suffix in [".html", ".htm"]:
        res = _extract_html_section(p, lines, target, max_lines=max_lines)
    else:
        res = _extract_markdown_section(p, lines, target, max_lines=max_lines)

    return res


def main():
    parser = argparse.ArgumentParser(
        description="Git 歷史章節抽取工具：從指定 commit 的歷史版本中精準提取 HTML 或 Markdown 章節"
    )
    parser.add_argument("--commit", "-c", type=str, default="HEAD", help="Git commit hash、tag 或分支 (預設: HEAD)")
    parser.add_argument("--file", "-f", type=str, required=True, help="目標檔案路徑 (例如: GEMINI.md 或 0.doc_mg/tasks/task_xxx.md)")
    parser.add_argument("--heading", "-H", type=str, default=None, help="欲擷取的章節標題關鍵字")
    parser.add_argument("--id", "-I", dest="target_id", type=str, default=None, help="欲擷取的 HTML id 錨點 (例如 chapter-0)")
    parser.add_argument("--out", "-o", type=str, default=None, help="輸出檔案路徑 (例如 scratch/tmp/test_section.md)")
    parser.add_argument("--max-lines", "-m", type=int, default=None, help="最大擷取行數 (預設不限制，完整抽取)")
    parser.add_argument("--compact", action="store_true", help="緊湊輸出模式，省略邊界裝飾線")

    args = parser.parse_args()

    target = args.heading or args.target_id
    if not target:
        print("❌ 請提供 --heading 或 --id 參數指定欲擷取的章節或標題！", file=sys.stderr)
        sys.exit(1)

    effective_max_lines = args.max_lines if (args.max_lines and args.max_lines > 0) else None

    res = extract_git_section(
        commit=args.commit,
        file_path_str=args.file,
        target=target,
        max_lines=effective_max_lines
    )

    if "error" in res:
        print(f"❌ {res['error']}", file=sys.stderr)
        sys.exit(1)

    if args.out:
        out_p = Path(args.out)
        if not out_p.is_absolute():
            out_p = REPO_ROOT / out_p
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(res["content"], encoding="utf-8")
        print(
            f"✅ 成功從 commit [{args.commit}] 抽取章節「{target}」"
            f"（共 {res['line_count']} 行，約 ~{res['tokens']} tokens），"
            f"已儲存至: {out_p.as_posix()}"
        )
    else:
        trunc_tag = " (⚠️ 已超長截斷)" if res.get("truncated") else ""
        if args.compact:
            print(f"[{res['file']} | {args.commit} | L{res['start_line']}-L{res['end_line']} | ~{res['tokens']} tokens]")
            print(res["content"])
        else:
            out_str = (
                f"\n📖 [Git 歷史章節 | Commit: {args.commit}] {res['file']} "
                f"(起始於 L{res['start_line']} - L{res['end_line']}, 行數: {res['line_count']}{trunc_tag}, 僅約 ~{res['tokens']} tokens)\n"
                f"{'─' * 60}\n"
                f"{res['content']}\n"
                f"{'─' * 60}\n"
            )
            print(out_str)


if __name__ == "__main__":
    main()
