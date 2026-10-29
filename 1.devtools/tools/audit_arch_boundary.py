#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1.devtools/tools/audit_arch_boundary.py
----------------------------------------
Chrome Plus - 領域架構防腐與 Barrel 門面審查器 (Domain Architecture & Barrel Boundary Auditor)

核心職責:
1. 依據 guide-pk-features-arch.md 審查插件內部四層架構 (entries, features, shared, types) 之依賴方向。
2. 杜絕底層反向依賴 (Shared/Types 依賴 Features/Entries -> ERROR)。
3. 強制嚴格 Barrel 門面模式 (跨 Feature 引用禁止穿透至私有內部路徑 -> ERROR)。
4. 驗證微工具 (Toolbox Tools) 間的獨立封閉性 (禁止跨微工具私有穿透 -> ERROR)。
5. 檢查領域與微工具目錄門面出口 (index.ts) 完整性 (WARNING)。
6. 支援 --plugin, --compact, --strict, --json 與 Exit 0/1 門禁。

用法範例:
  py 1.devtools/tools/audit_arch_boundary.py                     # 預設審查 chrome_pk
  py 1.devtools/tools/audit_arch_boundary.py --plugin chrome_pk  # 指定插件
  py 1.devtools/tools/audit_arch_boundary.py --compact           # 緊湊模式 (單行匯總)
  py 1.devtools/tools/audit_arch_boundary.py --strict            # 嚴格模式 (WARN 視為失敗)
  py 1.devtools/tools/audit_arch_boundary.py --json              # 輸出 JSON 結構化報告
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from lib.common import setup_utf8_output, get_repo_root, REPO_ROOT

setup_utf8_output()


class ArchViolation:
    def __init__(self, rule_id: str, severity: str, file_path: str, line_num: int, target: str, message: str, suggestion: str = ""):
        self.rule_id = rule_id          # e.g., "RULE_ARCH_BARREL_PENETRATION"
        self.severity = severity        # "ERROR" or "WARNING"
        self.file_path = file_path      # 相對插件根目錄之檔案路徑
        self.line_num = line_num        # 行號
        self.target = target            # import target specifier
        self.message = message          # 問題描述
        self.suggestion = suggestion    # 修正建議

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "severity": self.severity,
            "file": self.file_path,
            "line": self.line_num,
            "target": self.target,
            "message": self.message,
            "suggestion": self.suggestion,
        }


