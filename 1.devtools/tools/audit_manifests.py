#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import sys
import argparse

# 嘗試將標準輸出設定為 UTF-8 與行緩衝，以避免 Windows CP950 編碼報錯與背景輸出延遲
try:
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
except AttributeError:
    # Python 舊版本相容
    pass

# 基礎路徑定義
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def discover_plugins(base_dir):
    """動態搜尋工作區內含有 manifest.json 的有效插件目錄"""
    plugins = []
    ignored_dirs = {'.git', '.agents', '0.doc_mg', '1.devtools', 'node_modules', 'dist', 'scratch'}
    for item in os.listdir(base_dir):
        if item in ignored_dirs or item.startswith('.'):
            continue
        item_path = os.path.join(base_dir, item)
        if os.path.isdir(item_path):
            manifest_candidates = [
                os.path.join(item_path, 'manifest.json'),
                os.path.join(item_path, 'public', 'manifest.json'),
                os.path.join(item_path, 'src', 'manifest.json'),
            ]
            if any(os.path.exists(m) for m in manifest_candidates):
                plugins.append(item)
    return sorted(plugins)

def check_file_exists(base_path, relative_path, plugin_dir=None):
    """檢查指定相對路徑的檔案是否存在"""
    # 處理路徑前導斜線
    clean_path = relative_path.lstrip('/')
    
    # 嘗試在當前 manifest 同級目錄查找
    full_path = os.path.join(base_path, clean_path)
    if os.path.exists(full_path):
        return True, full_path
        
    # 如果是 Vite 項目 (例如 chrome_pk)
    # 開發期有些檔案（如 popup.html、popup.js/ts）在項目根目錄或 src 目錄下，打包後才會合併至 dist/
    if plugin_dir:
        alt_paths = [
            os.path.join(plugin_dir, clean_path),
            os.path.join(plugin_dir, 'src', clean_path),
            os.path.join(plugin_dir, 'src', clean_path.replace('.js', '.ts')),
            os.path.join(plugin_dir, 'src', clean_path.replace('.js', '.tsx')),
            # PK+ (ScrumClock) 的 popup 可能是 index.html
            os.path.join(plugin_dir, 'index.html') if 'popup' in clean_path else ''
        ]
        for alt_path in alt_paths:
            if alt_path and os.path.exists(alt_path):
                return True, alt_path
                
    return False, full_path

def check_code_safety(file_path):
    """檢測檔案內容是否含有 eval()、new Function()、或未消毒的 innerHTML"""
    issues = []
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in ['.js', '.ts', '.tsx', '.jsx', '.html']:
        return issues
        
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_idx, line in enumerate(f, 1):
                clean_line = line.strip()
                # 排除單行註解與多行註解開頭
                if clean_line.startswith('//') or clean_line.startswith('/*') or clean_line.startswith('*'):
                    continue
                
                # 1. 檢查 eval()
                if 'eval(' in clean_line:
                    issues.append((line_idx, "含有 eval() 呼叫，違反 MV3 CSP 規範。"))
                
                # 2. 檢查 new Function()
                if 'new Function(' in clean_line:
                    issues.append((line_idx, "含有 new Function()，違反 MV3 CSP 規範。"))
                    
                # 3. 檢查 innerHTML 賦值
                if '.innerHTML' in clean_line and '=' in clean_line:
                    # 排除簡單的安全寫法如 innerHTML = ''
                    if "=''" not in clean_line.replace(' ', '') and '=""' not in clean_line.replace(' ', ''):
                        issues.append((line_idx, "含有 .innerHTML 賦值，可能存在 XSS 漏洞。請改用 .textContent，或確保已使用安全庫（如 DOMPurify）消毒。"))
    except Exception:
        # 忽略無法讀取或解碼的檔案，或是遇到二進位檔案
        pass
    return issues

