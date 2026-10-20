#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1.devtools/tools/audit_plugin_isolation.py
Chrome 多插件工作區：多插件物理隔離與黑盒契約防衛審計器 (Isolation Guard)

核心規範:
- GEMINI.md 核心憲法底線: 多插件隔離與邊界防禦
- 0.doc_mg/docs/cross_plugin_contract.md: 跨插件通訊解耦與防禦性架構規範
- 各插件儲存與依賴 100% 獨立，嚴禁跨目錄 import/require 原始碼或共享私有依賴。
- 跨插件合作僅允許透過 chrome.runtime.sendMessage / Extension ID 進行純資料黑盒通訊。
"""

import os
import sys
import re
import json
import argparse
from typing import List, Dict, Tuple, Optional

# UTF-8 輸出防亂碼相容性處理 (Windows CP950 防護)
try:
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
except AttributeError:
    pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

IGNORED_DIRS = {
    '.git', '.agents', '0.doc_mg', '1.devtools', 'node_modules', 
    'dist', 'build', '.next', '.vite', 'coverage', '.cache', 'scratch', '__pycache__'
}

AUDIT_EXTENSIONS = {
    '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
    '.html', '.htm', '.css', '.json', '.vue', '.svelte'
}

IGNORED_FILES = {
    'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'
}

# 偵測 JS/TS import, export, require, import(...)
RE_JS_IMPORT = re.compile(
    r"""(?:import|export)\s+(?:(?:(?:\*|[\w{}\s,]+)\s+from\s+)?['"]([^'"]+)['"]|(?:['"]([^'"]+)['"]))"""
)
RE_JS_REQUIRE = re.compile(r"""(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)""")

# 偵測 HTML src / href
RE_HTML_SRC = re.compile(r"""<(?:script|link|img|iframe|source)\b[^>]*(?:src|href)=['"]([^'"]+)['"]""", re.IGNORECASE)

# 偵測 CSS @import / url()
RE_CSS_IMPORT = re.compile(r"""@import\s+(?:url\s*\(\s*)?['"]?([^'"\)]+)['"]?\s*\)?""", re.IGNORECASE)

# 偵測硬編碼本機絕對檔案路徑 (精確識別 Windows 磁區與 Unix 使用者主目錄，排除 API endpoints 如 /users/@me)
RE_ABSOLUTE_LOCAL_PATH = re.compile(
    r"""(?:[a-zA-Z]:[\\/](?:Users|home|workspace|Projects|00\.)|/(?:Users|home)/[a-zA-Z0-9._-]+/(?:Documents|Desktop|Downloads|Projects|workspace|code|\.))[^\s'"`]+""",
    re.IGNORECASE
)

def discover_plugins(base_dir: str) -> List[str]:
    """動態搜尋工作區內含有 manifest.json 的有效插件目錄"""
    plugins = []
    for item in os.listdir(base_dir):
        if item in IGNORED_DIRS or item.startswith('.'):
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

class IsolationIssue:
    def __init__(self, file_path: str, line_num: int, severity: str, message: str, advice: str = ""):
        self.file_path = file_path
        self.line_num = line_num
        self.severity = severity  # 'CRITICAL', 'ERROR', 'WARN'
        self.message = message
        self.advice = advice

    def to_dict(self) -> Dict[str, str]:
        return {
            "file": self.file_path,
            "line": self.line_num,
            "severity": self.severity,
            "message": self.message,
            "advice": self.advice
        }

    def __str__(self) -> str:
        tag = f"[{self.severity}]"
        line_info = f":{self.line_num}" if self.line_num > 0 else ""
        out = f"{tag} {self.file_path}{line_info}: {self.message}"
        if self.advice:
            out += f"\n       建議: {self.advice}"
        return out

