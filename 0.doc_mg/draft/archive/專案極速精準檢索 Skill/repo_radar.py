# -*- coding: utf-8 -*-
"""
repo_radar.py - Chrome Plus 高精準度、極低 Token 專案情報雷達
專門為 AI Coding Assistant 與開發者設計的檢索 Skill。
提供四大核心指令：
  1. outline: 解析 Markdown 標題大綱與代碼綱要（僅消耗 ~50 tokens）
  2. section: 精準截取特定 Markdown 標題章節（僅消耗 ~150 tokens）
  3. symbol:  秒級定位 interface, type, class, def 符號定義
  4. search:  帶 Token 熔斷與智慧過濾的高信噪比關鍵字搜尋
"""

import os
import re
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional

# 專案根目錄定位 (以本腳本位於 0.doc_mg/tools/ 為基準)
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent

# 嚴格過濾黑名單目錄與副檔名，絕不浪費 Token 讀取編譯垃圾
IGNORE_DIRS = {
    "node_modules", "dist", "build", ".git", ".vite",
    "archive", "coverage", ".turbo", "__pycache__", ".venv"
}
IGNORE_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
    ".zip", ".tar", ".gz", ".lock", ".map", ".min.js"
}

def estimate_tokens(text: str) -> int:
    """粗略估算 Token 數量 (以中文約 1.5 char/token，英文約 4 char/token 作安全估算)"""
    if not text:
        return 0
    # 統計非 ASCII 字元
    non_ascii = len(re.findall(r'[^\x00-\x7F]', text))
    ascii_chars = len(text) - non_ascii
    return int((non_ascii / 1.5) + (ascii_chars / 4)) + 1

# ==========================================
# 1. Outline 模組：結構大綱檢索
# ==========================================
def get_markdown_outline(file_path: Path) -> Dict[str, Any]:
    """抽取 Markdown 檔案的所有標題大綱，附帶行號與預估 tokens"""
    if not file_path.exists():
        return {"error": f"檔案不存在: {file_path}"}

    lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()
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

    total_tokens = estimate_tokens("\n".join(lines))
    return {
        "file": str(file_path.relative_to(REPO_ROOT)),
        "total_lines": len(lines),
        "total_estimated_tokens": total_tokens,
        "headings": headings
    }

def print_outline(result: Dict[str, Any]):
    if "error" in result:
        print(f"❌ {result['error']}")
        return

    print(f"\n📑 [檔案大綱] {result['file']} (總行數: {result['total_lines']}, 全文預估: ~{result['total_estimated_tokens']} tokens)")
    print("─" * 60)
    for h in result["headings"]:
        print(f"L{h['line']:<4} | {h['indent']}#{'#' * (h['level'] - 1)} {h['title']}")
    print("─" * 60)
    print("💡 提示：使用 `python repo_radar.py section <file> --heading \"<標題名稱>\"` 僅讀取單一章節，節省 90% 以上 Token！\n")

# ==========================================
# 2. Section 模組：精準章節抽吸
# ==========================================
def extract_section(file_path: Path, target_heading: str) -> Dict[str, Any]:
    """從 Markdown 檔案中僅擷取指定標題下的內容，遇到下一個同級或更高層級標題時自動停止"""
    if not file_path.exists():
        return {"error": f"檔案不存在: {file_path}"}

    lines = file_path.read_text(encoding="utf-8", errors="ignore").splitlines()
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
                # 若已經找到，遇到層級小於或等於目標層級的標題就停止截取
                if current_level <= target_level:
                    break
                else:
                    section_lines.append(line)
        elif found:
            section_lines.append(line)

    if not found:
        return {"error": f"在 {file_path.name} 中找不到包含「{target_heading}」的標題"}

    content = "\n".join(section_lines).strip()
    return {
        "file": str(file_path.relative_to(REPO_ROOT)),
        "heading": target_heading,
        "start_line": start_line,
        "line_count": len(section_lines),
        "tokens": estimate_tokens(content),
        "content": content
    }