def audit_plugin(plugin, compact=False):
    """審計單一插件的 manifest.json 與關聯的程式碼檔案"""
    plugin_dir = os.path.join(BASE_DIR, plugin)
    
    manifest_paths = [
        os.path.join(plugin_dir, 'manifest.json'),
        os.path.join(plugin_dir, 'public', 'manifest.json'),
        os.path.join(plugin_dir, 'src', 'manifest.json'),
        os.path.join(plugin_dir, 'dist', 'manifest.json') # 打包後的版本
    ]
    
    manifest_path = None
    for path in manifest_paths:
        if os.path.exists(path):
            manifest_path = path
            break
            
    if not manifest_path:
        if not compact:
            print(f"[{plugin}] 警告: 找不到 manifest.json，跳過審計。")
        return True, [], []

    errors = []
    warnings = []
    files_to_scan = set()
    
    if not compact:
        print(f"開始審計 [{plugin}] ... (路徑: {os.path.relpath(manifest_path, BASE_DIR)})")
    
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        errors.append(f"無法解析 JSON 格式: {e}")
        return False, errors

    # 1. 檢查 Manifest 版本
    mv = data.get('manifest_version')
    if mv != 3:
        errors.append(f"manifest_version 必須為 3 (目前為 {mv})。MV2 已被 Chrome 棄用。")

    # 2. 檢查 Action 欄位 (MV3 應使用 action)
    if 'browser_action' in data:
        errors.append("不合規的欄位: 'browser_action' 已在 MV3 中廢棄，請改用 'action'。")
    if 'page_action' in data:
        errors.append("不合規的欄位: 'page_action' 已在 MV3 中廢棄，請改用 'action'。")

    plugin_root_for_files = os.path.dirname(manifest_path)

    # 3. 檢查 Action HTML 與 Icon
    action = data.get('action', {})
    default_popup = action.get('default_popup')
    if default_popup:
        exists, full_path = check_file_exists(plugin_root_for_files, default_popup, plugin_dir)
        if not exists:
            errors.append(f"action.default_popup 檔案不存在: {default_popup}")
        else:
            files_to_scan.add(full_path)
            
    default_icon = action.get('default_icon')
    if default_icon:
        if isinstance(default_icon, dict):
            for size, path in default_icon.items():
                exists, full_path = check_file_exists(plugin_root_for_files, path, plugin_dir)
                if not exists:
                    errors.append(f"action.default_icon ({size}) 檔案不存在: {path}")
                else:
                    files_to_scan.add(full_path)
        elif isinstance(default_icon, str):
            exists, full_path = check_file_exists(plugin_root_for_files, default_icon, plugin_dir)
            if not exists:
                errors.append(f"action.default_icon 檔案不存在: {default_icon}")
            else:
                files_to_scan.add(full_path)

    # 4. 檢查全域 Icons
    icons = data.get('icons', {})
    for size, path in icons.items():
        exists, full_path = check_file_exists(plugin_root_for_files, path, plugin_dir)
        if not exists:
            errors.append(f"icons ({size}) 檔案不存在: {path}")
        else:
            files_to_scan.add(full_path)

    # 5. 檢查 Background / Service Worker
    bg = data.get('background', {})
    if bg:
        if 'scripts' in bg:
            errors.append("background 欄位錯誤: MV3 不支援 'background.scripts' 多腳本，請改用 'background.service_worker'。")
        if bg.get('persistent') is not None:
            warnings.append("background 欄位警告: MV3 背景腳本均為非持續性，'persistent' 屬性已無效，建議移除。")
        
        sw = bg.get('service_worker')
        if sw:
            exists, full_path = check_file_exists(plugin_root_for_files, sw, plugin_dir)
            if not exists:
                errors.append(f"background.service_worker 檔案不存在: {sw}")
            else:
                files_to_scan.add(full_path)
        elif 'scripts' not in bg:
            errors.append("background 宣告缺失: 宣告了 'background' 但找不到 'service_worker' 屬性。")

    # 6. 檢查 Content Scripts
    cs_list = data.get('content_scripts', [])
    for idx, cs in enumerate(cs_list):
        # 檢查 js 檔案
        for js_file in cs.get('js', []):
            exists, alt_path = check_file_exists(plugin_root_for_files, js_file, plugin_dir)
            if not exists:
                errors.append(f"content_scripts[{idx}] 中的 JS 檔案不存在: {js_file}")
            else:
                files_to_scan.add(alt_path)
                    
        # 檢查 css 檔案
        for css_file in cs.get('css', []):
            exists, alt_path = check_file_exists(plugin_root_for_files, css_file, plugin_dir)
            if not exists:
                errors.append(f"content_scripts[{idx}] 中的 CSS 檔案不存在: {css_file}")

    # 6.1 檢查 Side Panel (MV3 原生側邊欄)
    side_panel = data.get('side_panel', {})
    default_panel_path = side_panel.get('default_path')
    if default_panel_path:
        exists, full_path = check_file_exists(plugin_root_for_files, default_panel_path, plugin_dir)
        if not exists:
            errors.append(f"side_panel.default_path 檔案不存在: {default_panel_path}")
        else:
            files_to_scan.add(full_path)

    # 7. 檢查 CSP (Content Security Policy) 安全合規
    csp = data.get('content_security_policy', {})
    if csp:
        if isinstance(csp, str):
            errors.append("CSP 格式錯誤: MV3 中 content_security_policy 必須為物件形式，例如 { 'extension_pages': '...' }，不支援字串。")
        else:
            ep = csp.get('extension_pages', '')
            if 'unsafe-eval' in ep.replace('wasm-unsafe-eval', ''):
                errors.append("CSP 安全漏洞: 'unsafe-eval' 已被 Chrome 審查禁用，禁止出現在 extension_pages 中。")
            if 'http://' in ep:
                errors.append("CSP 安全漏洞: extension_pages 禁止引入不安全的 http:// 外部來源。")

    # 遍歷插件目錄，收集所有 JS/TS/HTML 原始碼以防漏網之魚
    for root_dir, dirs, files in os.walk(plugin_dir):
        # 排除 node_modules, .git, archive, dist 等目錄（就地剪枝避免走訪數萬子目錄造成假死）
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'archive', 'dist')]
            
        for file in files:
            if file.endswith(('.js', '.ts', '.tsx', '.jsx', '.html')):
                files_to_scan.add(os.path.join(root_dir, file))

    # 8. 執行靜態程式碼安全性檢測
    if files_to_scan:
        has_code_issue = False
        for file_path in sorted(files_to_scan):
            rel_file = os.path.relpath(file_path, BASE_DIR)
            issues = check_code_safety(file_path)
            if issues:
                for line, desc in issues:
                    if "XSS" in desc:
                        warnings.append(f"[{rel_file}:{line}] XSS 警告: {desc}")
                        if not compact:
                            if not has_code_issue:
                                print("  開始掃描程式碼安全性...")
                                has_code_issue = True
                            print(f"    檔案: {rel_file}")
                            print(f"      [!] 行 {line}: {desc}")
                    else:
                        errors.append(f"[{rel_file}:{line}] 安全錯誤: {desc}")
                        if not compact:
                            if not has_code_issue:
                                print("  開始掃描程式碼安全性...")
                                has_code_issue = True
                            print(f"    檔案: {rel_file}")
                            print(f"      [X] 行 {line}: {desc}")

    # 輸出審計報告 (使用 ASCII 安全字元避免 CP950 解碼錯誤)
    if not compact:
        for w in warnings:
            if not w.startswith('['):
                print(f"  [!] 警告: {w}")
        for e in errors:
            if not e.startswith('['):
                print(f"  [X] 錯誤: {e}")
            
        if not errors:
            print("  [o] 通過檢測！無嚴重合規問題。")
        else:
            print(f"  [X] 未通過檢測。共有 {len(errors)} 個嚴重錯誤/漏洞警告。")

    return (len(errors) == 0), errors, warnings

