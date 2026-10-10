#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import argparse
import re

# 嘗試將標準輸出設定為 UTF-8 以避免 Windows CP950 編碼報錯
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# 基礎路徑定義
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def validate_chrome_version(version_str):
    """
    校驗版本號是否符合 Chrome Web Store 規範：
    1 到 4 個以點分隔的整數，每個整數介於 0 到 65535 之間。
    """
    if not isinstance(version_str, str) or not version_str.strip():
        return False, "版本號不能為空"
    
    parts = version_str.strip().split('.')
    if len(parts) < 1 or len(parts) > 4:
        return False, f"版本號層級必須為 1 到 4 組整數 (目前為 {len(parts)} 組: {version_str})"
    
    for idx, part in enumerate(parts):
        if not part.isdigit():
            return False, f"第 {idx+1} 組版本號含有非整數字元: '{part}'"
        val = int(part)
        if val < 0 or val > 65535:
            return False, f"第 {idx+1} 組版本號超出範圍 [0, 65535]: {val}"
        # 排除多餘的前導 0 (如 '01')，但單一 '0' 是允許的
        if len(part) > 1 and part.startswith('0'):
            return False, f"第 {idx+1} 組版本號不允許不必要的前導 0: '{part}'"

    return True, ""

def parse_version_numbers(version_str):
    """將版本字串拆為整數串列"""
    return [int(p) for p in version_str.strip().split('.')]

def format_version_numbers(nums):
    """將整數串列轉為版本字串"""
    return '.'.join(str(n) for n in nums)

def calculate_bump_version(current_ver, bump_type):
    """
    根據 SemVer / Chrome 規範計算遞增後的版本號。
    bump_type 可以是 'patch', 'minor', 'major', 'build'
    """
    valid, msg = validate_chrome_version(current_ver)
    if not valid:
        raise ValueError(f"目前版本號不合規: {current_ver} ({msg})")

    nums = parse_version_numbers(current_ver)
    
    # 常用標準化：若是 2 碼（例如 1.0），在 patch 時擴展為 3 碼 1.0.1
    if bump_type.lower() == 'major':
        nums[0] += 1
        for i in range(1, len(nums)):
            nums[i] = 0
    elif bump_type.lower() == 'minor':
        if len(nums) < 2:
            nums.append(1)
        else:
            nums[1] += 1
            for i in range(2, len(nums)):
                nums[i] = 0
    elif bump_type.lower() == 'patch':
        if len(nums) < 3:
            # 例如 1.0 -> 擴充為 1.0.1
            while len(nums) < 2:
                nums.append(0)
            nums.append(1)
        else:
            nums[2] += 1
            for i in range(3, len(nums)):
                nums[i] = 0
    elif bump_type.lower() == 'build':
        if len(nums) < 4:
            while len(nums) < 3:
                nums.append(0)
            nums.append(1)
        else:
            nums[3] += 1
    else:
        # 直接作為自訂新版本號
        valid_custom, custom_msg = validate_chrome_version(bump_type)
        if not valid_custom:
            raise ValueError(f"無效的遞增類型或版本號 '{bump_type}': {custom_msg}")
        return bump_type

    new_ver = format_version_numbers(nums)
    valid_new, new_msg = validate_chrome_version(new_ver)
    if not valid_new:
        raise ValueError(f"計算所得版本號不合規: {new_ver} ({new_msg})")

    return new_ver

