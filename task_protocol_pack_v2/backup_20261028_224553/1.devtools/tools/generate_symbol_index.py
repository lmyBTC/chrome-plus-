#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_symbol_index.py - 專案極致輕量符號與文檔索引生成器
為 AI Agent 與開發者提供全專案的「一張圖秒查」快取。
特點：
  1. 掃描整個專案的 TypeScript (interface, type, class, export const/function) 與 Python 定義
  2. 掃描所有 Markdown 的一級與二級/三級標題
  3. 產出極小化、無多餘雜訊的 .repo_index.json (< 10KB, 僅消耗 ~200 Tokens)
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
REPO_ROOT = SCRIPT_DIR.parent.parent
INDEX_FILE = REPO_ROOT / ".repo_index.json"

IGNORE_DIRS = {
    "node_modules", "dist", "build", ".git", ".vite",
    "archive", "coverage", ".turbo", "__pycache__", ".venv",
    ".system_generated", "scratch"
}

# 抓取 TypeScript / Python 關鍵符號
SYMBOL_PATTERN = re.compile(
    r'^\s*(export\s+)?(interface|type|class|function|const|def)\s+([A-Za-z0-9_]+)'
)

def scan_markdown_headings() -> Dict[str, List[Dict[str, Any]]]:
    """掃描所有 Markdown 核心標題"""
    docs_map = {}
    for root, dirs, files in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            if file.endswith(".md"):
                fp = Path(root) / file
                rel_path = str(fp.relative_to(REPO_ROOT)).replace("\\", "/")
                headings = []
                try:
                    lines = fp.read_text(encoding="utf-8", errors="ignore").splitlines()
                    for idx, line in enumerate(lines, 1):
                        m = re.match(r'^(#{1,3})\s+(.+)$', line)
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
    """掃描程式碼中的關鍵型別與函式宣告"""
    symbols_map = {}
    valid_exts = {".ts", ".tsx", ".py"}

    for root, dirs, files in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in valid_exts:
                fp = Path(root) / file
                rel_path = str(fp.relative_to(REPO_ROOT)).replace("\\", "/")
                try:
                    lines = fp.read_text(encoding="utf-8", errors="ignore").splitlines()
                    for idx, line in enumerate(lines, 1):
                        m = SYMBOL_PATTERN.search(line)
                        if m:
                            kind = m.group(2)
                            sym_name = m.group(3)
                            # 忽略單字過短或通用常見變數
                            if len(sym_name) <= 2 or sym_name in {"key", "val", "item", "res", "req"}:
                                continue
                            if sym_name not in symbols_map:
                                symbols_map[sym_name] = {
                                    "kind": kind,
                                    "file": rel_path,
                                    "line": idx
                                }
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

    INDEX_FILE.write_text(json.dumps(index_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    elapsed = time.time() - start_time
    size_kb = INDEX_FILE.stat().st_size / 1024
    print(f"✅ 全域索引已成功生成: {INDEX_FILE.name}")
    print(f"📊 統計: {len(symbols)} 個代碼符號, {len(docs)} 篇文檔大綱 | 檔案大小: {size_kb:.2f} KB | 耗時: {elapsed:.2f}s")
    return INDEX_FILE

if __name__ == "__main__":
    build_index()