def check_relative_target(target_path: str, file_path: str, plugin_dir: str, all_plugins: Dict[str, str], is_code_import: bool = True) -> Optional[Tuple[str, str, str]]:
    """
    分析相對路徑是否逃逸出插件目錄或跨入其他插件
    回傳 (severity, message, advice) 或 None
    """
    # 略過 web protocols, data URLs, anchors, mailto
    if any(target_path.startswith(proto) for proto in ('http://', 'https://', 'chrome://', 'chrome-extension://', 'data:', '#', 'mailto:')):
        return None
    
    # 檢查是否為別名或 npm 套件名稱直接提及其他插件目錄，或在相對路徑中提及其他插件
    norm_target = target_path.replace('\\', '/')
    for other_p_name in all_plugins.keys():
        if target_path == other_p_name or target_path.startswith(other_p_name + '/'):
            return (
                "CRITICAL",
                f"直接引用外部插件 '{other_p_name}': {target_path}",
                "嚴禁直接跨插件引用！請遵循 cross_plugin_contract.md 使用 chrome.runtime.sendMessage 進行黑盒通訊。"
            )
        if f"../{other_p_name}" in norm_target:
            return (
                "CRITICAL",
                f"跨插件源碼依賴違背: 嘗試引用插件 '{other_p_name}' 之路徑 ({target_path})",
                "違反 GEMINI.md 插件隔離規範！跨插件合作僅允許純資料黑盒合約，請參閱 0.doc_mg/docs/cross_plugin_contract.md。"
            )

    # 僅處理有相對或根目錄路徑特徵的參照 (以 / 或 . 開頭)
    if not (target_path.startswith('.') or target_path.startswith('/')):
        return None

    # 解析目標絕對路徑
    file_dir = os.path.dirname(file_path)
    try:
        if target_path.startswith('/'):
            resolved_abs = os.path.normpath(os.path.join(plugin_dir, target_path.lstrip('/')))
        else:
            resolved_abs = os.path.normpath(os.path.join(file_dir, target_path))
    except Exception:
        return None

    # 檢查是否逃逸出插件目錄
    try:
        common = os.path.commonpath([resolved_abs, plugin_dir])
    except ValueError:
        # 跨磁碟機 (Windows)
        return (
            "CRITICAL",
            f"路徑逃逸出插件磁區: {target_path}",
            "路徑不可跨出當前插件專屬目錄。"
        )

    if common != plugin_dir:
        # 逃逸出插件根目錄，確認是否跨入其他插件
        for other_p_name, other_p_dir in all_plugins.items():
            try:
                if os.path.commonpath([resolved_abs, other_p_dir]) == other_p_dir:
                    return (
                        "CRITICAL",
                        f"跨插件源碼依賴違背: 引用了插件 '{other_p_name}' 之檔案 ({target_path})",
                        "違反 GEMINI.md 插件隔離規範！跨插件合作僅允許純資料黑盒合約，請參閱 0.doc_mg/docs/cross_plugin_contract.md。"
                    )
            except ValueError:
                pass
        
        # 若是 package.json 中指向工作區根目錄 (例如 root workspace monorepo link)
        if not is_code_import and resolved_abs == BASE_DIR:
            return None

        return (
            "ERROR",
            f"檔案路徑逃逸出插件邊界: {target_path} -> 逃逸至 {os.path.relpath(resolved_abs, BASE_DIR)}",
            "插件原始碼所有資源必須封裝在該插件專屬目錄下，禁止直接引用插件目錄外部檔案。"
        )

    return None

