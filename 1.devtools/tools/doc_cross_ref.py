# -*- coding: utf-8 -*-
"""
doc_cross_ref.py - 文件交叉引用自動標註工具
掃描指定目錄，提取關鍵字（模組名、函式名、Action 名稱、端口號），
比對各檔案中出現的交叉引用，並在檔案頂部插入/更新 <!-- cross-ref --> 區塊。

用法:
  python doc_cross_ref.py --dir <目錄路徑> --dry-run   # 預覽模式
  python doc_cross_ref.py --dir <目錄路徑> --apply      # 寫入模式

@related ../tasks/Chrome Plus x Gemini Nano/chrome_plus_x_gemini_nano.md
"""

import os
import re
import sys
import argparse
from pathlib import Path
from collections import defaultdict

# ── 關鍵字定義 ──────────────────────────────────────────────
KEYWORDS = [
    # 模組/類別名
    "NanoService", "NanoIntentRouter", "ToneShifter", "SocialDispatcher",
    "PulseExtractor", "MainDispatcher",
    # Python 工具名
    "social_publisher", "rss_generator", "local_dedup", "markdown_archiver",
    "main_dispatcher",
    # Action 協定
    "DISPATCH_SOCIAL_POST", "LOCAL_TOOL_PROXY", "EXECUTE_ROUTER_ACTION",
    "CREATE_TASK", "GET_ACTIVE_PULSE_ITEM",
    # 型別
    "SocialPostDraft", "ToneShiftMode", "ToneShiftResult", "DedupCheckResult",
    # 基礎設施
    "127.0.0.1:8765", "nanoService", "nanoIntentRouter",
    "toneShifter", "pulseExtractor",
]

SUPPORTED_EXT = {".ts", ".tsx", ".py", ".md"}

CROSS_REF_START = "<!-- cross-ref:auto"
CROSS_REF_END = "cross-ref:end -->"


def extract_keywords_from_file(filepath, keywords):
    """讀取檔案內容，回傳其中包含的關鍵字集合"""
    try:
        content = filepath.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return set()

    found = set()
    for kw in keywords:
        if kw in content:
            found.add(kw)
    return found


def build_cross_ref_map(directory, keywords):
    """建構 {檔名: {keywords: set, path: Path}} 映射"""
    file_map = {}
    for fp in sorted(directory.rglob("*")):
        if fp.is_file() and fp.suffix in SUPPORTED_EXT:
            rel = fp.relative_to(directory)
            found = extract_keywords_from_file(fp, keywords)
            if found:
                file_map[str(rel)] = {"keywords": found, "path": fp}
    return file_map


def compute_relations(file_map):
    """計算每個檔案與其他檔案的共享關鍵字"""
    relations = defaultdict(list)
    files = list(file_map.keys())

    for i, f1 in enumerate(files):
        for f2 in files[i + 1:]:
            shared = file_map[f1]["keywords"] & file_map[f2]["keywords"]
            if shared:
                sorted_shared = sorted(shared)
                relations[f1].append((f2, sorted_shared))
                relations[f2].append((f1, sorted_shared))

    return dict(relations)


def generate_cross_ref_block(filename, related_files):
    """產生 <!-- cross-ref --> 區塊文字"""
    lines = [f"{CROSS_REF_START} ─────────────────────"]
    lines.append(f"  本檔: {filename}")
    lines.append("  交叉引用:")

    for rel_file, shared_kws in sorted(related_files, key=lambda x: x[0]):
        kw_str = ", ".join(shared_kws[:5])  # 最多顯示 5 個
        suffix = "..." if len(shared_kws) > 5 else ""
        lines.append(f"    - ./{rel_file}  [{kw_str}{suffix}]")

    lines.append(f"───────────────────── {CROSS_REF_END}")
    return "\n".join(lines)


def has_existing_cross_ref(content):
    """檢查檔案是否已有 cross-ref 區塊，回傳 (存在, 起始位置, 結束位置)"""
    start_idx = content.find(CROSS_REF_START)
    if start_idx == -1:
        return False, -1, -1
    end_idx = content.find(CROSS_REF_END, start_idx)
    if end_idx == -1:
        return False, -1, -1
    return True, start_idx, end_idx + len(CROSS_REF_END)


def inject_cross_ref(filepath, block, dry_run):
    """將 cross-ref 區塊注入檔案頂部（或更新已存在的區塊）"""
    content = filepath.read_text(encoding="utf-8")
    exists, start, end = has_existing_cross_ref(content)

    if exists:
        new_content = content[:start] + block + content[end:]
    else:
        # 插入到檔案最頂部
        new_content = block + "\n" + content

    if new_content == content:
        return False  # 無變更

    if dry_run:
        print(f"  [DRY-RUN] 將更新: {filepath.name}")
        print(f"    區塊預覽 (前3行):")
        for line in block.split("\n")[:3]:
            print(f"      {line}")
        print()
        return True
    else:
        filepath.write_text(new_content, encoding="utf-8")
        print(f"  [APPLIED] 已更新: {filepath.name}")
        return True


def main():
    parser = argparse.ArgumentParser(
        description="文件交叉引用自動標註工具"
    )
    parser.add_argument(
        "--dir", required=True, help="掃描目標目錄路徑"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="預覽模式")
    group.add_argument("--apply", action="store_true", help="寫入模式")
    args = parser.parse_args()

    target_dir = Path(args.dir).resolve()
    if not target_dir.is_dir():
        print(f"錯誤: 目錄不存在 - {target_dir}")
        sys.exit(1)

    print(f"📂 掃描目錄: {target_dir}")
    print(f"🔑 關鍵字數量: {len(KEYWORDS)}")
    print()

    # 1. 建構檔案-關鍵字映射
    file_map = build_cross_ref_map(target_dir, KEYWORDS)
    print(f"📄 掃描到 {len(file_map)} 個相關檔案:")
    for fname, info in sorted(file_map.items()):
        print(f"  - {fname} ({len(info['keywords'])} 個關鍵字)")
    print()

    # 2. 計算交叉關係
    relations = compute_relations(file_map)
    total_pairs = sum(len(v) for v in relations.values()) // 2
    print(f"🔗 發現 {total_pairs} 組交叉引用關係")
    print()

    # 3. 注入/更新 cross-ref 區塊
    updated = 0
    for fname, related in sorted(relations.items()):
        block = generate_cross_ref_block(fname, related)
        fp = file_map[fname]["path"]
        if inject_cross_ref(fp, block, dry_run=args.dry_run):
            updated += 1

    print()
    mode = "DRY-RUN" if args.dry_run else "APPLIED"
    print(f"✅ [{mode}] 共 {updated} 個檔案{'將被' if args.dry_run else '已'}更新")


if __name__ == "__main__":
    main()
