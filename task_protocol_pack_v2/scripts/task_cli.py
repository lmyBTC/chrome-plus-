#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import sys
import shutil
import argparse
import subprocess
from datetime import datetime, date

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from lib.common import (
    get_repo_root,
    setup_utf8_output,
    parse_frontmatter as common_parse_frontmatter,
    get_active_task,
    REPO_ROOT,
    TASKS_DIR as COMMON_TASKS_DIR,
    TEMPLATE_PATH as COMMON_TEMPLATE_PATH,
)

setup_utf8_output()

# 基礎路徑定義 (SSOT)
BASE_DIR = str(REPO_ROOT)
TASKS_DIR = str(COMMON_TASKS_DIR)
TEMPLATE_PATH = str(COMMON_TEMPLATE_PATH)

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
    """解析 Markdown 檔案的 YAML Frontmatter (委派至 lib.common)"""
    meta = common_parse_frontmatter(file_path)
    return meta if meta else None

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
    "gemini-nano": "chrome_gemini_nano",
    "chrome_gemini_nano": "chrome_gemini_nano",
    "global": "global",
    "workspace": "global",
    "agents": "global",
}

def normalize_plugin_dir(plugin, archive_root):
    """將 plugin 標籤映射為 archive 目錄名稱"""
    clean_plugin = plugin.strip().lower()
    if clean_plugin in PLUGIN_DIR_MAP:
        return PLUGIN_DIR_MAP[clean_plugin]
    cand_path = os.path.join(archive_root, plugin)
    if os.path.isdir(cand_path):
        return plugin
    return slugify(plugin) or "global"