def audit_file(file_path: str, plugin_name: str, plugin_dir: str, all_plugins: Dict[str, str]) -> List[IsolationIssue]:
    """審計單一檔案的隔離性與路徑規範"""
    issues = []
    rel_file = os.path.relpath(file_path, BASE_DIR)
    ext = os.path.splitext(file_path)[1].lower()

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except Exception as e:
        issues.append(IsolationIssue(rel_file, 0, "WARN", f"無法讀取檔案內容: {e}"))
        return issues

    for idx, line in enumerate(lines, 1):
        clean_line = line.strip()
        if not clean_line or clean_line.startswith('//') or clean_line.startswith('*') or clean_line.startswith('/*'):
            # 跳過純單行註解以防範文檔性誤判
            pass

        # 1. 檢查硬編碼本機絕對路徑 (如 C:\Users\xxx 或 /Users/xxx/Documents)
        m_abs = RE_ABSOLUTE_LOCAL_PATH.search(line)
        if m_abs:
            issues.append(IsolationIssue(
                rel_file, idx, "WARN",
                f"偵測到疑似本機絕對路徑硬編碼: '{m_abs.group(0)}'",
                "請改用相對路徑或 Chrome API (如 chrome.runtime.getURL) 動態定位。"
            ))

        # 2. 檢查 JS/TS import / export / require / import(...)
        if ext in {'.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.html'}:
            for m in RE_JS_IMPORT.finditer(line):
                target = m.group(1) or m.group(2)
                if target:
                    res = check_relative_target(target, file_path, plugin_dir, all_plugins, is_code_import=True)
                    if res:
                        issues.append(IsolationIssue(rel_file, idx, res[0], res[1], res[2]))

            for m in RE_JS_REQUIRE.finditer(line):
                target = m.group(1)
                if target:
                    res = check_relative_target(target, file_path, plugin_dir, all_plugins, is_code_import=True)
                    if res:
                        issues.append(IsolationIssue(rel_file, idx, res[0], res[1], res[2]))

        # 3. 檢查 HTML 標籤引用
        if ext in {'.html', '.htm', '.vue', '.svelte'}:
            for m in RE_HTML_SRC.finditer(line):
                target = m.group(1)
                if target:
                    res = check_relative_target(target, file_path, plugin_dir, all_plugins, is_code_import=True)
                    if res:
                        issues.append(IsolationIssue(rel_file, idx, res[0], res[1], res[2]))

        # 4. 檢查 CSS @import
        if ext in {'.css', '.vue', '.svelte', '.html'}:
            for m in RE_CSS_IMPORT.finditer(line):
                target = m.group(1)
                if target:
                    res = check_relative_target(target, file_path, plugin_dir, all_plugins, is_code_import=True)
                    if res:
                        issues.append(IsolationIssue(rel_file, idx, res[0], res[1], res[2]))

    return issues

def audit_package_json(pkg_path: str, plugin_name: str, plugin_dir: str, all_plugins: Dict[str, str]) -> List[IsolationIssue]:
    """專門審計 package.json 依賴項是否有非法跨插件連結"""
    issues = []
    rel_file = os.path.relpath(pkg_path, BASE_DIR)
    try:
        with open(pkg_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        return [IsolationIssue(rel_file, 0, "WARN", f"無法解析 package.json: {e}")]

    for dep_type in ('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'):
        deps = data.get(dep_type, {})
        if not isinstance(deps, dict):
            continue
        for pkg, ver in deps.items():
            if not isinstance(ver, str):
                continue
            if ver.startswith('file:') or ver.startswith('link:'):
                raw_path = ver.split(':', 1)[1]
                res = check_relative_target(raw_path, pkg_path, plugin_dir, all_plugins, is_code_import=False)
                if res:
                    issues.append(IsolationIssue(
                        rel_file, 0, res[0],
                        f"package.json {dep_type}['{pkg}'] 包含跨邊界本地依賴: {ver}",
                        res[2]
                    ))
    return issues

def audit_plugin_isolation(plugin_name: str, all_plugins: Dict[str, str]) -> Tuple[List[IsolationIssue], int]:
    """審計指定插件目錄下所有原始碼檔案"""
    plugin_dir = all_plugins[plugin_name]
    issues: List[IsolationIssue] = []
    scanned_files_count = 0

    # 檢查 package.json
    pkg_path = os.path.join(plugin_dir, 'package.json')
    if os.path.exists(pkg_path):
        issues.extend(audit_package_json(pkg_path, plugin_name, plugin_dir, all_plugins))

    for root, dirs, files in os.walk(plugin_dir):
        # 剪枝忽略目錄
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]

        for file in files:
            if file in IGNORED_FILES:
                continue
            ext = os.path.splitext(file)[1].lower()
            if ext in AUDIT_EXTENSIONS:
                scanned_files_count += 1
                full_path = os.path.join(root, file)
                file_issues = audit_file(full_path, plugin_name, plugin_dir, all_plugins)
                issues.extend(file_issues)

    return issues, scanned_files_count

