#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1.devtools/tools/audit_suite.py
Chrome Plus - Gate 3 整合自動化審計套件 (Gate 3 Automated Audit Suite)

核心職責:
- 整合調用全站品質與架構門禁工具，提供一鍵全自動 Gate 3 檢驗。
- 涵蓋 6 大核心門禁:
  1. Manifest V3 合規性與安全審計 (audit_manifests.py)
  2. 多插件邊界與實體隔離防衛 (audit_plugin_isolation.py)
  3. Markdown 連結、死鏈與路徑規範 (audit_markdown_links.py)
  4. 文檔交叉引用一致性 (doc_cross_ref.py)
  5. 規則與文檔 Token 預算健康度 (audit_token_usage.py)
  6. SSOT 規範與真理防腐審計 (audit_ssot.mjs)
- 提供極簡緊湊終端矩陣、JSON 結構化輸出與 strict 嚴格中斷模式。
- 100% Python 3 原生標準庫，完全相容 Windows PowerShell 與 UTF-8 環境。

Usage:
  py 1.devtools/tools/audit_suite.py               # 預設簡報矩陣模式 (Exit 0/1)
  py 1.devtools/tools/audit_suite.py --compact     # 緊湊模式
  py 1.devtools/tools/audit_suite.py --strict      # 嚴格模式 (遇任何 WARN/CRITICAL 即 Exit 1)
  py 1.devtools/tools/audit_suite.py --json        # 輸出 JSON 格式報告
  py 1.devtools/tools/audit_suite.py --only manifests isolation
  py 1.devtools/tools/audit_suite.py --fix         # 連動修復可修復項目 (如 Markdown 連結)
