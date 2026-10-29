#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import sys
import shutil
import subprocess
from datetime import datetime, timedelta

# 強制 UTF-8 輸出
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# 路徑設定
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOC_TASK_DIR = os.path.join(PROJECT_ROOT, 'doc', 'doc_task')
DOC_DRAFT_DIR = os.path.join(PROJECT_ROOT, 'doc', 'draft')
DOC_PULSE_DIR = os.path.join(DOC_DRAFT_DIR, '_pulse')

TASK_ARCHIVE_DIR = os.path.join(DOC_TASK_DIR, 'archive')
DRAFT_ARCHIVE_DIR = os.path.join(DOC_DRAFT_DIR, 'archive')
PULSE_ARCHIVE_DIR = os.path.join(DOC_PULSE_DIR, 'archive')

# 排除保護的非歸檔檔案
PROTECTED_TASK_FILES = {
    'task_template_v2.md',
    'task_manager.md',
    'Daily_task.md',
}

PROTECTED_DRAFT_FILES = {
    '00.pulse-text.md',
    '00_pulse-sop.md',
    '00search-draft-template.md',
    '架構升級分析與重構指南.md',
}

PROTECTED_PULSE_FILES = {
    '00.pulse-text.md',
    '00_pulse-sop.md',
}

def is_protected_pulse(filename):
    """檢查是否為受保護的 Pulse 模板或工作台檔案"""
    if filename in PROTECTED_PULSE_FILES:
        return True
    if filename.startswith('00') or filename.startswith('00_') or filename.startswith('00.'):
        return True
    return False

def is_protected_draft(filename, is_archive_root=False):
    """檢查是否為受保護的草稿/指南/模板檔案 (在 doc/draft/archive 根目錄時允許歷史歸檔)"""
    if not is_archive_root and filename in PROTECTED_DRAFT_FILES:
        return True
    if filename.startswith('00') or filename.startswith('00_') or filename.startswith('00.'):
        return True
    return False

def get_monday_of_week(dt):
    """計算給定日期所屬週的週一"""
    return dt - timedelta(days=dt.weekday())

def get_archive_target_dir(base_dir, dt):
    """
    根據檔案日期所屬週決定歸檔路徑與相對路徑標記：
    - 當週與前一週 (近 2 週)：保留在第一層 base_dir/YYYY-MM-DD
    - 逾 2 週之歷史檔案：下沉至 base_dir/historical/YYYY-MM-DD
    """
    if not dt:
        return os.path.join(base_dir, 'historical', 'unknown'), 'historical/unknown'
    monday = get_monday_of_week(dt)
    folder_name = monday.strftime('%Y-%m-%d')
    today = datetime.now().date()
    current_monday = get_monday_of_week(today)
    cutoff_monday = current_monday - timedelta(days=7)  # 保留當週與上週 (2 週視窗)

    if monday < cutoff_monday:
        return os.path.join(base_dir, 'historical', folder_name), f"historical/{folder_name}"
    else:
        return os.path.join(base_dir, folder_name), folder_name


def parse_date_from_filename(filename):
    """從檔名解析日期 (支援多種日期格式)"""
    # 格式 0: 新規範 task_MMDD_NN_ (兩位數月份+兩位數日期+兩位數以上流水號)
    match0 = re.search(r'task_(\d{2})(\d{2})_(\d{2,})[-_]', filename, re.IGNORECASE)
    if match0:
        m, d, _ = match0.groups()
        inferred_year = None
        # 若為存在之路徑或可定位於 DOC_TASK_DIR，優先從內容解析真實年份以防跨年偏差
        target_path = filename if os.path.exists(filename) else os.path.join(DOC_TASK_DIR, os.path.basename(filename))
        if os.path.exists(target_path) and os.path.isfile(target_path):
            dt_content = parse_date_from_content(target_path)
            if dt_content:
                inferred_year = dt_content.year
        if not inferred_year:
            inferred_year = datetime.now().year
        try:
            return datetime(int(inferred_year), int(m), int(d)).date()
        except ValueError:
            pass

    # 格式 1: task_YYYYMMDD_ or draft-YYYYMMDD- or YYYYMMDD-
    match1 = re.search(r'(?:task_|draft-)?(\d{4})(\d{2})(\d{2})[-_]', filename)
    if match1:
        y, m, d = match1.groups()
        try:
            return datetime(int(y), int(m), int(d)).date()
        except ValueError:
            pass

    # 格式 2: YYYY-MM-DD
    match2 = re.search(r'(\d{4})-(\d{2})-(\d{2})', filename)
    if match2:
        y, m, d = match2.groups()
        try:
            return datetime(int(y), int(m), int(d)).date()
        except ValueError:
            pass

    return None

