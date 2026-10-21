#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
archive_rotator.py - 任務生命週期雙層滾動歸檔維護工具 (Two-Tier Archive Rotator)

職責：
1. 第一層守門 (Tasks Root Pure Governance)：
   掃描 0.doc_mg/tasks/ 根目錄下之任務檔。未完成任務（進行中/待處理等）始終保留。
   tasks 根目錄保持純淨（0 結案滯留）；所有已完成任務移至 0.doc_mg/tasks/archive/ 根目錄（近期緩衝區）。
2. 第二層緩衝治理 (Archive Buffer Retention Governance)：
   掃描 0.doc_mg/tasks/archive/ 根層之已封存任務檔。
   常態保留最新 10 份已結案任務；超過 10 份之歷史任務，依其所屬插件分類安全移入 archive/<plugin>/。
3. 第三層歷史下沉 (Plugin History Governance)：
   掃描 archive 各插件子目錄。超過指定天數（預設 30 天）或超過配額之歷史任務，移入對應插件子目錄下之 `history/`。

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

DATE_PATTERN_8 = re.compile(r"^task_(\d{4})(\d{2})(\d{2})_.*\.md$")
DATE_PATTERN_4 = re.compile(r"^task_(\d{2})(\d{2})_.*\.md$")
FRONTMATTER_DATE_PATTERN = re.compile(r"^(?:created|deadline):\s*[\"']?(\d{4}-\d{2}-\d{2})[\"']?", re.MULTILINE)
FRONTMATTER_STATUS_PATTERN = re.compile(r"^status:\s*[\"']?([^\"'\r\n]+)[\"']?", re.MULTILINE)
FRONTMATTER_PLUGIN_PATTERN = re.compile(r"^plugin:\s*[\"']?([^\"'\r\n]+)[\"']?", re.MULTILINE)

COMPLETED_KEYWORDS = ["已完成", "已結案", "已廢棄", "done", "completed", "closed"]

PLUGIN_DIR_MAP = {
    "chrome_scrumclock": "chrome_pk",
    "scrumclock": "chrome_pk",
    "pk": "chrome_pk",
    "chrome_pk": "chrome_pk",
    "finance-research-clipper-oss": "finance-research-clipper-oss",
    "finance_clipper": "finance-research-clipper-oss",
    "browser-activity-monitor": "browser-activity-monitor",
    "activity-monitor": "browser-activity-monitor",
    "chrome_video speed plus": "chrome_video speed plus",
    "video-speed": "chrome_video speed plus",
    "gemini-nano": "gemini-nano",
    "chrome_gemini_nano": "gemini-nano",
    "global": "global",
    "workspace": "workspace",
    "agents": "agents",
}

def parse_date_from_filename(filename: str):
    """嘗試從檔名解析出日期 (支援 8 碼 YYYYMMDD 與 4 碼 MMDD)"""
    m8 = DATE_PATTERN_8.match(filename)
    if m8:
        try:
            return date(int(m8.group(1)), int(m8.group(2)), int(m8.group(3)))
        except ValueError:
            return None
    m4 = DATE_PATTERN_4.match(filename)
    if m4:
        try:
            return date(date.today().year, int(m4.group(1)), int(m4.group(2)))
        except ValueError:
            return None
    return None

def parse_task_metadata(filepath: str, filename: str):
    """解析任務檔的 metadata (日期、狀態、所屬插件)"""
    file_date = parse_date_from_filename(filename)
    status = "unknown"
    plugin = "global"

    try:
        with open(filepath, "rb") as f:
            head = f.read(2048).decode("utf-8", errors="ignore")

        sm = FRONTMATTER_STATUS_PATTERN.search(head)
        if sm:
            status = sm.group(1).strip()

        pm = FRONTMATTER_PLUGIN_PATTERN.search(head)
        if pm:
            plugin = pm.group(1).strip()

        dm = FRONTMATTER_DATE_PATTERN.search(head)
        if dm:
            parts = dm.group(1).split("-")
            fm_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
            # 若為 4 碼檔名，以 frontmatter 記載之真實年份優先覆寫
            if DATE_PATTERN_4.match(filename):
                file_date = fm_date
            elif not file_date:
                file_date = fm_date
    except Exception:
        pass

    return file_date, status, plugin

def is_task_completed(status: str) -> bool:
    """判定任務是否為已完成/已結案狀態"""
    s = status.lower()
    return any(k in s for k in COMPLETED_KEYWORDS)