def archive_tasks(dry_run=False, max_buffer=10, threshold_days=30):
    """自動歸檔狀態為已完成的任務，並落實雙層滾動歸檔 (Two-Tier Archive Governance)"""
    if not os.path.exists(TASKS_DIR):
        print("[資訊] 任務目錄不存在，無須歸檔。")
        return

    today = date.today()
    archived_count = 0
    buffer_overflow_count = 0
    rotated_count = 0
    archive_root = os.path.join(TASKS_DIR, 'archive')
    os.makedirs(archive_root, exist_ok=True)

    print("==================================================")
    print("      Chrome Plus 任務生命週期雙層歸檔工具         ")
    print(f" 基準日: {today.isoformat()} | 緩衝上限: {max_buffer} 筆 | 歷史閾值: {threshold_days} 天 | 模式: {'【模擬預覽】' if dry_run else '【正式執行】'}")
    print("==================================================")

    # 1. 階段 1：掃描 tasks 根目錄待結案之活躍任務，移入 archive/ 根目錄（近期緩衝區）
    print("\n[階段 1] 掃描 tasks 根目錄已完成任務 (移入 archive/ 緩衝區)...")
    tasks_to_archive = []
    completed_keywords = ["已完成", "closed", "done", "已結案"]
    for filename in sorted(os.listdir(TASKS_DIR)):
        if not filename.endswith('.md') or filename.startswith('task_template'):
            continue

        file_path = os.path.join(TASKS_DIR, filename)
        if not os.path.isfile(file_path):
            continue

        metadata = parse_frontmatter(file_path)
        if not metadata:
            continue

        status = metadata.get('status', '').lower()
        if any(k in status for k in completed_keywords):
            target_path = os.path.join(archive_root, filename)
            tasks_to_archive.append((filename, file_path, target_path))

    if tasks_to_archive:
        for fn, src, dst in tasks_to_archive:
            print(f"  [檢測到已完成] {fn}")
            if dry_run:
                print(f"    [模擬] 將移至緩衝區: {os.path.relpath(dst, BASE_DIR)}")
            else:
                shutil.move(src, dst)
                print(f"    [完成] 已移至緩衝區: {os.path.relpath(dst, BASE_DIR)}")
                archived_count += 1
    else:
        print("  [資訊] tasks/ 根目錄無符合結案條件的任務檔案。")

    # 2. 階段 2：檢查 archive/ 根目錄緩衝區，保留最新 max_buffer 份，溢出分流至各插件目錄
    print(f"\n[階段 2] 檢查 archive/ 緩衝區 (保留最新 {max_buffer} 份，溢出分流至插件目錄)...")
    root_task_files = {}
    if os.path.isdir(archive_root):
        for fn in os.listdir(archive_root):
            fp = os.path.join(archive_root, fn)
            if os.path.isfile(fp) and fn.startswith('task_') and fn.endswith('.md'):
                root_task_files[fn] = fp

    if dry_run:
        for fn, src, dst in tasks_to_archive:
            root_task_files[fn] = src

    buffer_tasks = []
    for fn, fp in root_task_files.items():
        meta = parse_frontmatter(fp) or {}
        f_date = parse_date_from_file(fn, meta) or date.min
        plugin = meta.get('plugin', 'global')
        buffer_tasks.append({
            'filename': fn,
            'filepath': os.path.join(archive_root, fn),
            'actual_src': fp,
            'date': f_date,
            'plugin': plugin
        })

    buffer_tasks.sort(key=lambda x: (x['date'], x['filename']), reverse=True)

    overflow_moves = []
    if len(buffer_tasks) > max_buffer:
        overflow = buffer_tasks[max_buffer:]
        print(f"  緩衝區現存 {len(buffer_tasks)} 份 > 上限 {max_buffer} 份，觸發溢出分流 ({len(overflow)} 份):")
        for item in overflow:
            plugin_dir = normalize_plugin_dir(item['plugin'], archive_root)
            dest_dir = os.path.join(archive_root, plugin_dir)
            dest_path = os.path.join(dest_dir, item['filename'])
            overflow_moves.append((item['filename'], item['actual_src'], dest_dir, dest_path, plugin_dir, item['date']))
    else:
        print(f"  [OK] archive/ 根層緩衝區共 {len(buffer_tasks)} 份任務 (<= 上限 {max_buffer})，全數常態保留。")
        for item in buffer_tasks:
            print(f"    + [緩衝保留] {item['filename']} [{item['date'].isoformat()}]")

    if overflow_moves:
        for fn, src, ddir, dst, pdir, f_date in overflow_moves:
            print(f"  [溢出分流] {fn} [{f_date.isoformat()}] ➔ archive/{pdir}/")
            if dry_run:
                print(f"    [模擬] 將移至: {os.path.relpath(dst, BASE_DIR)}")
            else:
                os.makedirs(ddir, exist_ok=True)
                shutil.move(src, dst)
                print(f"    [完成] 已移至: {os.path.relpath(dst, BASE_DIR)}")
                buffer_overflow_count += 1

    # 3. 階段 3：檢查 archive/ 各插件目錄，逾期任務下沉至 history/
    print(f"\n[階段 3] 檢查 archive/ 各插件目錄逾期下沉至 history/ (閾值: {threshold_days} 天)...")
    rotate_moves = []
    if os.path.isdir(archive_root):
        for plugin_folder in sorted(os.listdir(archive_root)):
            p_path = os.path.join(archive_root, plugin_folder)
            if not os.path.isdir(p_path) or plugin_folder in ('history',):
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
        print("  [資訊] archive/ 各插件第一層檔案均在閾值內，無須滾動下沉。")

    print("\n==================================================")
    if dry_run:
        print(f"[總結] 模擬預覽完成。新歸檔至緩衝: {len(tasks_to_archive)} 份，緩衝溢出分流: {len(overflow_moves)} 份，插件歷史下沉: {len(rotate_moves)} 份。")
    else:
        print(f"[總結] 歸檔維護完成。成功新歸檔: {archived_count} 份，緩衝溢出分流: {buffer_overflow_count} 份，插件歷史下沉: {rotated_count} 份。")