class ArchAuditor:
    def __init__(self, plugin_name: str = "chrome_pk", strict: bool = False, verbose: bool = False):
        self.plugin_name = plugin_name
        self.strict = strict
        self.verbose = verbose
        self.plugin_dir = REPO_ROOT / plugin_name
        self.src_dir = self.plugin_dir / "src"

        self.violations: List[ArchViolation] = []
        self.scanned_files_count = 0
        self.features_found: List[str] = []
        self.tools_found: List[str] = []

        # 正則表達式：匹配 import / export 語句中的路徑引用
        # 1. 靜態 import / export from: import ... from '...'; export ... from '...';
        # 2. 裸 import: import '...';
        # 3. 動態 import(): import('...')
        # 4. require: require('...')
        self._import_regex = re.compile(
            r"""(?:^|[\s;{}])(?:import|export)\s+(?:type\s+)?(?:[\w*\s{},$]+\s+from\s+)?['"]([^'"]+)['"]"""
            r"""|(?:import\s*\(\s*['"]([^'"]+)['"]\s*\))"""
            r"""|(?:require\s*\(\s*['"]([^'"]+)['"]\s*\))"""
        )

    def _strip_comments(self, text: str) -> str:
        """去除 JavaScript / TypeScript 單行與多行註解，保留換行以維持行號"""
        def replacer(match):
            s = match.group(0)
            if s.startswith('/'):
                # 將註解替換為等量換行，維持行號一致
                return '\n' * s.count('\n')
            return s

        comment_pattern = re.compile(
            r'//.*?$|/\*.*?\*/|\'(?:\\.|[^\\\'])*\'|"(?:\\.|[^\\"])*"',
            re.DOTALL | re.MULTILINE
        )
        return re.sub(comment_pattern, replacer, text)

    def _get_feature_name(self, rel_path: Path) -> Optional[str]:
        """判斷路徑是否屬於 src/features/<feature_name>，若是則返回 feature 名稱"""
        parts = rel_path.parts
        if len(parts) >= 2 and parts[0] == "features":
            return parts[1]
        return None

    def _get_toolbox_tool_id(self, rel_path: Path) -> Optional[str]:
        """判斷路徑是否屬於 src/features/toolbox/tools/<tool_id>"""
        parts = rel_path.parts
        if len(parts) >= 4 and parts[0] == "features" and parts[1] == "toolbox" and parts[2] == "tools":
            return parts[3]
        return None

    def _resolve_target_path(self, current_file_rel_src: Path, target: str) -> Optional[Path]:
        """
        將 import 標的解析為相對於 src/ 的標準路徑。
        若是第三方套件 (例如 'react', 'lucide-react') 則返回 None。
        """
        # 1. Alias: @/* -> src/*
        if target.startswith("@/"):
            clean = target[2:].lstrip("/")
            return Path(clean)

        # 2. 相對路徑: ./ 或 ../
        if target.startswith("./") or target.startswith("../"):
            current_dir = current_file_rel_src.parent
            resolved = (current_dir / target).resolve()
            try:
                # 計算相對於 src_dir 的相對路徑
                rel = resolved.relative_to(self.src_dir.resolve())
                return rel
            except ValueError:
                # 超出 src_dir 範圍（可能是跨插件或引用外層），保留為絕對或相對標記
                return None

        # 3. 第三方套件或內建模組
        return None

    def run_audit(self) -> Dict[str, Any]:
        """執行完整架構邊界審計"""
        if not self.src_dir.exists():
            self.violations.append(ArchViolation(
                rule_id="RULE_ARCH_SRC_NOT_FOUND",
                severity="ERROR",
                file_path=self.plugin_name,
                line_num=0,
                target="",
                message=f"插件目錄不存在 src/ 源碼資料夾: {self.src_dir}"
            ))
            return self._summarize()

        # 探索 features 與 tools
        features_dir = self.src_dir / "features"
        if features_dir.exists():
            self.features_found = [
                d.name for d in features_dir.iterdir()
                if d.is_dir() and not d.name.startswith('.')
            ]
            toolbox_tools_dir = features_dir / "toolbox" / "tools"
            if toolbox_tools_dir.exists():
                self.tools_found = [
                    d.name for d in toolbox_tools_dir.iterdir()
                    if d.is_dir() and not d.name.startswith('.')
                ]

        # 1. 檢查門面出口完整性 (RULE_ARCH_BARREL_INTEGRITY)
        self._check_barrel_integrity()

        # 2. 逐檔掃描 imports
        for root, dirs, files in os.walk(self.src_dir):
            # 排除暫存或編譯輸出
            dirs[:] = [d for d in dirs if d not in ('.git', 'dist', 'node_modules', 'coverage', '__tests__')]
            for file in files:
                if not (file.endswith(('.ts', '.tsx', '.js', '.jsx')) and not file.endswith('.d.ts')):
                    continue

                full_path = Path(root) / file
                rel_src = full_path.relative_to(self.src_dir)
                self.scanned_files_count += 1
                self._audit_file_imports(full_path, rel_src)

        return self._summarize()

    def _check_barrel_integrity(self):
        """檢查所有 features 和 toolbox tools 是否皆具備 index.ts / index.tsx 門面"""
        # 檢查各 feature
        features_dir = self.src_dir / "features"
        if features_dir.exists():
            for f_name in self.features_found:
                f_dir = features_dir / f_name
                has_index = any((f_dir / idx).exists() for idx in ("index.ts", "index.tsx", "index.js"))
                if not has_index:
                    self.violations.append(ArchViolation(
                        rule_id="RULE_ARCH_BARREL_INTEGRITY",
                        severity="WARNING",
                        file_path=f"src/features/{f_name}",
                        line_num=1,
                        target=f"@/features/{f_name}",
                        message=f"領域模組 [{f_name}] 缺少標準門面出口 (index.ts 或 index.tsx)",
                        suggestion=f"請在 src/features/{f_name}/ 建立 index.ts 並統一導出公開 API 與元件。"
                    ))

        # 檢查各 toolbox micro-tool
        toolbox_tools_dir = self.src_dir / "features" / "toolbox" / "tools"
        if toolbox_tools_dir.exists():
            for t_id in self.tools_found:
                t_dir = toolbox_tools_dir / t_id
                has_index = any((t_dir / idx).exists() for idx in ("index.ts", "index.tsx", "index.js"))
                if not has_index:
                    self.violations.append(ArchViolation(
                        rule_id="RULE_ARCH_BARREL_INTEGRITY",
                        severity="WARNING",
                        file_path=f"src/features/toolbox/tools/{t_id}",
                        line_num=1,
                        target=f"./tools/{t_id}",
                        message=f"微工具 [{t_id}] 缺少標準門面出口 (index.ts 或 index.tsx)",
                        suggestion=f"請在 src/features/toolbox/tools/{t_id}/ 建立 index.ts 並導出 manifest 與主視圖元件。"
                    ))

    def _audit_file_imports(self, full_path: Path, rel_src: Path):
        """審查單個檔案的所有 import/export 語句"""
        try:
            content = full_path.read_text(encoding='utf-8', errors='ignore')
        except Exception as e:
            return

        stripped_content = self._strip_comments(content)
        lines = stripped_content.splitlines()

        # 檔案所屬層級與上下文
        src_parts = rel_src.parts
        file_layer = src_parts[0] if src_parts else ""
        source_feature = self._get_feature_name(rel_src)
        source_tool = self._get_toolbox_tool_id(rel_src)

        for line_num, line in enumerate(lines, 1):
            if "import" not in line and "export" not in line and "require" not in line:
                continue

            for match in self._import_regex.finditer(line):
                target = match.group(1) or match.group(2) or match.group(3)
                if not target:
                    continue

                resolved_rel = self._resolve_target_path(rel_src, target)
                if not resolved_rel:
                    continue

                target_parts = resolved_rel.parts
                if not target_parts:
                    continue

                target_layer = target_parts[0]

                # =========================================================
                # 規則 1: Shared / Types 反向依賴防護 (RULE_ARCH_SHARED_PURITY)
                # =========================================================
                if file_layer in ("shared", "types"):
                    if target_layer in ("features", "entries"):
                        self.violations.append(ArchViolation(
                            rule_id="RULE_ARCH_SHARED_PURITY",
                            severity="ERROR",
                            file_path=f"src/{rel_src.as_posix()}",
                            line_num=line_num,
                            target=target,
                            message=f"底層共用模組 [{file_layer}] 反向依賴高層領域業務 [{target_layer}]，破壞單向依賴架構",
                            suggestion=f"請將被依賴之通用邏輯下沉至 src/shared/ 或透過依賴注入/契約介面 (Interface) 抽象化。"
                        ))
                elif file_layer == "types" and target_layer == "shared":
                    # types 禁止引用 shared 具體實作
                    self.violations.append(ArchViolation(
                        rule_id="RULE_ARCH_TYPES_PURITY",
                        severity="ERROR",
                        file_path=f"src/{rel_src.as_posix()}",
                        line_num=line_num,
                        target=target,
                        message="全域型別層 [types] 引用了實作層 [shared]，應保持純型別定義",
                        suggestion="請將具體實作與純型別分離，或僅引入 .types 檔。"
                    ))

                # =========================================================
                # 規則 2: 跨 Feature 門面穿透檢測 (RULE_ARCH_BARREL_PENETRATION)
                # =========================================================
                if target_layer == "features" and len(target_parts) >= 2:
                    target_feature = target_parts[1]
                    # 若目標屬於 toolbox 內的微工具，由規則 3 (微工具隔離) 專門審查，避免重複報錯
                    is_targeting_micro_tool = (
                        target_feature == "toolbox" and len(target_parts) >= 4 and target_parts[2] == "tools"
                    )

                    # 判斷是否為「跨 Feature」引用
                    is_cross_feature = (source_feature != target_feature)

                    if is_cross_feature and not is_targeting_micro_tool:
                        # 檢查是否穿透深入私有子路徑
                        # 合法引用標準:
                        #   target_parts == ('features', target_feature)
                        #   或 ('features', target_feature, 'index')
                        #   或 ('features', target_feature, 'index.ts' / 'index.tsx')
                        sub_parts = target_parts[2:]
                        is_penetration = False
                        if len(sub_parts) > 0:
                            first_sub = sub_parts[0]
                            # 如果第一層子路徑不是 index 或 index.ts/tsx，且包含 components/hooks/services/contexts 等私有目錄
                            if first_sub not in ("index", "index.ts", "index.tsx", "index.js"):
                                is_penetration = True

                        if is_penetration:
                            self.violations.append(ArchViolation(
                                rule_id="RULE_ARCH_BARREL_PENETRATION",
                                severity="ERROR",
                                file_path=f"src/{rel_src.as_posix()}",
                                line_num=line_num,
                                target=target,
                                message=f"跨領域引用違規穿透：禁止從外部直接引用私有子路徑 [features/{target_feature}/{'/'.join(sub_parts)}]",
                                suggestion=f"請在 src/features/{target_feature}/index.ts 中公開所需匯出，外部統一改為引用 '@/features/{target_feature}'"
                            ))

                # =========================================================
                # 規則 3: 微工具獨立封閉性 (RULE_ARCH_MICRO_TOOL_ISOLATION)
                # =========================================================
                # 檢查是否引用了 toolbox/tools/<tool_id>
                if len(target_parts) >= 4 and target_parts[0] == "features" and target_parts[1] == "toolbox" and target_parts[2] == "tools":
                    target_tool = target_parts[3]
                    tool_sub_parts = target_parts[4:]

                    # 情況 A: 非微工具本身引用微工具（例如從外部或 toolbox/registry）
                    # registry.ts 允許引用 ./tools/<tool_id> (即門面)
                    # 其他模組禁止深入微工具內部 components / services
                    if source_tool != target_tool:
                        # 跨工具或外部引用微工具內部
                        if len(tool_sub_parts) > 0 and tool_sub_parts[0] not in ("index", "index.ts", "index.tsx", "index.js", "manifest", "manifest.ts"):
                            self.violations.append(ArchViolation(
                                rule_id="RULE_ARCH_MICRO_TOOL_ISOLATION",
                                severity="ERROR",
                                file_path=f"src/{rel_src.as_posix()}",
                                line_num=line_num,
                                target=target,
                                message=f"微工具私有穿透：禁止跨微工具或從外部穿透引用微工具內部私有路徑 [{'/'.join(tool_sub_parts)}]",
                                suggestion=f"微工具需保持完全封閉與隨插即用。若為共用邏輯請上提至 shared/，若為對外視圖請透過微工具 index.ts 門面導出。"
                            ))

    def _summarize(self) -> Dict[str, Any]:
        errors = [v for v in self.violations if v.severity == "ERROR"]
        warnings = [v for v in self.violations if v.severity == "WARNING"]

        passed = (len(errors) == 0)
        if self.strict and len(warnings) > 0:
            passed = False

        return {
            "plugin": self.plugin_name,
            "passed": passed,
            "scanned_files": self.scanned_files_count,
            "features_count": len(self.features_found),
            "features": self.features_found,
            "tools_count": len(self.tools_found),
            "tools": self.tools_found,
            "error_count": len(errors),
            "warning_count": len(warnings),
            "violations": [v.to_dict() for v in self.violations]
        }