def parse_date_from_content(filepath):
    """從檔案內容解析建立日期 (支援 Task 與 Draft Markdown/HTML)"""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for _ in range(60):
                line = f.readline()
                if not line:
                    break
                # 建立日期: YYYY-MM-DD / 發布日期: YYYY-MM-DD
                match = re.search(r'(?:建立日期|發布日期|更新日期|日期|date|created|published):\s*["\']?(\d{4})[-/](\d{2})[-/](\d{2})["\']?', line, re.IGNORECASE)
                if match:
                    y, m, d = match.groups()
                    try:
                        return datetime(int(y), int(m), int(d)).date()
                    except ValueError:
                        pass
                # HTML meta date 或 time 標籤
                match_html = re.search(r'(?:datePublished|datetime)=["\'](\d{4})-(\d{2})-(\d{2})', line)
                if match_html:
                    y, m, d = match_html.groups()
                    try:
                        return datetime(int(y), int(m), int(d)).date()
                    except ValueError:
                        pass
    except Exception as e:
        print(f"警告：讀取 {os.path.basename(filepath)} 失敗：{e}", file=sys.stderr)
    return None

def get_file_creation_date(filepath):
    """取得檔案的系統修改/建立時間"""
    try:
        stat = os.stat(filepath)
        timestamp = min(stat.st_mtime, stat.st_ctime)
        return datetime.fromtimestamp(timestamp).date()
    except Exception as e:
        print(f"警告：無法獲取 {os.path.basename(filepath)} 的建立時間：{e}", file=sys.stderr)
    return None

def parse_related_drafts_from_task(filepath):
    """從 Task Frontmatter 解析 related_drafts 清單"""
    drafts = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(4096)
            # 解析 related_drafts: [...] 或多行列表
            match_block = re.search(r'related_drafts:\s*\[(.*?)\]', content, re.DOTALL)
            if match_block:
                raw_items = match_block.group(1).split(',')
                for item in raw_items:
                    cleaned = item.strip().strip('"\'` ')
                    if cleaned:
                        drafts.append(cleaned)
            else:
                match_lines = re.search(r'related_drafts:\s*\n((?:\s*-\s*["\']?[^\n]+["\']?\n?)+)', content)
                if match_lines:
                    for line in match_lines.group(1).splitlines():
                        cleaned = re.sub(r'^\s*-\s*', '', line).strip().strip('"\'` ')
                        if cleaned:
                            drafts.append(cleaned)
    except Exception:
        pass
    return drafts

def is_task_completed(filepath):
    """檢查任務是否已完成 (支援 status: "已完成"、**狀態**: `已完成` 等多種格式，包含已廢棄/已整合狀態)"""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(4096)
            if re.search(r'(?:status|\*\*狀態\*\*|狀態(?:標籤)?)\s*[:：]\s*[`"\'\[\s]*(已完成|Completed|已廢棄|已整合至路線圖)[`"\'\]\s]*', content, re.IGNORECASE):
                return True
    except Exception:
        pass
    return False