def normalize_plugin_dir(plugin: str, archive_root: str) -> str:
    """將 plugin 標籤映射為 archive 目錄名稱"""
    clean_plugin = plugin.strip().lower()
    if clean_plugin in PLUGIN_DIR_MAP:
        return PLUGIN_DIR_MAP[clean_plugin]
    
    # 檢查是否已存在同名目錄
    cand_path = os.path.join(archive_root, plugin)
    if os.path.isdir(cand_path):
        return plugin
    return "global"

def rotate_tasks_root(tasks_root: str, archive_root: str, max_completed: int, execute: bool):
    """第一層守門：tasks 根目錄純淨化治理 (預設保留 max_completed=0 筆，全數移入 archive)"""
    print(f"\n--------------------------------------------------")
    print(f"【第一層治理】tasks 根目錄已完成任務治理 (上限: {max_completed} 筆，預設 0 即全數歸檔)")
    print(f" 目標目錄: {tasks_root}")
    print(f"--------------------------------------------------")

    if not os.path.isdir(tasks_root):
        print(f"[ERROR] tasks 根目錄不存在: {tasks_root}")
        return 0, 0

    files = [f for f in os.listdir(tasks_root) if os.path.isfile(os.path.join(tasks_root, f)) and f.startswith("task_") and f.endswith(".md")]

    completed_tasks = []
    active_tasks = []

    for fn in files:
        fpath = os.path.join(tasks_root, fn)
        fdate, status, plugin = parse_task_metadata(fpath, fn)
        effective_date = fdate or date.min
        if is_task_completed(status):
            completed_tasks.append({
                "filename": fn,
                "filepath": fpath,
                "date": effective_date,
                "status": status,
                "plugin": plugin
            })
        else:
            active_tasks.append({
                "filename": fn,
                "filepath": fpath,
                "date": effective_date,
                "status": status,
                "plugin": plugin
            })

    # 排序：由新到舊
    completed_tasks.sort(key=lambda x: (x["date"], x["filename"]), reverse=True)

    print(f"掃描結果: 進行中/待處理任務 {len(active_tasks)} 筆，已完成任務 {len(completed_tasks)} 筆")
    if active_tasks:
        print(f"進行中/待處理任務 (免除歸檔配額限制):")
        for at in active_tasks:
            print(f"  * [進行中] {at['filename']} ({at['status']})")

    overflow_tasks = []
    if len(completed_tasks) > max_completed:
        overflow_tasks = completed_tasks[max_completed:]
        retained_tasks = completed_tasks[:max_completed]
        print(f"\n已完成任務超過配額 ({len(completed_tasks)} > {max_completed})，預計溢出搬移 ({len(overflow_tasks)} 筆):")
        for ot in overflow_tasks:
            dest_dir = archive_root
            dest_path = os.path.join(dest_dir, ot["filename"])
            print(f"  - {ot['filename']} [{ot['date'].isoformat()}] -> archive/ (近期緩衝區)")
            ot["dest_dir"] = dest_dir
            ot["dest_path"] = dest_path

        if execute:
            print(f"\n>>> 開始執行 tasks 根層已完成任務移入 archive/ 緩衝區...")
            moved = 0
            for ot in overflow_tasks:
                os.makedirs(ot["dest_dir"], exist_ok=True)
                try:
                    shutil.move(ot["filepath"], ot["dest_path"])
                    moved += 1
                except Exception as e:
                    print(f"[ERROR] 搬移失敗 {ot['filename']}: {e}")
            print(f"[COMPLETED] 成功移入 {moved} 份已完成任務至 archive/ 緩衝區")
    else:
        print(f"[OK] tasks 根目錄已完成任務數 ({len(completed_tasks)}) 未超過上限 ({max_completed})，全數常態保留。")
        for ct in completed_tasks:
            print(f"  + [保留] {ct['filename']} [{ct['date'].isoformat()}]")

    return len(completed_tasks), len(overflow_tasks)

