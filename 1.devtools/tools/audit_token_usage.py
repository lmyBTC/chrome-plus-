#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1.devtools/tools/audit_token_usage.py
-------------------------------------
Chrome Plus 專案之分層 Token 審計與健康檢查工具 (Tiered Token Audit)。
監控核心規則檔、專家技能檔與任務文件的 Token 消耗，防範 Context 膨脹。
"""

import os
import sys
import argparse
import io

# 強制標準輸出為 UTF-8，解決 Windows 下控制台亂碼與編碼報錯問題
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
elif sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except Exception:
        pass

# 確定目錄結構與專案根目錄
_tools_dir = os.path.dirname(os.path.abspath(__file__))
_devtools_dir = os.path.dirname(_tools_dir)
_project_root = os.path.dirname(_devtools_dir)

if _tools_dir not in sys.path:
    sys.path.insert(0, _tools_dir)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# 引用全域統一 Token 估算器 (SSOT)
try:
    from token_estimator import estimate_tokens, estimate_tokens_conservative
except ImportError:
    # 備援路徑
    from tools.token_estimator import estimate_tokens, estimate_tokens_conservative


# ==========================================
# 分層門檻與目標定義 (Tiered Thresholds)
# ==========================================

# Tier 1: 全域核心規則檔（常駐載入，最嚴格門檻）
TIER1_FILES = [
    "GEMINI.md",
    "AGENTS.md",
    ".agents/rules.md"
]
DEFAULT_TIER1_THRESHOLD = 2000

# Tier 2: 專案按需指南與技能（按需載入，門檻: 3,000 Tokens）
TIER2_DIRS = [
    ".agents/skills",
    "0.doc_mg/docs",
    "0.doc_mg/tasks"
]
DEFAULT_TIER2_THRESHOLD = 3000

# 排除目錄（完全不參與 Tier 2 掃描）
EXCLUDE_DIRS = [
    os.path.normpath("0.doc_mg/tasks/archive"),
    os.path.normpath("0.doc_mg/archive"),
    os.path.normpath(".agents/skills/dist"),
    os.path.normpath("node_modules"),
    os.path.normpath(".git"),
    os.path.normpath("dist")
]

# Tier 3: 規範契約與日誌文件（行數監控維護）
TIER3_FILES = [
    os.path.normpath("0.doc_mg/docs/cross_plugin_contract.md")
]
DEFAULT_TIER3_LINE_THRESHOLD = 500


def analyze_file(file_path):
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return {"error": str(e)}
        
    tokens = estimate_tokens_conservative(content)
    chars = len(content)
    lines = len(content.splitlines())
    return {"tokens": tokens, "chars": chars, "lines": lines}


def is_in_excluded_dir(rel_path):
    norm_path = os.path.normpath(rel_path)
    for exc in EXCLUDE_DIRS:
        if norm_path == exc or norm_path.startswith(exc + os.sep):
            return True
    return False


def main():
    parser = argparse.ArgumentParser(description="Chrome Plus 分層 Token 審計與健康檢查工具")
    parser.add_argument("--compact", action="store_true", help="啟用緊湊輸出模式，只顯示關鍵摘要與警告")
    parser.add_argument("--strict", action="store_true", help="若存在 CRITICAL 警報則以 Exit code 1 退出")
    parser.add_argument("--threshold-tier1", type=int, default=DEFAULT_TIER1_THRESHOLD, help="Tier 1 規則檔門檻 (預設 2,000)")
    parser.add_argument("--threshold-tier2", type=int, default=DEFAULT_TIER2_THRESHOLD, help="Tier 2 技能/文檔門檻 (預設 3,000)")
    parser.add_argument("--target", type=str, default=None, help="指定單一檔案或目錄進行 Token 檢測")
    args = parser.parse_args()

    project_root = _project_root
    t1_threshold = args.threshold_tier1
    t2_threshold = args.threshold_tier2

    # 單一目標快速檢測模式
    if args.target:
        target_path = os.path.abspath(args.target) if os.path.isabs(args.target) else os.path.join(project_root, args.target)
        res = analyze_file(target_path)
        if not res:
            print(f"[ERROR] 目標檔案不存在: {args.target}")
            sys.exit(1)
        if "error" in res:
            print(f"[ERROR] 讀取失敗: {res['error']}")
            sys.exit(1)
        print(f"目標: {args.target}")
        print(f"Tokens: {res['tokens']} | 字元: {res['chars']} | 行數: {res['lines']}")
        sys.exit(0)

    if not args.compact:
        print("=" * 64)
        print(" Chrome Plus — 分層 Token 審計報告 (Tiered Token Audit)")
        print(f" 專案根目錄: {project_root}")
        print("=" * 64)
    
    critical_issues = []
    warning_issues = []
    notices = []

    # -------------------------------------------------------------
    # 1. Tier 1: 全域核心規則檔 (Global Core Rules)
    # -------------------------------------------------------------
    if not args.compact:
        print(f"\n[Tier 1: 全域核心規則檔 (常駐載入 / 門檻: {t1_threshold:,} Tokens)]")
    
    for rel_file in TIER1_FILES:
        full_path = os.path.join(project_root, rel_file)
        res = analyze_file(full_path)
        if not res:
            if not args.compact:
                print(f"  [MISSING]  {rel_file} 檔案不存在")
            continue
        if "error" in res:
            if not args.compact:
                print(f"  [ERROR]    {rel_file}: 讀取失敗 ({res['error']})")
            continue
            
        tokens = res["tokens"]
        if tokens > t1_threshold:
            status = "CRITICAL"
            critical_issues.append({"file": rel_file, "tokens": tokens, "tier": "Tier 1"})
            if not args.compact:
                print(f"  [{status:<8}] {rel_file:<24} | Tokens: {tokens:>5} (字元: {res['chars']:>5})")
        else:
            status = "PASS"
            if not args.compact:
                print(f"  [{status:<8}] {rel_file:<24} | Tokens: {tokens:>5} (字元: {res['chars']:>5})")

    # -------------------------------------------------------------
    # 2. Tier 2: 專案按需指南與技能 (On-Demand Guides & Skills)
    # -------------------------------------------------------------
    if not args.compact:
        print(f"\n[Tier 2: 按需指南與技能 (排除 archive/ / 門檻: {t2_threshold:,} Tokens)]")
    tier2_files = []
    
    for rel_dir in TIER2_DIRS:
        full_dir = os.path.join(project_root, rel_dir)
        if not os.path.exists(full_dir):
            continue
            
        for root, _, files in os.walk(full_dir):
            for file in files:
                if not file.endswith(".md"):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, project_root).replace("\\", "/")
                norm_rel_path = os.path.normpath(rel_path).replace("\\", "/")
                
                # 排除過濾
                if is_in_excluded_dir(norm_rel_path):
                    continue
                if norm_rel_path in TIER3_FILES:
                    continue
                tier2_files.append((norm_rel_path, full_path))

    tier2_files.sort(key=lambda x: x[0])
    for rel_path, full_path in tier2_files:
        res = analyze_file(full_path)
        if not res or "error" in res:
            continue
        tokens = res["tokens"]
        if tokens > t2_threshold:
            status = "WARN"
            warning_issues.append({"file": rel_path, "tokens": tokens, "tier": "Tier 2"})
            if not args.compact:
                print(f"  [{status:<8}] {rel_path:<48} | Tokens: {tokens:>5}")

    if not warning_issues and not args.compact:
        print(f"  所有 Tier 2 文件均在健康範圍內 (<= {t2_threshold:,} Tokens)。[ALL PASS]")

    # -------------------------------------------------------------
    # 3. Tier 3: 規範契約與日誌 (Line Count Monitoring)
    # -------------------------------------------------------------
    if not args.compact:
        print(f"\n[Tier 3: 規範契約與監控文件 (行數監控 / 門檻: {DEFAULT_TIER3_LINE_THRESHOLD} 行)]")
    for norm_rel_path in TIER3_FILES:
        full_path = os.path.join(project_root, norm_rel_path)
        res = analyze_file(full_path)
        if not res or "error" in res:
            continue
        lines = res["lines"]
        posix_rel_path = norm_rel_path.replace("\\", "/")
        if lines > DEFAULT_TIER3_LINE_THRESHOLD:
            status = "NOTICE"
            notices.append({"file": posix_rel_path, "lines": lines})
            if not args.compact:
                print(f"  [{status:<8}] {posix_rel_path:<48} | 行數: {lines:>4} (建議評估維護)")
        else:
            status = "PASS"
            if not args.compact:
                print(f"  [{status:<8}] {posix_rel_path:<48} | 行數: {lines:>4}")

    # -------------------------------------------------------------
    # 4. 總結 (Summary)
    # -------------------------------------------------------------
    total_alerts = len(critical_issues) + len(warning_issues)
    
    if args.compact:
        print(f"[Token Audit] Alerts: {total_alerts} (CRITICAL: {len(critical_issues)}, WARN: {len(warning_issues)}, NOTICE: {len(notices)})")
        if total_alerts > 0:
            for item in critical_issues:
                print(f"  - CRITICAL: {item['file']} ({item['tokens']:,} > {t1_threshold})")
            for item in warning_issues:
                print(f"  - WARN: {item['file']} ({item['tokens']:,} > {t2_threshold})")
    else:
        print("\n" + "=" * 64)
        print(" 審計結論 (Audit Summary)")
        print("=" * 64)
        print(f" Tier 1 CRITICAL : {len(critical_issues)} 筆")
        print(f" Tier 2 WARN     : {len(warning_issues)} 筆")
        print(f" Tier 3 NOTICE   : {len(notices)} 筆")
        print(f" 實質警報總數    : {total_alerts} 筆")

        if total_alerts == 0:
            print("\n 系統評級: 健康 [ALL CLEAR]")
        else:
            print("\n 待關注清單:")
            for item in critical_issues:
                print(f"  * [Tier 1 CRITICAL] {item['file']} (Tokens: {item['tokens']:,} > {t1_threshold:,})")
            for item in warning_issues:
                print(f"  * [Tier 2 WARN]     {item['file']} (Tokens: {item['tokens']:,} > {t2_threshold:,})")

    if args.strict and len(critical_issues) > 0:
        sys.exit(1)
    
    sys.exit(0)


if __name__ == "__main__":
    main()