def main():
    parser = argparse.ArgumentParser(description="Chrome 多插件物理隔離與黑盒契約防衛審計工具")
    parser.add_argument("--plugin", type=str, help="指定單一插件名稱進行審計")
    parser.add_argument("--compact", action="store_true", help="緊湊輸出模式 (節省 Token，適合 Gate 2/3 調用)")
    parser.add_argument("--strict", action="store_true", help="嚴格模式 (將所有警告視為錯誤)")
    parser.add_argument("--json", action="store_true", help="輸出 JSON 格式報告")
    args = parser.parse_args()

    # 發現所有插件
    discovered = discover_plugins(BASE_DIR)
    all_plugins = {p: os.path.join(BASE_DIR, p) for p in discovered}

    if args.plugin:
        if args.plugin not in all_plugins:
            print(f"[ERROR] 找不到指定的插件: '{args.plugin}'。有效清單: {', '.join(discovered)}")
            sys.exit(1)
        target_plugins = [args.plugin]
    else:
        target_plugins = discovered

    total_scanned = 0
    plugin_results = {}
    has_critical_or_error = False
    has_warnings = False

    for p in target_plugins:
        issues, count = audit_plugin_isolation(p, all_plugins)
        total_scanned += count
        
        errors = [i for i in issues if i.severity in ('CRITICAL', 'ERROR')]
        warns = [i for i in issues if i.severity == 'WARN']
        
        if errors or (args.strict and warns):
            has_critical_or_error = True
        if warns:
            has_warnings = True

        plugin_results[p] = {
            "scanned": count,
            "errors": errors,
            "warnings": warns,
            "all_issues": issues
        }

    # JSON 模式輸出
    if args.json:
        report = {
            "summary": {
                "total_plugins": len(target_plugins),
                "total_scanned_files": total_scanned,
                "passed": not has_critical_or_error
            },
            "plugins": {
                p: {
                    "scanned": res["scanned"],
                    "error_count": len(res["errors"]),
                    "warning_count": len(res["warnings"]),
                    "issues": [i.to_dict() for i in res["all_issues"]]
                }
                for p, res in plugin_results.items()
            }
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        sys.exit(1 if has_critical_or_error else 0)

    # 終端緊湊模式
    if args.compact:
        status_symbol = "[X] 失敗" if has_critical_or_error else "[o] 通過"
        print(f"=== 多插件隔離審計 {status_symbol} (掃描 {len(target_plugins)} 個插件, {total_scanned} 個原始碼檔) ===")
        for p, res in plugin_results.items():
            err_cnt = len(res["errors"])
            warn_cnt = len(res["warnings"])
            if err_cnt == 0 and warn_cnt == 0:
                print(f"  [o] {p:<30} 掃描: {res['scanned']:>3} 檔 | 隔離合規")
            else:
                p_status = "[X]" if err_cnt > 0 or (args.strict and warn_cnt > 0) else "[!]"
                print(f"  {p_status} {p:<30} 掃描: {res['scanned']:>3} 檔 | 錯誤: {err_cnt}, 警告: {warn_cnt}")
                for i in res["all_issues"]:
                    print(f"      - {i}")
        
        sys.exit(1 if has_critical_or_error else 0)

    # 完整終端報告模式
    print("=" * 60)
    print("       Chrome Plus 多插件物理隔離與黑盒防衛審計器        ")
    print("=" * 60)
    print(f"工作區根目錄: {BASE_DIR}")
    print(f"目標插件 ({len(target_plugins)}): {', '.join(target_plugins)}\n")

    for p in target_plugins:
        res = plugin_results[p]
        err_cnt = len(res["errors"])
        warn_cnt = len(res["warnings"])

        if err_cnt == 0 and warn_cnt == 0:
            print(f"[*] 插件 [{p}] (掃描 {res['scanned']} 個檔案): [o] 完全隔離合規")
        else:
            header_sym = "[X]" if err_cnt > 0 else "[!]"
            print(f"{header_sym} 插件 [{p}] (掃描 {res['scanned']} 個檔案): {err_cnt} 個錯誤, {warn_cnt} 個警告")
            for issue in res["all_issues"]:
                print(f"    {issue}")
        print("-" * 60)

    if not has_critical_or_error:
        print(f"\n[審計總結] 成功！所有 {len(target_plugins)} 款插件均符合物理隔離與黑盒契約規範 (Exit 0)。")
        sys.exit(0)
    else:
        print(f"\n[審計總結] 檢測到隔離違背！請依據建議修復跨目錄引入或本機絕對路徑 (Exit 1)。")
        sys.exit(1)

if __name__ == '__main__':
    main()
