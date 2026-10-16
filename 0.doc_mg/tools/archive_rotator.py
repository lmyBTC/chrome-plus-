#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
archive_rotator.py - 雙層滾動歸檔維護工具 (Two-Tier Archive Rotator)

職責：
自動掃描 0.doc_mg/tasks/archive/ 各插件目錄第一層之已封存任務檔。
凡超過指定天數（預設 30 天）之歷史任務，自動安全移入對應插件子目錄下之 `history/`。
第一層僅保留近 30 天之活躍封存檔案，大幅減少視覺噪音與目視成本。

安全原則：
- 嚴禁刪除任何檔案 (No-Deletion Policy)，僅使用檔案移動 (Move)。
- 預設或指定 --dry-run 僅輸出預覽報告，必須明確指定 --execute 才執行實際檔案搬移。
"""

import os
import sys
import re
import shutil
import argparse
from datetime import datetime, date

# 解決 Windows cp950 終端輸出 UTF-8 字元崩潰問題
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

DATE_PATTERN = re.compile(r"^task_(\d{4})(\d{2})(\d{2})_.*\.md$")
FRONTMATTER_DATE_PATTERN = re.compile(r"^(?:created|deadline):\s*[\"']?(\d{4}-\d{2}-\d{2})[\"']?", re.MULTILINE)

def parse_date_from_filename(filename: str):
    """嘗試從檔名 task_YYYYMMDD_... 解析出日期"""
    m = DATE_PATTERN.match(filename)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None

def parse_date_from_frontmatter(filepath: str):
    """嘗試從任務檔 frontmatter 解析 created 日期"""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            head = f.read(1024)
            m = FRONTMATTER_DATE_PATTERN.search(head)
            if m:
                parts = m.group(1).split("-")
                return date(int(parts[0]), int(parts[1]), int(parts[2]))
    except Exception:
        pass
    return None

def rotate_archives(archive_root: str, ref_date: date, threshold_days: int, execute: bool):
    if not os.path.isdir(archive_root):
        print(f"[ERROR] 歸檔根目錄不存在: {archive_root}")
        return 1

    print(f"==================================================")
    print(f" 雙層滾動歸檔工具 (Archive Rotator)")
    print(f" 基準日期: {ref_date.isoformat()} | 閾值: {threshold_days} 天")
    print(f" 模式: {'【正式執行 (EXECUTE)】' if execute else '【模擬預覽 (DRY-RUN)】'}")
    print(f" 目標根路徑: {archive_root}")
    print(f"==================================================")

    # 1. 檢查根目錄有無散落檔案
    root_files = [f for f in os.listdir(archive_root) if os.path.isfile(os.path.join(archive_root, f)) and f.endswith(".md")]
    if root_files:
        print(f"\n[NOTICE] 發現散落在 archive/ 根層之任務檔 ({len(root_files)} 份):")
        for rf in root_files:
            print(f"  - {rf} (建議依插件名稱手動或透過規則歸位)")

    subdirs = [d for d in os.listdir(archive_root) if os.path.isdir(os.path.join(archive_root, d))]

    total_scanned = 0
    total_active = 0
    total_to_rotate = 0
    total_skipped = 0

    plan_moves = []

    for subdir in sorted(subdirs):
        subdir_path = os.path.join(archive_root, subdir)
        # 排除歷史目錄本身
        if subdir == "history":
            continue

        entries = os.listdir(subdir_path)
        md_files = [e for e in entries if os.path.isfile(os.path.join(subdir_path, e)) and e.endswith(".md")]

        for filename in sorted(md_files):
            total_scanned += 1
            filepath = os.path.join(subdir_path, filename)

            # 解析日期
            file_date = parse_date_from_filename(filename)
            if not file_date:
                file_date = parse_date_from_frontmatter(filepath)

            if not file_date:
                total_skipped += 1
                # 無法判定日期者保留於原位
                continue

            days_diff = (ref_date - file_date).days
            if days_diff > threshold_days:
                # 逾期，需下沉至 history/
                history_dir = os.path.join(subdir_path, "history")
                dest_path = os.path.join(history_dir, filename)
                plan_moves.append((subdir, filename, filepath, history_dir, dest_path, days_diff, file_date))
                total_to_rotate += 1
            else:
                total_active += 1

    # 輸出搬移計畫
    if plan_moves:
        print(f"\n[ROTATION PLAN] 預計下沉至 history/ 的檔案清單 ({len(plan_moves)} 份):")
        current_sub = None
        for sub, fn, src, h_dir, dst, diff, f_date in plan_moves:
            if sub != current_sub:
                current_sub = sub
                print(f"\n  目錄: {sub}/ (目標: {sub}/history/)")
            print(f"    - {fn} [{f_date.isoformat()}] (距基準日 {diff} 天 > {threshold_days} 天)")
    else:
        print("\n[OK] 目前沒有需要下沉歸檔的任務檔。")

    # 執行模式
    if execute and plan_moves:
        print(f"\n>>> 開始執行檔案搬移 (共 {len(plan_moves)} 筆)...")
        moved_count = 0
        for sub, fn, src, h_dir, dst, diff, f_date in plan_moves:
            os.makedirs(h_dir, exist_ok=True)
            try:
                shutil.move(src, dst)
                moved_count += 1
            except Exception as e:
                print(f"[ERROR] 移動失敗 {fn}: {e}")
        print(f"[COMPLETED] 成功搬移 {moved_count} 份檔案至各插件 history/ 子目錄。")
    elif not execute and plan_moves:
        print(f"\n[DRY-RUN] 本次為預覽模式，未改動任何實體檔案。若需執行請加入 `--execute` 參數。")

    print(f"\n==================================================")
    print(f" 統計摘要:")
    print(f"   總掃描檔案數: {total_scanned}")
    print(f"   保留活躍 (<= {threshold_days} 天): {total_active}")
    print(f"   下沉歷史 (> {threshold_days} 天): {total_to_rotate}")
    print(f"   無法判定日期/略過: {total_skipped}")
    print(f"==================================================")
    return 0

def main():
    parser = argparse.ArgumentParser(description="雙層滾動歸檔維護工具")
    parser.add_argument("--root", default="0.doc_mg/tasks/archive", help="歸檔目錄路徑 (預設: 0.doc_mg/tasks/archive)")
    parser.add_argument("--days", type=int, default=30, help="活躍天數閾值 (預設: 30 天)")
    parser.add_argument("--reference-date", type=str, default="2026-10-16", help="基準日期 YYYY-MM-DD (預設: 2026-10-16)")
    parser.add_argument("--dry-run", action="store_true", default=False, help="模擬預覽模式 (預設行為)")
    parser.add_argument("--execute", action="store_true", default=False, help="正式執行移動操作")

    args = parser.parse_args()

    # 解析基準日期
    try:
        parts = [int(p) for p in args.reference_date.split("-")]
        ref_date = date(parts[0], parts[1], parts[2])
    except Exception:
        ref_date = date.today()

    # 安全機制：若未給 --execute，則一律為 dry-run
    execute_mode = args.execute

    return rotate_archives(
        archive_root=args.root,
        ref_date=ref_date,
        threshold_days=args.days,
        execute=execute_mode
    )

if __name__ == "__main__":
    sys.exit(main())