# ==========================================
# 3. Symbol 模組：代碼符號快速定位
# ==========================================
def find_symbol(symbol_name: str, scope_dir: Optional[Path] = None) -> List[Dict[str, Any]]:
    """在專案源代碼中快速定位 interface, type, class, function, def 符號定義"""
    search_root = scope_dir if scope_dir else REPO_ROOT
    results = []

    # 匹配 TypeScript/JavaScript/Python 符號宣告
    pattern = re.compile(
        rf'^\s*(export\s+)?(interface|type|class|function|const|async\s+function|def)\s+({re.escape(symbol_name)})\b'
    )

    for root, dirs, files in os.walk(search_root):
        # 原地過濾忽略目錄
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in {".ts", ".tsx", ".js", ".jsx", ".py"}:
                file_p = Path(root) / file
                try:
                    lines = file_p.read_text(encoding="utf-8", errors="ignore").splitlines()
                except Exception:
                    continue

                for idx, line in enumerate(lines):
                    if pattern.search(line):
                        # 擷取該符號及接下來的 15 行上下文
                        snippet = "\n".join(lines[idx:idx + 18])
                        results.append({
                            "file": str(file_p.relative_to(REPO_ROOT)),
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

    valid_exts = {".ts", ".tsx", ".py", ".md", ".json", ".html"}

    for root, dirs, files in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
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
                            # 取前後 3 行作為脈絡
                            start = max(0, idx - 2)
                            end = min(len(lines), idx + 3)
                            ctx = "\n".join(lines[start:end])
                            
                            results.append({
                                "file": str(file_p.relative_to(REPO_ROOT)),
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
        description="Repo Radar - 極低 Token 專案精準情報檢索工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
範例指令:
  1. 查看文檔大綱 (不消耗內文 tokens):
     python 0.doc_mg/tools/repo_radar.py outline 0.doc_mg/docs/cross_plugin_contract.md

  2. 精準讀取某章節 (取代讀取整份檔案):
     python 0.doc_mg/tools/repo_radar.py section 0.doc_mg/docs/cross_plugin_contract.md --heading "3.1"

  3. 瞬間定位介面/符號定義:
     python 0.doc_mg/tools/repo_radar.py symbol TaskTriageProposal

  4. 帶 Token 預算限制搜尋關鍵字:
     python 0.doc_mg/tools/repo_radar.py search "EXECUTE_ROUTER_ACTION" --limit 3
        """
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # outline
    p_outline = subparsers.add_parser("outline", help="抽取檔案標題大綱")
    p_outline.add_argument("file", type=str, help="目標 Markdown 或程式碼路徑")

    # section
    p_section = subparsers.add_parser("section", help="精準截取 Markdown 某章節")
    p_section.add_argument("file", type=str, help="目標 Markdown 檔案路徑")
    p_section.add_argument("--heading", "-H", required=True, type=str, help="欲擷取的標題關鍵字")

    # symbol
    p_symbol = subparsers.add_parser("symbol", help="全專案定位型別、介面或類別定義")
    p_symbol.add_argument("name", type=str, help="符號名稱 (如 TaskTriageProposal, BoardViewProps)")

    # search
    p_search = subparsers.add_parser("search", help="帶 Token 熔斷的關鍵字搜尋")
    p_search.add_argument("keyword", type=str, help="搜尋字串")
    p_search.add_argument("--limit", "-L", type=int, default=5, help="最多回傳結果數 (預設 5)")

    args = parser.parse_args()

    # 指令派發
    if args.command == "outline":
        p = Path(args.file)
        if not p.is_absolute():
            p = REPO_ROOT / p
        res = get_markdown_outline(p)
        print_outline(res)

    elif args.command == "section":
        p = Path(args.file)
        if not p.is_absolute():
            p = REPO_ROOT / p
        res = extract_section(p, args.heading)
        if "error" in res:
            print(f"❌ {res['error']}")
        else:
            print(f"\n📖 [精確章節] {res['file']} (起始於 L{res['start_line']}, 僅約 ~{res['tokens']} tokens)")
            print("─" * 60)
            print(res["content"])
            print("─" * 60 + "\n")

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

if __name__ == "__main__":
    main()