def generate_handover(task_path=None):
    """
    自動提取進行中任務之下一 Phase 目標與 Context 快照，輸出精準接力代碼塊。
    """
    target_file = None
    if task_path:
        from pathlib import Path
        p = Path(task_path)
        if p.is_file():
            target_file = p
        elif (REPO_ROOT / task_path).is_file():
            target_file = REPO_ROOT / task_path
        elif (COMMON_TASKS_DIR / task_path).is_file():
            target_file = COMMON_TASKS_DIR / task_path

    if not target_file:
        target_file = get_active_task()

    if not target_file or not os.path.isfile(str(target_file)):
        print("[錯誤] 未能定位進行中任務檔案，請手動指定 task 檔案路徑。")
        sys.exit(1)

    target_file = str(target_file)
    try:
        with open(target_file, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception:
        with open(target_file, "r", encoding="utf-8-sig") as f:
            content = f.read()

    rel_task_path = os.path.relpath(target_file, str(REPO_ROOT)).replace("\\", "/")

    # 正則提取所有 Phase
    phase_pattern = re.compile(r"^###\s+(Phase\s+[^:\n]+):\s*(.+)$", re.MULTILINE)
    phases = []
    for m in phase_pattern.finditer(content):
        phase_label = m.group(1).strip()
        rest = m.group(2).strip()
        status_m = re.search(r"狀態：\s*`?\[(.*?)\]`?", rest)
        status = status_m.group(1).strip() if status_m else "待辦"
        phase_title = re.sub(r"\s*狀態：.*$", "", rest).strip()
        phases.append({
            "label": phase_label,
            "title": phase_title,
            "status": status,
        })

    next_phase = None
    completed_phases = []
    for p in phases:
        if p["status"] == "已完成":
            completed_phases.append(p)
        elif not next_phase:
            next_phase = p

    print("==================================================")
    print("  🚀 SESSION HANDOVER (跨會話無損接力指令)")
    print("==================================================")
    print(f"任務檔案: {rel_task_path}")
    if completed_phases:
        last_done = completed_phases[-1]
        print(f"前置階段: {last_done['label']} ({last_done['title']}) [已完成]")

    if next_phase:
        prompt = f"請讀取 {rel_task_path}，開始執行 {next_phase['label']} ({next_phase['title']})"
        print(f"接力目標: {next_phase['label']} ({next_phase['title']}) [{next_phase['status']}]")
        print("\n請複製以下指令至新對話 Session 即可冷啟動：")
        print("--------------------------------------------------")
        print(prompt)
        print("--------------------------------------------------")
    else:
        print("\n[🎉 恭喜] 所有 Phase 均已完成！請進行驗收審計或執行 task_cli.py archive 歸檔。")
    print("==================================================")

def main():
    parser = argparse.ArgumentParser(description="多插件開發區任務生命週期 CLI 工具")
    subparsers = parser.add_subparsers(dest="command", help="子指令")

    # init 指令
    init_parser = subparsers.add_parser('init', help='初始化新任務檔案')
    init_parser.add_argument('plugin_pos', nargs='?', default=None, help='插件名稱 (位置參數)')
    init_parser.add_argument('title_pos', nargs='?', default=None, help='任務標題名稱 (位置參數)')
    init_parser.add_argument('--plugin', help='此任務所屬的插件目錄名稱 (例如: chrome_pk | global)')
    init_parser.add_argument('--title', help='任務標題名稱')
    init_parser.add_argument('--seq', type=int, default=None, help='自訂當日流水號 (例如: 1 或 2，預設自動遞增)')
    init_parser.add_argument('--no-git', action='store_true', help='略過自動 git add')

    # archive 指令
    archive_parser = subparsers.add_parser('archive', help='自動歸檔已完成的任務與雙層滾動維護')
    archive_parser.add_argument('--dry-run', action='store_true', help='模擬執行，不實際搬移檔案')
    archive_parser.add_argument('--buffer', type=int, default=10, help='archive 根目錄近期緩衝區常態保留數 (預設: 10)')
    archive_parser.add_argument('--days', type=int, default=30, help='超過指定天數下沉至 history/ (預設 30 天)')

    # handover 指令
    handover_parser = subparsers.add_parser('handover', help='自動生成新 Session 接力提示詞')
    handover_parser.add_argument('task_pos', nargs='?', default=None, help='指定任務檔案路徑 (可選位置參數)')
    handover_parser.add_argument('--task', '-t', default=None, help='指定任務檔案路徑')

    args = parser.parse_args()

    if args.command == 'init':
        plugin = args.plugin or args.plugin_pos
        title = args.title or args.title_pos
        if not plugin or not title:
            init_parser.print_help()
            print("\n[錯誤] 缺少必要的插件名稱或任務標題。用法範例：")
            print("  py 1.devtools/tools/task_cli.py init global my_cool_feature")
            sys.exit(1)
        init_task(plugin, title, no_git=args.no_git, seq=args.seq)
    elif args.command == 'archive':
        archive_tasks(dry_run=args.dry_run, max_buffer=args.buffer, threshold_days=args.days)
    elif args.command == 'handover':
        task_file = args.task or args.task_pos
        generate_handover(task_path=task_file)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
