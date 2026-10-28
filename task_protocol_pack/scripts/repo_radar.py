#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
repo_radar.py - Mason Yang Blog 極低 Token 專案情報雷達
專門為 AI Coding Assistant 與開發者設計的檢索 Skill。
提供五大核心指令：
  0. map:     輸出專案核心文檔與符號壓縮地圖（僅消耗 ~80 tokens）
  1. outline: 解析 Markdown 標題大綱與代碼綱要（僅消耗 ~50 tokens）
  2. section: 精準截取特定 Markdown 標題章節（僅消耗 ~150 tokens，內建 150 行超長防禦）
  3. symbol:  秒級定位 Class, Web Components, Function, Def 符號定義（優先查快取）
  4. search:  帶 Token 熔斷與智慧過濾的高信噪比關鍵字搜尋
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# 專案根目錄定位 (以本腳本位於 tools/ 為基準)
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
INDEX_FILE = REPO_ROOT / ".agents" / ".repo_index.json"
if not INDEX_FILE.exists() and (REPO_ROOT / ".repo_index.json").exists():
    INDEX_FILE = REPO_ROOT / ".repo_index.json"

# 嚴格過濾黑名單目錄與非核心檔案 (禁止暫存、外部工具、測試、封存與編譯垃圾)
IGNORE_DIRS = {
    "node_modules", "dist", "build", ".git", ".github", ".vite",
    "archive", "coverage", ".turbo", "__pycache__", ".venv",
    ".system_generated", "scratch", "graphify-out", ".pytest_cache",
    ".vscode", ".cursor", ".gemini", "github-tools", "draft", "doc_task",
    "tests", "issue_details", "vendor", "examples", "futu"
}
IGNORE_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".zip", ".tar", ".gz", ".lock", ".map", ".min.js", ".pyc"
}
IGNORE_FILES = {
    ".repo_index.json", "package-lock.json"
}

# 引用全域統一 Token 估算器 (SSOT)
try:
    from tools.token_estimator import estimate_tokens
except ModuleNotFoundError:
    _current_dir = os.path.dirname(os.path.abspath(__file__))
    _project_root = os.path.dirname(_current_dir)
    if _project_root not in sys.path:
        sys.path.insert(0, _project_root)
    if _current_dir not in sys.path:
        sys.path.insert(0, _current_dir)
    try:
        from tools.token_estimator import estimate_tokens
    except ModuleNotFoundError:
        from token_estimator import estimate_tokens

