#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import sys
import shutil
import argparse
import subprocess
from datetime import datetime, date

# 嘗試將標準輸出設定為 UTF-8
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# 基礎路徑定義
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TASKS_DIR = os.path.join(BASE_DIR, '0.doc_mg', 'tasks')
TEMPLATE_PATH = os.path.join(BASE_DIR, '0.doc_mg', 'task_template_v2.md')

def slugify(text):
    """將標題轉為適合做為檔名的 slug (英文字母、數字、底線、中文字)"""
    # 移除非法字元，保留底線、中文字、英文字母、數字與減號
    text = re.sub(r'[^\w\s-]', '', text)
    # 取代空格與連續減號/底線為單一底線
    text = re.sub(r'[-\s]+', '_', text)
    return text.strip('_')

def get_next_sequence_number(date_str, full_date_str=None):
    """
    掃描 tasks 與 archive 目錄中當日現存任務，計算下一個流水號（回傳格式為兩位數字串，如 '01', '02'）。
    支援同時比對:
      - 新格式: task_{date_str}_... (如 task_1020_01_...)
      - 歷史格式: task_{full_date_str}_... (如 task_20261020_...)
    """
    prefixes = [f"task_{date_str}_"]
    if full_date_str and full_date_str != date_str:
        prefixes.append(f"task_{full_date_str}_")

    found_files = []
    # 1. 掃描 TASKS_DIR 根層
    if os.path.exists(TASKS_DIR):
        for f in os.listdir(TASKS_DIR):
            if f.endswith('.md') and any(f.startswith(p) for p in prefixes):
                found_files.append(f)
        # 2. 掃描 archive/ 目錄樹
        archive_dir = os.path.join(TASKS_DIR, 'archive')
        if os.path.isdir(archive_dir):
            for root, _, files in os.walk(archive_dir):
                for f in files:
                    if f.endswith('.md') and any(f.startswith(p) for p in prefixes):
                        found_files.append(f)

    max_seq = 0
    seq_regexes = [
        re.compile(rf"^{re.escape(p)}(\d{{2}})_") for p in prefixes
    ]

    for f in found_files:
        for r in seq_regexes:
            m = r.match(f)
            if m:
                seq_val = int(m.group(1))
                if seq_val > max_seq:
                    max_seq = seq_val
                break

    if max_seq > 0:
        next_seq = max(max_seq + 1, len(found_files) + 1)
    else:
        next_seq = len(found_files) + 1

    return f"{next_seq:02d}"

def init_task(plugin, title, no_git=False, seq=None):
    """初始化一個新任務"""
    # 驗證插件目錄是否存在
    plugin_path = os.path.join(BASE_DIR, plugin)
    if not os.path.isdir(plugin_path) and plugin not in ('workspace', 'global'):
        print(f"[警告] 找不到插件目錄 '{plugin}'，但仍會繼續建立任務。")

    # 確保任務目錄存在
    os.makedirs(TASKS_DIR, exist_ok=True)

    # 取得短日期 (MMDD) 與歷史全日期 (YYYYMMDD)
    now = datetime.now()
    date_str = now.strftime('%m%d')
    full_date_str = now.strftime('%Y%m%d')

    # 流水號處理 (若無傳入則自動計算)
    if seq is not None:
        seq_str = f"{int(seq):02d}"
    else:
        seq_str = get_next_sequence_number(date_str, full_date_str)

    title_slug = slugify(title)
    task_filename = f"task_{date_str}_{seq_str}_{plugin}_{title_slug}.md"
    task_path = os.path.join(TASKS_DIR, task_filename)

    # 檢查是否已存在同名檔案
    if os.path.exists(task_path):
        print(f"[錯誤] 任務檔案已存在: {task_filename}")
        sys.exit(1)

    # 讀取範本
    if not os.path.exists(TEMPLATE_PATH):
        print(f"[錯誤] 找不到範本檔案: {TEMPLATE_PATH}")
        sys.exit(1)

    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # 替換範本內容中的 placeholder
    current_date_hyphen = now.strftime('%Y-%m-%d')
    content = content.replace('[任務標題]', title)
    content = content.replace('[請填寫插件目錄名稱，例如: chrome_pk | chrome_video speed plus | finance-research-clipper-oss | global]', plugin)
    content = content.replace('[請填寫插件目錄名稱，例如: chrome_pk | chrome_video speed plus | finance-research-clipper-oss]', plugin)
    content = content.replace('[請填寫插件目錄名稱，例如: chrome_scrumclock | chrome_video speed plus | finance-research-clipper-oss | global]', plugin)
    content = content.replace('[請填寫插件目錄名稱，例如: chrome_scrumclock | chrome_video speed plus | finance-research-clipper-oss]', plugin)
    content = content.replace('YYYY-MM-DD', current_date_hyphen)
    content = content.replace('[plugin]', plugin)

    # 自動正則移除所有 <!-- ... --> 註解
    content = re.sub(r'<!--[\s\S]*?-->', '', content)

    # 清理因移除註解留下的多餘空行與空白
    cleaned_lines = []
    for line in content.splitlines():
        if re.match(r'^\s*>\s*$', line):
            continue
        cleaned_lines.append(line.rstrip())
    
    # 壓縮連續超過 2 行的空行
    content = re.sub(r'\n{3,}', '\n\n', '\n'.join(cleaned_lines)) + '\n'

    # 寫入新檔案 (強制 UTF-8，無 BOM)
    with open(task_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)

    rel_task = os.path.relpath(task_path, BASE_DIR)
    print(f"[成功] 已初始化任務檔案: {rel_task}")
    print(f"       檔名: {task_filename}")

    # 自動 git add
    if not no_git:
        try:
            res = subprocess.run(['git', 'add', rel_task], cwd=BASE_DIR, capture_output=True, text=True)
            if res.returncode == 0:
                print(f"[Git] 已自動將任務檔納入版本防護 (git add {rel_task})")
            else:
                print(f"[警告] 自動 git add 失敗: {res.stderr.strip()}")
        except Exception as e:
            print(f"[警告] 自動 git add 異常: {e}")