def main():
    parser = argparse.ArgumentParser(description="Chrome 插件 Manifest V3 合規性與安全性自動審計器")
    parser.add_argument('--compact', action='store_true', help='啟用緊湊輸出模式 (控制在 10 行以內)')
    parser.add_argument('--strict', action='store_true', help='嚴格模式：存在任何警告 (如 innerHTML) 即視為未通過 (Exit 1)')
    parser.add_argument('--plugin', help='指定審計單一插件目錄名稱')
    parser.add_argument('--json', action='store_true', help='輸出結構化 JSON 審計報告')

    args = parser.parse_args()

    all_plugins = discover_plugins(BASE_DIR)
    if args.plugin:
        if args.plugin not in all_plugins:
            print(f"[錯誤] 找不到指定的插件: {args.plugin}")
            print(f"可選插件: {', '.join(all_plugins)}")
            sys.exit(1)
        target_plugins = [args.plugin]
    else:
        target_plugins = all_plugins

    results = {}
    total_errors = 0
    total_warnings = 0

    if not args.compact and not args.json:
        print("==================================================")
        print("          Chrome 插件 Manifest V3 審計工具         ")
        print("==================================================")
        print(f"動態發現 {len(target_plugins)} 款有效插件: {', '.join(target_plugins)}\n")

    for plugin in target_plugins:
        success, errors, warnings = audit_plugin(plugin, compact=args.compact or args.json)
        results[plugin] = {
            'success': success,
            'errors': errors,
            'warnings': warnings
        }
        total_errors += len(errors)
        total_warnings += len(warnings)
        if not args.compact and not args.json:
            print("-" * 50)

    is_overall_success = (total_errors == 0)
    if args.strict and total_warnings > 0:
        is_overall_success = False

    # JSON 模式
    if args.json:
        report = {
            "summary": {
                "total_plugins": len(target_plugins),
                "success": is_overall_success,
                "total_errors": total_errors,
                "total_warnings": total_warnings,
                "strict": args.strict
            },
            "plugins": results
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        sys.exit(0 if is_overall_success else 1)

    # 緊湊模式 (嚴格限制在 10 行以內)
    if args.compact:
        status_sym = "[o] 通過" if is_overall_success else "[X] 失敗"
        print(f"=== Manifest V3 合規審計 {status_sym} ({len(target_plugins)} 款插件) ===")
        for p in target_plugins:
            res = results[p]
            err_cnt = len(res['errors'])
            warn_cnt = len(res['warnings'])
            if err_cnt == 0 and warn_cnt == 0:
                print(f"  [o] {p:<30} | MV3 合規")
            elif err_cnt == 0:
                p_sym = "[X]" if args.strict else "[o]"
                print(f"  {p_sym} {p:<30} | MV3 合規 ({warn_cnt} 處 XSS 警告)")
            else:
                print(f"  [X] {p:<30} | 錯誤: {err_cnt}, 警告: {warn_cnt}")
        
        if is_overall_success:
            print(f"[審計總結] 所有插件 Manifest V3 完全合規 (Exit 0)。")
            sys.exit(0)
        else:
            if args.strict and total_errors == 0:
                print(f"[審計總結] 嚴格模式未通過！發現 {total_warnings} 處警告 (Exit 1)。")
            else:
                failed = [p for p in target_plugins if not results[p]['success']]
                print(f"[審計總結] 審計失敗！合規錯誤插件: {', '.join(failed)} (Exit 1)。")
            sys.exit(1)

    # 完整模式總結
    if is_overall_success:
        print("\n[審計總結] 所有檢測到的插件 Manifest V3 均完全合規！")
        sys.exit(0)
    else:
        if args.strict and total_errors == 0:
            print(f"\n[審計總結] 嚴格模式檢測失敗！發現 {total_warnings} 個代碼安全性警告 (Exit 1)。")
        else:
            failed = [p for p in target_plugins if not results[p]['success']]
            print(f"\n[審計總結] 檢測失敗！以下插件有合規錯誤: {', '.join(failed)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