def rotate_archive_buffer(archive_root: str, max_buffer: int, execute: bool):
    """第二層治理：archive/ 根目錄近期緩衝區治理 (常態保留最新 max_buffer 份，溢出分流至各插件目錄)"""
    print(f"\n--------------------------------------------------")
    print(f"【第二層治理】archive/ 根目錄近期緩衝區治理 (上限: {max_buffer} 筆)")
    print(f" 目標目錄: {archive_root}")
    print(f"--------------------------------------------------")

    if not os.path.isdir(archive_root):
        print(f"[ERROR] 歸檔根目錄不存在: {archive_root}")
        return 0, 0

    root_files = [f for f in os.listdir(archive_root) if os.path.isfile(os.path.join(archive_root, f)) and f.startswith("task_") and f.endswith(".md")]

    buffer_tasks = []
    for fn in root_files:
        fp = os.path.join(archive_root, fn)
        fdate, status, plugin = parse_task_metadata(fp, fn)
        effective_date = fdate or date.min
        buffer_tasks.append({
            "filename": fn,
            "filepath": fp,
            "date": effective_date,
            "status": status,
            "plugin": plugin
        })

    # 排序：由新到舊
    buffer_tasks.sort(key=lambda x: (x["date"], x["filename"]), reverse=True)

    overflow_tasks = []
    if len(buffer_tasks) > max_buffer:
        overflow_tasks = buffer_tasks[max_buffer:]
        print(f"緩衝區現存 {len(buffer_tasks)} 份 > 上限 {max_buffer} 份，預計溢出分流 ({len(overflow_tasks)} 筆):")
        for ot in overflow_tasks:
            target_plugin_dir = normalize_plugin_dir(ot["plugin"], archive_root)
            dest_dir = os.path.join(archive_root, target_plugin_dir)
            dest_path = os.path.join(dest_dir, ot["filename"])
            print(f"  - {ot['filename']} [{ot['date'].isoformat()}] -> archive/{target_plugin_dir}/")
            ot["dest_dir"] = dest_dir
            ot["dest_path"] = dest_path

        if execute:
            print(f"\n>>> 開始執行緩衝區溢出任務分流...")
            moved = 0
            for ot in overflow_tasks:
                os.makedirs(ot["dest_dir"], exist_ok=True)
                try:
                    shutil.move(ot["filepath"], ot["dest_path"])
                    moved += 1
                except Exception as e:
                    print(f"[ERROR] 搬移失敗 {ot['filename']}: {e}")
            print(f"[COMPLETED] 成功分流 {moved} 份溢出任務至各插件目錄")
    else:
        print(f"[OK] archive/ 根目錄緩衝區任務數 ({len(buffer_tasks)}) 未超過上限 ({max_buffer})，全數常態保留。")
        for bt in buffer_tasks:
            print(f"  + [緩衝保留] {bt['filename']} [{bt['date'].isoformat()}]")

    return len(buffer_tasks), len(overflow_tasks)

def rotate_archives(archive_root: str, ref_date: date, threshold_days: int, max_archive_retained: int, execute: bool):
    """第三層滾動：archive/ 各插件目錄常態保留最新 max_archive_retained 筆，超過配額或超過 threshold_days 的檔案移至 history/"""
    print(f"\n--------------------------------------------------")
    print(f"【第三層治理】archive/ 各插件目錄歷史下沉治理 (保留上限: {max_archive_retained} 筆 | 天數閾值: {threshold_days} 天)")
    print(f" 基準日期: {ref_date.isoformat()} | 歸檔目錄: {archive_root}")
    print(f"--------------------------------------------------")

    if not os.path.isdir(archive_root):
        print(f"[ERROR] 歸檔根目錄不存在: {archive_root}")
        return 1

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
        md_files = [e for e in entries if os.path.isfile(os.path.join(subdir_path, e)) and e.startswith("task_") and e.endswith(".md")]

        task_entries = []
        for filename in md_files:
            total_scanned += 1
            filepath = os.path.join(subdir_path, filename)

            file_date, status, _ = parse_task_metadata(filepath, filename)

            if not file_date:
                total_skipped += 1
                continue

            days_diff = (ref_date - file_date).days
            task_entries.append({
                "filename": filename,
                "filepath": filepath,
                "file_date": file_date,
                "days_diff": days_diff
            })

        # 排序：由新到舊 (最新排最前面)
        task_entries.sort(key=lambda x: (x["file_date"], x["filename"]), reverse=True)

        history_dir = os.path.join(subdir_path, "history")
        for idx, entry in enumerate(task_entries):
            fn = entry["filename"]
            fpath = entry["filepath"]
            f_date = entry["file_date"]
            diff = entry["days_diff"]
            dest_path = os.path.join(history_dir, fn)

            # 超過保留配額或超過天數閾值
            is_overflow = (idx >= max_archive_retained)
            is_expired = (diff > threshold_days)

            if is_overflow or is_expired:
                reason = []
                if is_overflow:
                    reason.append(f"超過保留配額 (排名第 {idx + 1} 筆 > {max_archive_retained})")
                if is_expired:
                    reason.append(f"逾期 ({diff} 天 > {threshold_days} 天)")
                reason_str = " & ".join(reason)

                plan_moves.append((subdir, fn, fpath, history_dir, dest_path, reason_str, f_date))
                total_to_rotate += 1
            else:
                total_active += 1

    # 輸出搬移計畫
    if plan_moves:
        print(f"\n[ROTATION PLAN] 預計下沉至 history/ 的檔案清單 ({len(plan_moves)} 份):")
        current_sub = None
        for sub, fn, src, h_dir, dst, reason_str, f_date in plan_moves:
            if sub != current_sub:
                current_sub = sub
                print(f"\n  目錄: {sub}/ (目標: {sub}/history/)")
            print(f"    - {fn} [{f_date.isoformat()}] ({reason_str})")
    else:
        print("\n[OK] 目前沒有需要下沉至 history/ 的逾期或超額任務檔。")

    # 執行模式
    if execute and plan_moves:
        print(f"\n>>> 開始執行歷史下沉搬移 (共 {len(plan_moves)} 筆)...")
        moved_count = 0
        for sub, fn, src, h_dir, dst, reason_str, f_date in plan_moves:
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
    print(f" 歷史滾動統計摘要:")
    print(f"   總掃描已封存檔案數: {total_scanned}")
    print(f"   保留於活躍層 (<= {threshold_days} 天且最新 {max_archive_retained} 筆內): {total_active}")
    print(f"   下沉歷史層 (> {threshold_days} 天或超過 {max_archive_retained} 筆配額): {total_to_rotate}")
    print(f"   無法判定日期/略過: {total_skipped}")
    print(f"==================================================")
    return 0