def discover_plugins(base_dir=BASE_DIR):
    """
    動態發現所有有效插件及其配置檔案路徑資訊
    """
    plugins = {}
    ignored_dirs = {'.git', '.agents', '0.doc_mg', '1.devtools', 'node_modules', 'dist', 'scratch'}
    
    for item in sorted(os.listdir(base_dir)):
        if item in ignored_dirs or item.startswith('.'):
            continue
        item_path = os.path.join(base_dir, item)
        if not os.path.isdir(item_path):
            continue

        # 搜尋候選 manifest
        manifest_candidates = [
            os.path.join(item_path, 'manifest.json'),
            os.path.join(item_path, 'public', 'manifest.json'),
            os.path.join(item_path, 'src', 'manifest.json'),
        ]
        
        main_manifest = None
        for cand in manifest_candidates:
            if os.path.exists(cand):
                main_manifest = cand
                break
                
        if not main_manifest:
            continue

        # 檢查 dist/manifest.json (build 產物)
        dist_manifest = os.path.join(item_path, 'dist', 'manifest.json')
        has_dist_manifest = os.path.exists(dist_manifest)

        # 檢查 package.json
        pkg_path = os.path.join(item_path, 'package.json')
        has_pkg = os.path.exists(pkg_path)

        # 讀取 main manifest 資料
        manifest_ver = None
        manifest_ver_name = None
        try:
            with open(main_manifest, 'r', encoding='utf-8') as f:
                m_data = json.load(f)
                manifest_ver = m_data.get('version')
                manifest_ver_name = m_data.get('version_name')
        except Exception as e:
            manifest_ver = f"Error: {e}"

        # 讀取 package.json 資料
        pkg_ver = None
        if has_pkg:
            try:
                with open(pkg_path, 'r', encoding='utf-8') as f:
                    p_data = json.load(f)
                    pkg_ver = p_data.get('version')
            except Exception as e:
                pkg_ver = f"Error: {e}"

        plugins[item] = {
            'dir': item_path,
            'manifest_path': main_manifest,
            'dist_manifest_path': dist_manifest if has_dist_manifest else None,
            'package_path': pkg_path if has_pkg else None,
            'manifest_version': manifest_ver,
            'manifest_version_name': manifest_ver_name,
            'package_version': pkg_ver,
        }

    return plugins

def get_status_str(info):
    """判斷版本狀態一致性"""
    m_ver = info['manifest_version']
    p_ver = info['package_version']

    if info['package_path'] is None:
        return "OK (No Pkg)"
    if m_ver == p_ver:
        return "OK (Synced)"
    return "MISMATCH"

def cmd_list(args):
    """列出所有插件的版本狀態"""
    plugins = discover_plugins()
    if not plugins:
        print("未發現任何 Chrome 插件。")
        return

    print("=" * 80)
    print("                 Chrome Plus 插件版本狀態概覽")
    print("=" * 80)
    header = f"{'插件名稱 (Plugin)':<30} {'Manifest':<12} {'Package':<12} {'狀態 (Status)':<14} {'Version Name'}"
    print(header)
    print("-" * 80)

    for name, info in plugins.items():
        status = get_status_str(info)
        m_ver = info['manifest_version'] or 'N/A'
        p_ver = info['package_version'] or 'N/A'
        v_name = info['manifest_version_name'] or '-'
        print(f"{name:<30} {m_ver:<12} {p_ver:<12} {status:<14} {v_name}")

    print("-" * 80)
    print(f"共計發現 {len(plugins)} 款插件。")

