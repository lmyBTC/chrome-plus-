#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import sys
import shutil
import argparse
from datetime import datetime

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

def init_task(plugin, title):
    """初始化一個新任務"""
    # 驗證插件目錄是否存在
    plugin_path = os.path.join(BASE_DIR, plugin)
    if not os.path.isdir(plugin_path) and plugin != 'workspace':
        print(f"[警告] 找不到插件目錄 '{plugin}'，但仍會繼續建立任務。")

    # 確保任務目錄存在
    os.makedirs(TASKS_DIR, exist_ok=True)

    # 取得日期與檔名 slug
    date_str = datetime.now().strftime('%Y%m%d')
    title_slug = slugify(title)
    task_filename = f"task_{date_str}_{plugin}_{title_slug}.md"
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
    current_date_hyphen = datetime.now().strftime('%Y-%m-%d')
    content = content.replace('[任務標題]', title)
    content = content.replace('[請填寫插件目錄名稱，例如: chrome_scrumclock | chrome_video speed plus | finance-research-clipper-oss]', plugin)
    content = content.replace('YYYY-MM-DD', current_date_hyphen)
    content = content.replace('[plugin]', plugin)

    # 寫入新檔案 (強制 UTF-8，無 BOM)
    with open(task_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)

    print(f"[成功] 已初始化任務檔案: {os.path.relpath(task_path, BASE_DIR)}")
    print(f"       檔名: {task_filename}")

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

def archive_tasks(dry_run=False):
    """自動歸檔狀態為已完成的任務"""
    if not os.path.exists(TASKS_DIR):
        print("[資訊] 任務目錄不存在，無須歸檔。")
        return

    archived_count = 0
    # 遍歷任務目錄下的所有 markdown 檔案
    for filename in os.listdir(TASKS_DIR):
        if not filename.endswith('.md') or filename.startswith('task_template'):
            continue

        file_path = os.path.join(TASKS_DIR, filename)
        if not os.path.isfile(file_path):
            continue

        metadata = parse_frontmatter(file_path)
        if not metadata:
            continue

        status = metadata.get('status', '')
        plugin = metadata.get('plugin', 'unknown')

        # 如果狀態是 "已完成" 或 "Closed"
        if status in ['已完成', 'Closed']:
            # 清理插件名稱做為子資料夾
            plugin_dir = slugify(plugin)
            archive_subdir = os.path.join(TASKS_DIR, 'archive', plugin_dir)
            target_path = os.path.join(archive_subdir, filename)

            print(f"[檢測到已完成任務] {filename} (所屬插件: {plugin})")
            
            if dry_run:
                print(f"  [模擬] 將移至: {os.path.relpath(target_path, BASE_DIR)}")
            else:
                os.makedirs(archive_subdir, exist_ok=True)
                shutil.move(file_path, target_path)
                print(f"  [完成] 已移至: {os.path.relpath(target_path, BASE_DIR)}")
                archived_count += 1

    if archived_count > 0:
        print(f"[歸檔完畢] 共成功歸檔 {archived_count} 個任務檔案。")
    else:
        print("[資訊] 未發現符合歸檔條件的已完成任務。")

def main():
    parser = argparse.ArgumentParser(description="多插件開發區任務生命週期 CLI 工具")
    subparsers = parser.add_subparsers(dest="command", help="子指令")

    # init 指令
    init_parser = subparsers.add_parser('init', help='初始化新任務檔案')
    init_parser.add_argument('--plugin', required=True, help='此任務所屬的插件目錄名稱 (例如: chrome_scrumclock)')
    init_parser.add_argument('--title', required=True, help='任務標題名稱')

    # archive 指令
    archive_parser = subparsers.add_parser('archive', help='自動歸檔已完成的任務')
    archive_parser.add_argument('--dry-run', action='store_true', help='模擬執行，不實際搬移檔案')

    args = parser.parse_args()

    if args.command == 'init':
        init_task(args.plugin, args.title)
    elif args.command == 'archive':
        archive_tasks(args.dry_run)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