def main():
    parser = argparse.ArgumentParser(description="多層滾動歸檔維護工具")
    parser.add_argument("--tasks-root", default="0.doc_mg/tasks", help="tasks 目錄路徑 (預設: 0.doc_mg/tasks)")
    parser.add_argument("--archive-root", default=None, help="歸檔目錄路徑 (預設: 0.doc_mg/tasks/archive)")
    parser.add_argument("--root", default="0.doc_mg/tasks/archive", help="歸檔目錄相容別名 (預設: 0.doc_mg/tasks/archive)")
    parser.add_argument("--max-completed", type=int, default=0, help="tasks 根目錄保留之已完成任務數 (預設: 0，保持純淨全數歸檔)")
    parser.add_argument("--buffer-max", "--max-buffer", dest="buffer_max", type=int, default=10, help="archive 根目錄近期緩衝區常態保留數 (預設: 10)")
    parser.add_argument("--archive-max-retained", type=int, default=10, help="archive 各插件目錄常態保留之最新任務數 (預設: 10)")
    parser.add_argument("--days", type=int, default=30, help="活躍天數閾值 (預設: 30 天)")
    parser.add_argument("--reference-date", type=str, default=None, help="基準日期 YYYY-MM-DD (預設: 今天)")
    parser.add_argument("--dry-run", action="store_true", default=False, help="模擬預覽模式 (預設行為)")
    parser.add_argument("--execute", "--apply", dest="execute", action="store_true", default=False, help="正式執行移動操作")

    args = parser.parse_args()

    archive_root = args.archive_root if args.archive_root else args.root

    # 解析基準日期
    if args.reference_date:
        try:
            parts = [int(p) for p in args.reference_date.split("-")]
            ref_date = date(parts[0], parts[1], parts[2])
        except Exception:
            ref_date = date.today()
    else:
        ref_date = date.today()

    execute_mode = args.execute

    print("==================================================")
    print(" 多層任務滾動與歸檔治理維護系統 (Two-Tier Archive Governance)")
    print(f" 執行模式: {'【正式執行 (EXECUTE)】' if execute_mode else '【模擬預覽 (DRY-RUN)】'}")
    print("==================================================")

    # 第一層治理：tasks 根目錄純淨化治理 (預設 0 結案滯留，全數歸檔至 archive)
    rotate_tasks_root(
        tasks_root=args.tasks_root,
        archive_root=archive_root,
        max_completed=args.max_completed,
        execute=execute_mode
    )

    # 第二層治理：archive/ 根目錄近期緩衝區治理 (常態保留最新 10 份，溢出分流至各插件目錄)
    rotate_archive_buffer(
        archive_root=archive_root,
        max_buffer=args.buffer_max,
        execute=execute_mode
    )

    # 第三層治理：archive 各插件目錄常態保留最新 10 份，超過 10 份或超過 30 天任務下沉至 history/
    rotate_archives(
        archive_root=archive_root,
        ref_date=ref_date,
        threshold_days=args.days,
        max_archive_retained=args.archive_max_retained,
        execute=execute_mode
    )

    return 0

if __name__ == "__main__":
    sys.exit(main())