def load_cached_index() -> Optional[Dict[str, Any]]:
    """若存在 .repo_index.json，秒級載入快取避免磁碟掃描"""
    if INDEX_FILE.exists():
        try:
            return json.loads(INDEX_FILE.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None

# ==========================================
# 0. Map 模組：極小化的專案全貌地圖
# ==========================================
def get_project_map(show_all: bool = False) -> Dict[str, Any]:
    """回傳文檔目錄與高頻型別的壓縮地圖，讓 AI 只花 ~80 tokens 就知道該問哪裡"""
    index = load_cached_index()
    if not index:
        try:
            from generate_symbol_index import build_index
            build_index()
            index = load_cached_index() or {}
        except Exception:
            index = {}

    raw_docs = index.get("docs", {})
    docs_summary = {}

    # 核心導航清單關鍵字（預設展示高信噪比 SSOT 文檔）
    core_keywords = ["gemini.md", "rules.md", "readme.md", "agents.md", "doc/core/"]

    for doc, headings in raw_docs.items():
        doc_normalized = doc.lower().replace("\\", "/")
        if not show_all:
            is_core = any(
                doc_normalized.endswith(kw) or
                f"/{kw}" in doc_normalized or
                doc_normalized.startswith(kw)
                for kw in core_keywords
            )
            if not is_core:
                continue

        # 只保留 H1 / H2，節省 90% tokens
        filtered_headings = [h["title"] for h in headings if h.get("level", 1) <= 2]
        if filtered_headings:
            docs_summary[doc] = filtered_headings

    return {
        "core_docs": docs_summary,
        "total_symbols": len(index.get("symbols", {})),
        "total_docs_indexed": len(raw_docs),
        "show_all": show_all,
        "hint": "使用 `py tools/repo_radar.py symbol <name>` 或 `section <file> --heading <title>` 進行極低 Token 精確讀取"
    }

def print_project_map(result: Dict[str, Any]):
    title_suffix = " (全部文檔)" if result.get("show_all") else " (核心 SSOT，預估 ~80 tokens)"
    print(f"\n🗺️  [專案情報地圖]{title_suffix}")
    print("─" * 60)
    for doc, headings in result.get("core_docs", {}).items():
        print(f"📄 {doc}")
        for h in headings[:4]:  # 最多顯示 4 個核心章節
            print(f"   └─ {h}")
        if len(headings) > 4:
            print(f"   └─ ... (共 {len(headings)} 個核心章節)")
    print("─" * 60)
    print(f"📊 已快取符號: {result.get('total_symbols', 0)} 個 | 已索引文檔: {result.get('total_docs_indexed', 0)} 篇")
    if not result.get("show_all"):
        print("💡 提示：附加 `--all` 參數可列出全專案所有文檔。")
    print(f"💡 {result.get('hint')}\n")

# ==========================================
# 1. Outline 模組：結構大綱檢索 (Markdown & HTML)
# ==========================================
def _get_html_outline_headings(lines: List[str]) -> List[Dict[str, Any]]:
    """內部輔助：抽取 HTML 標題與 TOC 結構"""
    headings = []

    # 1. 解析 <title>
    for idx, line in enumerate(lines, start=1):
        m_title = re.search(r'<title>(.*?)</title>', line, re.IGNORECASE)
        if m_title:
            headings.append({
                "line": idx,
                "level": 1,
                "title": f"[Title] {m_title.group(1).strip()}",
                "indent": "",
                "id": ""
            })
            break

    # 2. 跨行/單行掃描 <h1~h6> 與 static-toc / section id
    in_tag = None
    tag_level = 0
    tag_start_line = 0
    tag_buffer = []
    tag_id = ""

    h_start_re = re.compile(r'<(h[1-6])\b([^>]*)>(.*)', re.IGNORECASE)
    h_end_re = re.compile(r'(.*?)</(h[1-6])>', re.IGNORECASE)
    h_single_re = re.compile(r'<(h[1-6])\b([^>]*)>(.*?)</\1>', re.IGNORECASE)
    toc_re = re.compile(r'<nav\b[^>]*class=["\'][^"\']*static-toc-container[^"\']*["\']|<ul\b[^>]*class=["\'][^"\']*static-toc[^"\']*["\']', re.IGNORECASE)
    sec_id_re = re.compile(r'<section\b[^>]*\bid=["\']([^"\']+)["\']', re.IGNORECASE)
    seen_toc = False

    for idx, line in enumerate(lines, start=1):
        # 檢測 static-toc 容器
        if not seen_toc and toc_re.search(line):
            seen_toc = True
            headings.append({
                "line": idx,
                "level": 2,
                "title": "[TOC] static-toc 導航區塊",
                "indent": "  ",
                "id": "static-toc"
            })

        # 檢測獨立 section id
        m_sec = sec_id_re.search(line)
        if m_sec:
            sec_id = m_sec.group(1)
            if any(k in sec_id for k in ["chapter", "section", "module", "analysis", "fallacies"]):
                headings.append({
                    "line": idx,
                    "level": 2,
                    "title": f"[Section] id=\"{sec_id}\"",
                    "indent": "  ",
                    "id": sec_id
                })

        # 標題解析
        if in_tag is None:
            m_single = h_single_re.search(line)
            if m_single:
                lvl = int(m_single.group(1)[1])
                attrs = m_single.group(2)
                raw_text = m_single.group(3)
                m_id = re.search(r'id=["\']([^"\']+)["\']', attrs)
                hid = m_id.group(1) if m_id else ""

                clean_txt = re.sub(r'<[^>]+>', ' ', raw_text)
                clean_txt = ' '.join(clean_txt.split()).strip()
                display_title = clean_txt if clean_txt else (f"id={hid}" if hid else "無標題")
                if hid and f"#{hid}" not in display_title and f"id={hid}" not in display_title:
                    display_title += f" (#{hid})"

                headings.append({
                    "line": idx,
                    "level": lvl,
                    "title": display_title,
                    "indent": "  " * (lvl - 1),
                    "id": hid
                })
            else:
                m_start = h_start_re.search(line)
                if m_start:
                    in_tag = m_start.group(1).lower()
                    tag_level = int(in_tag[1])
                    tag_start_line = idx
                    attrs = m_start.group(2)
                    m_id = re.search(r'id=["\']([^"\']+)["\']', attrs)
                    tag_id = m_id.group(1) if m_id else ""
                    tag_buffer = [m_start.group(3)]
        else:
            m_end = h_end_re.search(line)
            if m_end and m_end.group(2).lower() == in_tag:
                tag_buffer.append(m_end.group(1))
                full_raw = " ".join(tag_buffer)
                clean_txt = re.sub(r'<[^>]+>', ' ', full_raw)
                clean_txt = ' '.join(clean_txt.split()).strip()
                display_title = clean_txt if clean_txt else (f"id={tag_id}" if tag_id else "無標題")
                if tag_id and f"#{tag_id}" not in display_title and f"id={tag_id}" not in display_title:
                    display_title += f" (#{tag_id})"

                headings.append({
                    "line": tag_start_line,
                    "level": tag_level,
                    "title": display_title,
                    "indent": "  " * (tag_level - 1),
                    "id": tag_id
                })
                in_tag = None
                tag_buffer = []
                tag_id = ""
            else:
                tag_buffer.append(line)

    return headings


def get_file_outline(file_path: Path) -> Dict[str, Any]:
    """抽取檔案的所有標題大綱 (支援 Markdown 與 HTML)，附帶行號與預估 tokens"""
    if not file_path.exists():
        return {"error": f"檔案不存在: {file_path}"}

    lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    suffix = file_path.suffix.lower()

    if suffix in [".html", ".htm"]:
        headings = _get_html_outline_headings(lines)
    else:
        headings = []
        for idx, line in enumerate(lines, start=1):
            match = re.match(r'^(#{1,6})\s+(.+)$', line)
            if match:
                level = len(match.group(1))
                title = match.group(2).strip()
                headings.append({
                    "line": idx,
                    "level": level,
                    "title": title,
                    "indent": "  " * (level - 1)
                })

    try:
        rel_name = str(file_path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        rel_name = str(file_path)

    total_tokens = estimate_tokens("\n".join(lines))
    return {
        "file": rel_name,
        "total_lines": len(lines),
        "total_estimated_tokens": total_tokens,
        "headings": headings
    }

get_markdown_outline = get_file_outline


def format_outline_text(result: Dict[str, Any]) -> str:
    if "error" in result:
        return f"❌ {result['error']}\n"

    lines = [
        f"\n📑 [檔案大綱] {result['file']} (總行數: {result['total_lines']}, 全文預估: ~{result['total_estimated_tokens']} tokens)",
        "─" * 60
    ]
    for h in result["headings"]:
        prefix = "#" * h['level']
        lines.append(f"L{h['line']:<4} | {h['indent']}{prefix} {h['title']}")
    lines.append("─" * 60)
    lines.append("💡 提示：使用 `py tools/repo_radar.py section <file> --heading \"<標題名稱>\"` 僅讀取單一章節，節省 90% 以上 Token！\n")
    return "\n".join(lines)


def print_outline(result: Dict[str, Any], save_path: Optional[str] = None):
    output_text = format_outline_text(result)
    if save_path:
        p = Path(save_path)
        if not p.is_absolute():
            p = REPO_ROOT / p
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(output_text, encoding="utf-8")
        print(f"✅ 大綱已儲存至: {p.as_posix()}")
    else:
        print(output_text)


# ==========================================
# 2. Section 模組：精準章節抽吸 (含 150 行超長防禦機制)
# ==========================================
def _extract_html_section(file_path: Path, lines: List[str], target: str, max_lines: int) -> Dict[str, Any]:
    """內部輔助：精準截取 HTML 檔案章節"""
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

        # 1. 檢測單行標題
        m_single = h_single_re.search(line)
        if m_single:
            tag = m_single.group(1).lower()
            lvl = int(tag[1])
            if clean_target in line_lower or (norm_target and norm_target in norm_line):
                start_line = idx
                target_tag = tag
                target_level = lvl
                break

        # 2. 檢測多行標題起始
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
        return {"error": f"在 {file_path.name} 中找不到包含「{target}」的 HTML 區塊"}

    # 尋找結束行
    end_line = len(lines)
    section_lines = []

    for idx in range(start_line - 1, len(lines)):
        curr_line = lines[idx]
        line_num = idx + 1

        if line_num > start_line:
            if target_tag.startswith("h"):
                m_h = re.search(r'<(h[1-6])\b', curr_line, re.IGNORECASE)
                if m_h:
                    curr_lvl = int(m_h.group(1)[1])
                    if curr_lvl <= target_level:
                        end_line = line_num - 1
                        break
                if target_level <= 2 and re.search(r'<section\b[^>]*\bid=', curr_line, re.IGNORECASE):
                    end_line = line_num - 1
                    break
            elif target_tag == "section":
                if re.search(r'</section>', curr_line, re.IGNORECASE):
                    section_lines.append(curr_line)
                    end_line = line_num
                    break
                elif re.search(r'<section\b[^>]*\bid=', curr_line, re.IGNORECASE):
                    end_line = line_num - 1
                    break

        section_lines.append(curr_line)

    total_section_lines = len(section_lines)
    is_truncated = False
    if max_lines and max_lines > 0 and total_section_lines > max_lines:
        is_truncated = True
        truncated_lines = section_lines[:max_lines]
        truncated_lines.append(
            f"\n... [⚠️ 預警截斷：本章節長度為 {total_section_lines} 行，已超過 {max_lines} 行安全上限。為防止 Token 爆衝已自動截斷。"
            f" 建議改用 `py tools/repo_radar.py outline {file_path.name}` 縮小檢索範圍或指定更精確的子標題]"
        )
        content = "\n".join(truncated_lines).strip()
    else:
        content = "\n".join(section_lines).strip()

    try:
        rel_name = str(file_path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        rel_name = str(file_path)

    return {
        "file": rel_name,
        "heading": target,
        "start_line": start_line,
        "end_line": end_line,
        "line_count": min(total_section_lines, max_lines) if (max_lines and max_lines > 0) else total_section_lines,
        "total_lines": total_section_lines,
        "truncated": is_truncated,
        "tokens": estimate_tokens(content),
        "content": content
    }


def locate_query_in_file(
    file_path: Path,
    query_str: str,
    context_lines: int = 5,
    max_matches: int = 10,
    target_heading: Optional[str] = None
) -> Dict[str, Any]:
    """在 Markdown 或 HTML 檔案中精確定位文字，回溯所屬章節並輸出前後上下文片段"""
    if not file_path.exists():
        return {"error": f"檔案不存在: {file_path}"}

    lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    clean_query = query_str.strip().lower()
    if not clean_query:
        return {"error": "查詢字串不可為空"}

    # 取得結構大綱以便回溯所屬章節
    outline = get_file_outline(file_path)
    headings = outline.get("headings", [])

    matched_lines = []
    for idx, line in enumerate(lines, start=1):
        if clean_query in line.lower():
            matched_lines.append(idx)

    if not matched_lines:
        return {"error": f"在 {file_path.name} 中找不到包含「{query_str}」的文字內容"}

    total_matches = len(matched_lines)
    disp_matches = min(total_matches, max_matches)
    matches = []

    chunks = []
    for m_idx, m_line in enumerate(matched_lines[:disp_matches], start=1):
        # 回溯最近章節標題
        nearest_heading = None
        for h in headings:
            if h.get("line", 0) <= m_line:
                nearest_heading = h
            else:
                break

        h_title = nearest_heading["title"] if nearest_heading else "(文件開頭)"
        h_line = nearest_heading.get("line", 1) if nearest_heading else 1
        h_id = nearest_heading.get("id", "") if nearest_heading else ""

        ctx_start = max(1, m_line - context_lines)
        ctx_end = min(len(lines), m_line + context_lines)

        snippet_lines = []
        for l_no in range(ctx_start, ctx_end + 1):
            l_text = lines[l_no - 1]
            marker = ">>" if l_no == m_line else "  "
            snippet_lines.append(f"{marker} {l_no:5d} | {l_text}")

        snippet = "\n".join(snippet_lines)
        id_info = f" [#{h_id}]" if h_id else ""
        heading_desc = f" (所屬章節 L{h_line}: {h_title}{id_info})" if nearest_heading else ""
        chunks.append(
            f"[{m_idx}/{disp_matches}] 📍 L{m_line}{heading_desc}\n"
            f"{'─' * 60}\n"
            f"{snippet}\n"
        )

        matches.append({
            "line": m_line,
            "heading": h_title,
            "heading_line": h_line,
            "heading_id": h_id,
            "context_range": [ctx_start, ctx_end],
            "snippet": snippet
        })

    if total_matches > disp_matches:
        chunks.append(f"⚠️ 尚有 {total_matches - disp_matches} 處匹配未顯示，建議附加更精確的關鍵字縮小範圍。")

    formatted_content = "\n".join(chunks)

    try:
        rel_name = str(file_path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        rel_name = str(file_path)

    return {
        "mode": "query",
        "file": rel_name,
        "query": query_str,
        "total_matches": total_matches,
        "displayed_matches": disp_matches,
        "matches": matches,
        "content": formatted_content,
        "tokens": estimate_tokens(formatted_content)
    }


def extract_section(
    file_path: Path,
    target_heading: Optional[str] = None,
    max_lines: int = 150,
    query: Optional[str] = None,
    context_lines: int = 5
) -> Dict[str, Any]:
    """從 Markdown 或 HTML 檔案中僅擷取指定標題下的內容，或根據 query 精確定位字串與所屬章節上下文 (內建 150 行超長防護)"""
    if not file_path.exists():
        return {"error": f"檔案不存在: {file_path}"}

    if query:
        return locate_query_in_file(
            file_path,
            query,
            context_lines=context_lines,
            target_heading=target_heading
        )

    if not target_heading:
        return {"error": "請提供欲截取的標題關鍵字或章節名稱"}

    lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    suffix = file_path.suffix.lower()

    if suffix in [".html", ".htm"]:
        return _extract_html_section(file_path, lines, target_heading, max_lines)

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
            f"\n... [⚠️ 預警截斷：本章節長度為 {total_section_lines} 行，已超過 {max_lines} 行安全上限。為防止 Token 爆衝已自動截斷。"
            f" 建議改用 `py tools/repo_radar.py outline {file_path.name}` 縮小檢索範圍或指定更精確的子標題]"
        )
        content = "\n".join(truncated_lines).strip()
    else:
        content = "\n".join(section_lines).strip()

    try:
        rel_name = str(file_path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        rel_name = str(file_path)

    return {
        "file": rel_name,
        "heading": target_heading,
        "start_line": start_line,
        "line_count": min(total_section_lines, max_lines) if (max_lines and max_lines > 0) else total_section_lines,
        "total_lines": total_section_lines,
        "truncated": is_truncated,
        "tokens": estimate_tokens(content),
        "content": content
    }

# ==========================================
# 3. Symbol 模組：代碼符號快速定位
# ==========================================
def find_symbol(symbol_name: str, scope_dir: Optional[Path] = None) -> List[Dict[str, Any]]:
    """在專案源代碼中快速定位 class, Web Components, function, def 符號定義 (優先查快取)"""
    index = load_cached_index()
    results = []

    # 1. 優先秒查 .repo_index.json
    if index and "symbols" in index and symbol_name in index["symbols"]:
        entry = index["symbols"][symbol_name]
        target_fp = REPO_ROOT / entry["file"]
        if target_fp.exists():
            try:
                lines = target_fp.read_text(encoding="utf-8", errors="ignore").splitlines()
                idx = entry["line"] - 1
                snippet = "\n".join(lines[idx:idx + 18])
                return [{
                    "file": entry["file"],
                    "line": entry["line"],
                    "kind": entry.get("kind", "symbol"),
                    "declaration": lines[idx].strip() if idx < len(lines) else "",
                    "snippet": snippet,
                    "tokens": estimate_tokens(snippet)
                }]
            except Exception:
                pass

    # 2. 快取未中時回退到磁碟走訪
    search_root = scope_dir if scope_dir else REPO_ROOT
    pattern = re.compile(
        rf'^\s*(?:export\s+)?(?:default\s+)?(?:class|function|async\s+function|const|def)\s+({re.escape(symbol_name)})\b'
    )
    wc_pattern = re.compile(
        rf"customElements\.define\(\s*['\"]({re.escape(symbol_name)})['\"]"
    )

    for root, dirs, files in os.walk(search_root):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in {".js", ".mjs", ".py"}:
                file_p = Path(root) / file
                try:
                    lines = file_p.read_text(encoding="utf-8", errors="ignore").splitlines()
                except Exception:
                    continue

                for idx, line in enumerate(lines):
                    if pattern.search(line) or wc_pattern.search(line):
                        snippet = "\n".join(lines[idx:idx + 18])
                        try:
                            rel_p = str(file_p.relative_to(REPO_ROOT)).replace("\\", "/")
                        except ValueError:
                            rel_p = str(file_p)
                        results.append({
                            "file": rel_p,
                            "line": idx + 1,
                            "declaration": line.strip(),
                            "snippet": snippet,
                            "tokens": estimate_tokens(snippet)
                        })

    return results

# ==========================================
# 4. Search 模組：帶 Token 預算限制的高信噪比搜尋
# ==========================================
def smart_search(keyword: str, max_results: int = 5, max_chars: int = 1500) -> List[Dict[str, Any]]:
    """在專案有效源代碼與文檔中搜尋關鍵字，強制限制輸出字數防爆 Token"""
    results = []
    clean_kw = keyword.strip()
    total_chars = 0

    valid_exts = {".js", ".mjs", ".py", ".md", ".json", ".html", ".css"}

    for root, dirs, files in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
            if file in IGNORE_FILES:
                continue
            ext = os.path.splitext(file)[1].lower()
            if ext in valid_exts and ext not in IGNORE_EXTS:
                file_p = Path(root) / file
                try:
                    content = file_p.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue

                if clean_kw.lower() in content.lower():
                    lines = content.splitlines()
                    for idx, line in enumerate(lines):
                        if clean_kw.lower() in line.lower():
                            start = max(0, idx - 2)
                            end = min(len(lines), idx + 3)
                            ctx = "\n".join(lines[start:end])

                            try:
                                rel_p = str(file_p.relative_to(REPO_ROOT)).replace("\\", "/")
                            except ValueError:
                                rel_p = str(file_p)

                            results.append({
                                "file": rel_p,
                                "line": idx + 1,
                                "match_line": line.strip(),
                                "context": ctx,
                                "tokens": estimate_tokens(ctx)
                            })

                            total_chars += len(ctx)
                            if len(results) >= max_results or total_chars >= max_chars:
                                return results

    return results

# ==========================================
# CLI 入口介面
# ==========================================
def main():
    parser = argparse.ArgumentParser(
        description="Repo Radar - Mason Yang Blog 極低 Token 專案精準情報檢索工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
範例指令:
  0. 查看專案核心情報地圖 (僅消耗 ~80 tokens):
     py tools/repo_radar.py map

  1. 查看文檔大綱 (不消耗內文 tokens):
     py tools/repo_radar.py outline doc/core/tech-core-standards.md

  2. 精準讀取某章節 (取代讀取整份檔案，內建 150 行超長防衛):
     py tools/repo_radar.py section doc/core/tech-core-standards.md --heading "Shadow DOM"

  3. 瞬間定位介面/符號定義 (0ms 快取命中):
     py tools/repo_radar.py symbol ArticleRepository

  4. 帶 Token 預算限制搜尋關鍵字:
     py tools/repo_radar.py search "ArticleRepository" --limit 3

  5. 精準定位單一檔案內關鍵字/符號所在行號與周邊上下文 (支援任何源碼與文檔):
     py tools/repo_radar.py locate apps/cot-studio/cot-studio.js "buildPrompt"
        """
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # map
    p_map = subparsers.add_parser("map", help="輸出專案核心情報壓縮地圖 (~80 tokens)")
    p_map.add_argument("--all", "-A", action="store_true", help="列出全專案所有文檔（而非僅核心 SSOT）")

    # outline
    p_outline = subparsers.add_parser("outline", help="抽取檔案標題大綱 (支援 Markdown 與 HTML)")
    p_outline.add_argument("file", type=str, help="目標 Markdown 或 HTML 檔案路徑")
    p_outline.add_argument("--save", "-S", type=str, default=None, help="將大綱輸出保存至指定檔案 (UTF-8)")

    # section
    p_section = subparsers.add_parser("section", help="精準截取 Markdown 或 HTML 某章節或字串錨定 (內建 150 行防護)")
    p_section.add_argument("file", type=str, help="目標 Markdown 或 HTML 檔案路徑")
    p_section.add_argument("--heading", "-H", required=False, default=None, type=str, help="欲擷取的標題關鍵字或章節名稱")
    p_section.add_argument("--selector", "-S_ID", required=False, default=None, type=str, help="欲擷取的 HTML id 錨點 (例如 chapter-1)")
    p_section.add_argument("--query", "-Q", required=False, default=None, type=str, help="欲在單檔中精準定位的內文字串，輸出匹配行、前後上下文與所屬章節")
    p_section.add_argument("--context", "-C", type=int, default=5, help="查詢字串時前後顯示的上下文行數 (預設 5 行)")
    p_section.add_argument("--max-lines", type=int, default=150, help="章節最大截取行數 (預設 150 行)")
    p_section.add_argument("--save", "-S", type=str, default=None, help="將章節或定位內容保存至指定檔案 (UTF-8)")

    # symbol
    p_symbol = subparsers.add_parser("symbol", help="全專案定位 Class, Web Components, Function 等定義")
    p_symbol.add_argument("name", type=str, help="符號名稱 (如 ArticleRepository, my-custom-element)")

    # search
    p_search = subparsers.add_parser("search", help="帶 Token 熔斷的關鍵字搜尋")
    p_search.add_argument("keyword", type=str, help="搜尋字串")
    p_search.add_argument("--limit", "-L", type=int, default=5, help="最多回傳結果數 (預設 5)")

    # locate
    p_locate = subparsers.add_parser("locate", help="精準定位檔案內關鍵字/符號所在行號與周邊上下文 (取代終端手寫探勘腳本)")
    p_locate.add_argument("file", type=str, help="目標檔案路徑 (程式碼或文檔)")
    p_locate.add_argument("query", type=str, help="欲定位的關鍵字、符號或文字")
    p_locate.add_argument("--context", "-C", type=int, default=5, help="查詢字串時前後顯示的上下文行數 (預設 5 行)")
    p_locate.add_argument("--limit", "-L", type=int, default=10, help="最多顯示的匹配處數 (預設 10)")
    p_locate.add_argument("--save", "-S", type=str, default=None, help="將定位內容保存至指定檔案 (UTF-8)")

    args = parser.parse_args()

    # 指令派發
    if args.command == "map":
        res = get_project_map(show_all=args.all)
        print_project_map(res)

    elif args.command == "outline":
        p = Path(args.file)
        if not p.is_absolute():
            p = REPO_ROOT / p
        res = get_file_outline(p)
        print_outline(res, save_path=args.save)

    elif args.command == "section":
        p = Path(args.file)
        if not p.is_absolute():
            p = REPO_ROOT / p
        target = args.heading or args.selector
        if not target and not args.query:
            print("❌ 請提供 --heading、--selector 或 --query (-Q) 參數指定欲截取的章節或定位的字串！")
            sys.exit(1)
        res = extract_section(
            p,
            target_heading=target,
            max_lines=args.max_lines,
            query=args.query,
            context_lines=args.context
        )
        if "error" in res:
            print(f"❌ {res['error']}")
            sys.exit(1)
        else:
            if res.get("mode") == "query":
                disp_info = f", 顯示前 {res['displayed_matches']} 處" if res['total_matches'] > res['displayed_matches'] else ""
                out_str = (
                    f"\n🔍 [字串定位] {res['file']} (查詢: \"{res['query']}\", 共找到 {res['total_matches']} 處{disp_info}, 僅約 ~{res['tokens']} tokens)\n"
                    f"{'─' * 60}\n"
                    f"{res['content']}\n"
                    f"{'─' * 60}\n"
                )
            else:
                trunc_tag = " (已超長截斷)" if res.get("truncated") else ""
                out_str = (
                    f"\n📖 [精確章節] {res['file']} (起始於 L{res['start_line']}, 行數: {res['line_count']}{trunc_tag}, 僅約 ~{res['tokens']} tokens)\n"
                    f"{'─' * 60}\n"
                    f"{res['content']}\n"
                    f"{'─' * 60}\n"
                )
            if args.save:
                sp = Path(args.save)
                if not sp.is_absolute():
                    sp = REPO_ROOT / sp
                sp.parent.mkdir(parents=True, exist_ok=True)
                sp.write_text(out_str, encoding="utf-8")
                print(f"✅ 結果已儲存至: {sp.as_posix()}")
            else:
                print(out_str)

    elif args.command == "symbol":
        res = find_symbol(args.name)
        if not res:
            print(f"🔍 未在專案原始碼中找到符號宣告: {args.name}")
        else:
            print(f"\n🎯 找到 {len(res)} 處符號定義「{args.name}」:")
            for item in res:
                print("─" * 60)
                print(f"📍 {item['file']}:{item['line']} (預估 ~{item['tokens']} tokens)")
                print(item["snippet"])
            print("─" * 60 + "\n")

    elif args.command == "search":
        res = smart_search(args.keyword, max_results=args.limit)
        if not res:
            print(f"🔍 未找到包含「{args.keyword}」之有效程式碼或文檔。")
        else:
            print(f"\n⚡ 搜尋到 {len(res)} 項高信噪比片段 (受 Token 預算防護保護):")
            for idx, item in enumerate(res, 1):
                print(f"\n[{idx}] 📍 {item['file']}:{item['line']} (~{item['tokens']} tokens)")
                print("```")
                print(item["context"])
                print("```")
            print()

    elif args.command == "locate":
        p = Path(args.file)
        if not p.is_absolute():
            p = REPO_ROOT / p
        res = locate_query_in_file(
            p,
            query_str=args.query,
            context_lines=args.context,
            max_matches=args.limit
        )
        if "error" in res:
            print(f"❌ {res['error']}")
            sys.exit(1)
        else:
            disp_info = f", 顯示前 {res['displayed_matches']} 處" if res['total_matches'] > res['displayed_matches'] else ""
            out_str = (
                f"\n🔍 [行號定位] {res['file']} (查詢: \"{res['query']}\", 共找到 {res['total_matches']} 處{disp_info}, 僅約 ~{res['tokens']} tokens)\n"
                f"{'─' * 60}\n"
                f"{res['content']}\n"
                f"{'─' * 60}\n"
            )
            if args.save:
                sp = Path(args.save)
                if not sp.is_absolute():
                    sp = REPO_ROOT / sp
                sp.parent.mkdir(parents=True, exist_ok=True)
                sp.write_text(out_str, encoding="utf-8")
                print(f"✅ 結果已儲存至: {sp.as_posix()}")
            else:
                print(out_str)

if __name__ == "__main__":
    main()