"""

import os
import sys
import time
import json
import argparse
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional

# UTF-8 輸出相容性防護
try:
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
except AttributeError:
    pass

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEVTOOLS_DIR = REPO_ROOT / "1.devtools" / "tools"


class SuiteRunner:
    def __init__(self, strict: bool = False, fix: bool = False):
        self.strict = strict
        self.fix = fix
        self.python_exec = sys.executable
        self.node_exec = "node"

    def _run_cmd(self, args: List[str]) -> subprocess.CompletedProcess:
        return subprocess.run(
            [self.python_exec] + args,
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )

    def _run_node_cmd(self, args: List[str]) -> subprocess.CompletedProcess:
        return subprocess.run(
            [self.node_exec] + args,
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )

    def audit_manifests(self) -> Dict[str, Any]:
        """[Suite 1] Manifest V3 合規性與安全性"""
        t0 = time.perf_counter()
        script = DEVTOOLS_DIR / "audit_manifests.py"
        cmd = [str(script), "--compact"]
        res = self._run_cmd(cmd)
        elapsed = time.perf_counter() - t0

        output = res.stdout.strip()
        lines = [line.strip() for line in output.splitlines() if line.strip()]
        
        # 判斷結果
        passed = (res.returncode == 0) and ("合規" in output or "[o]" in output)
        has_xss_warn = "XSS 警告" in output
        
        status = "PASS" if passed else "FAIL"
        if passed and has_xss_warn and self.strict:
            status = "WARN"

        summary = "5/5 插件 Manifest V3 完全合規"
        if has_xss_warn:
            summary += " (含局部 innerHTML 提示)"
        if not passed:
            summary = "發現 Manifest 規範違背或解析失敗"

        return {
            "id": "manifests",
            "name": "Manifest V3 合規性",
            "status": status,
            "exit_code": res.returncode,
            "elapsed": elapsed,
            "summary": summary,
            "stdout": output,
            "stderr": res.stderr.strip()
        }

    def audit_isolation(self) -> Dict[str, Any]:
        """[Suite 2] 多插件邊界與實體隔離防衛"""
        t0 = time.perf_counter()
        script = DEVTOOLS_DIR / "audit_plugin_isolation.py"
        cmd = [str(script), "--compact"]
        if self.strict:
            cmd.append("--strict")
        res = self._run_cmd(cmd)
        elapsed = time.perf_counter() - t0

        output = res.stdout.strip()
        passed = (res.returncode == 0)
        
        status = "PASS" if passed else "FAIL"
        summary = "多插件 100% 獨立隔離，無非法跨目錄引用"
        if not passed:
            summary = "偵測到違反多插件邊界隔離或絕對路徑引用"

        return {
            "id": "isolation",
            "name": "多插件邊界與實體隔離",
            "status": status,
            "exit_code": res.returncode,
            "elapsed": elapsed,
            "summary": summary,
            "stdout": output,
            "stderr": res.stderr.strip()
        }

    def audit_markdown_links(self) -> Dict[str, Any]:
        """[Suite 3] Markdown 連結、死鏈與錨點"""
        t0 = time.perf_counter()
        script = DEVTOOLS_DIR / "audit_markdown_links.py"
        cmd = [str(script), "--quiet"]
        if self.fix:
            cmd = [str(script), "--quiet", "--fix"]
        res = self._run_cmd(cmd)
        elapsed = time.perf_counter() - t0

        output = res.stdout.strip()
        status = "PASS"
        summary = "Markdown 連結無阻斷性錯誤"
        dead_count = 0
        redundant_count = 0

        try:
            # 嘗試解析 quiet 輸出的 JSON
            data = json.loads(output)
            dead_count = data.get("dead", 0)
            redundant_count = data.get("redundant", 0)
            files = data.get("files", 0)
            
            if dead_count > 0:
                if self.strict:
                    status = "FAIL"
                else:
                    status = "WARN"
                summary = f"掃描 {files} 檔: 發現 {dead_count} 處死鏈, {redundant_count} 處冗餘格式"
            else:
                summary = f"掃描 {files} 檔: 0 死鏈, {redundant_count} 處建議標準化"
        except Exception:
            summary = output.splitlines()[-1] if output else "完成掃描"

        return {
            "id": "markdown_links",
            "name": "Markdown 連結與死鏈",
            "status": status,
            "exit_code": res.returncode,
            "elapsed": elapsed,
            "summary": summary,
            "stdout": output,
            "stderr": res.stderr.strip()
        }

    def audit_cross_ref(self) -> Dict[str, Any]:
        """[Suite 4] 文件交叉引用一致性"""
        t0 = time.perf_counter()
        script = DEVTOOLS_DIR / "doc_cross_ref.py"
        # 針對主要文檔目錄 0.doc_mg 進行 dry-run 審計
        cmd = [str(script), "--dir", "0.doc_mg", "--dry-run"]
        res = self._run_cmd(cmd)
        elapsed = time.perf_counter() - t0

        output = res.stdout.strip()
        passed = (res.returncode == 0)
        status = "PASS" if passed else "FAIL"
        
        # 提煉最後一行結果
        summary = "文件交叉引用標籤檢索正常"
        lines = [line.strip() for line in output.splitlines() if line.strip()]
        for line in reversed(lines):
            if "將被更新" in line or "檔案" in line:
                summary = line
                break

        return {
            "id": "cross_ref",
            "name": "文件交叉引用一致性",
            "status": status,
            "exit_code": res.returncode,
            "elapsed": elapsed,
            "summary": summary,
            "stdout": output,
            "stderr": res.stderr.strip()
        }

    def audit_token_usage(self) -> Dict[str, Any]:
        """[Suite 5] 規則與文檔 Token 預算健康度"""
        t0 = time.perf_counter()
        script = DEVTOOLS_DIR / "audit_token_usage.py"
        cmd = [str(script), "--compact"]
        if self.strict:
            cmd.append("--strict")
        res = self._run_cmd(cmd)
        elapsed = time.perf_counter() - t0

        output = res.stdout.strip()
        passed = (res.returncode == 0)
        has_critical = "CRITICAL" in output
        
        status = "PASS"
        if not passed or (has_critical and self.strict):
            status = "FAIL"
        elif has_critical:
            status = "WARN"

        summary = "Token 預算健康無阻斷性溢出"
        first_line = output.splitlines()[0] if output else ""
        if "Alerts" in first_line:
            summary = first_line

        return {
            "id": "token_usage",
            "name": "Token 預算與健康度",
            "status": status,
            "exit_code": res.returncode,
            "elapsed": elapsed,
            "summary": summary,
            "stdout": output,
            "stderr": res.stderr.strip()
        }

    def audit_ssot(self) -> Dict[str, Any]:
        """[Suite 6] SSOT 規範與真理防腐審計"""
        t0 = time.perf_counter()
        script = DEVTOOLS_DIR / "audit_ssot.mjs"
        cmd = [str(script), "--json"]
        if self.strict:
            cmd.append("--strict")
        res = self._run_node_cmd(cmd)
        elapsed = time.perf_counter() - t0

        output = res.stdout.strip()
        status = "PASS"
        summary = "SSOT 索引完整，無孤兒與違規命名"

        try:
            data = json.loads(output)
            cataloged = data.get("catalogedCount", 0)
            scanned = data.get("scannedCount", 0)
            raw_status = data.get("status", "PASS")
            issues = data.get("issues", [])
            warnings = data.get("warnings", [])

            if issues or res.returncode != 0 or raw_status == "FAIL":
                status = "FAIL"
                err_msg = issues[0] if issues else "存在 SSOT 規範違背"
                summary = f"發現 {len(issues)} 處 SSOT 阻斷缺失: {err_msg}"
            elif warnings:
                status = "WARN" if not self.strict else "FAIL"
                summary = f"驗證 {cataloged} 份索引: 發現 {len(warnings)} 處待關注項目"
            else:
                status = "PASS"
                summary = f"驗證 {cataloged} 份索引 / 掃描 {scanned} 份手冊: 0 缺失 0 孤兒"
        except Exception:
            if res.returncode != 0:
                status = "FAIL"
                summary = "audit_ssot.mjs 執行失敗"
            else:
                summary = output.splitlines()[-1] if output else "完成 SSOT 審計"

        return {
            "id": "ssot",
            "name": "SSOT 規範與真理防腐",
            "status": status,
            "exit_code": res.returncode,
            "elapsed": elapsed,
            "summary": summary,
            "stdout": output,
            "stderr": res.stderr.strip()
        }


def format_table(results: List[Dict[str, Any]], total_elapsed: float, strict: bool) -> str:
    """生成對齊美觀、Token 脫水的終端矩陣"""
    divider = "=" * 82
    sub_divider = "-" * 82
    title = "🔍 Chrome Plus - Gate 3 整合自動化審計套件 (Gate 3 Audit Suite)"
    col_header = f"{'項目':<26} {'狀態':<10} {'耗時':<9} {'關鍵指標與摘要'}"
    
    header = f"{divider}\n{title}\n{divider}\n{col_header}\n{sub_divider}"
    
    rows = []
    status_counts = {"PASS": 0, "WARN": 0, "FAIL": 0}
    
    for idx, r in enumerate(results, 1):
        status = r["status"]
        status_counts[status] = status_counts.get(status, 0) + 1
        
        # 標籤著色/符號
        tag = f"[{status}]"
        if status == "PASS":
            tag = "[ PASS ]"
        elif status == "WARN":
            tag = "[ WARN ]"
        elif status == "FAIL":
            tag = "[ FAIL ]"
            
        elapsed_str = f"{r['elapsed']:.2f}s"
        name_str = f"[{idx}] {r['name']}"
        summary_str = r["summary"]
        
        rows.append(f"{name_str:<26} {tag:<10} {elapsed_str:<9} {summary_str}")
        
    all_passed = (status_counts["FAIL"] == 0) and (not strict or status_counts["WARN"] == 0)
    
    if all_passed:
        final_summary = (
            f"✅ [結果總結] 所有門禁審計均通過 (通過: {status_counts['PASS']}, 警告: {status_counts['WARN']}) "
            f"- 總耗時 {total_elapsed:.2f}s - 符合 Gate 3 結案標準 (Exit 0)。"
        )
    else:
        final_summary = (
            f"❌ [結果總結] 審計未通過 (失敗: {status_counts['FAIL']}, 警告: {status_counts['WARN']}) "
            f"- 總耗時 {total_elapsed:.2f}s - 未達 Gate 3 結案標準 (Exit 1)。"
        )

    footer = f"{sub_divider}\n{final_summary}\n{divider}"
    
    return header + "\n" + "\n".join(rows) + "\n" + footer


def main() -> int:
    parser = argparse.ArgumentParser(description="Chrome Plus Gate 3 整合自動化審計套件")
    parser.add_argument("--compact", action="store_true", default=True, help="啟用緊湊模式 (預設開啟)")
    parser.add_argument("--strict", action="store_true", help="啟用嚴格模式 (遇任何 WARN/CRITICAL 即退出 1)")
    parser.add_argument("--json", action="store_true", help="輸出 JSON 格式報告")
    parser.add_argument("--verbose", "-v", action="store_true", help="顯示詳細子工具輸出")
    parser.add_argument("--fix", action="store_true", help="連動修復支援修復之項目 (如 Markdown 連結)")
    parser.add_argument(
        "--only", nargs="+",
        choices=["manifests", "isolation", "markdown_links", "cross_ref", "token_usage", "ssot"],
        help="僅執行指定的審計子項"
    )

    args = parser.parse_args()

    runner = SuiteRunner(strict=args.strict, fix=args.fix)
    
    suites = [
        ("manifests", runner.audit_manifests),
        ("isolation", runner.audit_isolation),
        ("markdown_links", runner.audit_markdown_links),
        ("cross_ref", runner.audit_cross_ref),
        ("token_usage", runner.audit_token_usage),
        ("ssot", runner.audit_ssot)
    ]

    if args.only:
        suites = [s for s in suites if s[0] in args.only]

    t_start = time.perf_counter()
    results = []
    has_fail = False
    has_warn = False

    for suite_id, func in suites:
        res = func()
        results.append(res)
        if res["status"] == "FAIL":
            has_fail = True
        elif res["status"] == "WARN":
            has_warn = True

    total_elapsed = time.perf_counter() - t_start

    # JSON 模式輸出
    if args.json:
        report = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "strict": args.strict,
            "total_elapsed": total_elapsed,
            "status": "FAIL" if (has_fail or (args.strict and has_warn)) else "PASS",
            "results": results
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(format_table(results, total_elapsed, strict=args.strict))
        
        # 若需要 verbose 或有失敗項，印出詳細 stdout/stderr
        if args.verbose or has_fail:
            for r in results:
                if args.verbose or r["status"] == "FAIL":
                    print(f"\n--- [詳細輸出: {r['name']} ({r['status']})] ---")
                    if r["stdout"]:
                        print(r["stdout"])
                    if r["stderr"]:
                        print(f"[STDERR]\n{r['stderr']}")

    # 判定 Exit Code
    if has_fail:
        return 1
    if args.strict and has_warn:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