def apply_version_to_file(file_path, new_ver, new_ver_name=None, is_manifest=True, dry_run=False):
    """更新單一檔案的版本號"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    old_ver = data.get('version')
    data['version'] = new_ver

    if is_manifest and new_ver_name is not None:
        if new_ver_name == "":
            data.pop('version_name', None)
        else:
            data['version_name'] = new_ver_name

    rel_path = os.path.relpath(file_path, BASE_DIR)

    if dry_run:
        print(f"  [Dry-Run] 模擬更新 {rel_path}: {old_ver} -> {new_ver}")
        return True

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f"  [已更新] {rel_path}: {old_ver} -> {new_ver}")
    return True

def update_plugin_version(plugin_name, info, new_version, new_version_name=None, dry_run=False):
    """對指定插件執行版本更新"""
    print(f"\n▶ 更新插件: [{plugin_name}]")
    
    # 1. 更新主要 Manifest
    if info['manifest_path']:
        apply_version_to_file(
            info['manifest_path'],
            new_version,
            new_ver_name=new_version_name,
            is_manifest=True,
            dry_run=dry_run
        )

    # 2. 若存在 dist/manifest.json，同步更新
    if info['dist_manifest_path']:
        apply_version_to_file(
            info['dist_manifest_path'],
            new_version,
            new_ver_name=new_version_name,
            is_manifest=True,
            dry_run=dry_run
        )

    # 3. 若存在 package.json，同步更新
    if info['package_path']:
        apply_version_to_file(
            info['package_path'],
            new_version,
            new_ver_name=None,
            is_manifest=False,
            dry_run=dry_run
        )

def cmd_bump(args):
    """執行版本號遞增 (patch / minor / major / build 或具體版本)"""
    plugins = discover_plugins()
    target_plugins = []

    if args.all:
        target_plugins = list(plugins.keys())
    elif args.plugin:
        if args.plugin not in plugins:
            print(f"[錯誤] 找不到插件 '{args.plugin}'。可用插件: {', '.join(plugins.keys())}")
            sys.exit(1)
        target_plugins = [args.plugin]
    else:
        print("[錯誤] 請指定 --plugin <name> 或 --all 進行版本更新。")
        sys.exit(1)

    bump_action = args.type.lower()
    print(f"目標操作: bump '{bump_action}' | 目標數量: {len(target_plugins)} | Dry-Run: {args.dry_run}")

    for name in target_plugins:
        info = plugins[name]
        current_ver = info['manifest_version']
        try:
            new_ver = calculate_bump_version(current_ver, bump_action)
        except Exception as e:
            print(f"[錯誤] 插件 [{name}] 計算新版本失敗: {e}")
            continue

        update_plugin_version(
            name,
            info,
            new_ver,
            new_version_name=args.version_name,
            dry_run=args.dry_run
        )

    if args.dry_run:
        print("\n[提示] 以上為 Dry-Run 模擬輸出，未實際修改任何實體檔案。")
    else:
        print("\n[完成] 版本號更新操作已全數寫入！")

def cmd_set(args):
    """直接設定指定版本號"""
    valid, msg = validate_chrome_version(args.version)
    if not valid:
        print(f"[錯誤] 指定的版本號不符合 Chrome 規範: {args.version} ({msg})")
        sys.exit(1)

    plugins = discover_plugins()
    target_plugins = []

    if args.all:
        target_plugins = list(plugins.keys())
    elif args.plugin:
        if args.plugin not in plugins:
            print(f"[錯誤] 找不到插件 '{args.plugin}'。可用插件: {', '.join(plugins.keys())}")
            sys.exit(1)
        target_plugins = [args.plugin]
    else:
        print("[錯誤] 請指定 --plugin <name> 或 --all 進行版本設定。")
        sys.exit(1)

    print(f"目標操作: set version '{args.version}' | 目標數量: {len(target_plugins)} | Dry-Run: {args.dry_run}")

    for name in target_plugins:
        info = plugins[name]
        update_plugin_version(
            name,
            info,
            args.version,
            new_version_name=args.version_name,
            dry_run=args.dry_run
        )

    if args.dry_run:
        print("\n[提示] 以上為 Dry-Run 模擬輸出，未實際修改任何實體檔案。")
    else:
        print("\n[完成] 版本號設定操作已全數寫入！")

def main():
    parser = argparse.ArgumentParser(
        description="Chrome Plus 專案全域版本號自動化管理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    subparsers = parser.add_subparsers(dest='command', help='子指令')

    # list / status 指令
    subparsers.add_parser('list', help='列出所有插件的當前版本與狀態')
    subparsers.add_parser('status', help='檢視所有插件的當前版本與狀態 (同 list)')

    # bump 指令
    bump_parser = subparsers.add_parser('bump', help='遞增版本號 (patch, minor, major, build 或指定新版本)')
    bump_parser.add_argument('type', help='遞增類型 (patch / minor / major / build) 或指定具體版本號')
    bump_parser.add_argument('--plugin', '-p', help='指定單一插件名稱')
    bump_parser.add_argument('--all', '-a', action='store_true', help='套用至全工作區所有插件')
    bump_parser.add_argument('--version-name', '-vn', help='指定自訂 version_name (傳入空字串可移除)')
    bump_parser.add_argument('--dry-run', '-d', action='store_true', help='模擬執行，不實際回寫檔案')

    # set 指令
    set_parser = subparsers.add_parser('set', help='直接設定指定版本號')
    set_parser.add_argument('version', help='目標版本號 (如 1.2.0)')
    set_parser.add_argument('--plugin', '-p', help='指定單一插件名稱')
    set_parser.add_argument('--all', '-a', action='store_true', help='套用至全工作區所有插件')
    set_parser.add_argument('--version-name', '-vn', help='指定自訂 version_name (傳入空字串可移除)')
    set_parser.add_argument('--dry-run', '-d', action='store_true', help='模擬執行，不實際回寫檔案')

    args = parser.parse_args()

    if args.command in ['list', 'status'] or args.command is None:
        cmd_list(args)
    elif args.command == 'bump':
        cmd_bump(args)
    elif args.command == 'set':
        cmd_set(args)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
