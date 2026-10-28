# -*- coding: utf-8 -*-
"""
Task and Token Protocol Pack - Installer and Updater for Chrome Plus Project
============================================================================
此腳本可將 task_protocol_pack 中的最新規範、技能與工具腳本，
安全安裝或升級至 Chrome Plus 專案的對應路徑中。

使用方式:
    py install.py --dry-run     # 預檢複製與覆蓋目標（不實際變更）
    py install.py --install     # 執行安裝升級（預設自動建立備份）
    py install.py --no-backup   # 執行安裝但不建立備份
"""

import os
import sys
import shutil
import argparse
from datetime import datetime

PACK_ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(PACK_ROOT)

# 來源檔案（相對於 PACK_ROOT）與 Chrome Plus 專案目標路徑（相對於 PROJECT_ROOT）對照表
INSTALL_MAPPING = [
    # 核心任務規範與範本
    ("docs/task_template_v2.md", "0.doc_mg/task_template_v2.md"),
    ("docs/task_manager.md", "0.doc_mg/docs/README_TASK_MANAGER.md"),
    
    # 專家技能
    ("skills/task-protocol/SKILL.md", ".agents/skills/task-protocol/SKILL.md"),
    ("skills/token-saver/SKILL.md", ".agents/skills/token-saver/SKILL.md"),
    
    # 核心工具腳本
    ("scripts/repo_radar.py", "1.devtools/tools/repo_radar.py"),
    ("scripts/code_skeleton.py", "1.devtools/tools/code_skeleton.py"),
    ("scripts/compact_log.py", "1.devtools/tools/compact_log.py"),
    ("scripts/generate_symbol_index.py", "1.devtools/tools/generate_symbol_index.py"),
    ("scripts/token_estimator.py", "1.devtools/tools/token_estimator.py"),
    ("scripts/log_issue.py", "1.devtools/tools/log_issue.py"),
    ("scripts/analyze_task_tokens.py", "1.devtools/tools/analyze_task_tokens.py"),
    ("scripts/util_archive_manager.py", "1.devtools/tools/util_archive_manager.py"),
]

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description="Task and Token Protocol 安裝與更新工具")
    parser.add_argument("--dry-run", action="store_true", help="僅預覽將變更的檔案，不實際執行")
    parser.add_argument("--install", action="store_true", help="執行安裝/更新到專案目錄")
    parser.add_argument("--no-backup", action="store_true", help="不安裝前備份既有檔案")
    args = parser.parse_args()

    if not args.install and not args.dry_run:
        print("[*] 請指定 --dry-run (預覽) 或 --install (執行安裝)。")
        print("    範例: py install.py --dry-run")
        print("    範例: py install.py --install")
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(PACK_ROOT, f"backup_{timestamp}")
    do_backup = not args.no_backup

    print("=" * 65)
    print("  Task and Token Protocol 安裝 / 升級檢測器")
    print(f"  專案根目錄: {PROJECT_ROOT}")
    print(f"  安裝包目錄: {PACK_ROOT}")
    print("=" * 65)

    actions = []
    for src_rel, dst_rel in INSTALL_MAPPING:
        src_path = os.path.join(PACK_ROOT, src_rel.replace('/', os.sep))
        dst_path = os.path.join(PROJECT_ROOT, dst_rel.replace('/', os.sep))
        
        if not os.path.exists(src_path):
            print(f"[警告] 安裝包來源缺失: {src_rel}")
            continue
            
        dst_exists = os.path.exists(dst_path)
        actions.append((src_path, dst_path, src_rel, dst_rel, dst_exists))

    if args.dry_run:
        print("\n[DRY RUN 預覽模式 - 不會修改任何檔案]:")
        for src_path, dst_path, src_rel, dst_rel, dst_exists in actions:
            status = "[覆蓋升級]" if dst_exists else "[全新安裝]"
            print(f"  {status:10} {dst_rel}")
            print(f"             來源: {src_rel}")
        print(f"\n共預計處理 {len(actions)} 個檔案。執行 'py install.py --install' 即可正式安裝。")
        return

    if args.install:
        if do_backup:
            os.makedirs(backup_dir, exist_ok=True)
            print(f"\n[備份] 正在將現有舊檔備份至: {backup_dir}")
            backed_up_count = 0
            for _, dst_path, _, dst_rel, dst_exists in actions:
                if dst_exists:
                    bk_target = os.path.join(backup_dir, dst_rel.replace('/', os.sep))
                    os.makedirs(os.path.dirname(bk_target), exist_ok=True)
                    shutil.copy2(dst_path, bk_target)
                    backed_up_count += 1
            print(f"[備份完成] 共備份了 {backed_up_count} 個既有檔案。")

        print("\n[安裝升級] 正在將檔案複製至專案目標路徑:")
        installed_count = 0
        for src_path, dst_path, src_rel, dst_rel, dst_exists in actions:
            os.makedirs(os.path.dirname(dst_path), exist_ok=True)
            shutil.copy2(src_path, dst_path)
            tag = "更新" if dst_exists else "新建"
            print(f"  [V] 已{tag}: {dst_rel}")
            installed_count += 1

        print("\n" + "=" * 65)
        print(f"[成功] 已順利安裝/更新 {installed_count} 個項目！")
        print("建議後續驗證動作:")
        print("  1. 執行: py 1.devtools/tools/repo_radar.py --help")
        print("  2. 執行: py 1.devtools/tools/code_skeleton.py --help")
        print("  3. 檢視 .agents/skills/task-protocol/SKILL.md 與 token-saver/SKILL.md")
        print("=" * 65)

if __name__ == '__main__':
    main()