def print_report(summary: Dict[str, Any], compact: bool = False, verbose: bool = False):
    """輸出人性化終端報告"""
    plugin = summary["plugin"]
    scanned = summary["scanned_files"]
    f_cnt = summary["features_count"]
    t_cnt = summary["tools_count"]
    err_cnt = summary["error_count"]
    warn_cnt = summary["warning_count"]
    passed = summary["passed"]

    if compact:
        status_tag = "[PASS]" if passed else "[FAIL]"
        print(f"{status_tag} Arch Boundary Audit: {plugin} ({scanned} files, {f_cnt} features, {t_cnt} tools, {err_cnt} errors, {warn_cnt} warnings)")
        if not passed:
            for v in summary["violations"]:
                if v["severity"] == "ERROR":
                    print(f"  -> [{v['rule_id']}] {v['file']}:{v['line']} - {v['message']}")
        return

    # 標準詳細輸出
    print("=" * 70)
    print(f"🛡️  領域架構防腐與 Barrel 門面審查器 (Arch Boundary Auditor)")
    print(f"目標插件: {plugin} | 檔案數: {scanned} | 領域數: {f_cnt} | 微工具數: {t_cnt}")
    print("=" * 70)

    if f_cnt > 0:
        print(f"📦 偵測到的業務領域 (Features): {', '.join(summary['features'])}")
    if t_cnt > 0:
        print(f"🧩 偵測到的微工具 (Toolbox Tools): {', '.join(summary['tools'])}")
    print("-" * 70)

    if not summary["violations"]:
        print("✅ 恭喜！架構邊界審計全數合格 (0 Errors, 0 Warnings)。")
        print("   - 無底層反向依賴 (Shared/Types Purity)")
        print("   - 嚴格遵守 Barrel 門面模式 (No Private Penetration)")
        print("   - 微工具完全隨插即用封裝 (Micro-tool Isolation)")
        print("=" * 70)
        return

    for v in summary["violations"]:
        icon = "❌" if v["severity"] == "ERROR" else "⚠️"
        print(f"{icon} [{v['severity']}] [{v['rule_id']}]")
        print(f"   檔案位置: {v['file']}:{v['line']}")
        print(f"   引用標的: {v['target']}")
        print(f"   違規說明: {v['message']}")
        if v.get("suggestion"):
            print(f"   修復建議: {v['suggestion']}")
        print()

    print("-" * 70)
    status_text = "PASSED" if passed else "FAILED"
    print(f"審計總結: {status_text} (Errors: {err_cnt}, Warnings: {warn_cnt})")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="領域架構防腐與 Barrel 門面審查器")
    parser.add_argument("--plugin", default="chrome_pk", help="指定插件名稱 (預設: chrome_pk，可傳 all)")
    parser.add_argument("--compact", action="store_true", help="緊湊輸出模式 (適合日誌脫水與 Audit Suite 整合)")
    parser.add_argument("--strict", action="store_true", help="嚴格模式 (遇 WARNING 亦返回 Exit 1)")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式輸出")
    parser.add_argument("--verbose", action="store_true", help="顯示詳細過程")

    args = parser.parse_args()

    # 插件列表處理
    target_plugins = []
    if args.plugin == "all":
        # 尋找所有含 src/features 的插件
        for item in REPO_ROOT.iterdir():
            if item.is_dir() and (item / "src" / "features").exists():
                target_plugins.append(item.name)
    else:
        target_plugins = [args.plugin]

    total_errors = 0
    total_warnings = 0
    all_summaries = []

    for p in target_plugins:
        auditor = ArchAuditor(plugin_name=p, strict=args.strict, verbose=args.verbose)
        summary = auditor.run_audit()
        all_summaries.append(summary)
        total_errors += summary["error_count"]
        total_warnings += summary["warning_count"]

        if not args.json:
            print_report(summary, compact=args.compact, verbose=args.verbose)

    if args.json:
        print(json.dumps(all_summaries if len(all_summaries) > 1 else all_summaries[0], indent=2, ensure_ascii=False))

    exit_code = 0
    if total_errors > 0:
        exit_code = 1
    elif args.strict and total_warnings > 0:
        exit_code = 1

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