def move_file_safe(src_path, dest_dir, dry_run=False):
    """安全搬移檔案 (優先 git mv，fallback 為 shutil.move)"""
    filename = os.path.basename(src_path)
    dest_path = os.path.join(dest_dir, filename)

    if os.path.abspath(src_path) == os.path.abspath(dest_path):
        return True

    if not dry_run:
        try:
            os.makedirs(dest_dir, exist_ok=True)
            # 優先嘗試 git mv
            try:
                subprocess.run(['git', 'mv', src_path, dest_path],
                               cwd=PROJECT_ROOT, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            except (subprocess.CalledProcessError, FileNotFoundError):
                shutil.move(src_path, dest_path)
            return True
        except Exception as e:
            print(f"錯誤：搬移 {filename} 失敗：{e}", file=sys.stderr)
            return False
    return True

def parse_target_post_from_task(filepath):
    """從 Task Frontmatter 解析 target_post"""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(4096)
            match = re.search(r'target_post:\s*["\']?([^"\']+)["\']?', content)
            if match:
                return match.group(1).strip()
    except Exception:
        pass
    return None

def archive_task_drafts(task_filepath, dry_run=False):
    """專門歸檔特定任務所關聯的所有草稿與衍生過渡檔案"""
    if not os.path.exists(task_filepath):
        print(f"[ERROR] 找不到任務檔案：{task_filepath}", file=sys.stderr)
        return 0

    dt = parse_date_from_filename(os.path.basename(task_filepath)) or parse_date_from_content(task_filepath) or get_file_creation_date(task_filepath)
    if not dt:
        dt = datetime.now().date()
    draft_dest_dir, rel_dest_folder = get_archive_target_dir(DRAFT_ARCHIVE_DIR, dt)

    moved_count = 0
    target_post = parse_target_post_from_task(task_filepath)
    post_slug = ""
    if target_post:
        base_post = os.path.basename(target_post)
        post_slug = re.sub(r'^(?:\d{8}-)?(.*?)(?:\.html)?$', r'\1', base_post).strip()

    # 1. 搬移明確宣告於 related_drafts 中的草稿
    related_drafts = parse_related_drafts_from_task(task_filepath)
    for draft_rel in related_drafts:
        draft_full_path = os.path.join(PROJECT_ROOT, draft_rel) if not os.path.isabs(draft_rel) else draft_rel
        if os.path.exists(draft_full_path) and os.path.isfile(draft_full_path):
            if not os.path.abspath(draft_full_path).startswith(os.path.abspath(DOC_DRAFT_DIR)):
                continue
            draft_name = os.path.basename(draft_full_path)
            if is_protected_draft(draft_name):
                continue
            dest_file_path = os.path.join(draft_dest_dir, draft_name)
            if os.path.abspath(draft_full_path) == os.path.abspath(dest_file_path):
                continue
            print(f"[DRAFT:DECLARED] {os.path.relpath(draft_full_path, PROJECT_ROOT)} -> doc/draft/archive/{rel_dest_folder}/")
            if move_file_safe(draft_full_path, draft_dest_dir, dry_run):
                moved_count += 1

    # 2. 自動偵測 doc/draft/ 根目錄中含有該 post_slug 或任務日期標籤的衍生中間檔案
    if os.path.exists(DOC_DRAFT_DIR):
        for f in os.listdir(DOC_DRAFT_DIR):
            f_path = os.path.join(DOC_DRAFT_DIR, f)
            if not os.path.isfile(f_path) or is_protected_draft(f):
                continue
            is_match = False
            if post_slug and len(post_slug) > 5 and post_slug in f:
                is_match = True
            elif dt and dt.strftime('%Y%m%d') in f:
                is_match = True

            if is_match:
                print(f"[DRAFT:DERIVED] {os.path.relpath(f_path, PROJECT_ROOT)} -> doc/draft/archive/{rel_dest_folder}/")
                if move_file_safe(f_path, draft_dest_dir, dry_run):
                    moved_count += 1

    return moved_count

def process_task_file(filename, src_dir, dry_run, is_archive_root=False, force_all=False):
    """處理任務檔案歸檔 (落實：草稿完成即歸檔，Task 保留今日)"""
    filepath = os.path.join(src_dir, filename)
    today = datetime.now().date()

    dt = parse_date_from_filename(filename)
    source_method = "filename"

    if not dt:
        dt = parse_date_from_content(filepath)
        source_method = "content"

    if not dt:
        dt = get_file_creation_date(filepath)
        source_method = "filesystem"

    is_completed = is_task_completed(filepath)

    task_dest_dir, rel_dest_folder = get_archive_target_dir(TASK_ARCHIVE_DIR, dt)

    moved_count = 0

    # 1. 關聯草稿：【完成即歸檔】！只要任務已完成，不論是否為今日，草稿立即歸檔至 doc/draft/archive/
    if is_completed or force_all:
        moved_count += archive_task_drafts(filepath, dry_run=dry_run)

    # 2. Task 任務檔案本身：【保留今日的 Task】！只有非今日之已完成任務才搬遷至 doc/doc_task/archive/
    should_archive_task = False
    if is_archive_root:
        should_archive_task = True
    elif force_all or (is_completed and dt and dt < today):
        should_archive_task = True

    if should_archive_task:
        rel_src = os.path.relpath(filepath, PROJECT_ROOT)
        print(f"[TASK:{source_method.upper()}] {rel_src} -> doc/doc_task/archive/{rel_dest_folder}/")
        if move_file_safe(filepath, task_dest_dir, dry_run):
            moved_count += 1

    return moved_count

def process_draft_file(filepath, dry_run, is_archive_root=False):
    """處理單一歷史草稿歸檔至對應週目錄"""
    filename = os.path.basename(filepath)
    if is_protected_draft(filename, is_archive_root=is_archive_root):
        return 0

    dt = parse_date_from_filename(filename)
    source_method = "filename"

    if not dt:
        dt = parse_date_from_content(filepath)
        source_method = "content"

    if not dt:
        dt = get_file_creation_date(filepath)
        source_method = "filesystem"

    draft_dest_dir, rel_dest_folder = get_archive_target_dir(DRAFT_ARCHIVE_DIR, dt)
    rel_src = os.path.relpath(filepath, PROJECT_ROOT)
    print(f"[DRAFT:{source_method.upper()}] {rel_src} -> doc/draft/archive/{rel_dest_folder}/")

    return 1 if move_file_safe(filepath, draft_dest_dir, dry_run) else 0

def archive_draft_backfill(dry_run):
    """清理並分類 doc/draft/archive/ 根目錄下的散落歷史草稿"""
    if not os.path.exists(DRAFT_ARCHIVE_DIR):
        return 0

    moved_count = 0
    raw_files = [f for f in os.listdir(DRAFT_ARCHIVE_DIR)
                 if os.path.isfile(os.path.join(DRAFT_ARCHIVE_DIR, f))]

    for filename in raw_files:
        filepath = os.path.join(DRAFT_ARCHIVE_DIR, filename)
        moved_count += process_draft_file(filepath, dry_run, is_archive_root=True)

    return moved_count

def archive_pulse_drafts(dry_run):
    """清理並按月 (YYYY-MM) 分片歸檔 doc/draft/_pulse/ 中的歷史快訊草稿"""
    if not os.path.exists(DOC_PULSE_DIR):
        return 0

    moved_count = 0
    os.makedirs(PULSE_ARCHIVE_DIR, exist_ok=True)

    # 1. 處理 doc/draft/_pulse/ 根目錄下的散落 Pulse
    root_files = [f for f in os.listdir(DOC_PULSE_DIR)
                  if os.path.isfile(os.path.join(DOC_PULSE_DIR, f)) and f.endswith('.md')]

    for filename in root_files:
        if is_protected_pulse(filename):
            continue

        filepath = os.path.join(DOC_PULSE_DIR, filename)
        dt = parse_date_from_filename(filename)
        source_method = "filename"

        if not dt:
            dt = parse_date_from_content(filepath)
            source_method = "content"

        if not dt:
            dt = get_file_creation_date(filepath)
            source_method = "filesystem"

        if not dt:
            month_folder = "unknown"
        else:
            month_folder = dt.strftime('%Y-%m')

        pulse_dest_dir = os.path.join(PULSE_ARCHIVE_DIR, month_folder)
        rel_src = os.path.relpath(filepath, PROJECT_ROOT)
        print(f"[PULSE:{source_method.upper()}] {rel_src} -> doc/draft/_pulse/archive/{month_folder}/")

        if move_file_safe(filepath, pulse_dest_dir, dry_run):
            moved_count += 1

    # 2. 處理舊版 doc/draft/_pulse/pulse-archive/ 目錄中的歷史檔案並整併
    old_archive_dir = os.path.join(DOC_PULSE_DIR, 'pulse-archive')
    if os.path.exists(old_archive_dir) and os.path.isdir(old_archive_dir):
        old_files = [f for f in os.listdir(old_archive_dir)
                     if os.path.isfile(os.path.join(old_archive_dir, f)) and f.endswith('.md')]
        for filename in old_files:
            filepath = os.path.join(old_archive_dir, filename)
            dt = parse_date_from_filename(filename) or parse_date_from_content(filepath) or get_file_creation_date(filepath)
            month_folder = dt.strftime('%Y-%m') if dt else "unknown"
            pulse_dest_dir = os.path.join(PULSE_ARCHIVE_DIR, month_folder)
            rel_src = os.path.relpath(filepath, PROJECT_ROOT)
            print(f"[PULSE:MIGRATE] {rel_src} -> doc/draft/_pulse/archive/{month_folder}/")
            if move_file_safe(filepath, pulse_dest_dir, dry_run):
                moved_count += 1

        # 若舊目錄已清空且非 dry_run，則自動刪除舊目錄
        if not dry_run:
            try:
                remaining = os.listdir(old_archive_dir)
                if not remaining:
                    os.rmdir(old_archive_dir)
                    print(f"[CLEANUP] 已成功移除舊目錄：doc/draft/_pulse/pulse-archive/")
            except Exception as e:
                print(f"[WARNING] 移除舊目錄失敗：{e}", file=sys.stderr)

    return moved_count

def prune_historical_archives(dry_run=False):
    """
    維護任務、草稿與 used 之歷史下沉 (維持第一層僅保留近兩週熱資料)：
    1. 掃描 doc/doc_task/archive/ 第一層 YYYY-MM-DD 目錄，逾 2 週自動移至 historical/
    2. 掃描 doc/draft/archive/ 第一層 YYYY-MM-DD 目錄，逾 2 週自動移至 historical/
    3. 掃描 doc/draft/used/ 第一層檔案，逾 2 週自動移至 historical/
    """
    today = datetime.now().date()
    current_monday = get_monday_of_week(today)
    cutoff_monday = current_monday - timedelta(days=7)  # 保留當週與上週 (2 週熱資料視窗)
    cutoff_date = today - timedelta(days=14)
    moved_count = 0

    # 1. 任務歷史目錄：doc/doc_task/archive/
    if os.path.exists(TASK_ARCHIVE_DIR):
        hist_dir = os.path.join(TASK_ARCHIVE_DIR, 'historical')
        for item in os.listdir(TASK_ARCHIVE_DIR):
            p = os.path.join(TASK_ARCHIVE_DIR, item)
            if os.path.isdir(p) and item != 'historical':
                dt = parse_date_from_filename(item)
                if dt and dt < cutoff_monday:
                    print(f"[PRUNE:TASK] doc/doc_task/archive/{item} -> historical/{item}")
                    if move_file_safe(p, hist_dir, dry_run):
                        moved_count += 1

    # 2. 草稿歷史目錄：doc/draft/archive/
    if os.path.exists(DRAFT_ARCHIVE_DIR):
        hist_dir = os.path.join(DRAFT_ARCHIVE_DIR, 'historical')
        for item in os.listdir(DRAFT_ARCHIVE_DIR):
            p = os.path.join(DRAFT_ARCHIVE_DIR, item)
            if os.path.isdir(p) and item != 'historical':
                dt = parse_date_from_filename(item)
                if dt and dt < cutoff_monday:
                    print(f"[PRUNE:DRAFT] doc/draft/archive/{item} -> historical/{item}")
                    if move_file_safe(p, hist_dir, dry_run):
                        moved_count += 1

    # 3. 已用草稿：doc/draft/used/
    used_dir = os.path.join(DOC_DRAFT_DIR, 'used')
    if os.path.exists(used_dir):
        hist_dir = os.path.join(used_dir, 'historical')
        for item in os.listdir(used_dir):
            p = os.path.join(used_dir, item)
            if os.path.isfile(p):
                stat = os.stat(p)
                last_active_dt = datetime.fromtimestamp(stat.st_mtime).date()
                if last_active_dt < cutoff_date:
                    print(f"[PRUNE:USED] doc/draft/used/{item} -> historical/{item}")
                    if move_file_safe(p, hist_dir, dry_run):
                        moved_count += 1

    return moved_count

def check_ssot_guard():
    """執行 SSOT 守門員檢查，確保無架構漂移才允許歸檔任務"""
    check_script = os.path.join(PROJECT_ROOT, "tools", "check_ssot_drift.py")
    if not os.path.exists(check_script):
        return True
    try:
        cmd = [sys.executable, check_script]
        res = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            print("\n[ERROR] 🛑 任務歸檔守門員攔截：全站 SSOT 檢查未通過！", file=sys.stderr)
            if res.stdout:
                for line in res.stdout.strip().splitlines():
                    print(f"  {line}", file=sys.stderr)
            print("\n[ERROR] 存在架構漂移或未同步項目，請先修復漂移 (執行 python scratch/manage.py audit-ssot) 再進行歸檔。\n", file=sys.stderr)
            return False
        return True
    except Exception as e:
        print(f"[WARNING] 執行 SSOT 守門員檢查時發生例外：{e}", file=sys.stderr)
        return True

def main():
    dry_run = '--dry-run' in sys.argv
    force_all = '--force' in sys.argv or '--all' in sys.argv
    tasks_only = '--tasks-only' in sys.argv
    drafts_only = '--drafts-only' in sys.argv
    pulse_only = '--pulse-only' in sys.argv
    skip_audit = '--skip-audit' in sys.argv

    # 專用草稿歸檔模式支援
    task_arg = None
    if '--task' in sys.argv:
        idx = sys.argv.index('--task')
        if idx + 1 < len(sys.argv):
            task_arg = sys.argv[idx + 1]
    archive_drafts_mode = '--archive-drafts' in sys.argv or (task_arg is not None)

    print("==================================================")
    print(" 歷史任務與草稿歸檔管理工具 (Task & Draft Manager)")
    print("==================================================")
    if dry_run:
        print("====== DRY RUN 模式：不會進行實際檔案搬移 ======")
    if force_all:
        print("[!] 強制模式 (--force): 將無視狀態歸檔所有非今日歷史任務。")

    os.makedirs(TASK_ARCHIVE_DIR, exist_ok=True)
    os.makedirs(DRAFT_ARCHIVE_DIR, exist_ok=True)
    os.makedirs(PULSE_ARCHIVE_DIR, exist_ok=True)

    total_moved = 0

    # 若為專用草稿歸檔模式
    if archive_drafts_mode:
        print("\n--- 專屬草稿生命週期歸檔模式 (Archive Drafts Mode) ---")
        if task_arg:
            full_task_path = os.path.join(PROJECT_ROOT, task_arg) if not os.path.isabs(task_arg) else task_arg
            print(f"[*] 指定任務：{os.path.relpath(full_task_path, PROJECT_ROOT)}")
            total_moved += archive_task_drafts(full_task_path, dry_run=dry_run)
        else:
            print("[*] 掃描所有已完成任務進行關聯草稿收斂歸檔...")
            doc_task_files = [f for f in os.listdir(DOC_TASK_DIR) if f.startswith('task_') and f.endswith('.md')]
            for tf in doc_task_files:
                tf_path = os.path.join(DOC_TASK_DIR, tf)
                if is_task_completed(tf_path):
                    total_moved += archive_task_drafts(tf_path, dry_run=dry_run)

        # 自動滑動維護歷史下沉
        total_moved += prune_historical_archives(dry_run=dry_run)

        print("\n==================================================")
        if dry_run:
            print(f"DRY RUN 完畢。預計搬移/歸檔 {total_moved} 個草稿檔案。")
        else:
            print(f"草稿歸檔完成。成功搬移/歸檔 {total_moved} 個草稿檔案。")
        print("==================================================")
        return

    # 1. 處理任務歸檔 (Tasks)
    if not drafts_only and not pulse_only:
        print("\n--- [1/3] 檢查歷史任務檔案 (Tasks & Related Drafts) ---")
        if not skip_audit:
            print("[*] 執行任務歸檔前置守門員 (SSOT Drift & Graph Guard)...")
            if not check_ssot_guard():
                print("[!] 任務歸檔中斷：SSOT 守門員未通過。如需略過請傳入 --skip-audit。", file=sys.stderr)
                sys.exit(1)
            print("[✓] SSOT 守門員檢查通過，准予執行任務歸檔。")

        archive_root_files = [f for f in os.listdir(TASK_ARCHIVE_DIR) 
                              if os.path.isfile(os.path.join(TASK_ARCHIVE_DIR, f)) and f.endswith('.md')]
        for filename in archive_root_files:
            total_moved += process_task_file(filename, TASK_ARCHIVE_DIR, dry_run, is_archive_root=True, force_all=force_all)

        doc_task_files = [f for f in os.listdir(DOC_TASK_DIR)
                          if os.path.isfile(os.path.join(DOC_TASK_DIR, f)) and f.endswith('.md')]
        for filename in doc_task_files:
            if filename in PROTECTED_TASK_FILES or filename.startswith('task_SOP'):
                continue
            if filename.startswith('task_'):
                total_moved += process_task_file(filename, DOC_TASK_DIR, dry_run, is_archive_root=False, force_all=force_all)

    # 2. 處理長文草稿歷史存量整理 (Drafts Backfill)
    if not tasks_only and not pulse_only:
        print("\n--- [2/3] 檢查 doc/draft/archive/ 歷史散落草稿 ---")
        total_moved += archive_draft_backfill(dry_run)

    # 3. 處理市場瞬息草稿按月歸檔 (Pulse Drafts)
    if not tasks_only:
        print("\n--- [3/3] 檢查 doc/draft/_pulse/ 市場瞬息草稿按月歸檔 ---")
        total_moved += archive_pulse_drafts(dry_run)

    # 4. 歷史下沉滑動維護 (保持第一層極致精簡)
    print("\n--- [4/4] 歷史下沉滑動維護 (維持第一層僅保留近兩週熱資料) ---")
    total_moved += prune_historical_archives(dry_run)

    print("\n==================================================")
    if dry_run:
        print(f"DRY RUN 完畢。預計搬移/分類 {total_moved} 個檔案。")
    else:
        print(f"歸檔完成。成功搬移/分類 {total_moved} 個檔案。")
    print("==================================================")

if __name__ == '__main__':
    main()
