#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_symbol_index.py - 專案極致輕量符號與文檔索引生成器
為 AI Agent 與開發者提供全專案的「一張圖秒查」快取。
特點：
  1. 完整掃描專案原生 JavaScript (.js, .mjs)、Web Components 與 Python (.py) 核心宣告 (Class, Function, Web Components, Global)
  2. 完整掃描核心 Markdown 規範與指南的一級與二級大綱 (自動略過代碼區塊)
  3. 產出健康健全、結構優雅的 .repo_index.json (< 80KB, 消耗極低 Tokens)
  4. 讓 AI 不需要重新搜尋整個硬碟，一秒鎖定定義所在檔案與行號
"""

import os
import re
import sys
import json
import time
from pathlib import Path
from typing import Dict, Any, List

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

SCRIPT_DIR = Path(__file__).resolve().parent

def detect_repo_root(start: Path) -> Path:
    curr = start
    for _ in range(4):
        if (curr / ".git").exists() or (curr / "GEMINI.md").exists() or (curr / "package.json").exists():
            return curr
        if curr.parent == curr:
            break
        curr = curr.parent
    return start.parent

REPO_ROOT = detect_repo_root(SCRIPT_DIR)
# 優先存放在專案根目錄以供全域快速讀取，若存在 .agents 亦相容寫入
INDEX_FILE = REPO_ROOT / ".repo_index.json"

# 嚴格過濾黑名單目錄與非核心檔案 (禁止暫存、外部工具、測試、封存與編譯垃圾)
IGNORE_DIRS = {
    "node_modules", "dist", "build", ".git", ".github", ".vite",
    "archive", "coverage", ".turbo", "__pycache__", ".venv",
    ".system_generated", "scratch", "graphify-out", ".pytest_cache",
    ".vscode", ".cursor", ".gemini", "github-tools", "draft", "doc_task",
    "tests", "issue_details", "vendor", "examples", "futu"
}

NOISE_WORDS = {
    "key", "val", "item", "res", "req", "err", "idx", "self",
    "data", "event", "config", "options", "props", "path", "file",
    "line", "lines", "root", "text", "args", "kwargs", "ret", "msg",
    "out", "elem", "node", "target", "value", "result", "list", "name",
    "cb", "fn", "el", "str", "obj", "arr", "doc", "pos", "len", "class"
}

# 排除常見的 UI 綁定事件與內部小 helper 前綴
EXCLUDE_FUNC_PREFIXES = (
    "handle", "open", "close", "copy", "setup", "render",
    "is_", "has_", "clean_", "safe_", "format_", "test_",
    "toggle", "switch", "show", "reset", "attach", "apply"
)

# 抓取原生 JS / Python 宣告
CLASS_PATTERN = re.compile(r'^\s*(?:export\s+)?(?:default\s+)?class\s+([A-Za-z0-9_]+)')
FUNCTION_PATTERN = re.compile(r'^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)')
GLOBAL_PATTERN = re.compile(r'^\s*(?:window|global)\.([A-Za-z0-9_]+)\s*=')
WEB_COMPONENT_PATTERN = re.compile(r"customElements\.define\(\s*['\"]([a-z0-9\-]+)['\"]\s*,\s*([A-Za-z0-9_]+)")
CONST_UPPER_PATTERN = re.compile(r'^\s*(?:export\s+)?const\s+([A-Z0-9_]{3,})\s*=')
PY_DEF_PATTERN = re.compile(r'^\s*(?:async\s+)?def\s+([A-Za-z0-9_]+)')
PY_CLASS_PATTERN = re.compile(r'^\s*class\s+([A-Za-z0-9_]+)')


def scan_markdown_headings() -> Dict[str, List[Dict[str, Any]]]:
    """掃描核心 Markdown 標題 (過濾代碼區塊，保留完整一二級標題大綱)"""
    docs_map = {}
    for root, dirs, files in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and "archive" not in d.lower()]
        for file in files:
            if file.endswith(".md"):
                fp = Path(root) / file
                rel_path = str(fp.relative_to(REPO_ROOT)).replace("\\", "/")

                # 僅保留根目錄核心文檔、doc/core、doc/doc_feature、doc/doc_template、.agents/skills、tools/README
                if not (rel_path.count("/") <= 1 or rel_path.startswith(("doc/core/", "doc/doc_feature/", "doc/doc_template/", ".agents/skills/"))):
                    continue

                headings = []
                try:
                    lines = fp.read_text(encoding="utf-8", errors="ignore").splitlines()
                    in_code_block = False
                    for idx, line in enumerate(lines, 1):
                        stripped = line.strip()
                        if stripped.startswith("```"):
                            in_code_block = not in_code_block
                            continue
                        if in_code_block:
                            continue

                        m = re.match(r'^(#{1,2})\s+(.+)$', line)
                        if m:
                            headings.append({
                                "line": idx,
                                "level": len(m.group(1)),
                                "title": m.group(2).strip()
                            })
                except Exception:
                    continue
                if headings:
                    docs_map[rel_path] = headings
    return docs_map


def scan_code_symbols() -> Dict[str, Dict[str, Any]]:
    """掃描程式碼中的關鍵類別、Web Components、全域物件與重要頂層函式"""
    symbols_map = {}
    valid_exts = {".js", ".mjs", ".py"}

    for root, dirs, files in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and "archive" not in d.lower()]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in valid_exts:
                fp = Path(root) / file
                rel_path = str(fp.relative_to(REPO_ROOT)).replace("\\", "/")
                try:
                    lines = fp.read_text(encoding="utf-8", errors="ignore").splitlines()
                    for idx, line in enumerate(lines, 1):
                        raw_line = line.strip()
                        if not raw_line or raw_line.startswith(("//", "/*", "*", "#")):
                            continue

                        # 1. Web Components 註冊
                        wc_match = WEB_COMPONENT_PATTERN.search(line)
                        if wc_match:
                            tag_name = wc_match.group(1)
                            class_name = wc_match.group(2)
                            if tag_name not in symbols_map:
                                symbols_map[tag_name] = {
                                    "kind": "web-component",
                                    "file": rel_path,
                                    "line": idx
                                }
                            if class_name not in symbols_map and class_name not in NOISE_WORDS:
                                symbols_map[class_name] = {
                                    "kind": "class",
                                    "file": rel_path,
                                    "line": idx
                                }
                            continue

                        # 2. JavaScript / Python Class
                        c_match = CLASS_PATTERN.search(line) or (ext == ".py" and PY_CLASS_PATTERN.search(line))
                        if c_match:
                            sym_name = c_match.group(1)
                            if len(sym_name) > 2 and sym_name not in NOISE_WORDS and sym_name not in symbols_map:
                                symbols_map[sym_name] = {
                                    "kind": "class",
                                    "file": rel_path,
                                    "line": idx
                                }
                            continue

                        # 3. 全域 window / global 物件掛載 (JS)
                        g_match = GLOBAL_PATTERN.search(line)
                        if g_match:
                            sym_name = g_match.group(1)
                            if len(sym_name) > 2 and sym_name not in NOISE_WORDS and sym_name not in symbols_map:
                                symbols_map[sym_name] = {
                                    "kind": "global",
                                    "file": rel_path,
                                    "line": idx
                                }
                            continue

                        # 4. 常數 (全大寫常量)
                        const_match = CONST_UPPER_PATTERN.search(line)
                        if const_match:
                            sym_name = const_match.group(1)
                            if len(sym_name) > 2 and sym_name not in NOISE_WORDS and sym_name not in symbols_map:
                                symbols_map[sym_name] = {
                                    "kind": "const",
                                    "file": rel_path,
                                    "line": idx
                                }
                            continue

                        # 5. 模組級重要核心函式 (頂層宣告，排除內部 UI helper 與私有小函式)
                        if not line.startswith("    "):
                            f_match = FUNCTION_PATTERN.search(line) or (ext == ".py" and PY_DEF_PATTERN.search(line))
                            if f_match:
                                sym_name = f_match.group(1)
                                if (len(sym_name) >= 4 and sym_name not in NOISE_WORDS and sym_name not in symbols_map
                                        and not sym_name.startswith(("_", "test_"))
                                        and not any(sym_name.startswith(p) for p in EXCLUDE_FUNC_PREFIXES)):
                                    symbols_map[sym_name] = {
                                        "kind": "function",
                                        "file": rel_path,
                                        "line": idx
                                    }
                                continue

                except Exception:
                    continue
    return symbols_map


def build_index() -> Path:
    start_time = time.time()
    docs = scan_markdown_headings()
    symbols = scan_code_symbols()

    index_payload = {
        "_meta": {
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_symbols": len(symbols),
            "total_docs": len(docs),
            "version": "1.0.0"
        },
        "docs": docs,
        "symbols": symbols
    }

    # 優雅的 indent=2 格式化，確保開發者易讀且體積健康 (< 80KB)
    INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    INDEX_FILE.write_text(json.dumps(index_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    
    # 若存在 .agents 目錄，同步寫入一份確保舊版相容
    agents_dir = REPO_ROOT / ".agents"
    if agents_dir.exists():
        try:
            (agents_dir / ".repo_index.json").write_text(json.dumps(index_payload, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass
    elapsed = time.time() - start_time
    size_kb = INDEX_FILE.stat().st_size / 1024
    print(f"✅ 全域索引已成功生成: {INDEX_FILE.name}")
    print(f"📊 統計: {len(symbols)} 個核心代碼符號, {len(docs)} 篇核心文檔大綱 | 檔案大小: {size_kb:.2f} KB | 耗時: {elapsed:.2f}s")
    return INDEX_FILE


if __name__ == "__main__":
    if "--help" in sys.argv or "-h" in sys.argv:
        print("用法: py generate_symbol_index.py")
        print("用途: 掃描專案代碼符號與文檔大綱，生成輕量快取索引 .repo_index.json")
        sys.exit(0)
    build_index()