def parse_frontmatter(file_path):
    """解析 Markdown 檔案的 YAML Frontmatter"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"[錯誤] 無法讀取檔案 {file_path}: {e}")
        return None

    # 匹配最上方的 --- block
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not match:
        return None

    yaml_block = match.group(1)
    metadata = {}
    for line in yaml_block.splitlines():
        if ':' in line:
            key, val = line.split(':', 1)
            # 移除 YAML 註解
            val_clean = val.split('#', 1)[0].strip()
            metadata[key.strip()] = val_clean.strip('"').strip("'")
    return metadata

# 正則：支援舊版 8 碼 (YYYYMMDD) 與新版 4 碼 (MMDD)
DATE_PATTERN_8 = re.compile(r"^task_(\d{4})(\d{2})(\d{2})_.*\.md$")
DATE_PATTERN_4 = re.compile(r"^task_(\d{2})(\d{2})_.*\.md$")

def parse_date_from_file(filename, metadata=None):
    """從檔名或 frontmatter 取得任務建立/過期日期"""
    # 1. 優先嘗試舊版 8 碼日期 (YYYYMMDD)
    m8 = DATE_PATTERN_8.match(filename)
    if m8:
        try:
            return date(int(m8.group(1)), int(m8.group(2)), int(m8.group(3)))
        except ValueError:
            pass

    # 2. 嘗試從 frontmatter 取得完整日期 (最高可信度之 YYYY-MM-DD)
    if metadata:
        created_str = metadata.get('created') or metadata.get('deadline')
        if created_str:
            try:
                parts = created_str.split('-')
                return date(int(parts[0]), int(parts[1]), int(parts[2]))
            except Exception:
                pass

    # 3. 嘗試新版 4 碼日期 (MMDD)，年份預設以今年推斷
    m4 = DATE_PATTERN_4.match(filename)
    if m4:
        try:
            current_year = date.today().year
            return date(current_year, int(m4.group(1)), int(m4.group(2)))
        except ValueError:
            pass

    return None

def archive_tasks(dry_run=False, threshold_days=30):
    """自動歸檔狀態為已完成的任務，並落實雙層滾動歸檔 (Two-Tier Archive Governance)"""
    if not os.path.exists(TASKS_DIR):
        print("[資訊] 任務目錄不存在，無須歸檔。")
        return

    today = date.today()
    archived_count = 0
    rotated_count = 0

    print("==================================================")
    print("      Chrome Plus 任務生命週期雙層歸檔工具         ")
    print(f" 基準日: {today.isoformat()} | 歷史閾值: {threshold_days} 天 | 模式: {'【模擬預覽】' if dry_run else '【正式執行】'}")
    print("==================================================")

    # 1. 掃描 TASKS_DIR 根目錄下待結案之活躍任務
    print("\n[階段 1] 掃描待結案之已完成任務...")
    tasks_to_archive = []
    for filename in sorted(os.listdir(TASKS_DIR)):
        if not filename.endswith('.md') or filename.startswith('task_template'):
            continue

        file_path = os.path.join(TASKS_DIR, filename)
        if not os.path.isfile(file_path):
            continue

        metadata = parse_frontmatter(file_path)
        if not metadata:
            continue

        status = metadata.get('status', '')
        plugin = metadata.get('plugin', 'global')

        if status in ['已完成', 'Closed']:
            plugin_dir = slugify(plugin)
            file_date = parse_date_from_file(filename, metadata)
            days_diff = (today - file_date).days if file_date else 0

            # 雙層判定：超過 threshold_days 則直接進入 history/ 子目錄
            if days_diff > threshold_days:
                target_dir = os.path.join(TASKS_DIR, 'archive', plugin_dir, 'history')
                tier_label = f"歷史下沉 (> {threshold_days} 天 ➔ {plugin_dir}/history/)"
            else:
                target_dir = os.path.join(TASKS_DIR, 'archive', plugin_dir)
                tier_label = f"近期活躍 (<= {threshold_days} 天 ➔ {plugin_dir}/)"

            target_path = os.path.join(target_dir, filename)
            tasks_to_archive.append((filename, file_path, target_path, tier_label))

    if tasks_to_archive:
        for fn, src, dst, tier in tasks_to_archive:
            print(f"  [檢測到已完成] {fn}")
            if dry_run:
                print(f"    [模擬] 將移至: {os.path.relpath(dst, BASE_DIR)} ({tier})")
            else:
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.move(src, dst)
                print(f"    [完成] 已移至: {os.path.relpath(dst, BASE_DIR)} ({tier})")
                archived_count += 1
    else:
        print("  [資訊] 未發現符合結案條件的任務檔案。")

    # 2. 雙層滾動巡檢：檢查 archive/ 各插件第一層，逾期任務下沉至 history/
    print("\n[階段 2] 檢查 archive/ 各目錄是否需雙層滾動下沉至 history/...")
    archive_root = os.path.join(TASKS_DIR, 'archive')
    rotate_moves = []

    if os.path.isdir(archive_root):
        for plugin_folder in sorted(os.listdir(archive_root)):
            p_path = os.path.join(archive_root, plugin_folder)
            if not os.path.isdir(p_path) or plugin_folder == 'history':
                continue

            for fn in sorted(os.listdir(p_path)):
                src_file = os.path.join(p_path, fn)
                if not os.path.isfile(src_file) or not fn.endswith('.md'):
                    continue

                metadata = parse_frontmatter(src_file)
                f_date = parse_date_from_file(fn, metadata)
                if not f_date:
                    continue

                days_diff = (today - f_date).days
                if days_diff > threshold_days:
                    dest_history_dir = os.path.join(p_path, 'history')
                    dest_file = os.path.join(dest_history_dir, fn)
                    rotate_moves.append((fn, src_file, dest_file, days_diff, plugin_folder))

    if rotate_moves:
        for fn, src, dst, diff, p_name in rotate_moves:
            print(f"  [逾期滾動] {p_name}/{fn} (建立距今 {diff} 天 > {threshold_days} 天)")
            if dry_run:
                print(f"    [模擬] 將下沉至: {os.path.relpath(dst, BASE_DIR)}")
            else:
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.move(src, dst)
                print(f"    [完成] 已下沉至: {os.path.relpath(dst, BASE_DIR)}")
                rotated_count += 1
    else:
        print("  [資訊] archive/ 第一層檔案均在閾值內，無須滾動下沉。")

    print("\n==================================================")
    if dry_run:
        print(f"[總結] 模擬預覽完成。待歸檔: {len(tasks_to_archive)} 份，待滾動: {len(rotate_moves)} 份。")
    else:
        print(f"[總結] 歸檔維護完成。成功新歸檔: {archived_count} 份，成功滾動下沉: {rotated_count} 份。")

def main():
    parser = argparse.ArgumentParser(description="多插件開發區任務生命週期 CLI 工具")
    subparsers = parser.add_subparsers(dest="command", help="子指令")

    # init 指令
    init_parser = subparsers.add_parser('init', help='初始化新任務檔案')
    init_parser.add_argument('--plugin', required=True, help='此任務所屬的插件目錄名稱 (例如: chrome_pk | global)')
    init_parser.add_argument('--title', required=True, help='任務標題名稱')
    init_parser.add_argument('--seq', type=int, default=None, help='自訂當日流水號 (例如: 1 或 2，預設自動遞增)')
    init_parser.add_argument('--no-git', action='store_true', help='略過自動 git add')

    # archive 指令
    archive_parser = subparsers.add_parser('archive', help='自動歸檔已完成的任務與雙層滾動維護')
    archive_parser.add_argument('--dry-run', action='store_true', help='模擬執行，不實際搬移檔案')
    archive_parser.add_argument('--days', type=int, default=30, help='超過指定天數下沉至 history/ (預設 30 天)')

    args = parser.parse_args()

    if args.command == 'init':
        init_task(args.plugin, args.title, no_git=args.no_git, seq=args.seq)
    elif args.command == 'archive':
        archive_tasks(dry_run=args.dry_run, threshold_days=args.days)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
