#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1.devtools/tools/doc_cross_ref.py
---------------------------------
Chrome Plus - 文件交叉引用、死鏈審計與倒排自動修復工具 (doc_cross_ref.py)

核心職責:
1. 交叉引用與死鏈審計 (--audit):
   - 掃描 Markdown 文件中的相對路徑、檔案引用與跳轉。
   - 驗證鏈結目標是否存在；若存在死鏈則回傳 Exit Code 1，零死鏈回傳 Exit Code 0。
2. 倉庫倒排索引反查與自動修復 (--fix):
   - 遍歷全專案建立檔名倒排索引 (filename -> repo paths)。
   - 當發現死鏈時，自動提取檔名反查倉庫；若全庫中恰好存在唯一有效目標檔案，
     自動計算從當前檔案出發的正確相對路徑並修正，保留原始錨點 (#anchor)。
3. 冗餘語法清洗 (--clean-redundant):
   - 識別鏡像連結（如 `[path](path)`、`file:///` 或無意義包裹），
     將其精簡為行內代碼或標準文字，大幅降低 Context Token 消耗。
4. 安全性與環境相容:
   - 100% Python 3 原生標準庫，零外部依賴。
   - 支援 --dry-run 預覽模式，防止誤寫入。
   - 遵循專案「路徑跳轉雙軌制」：文檔內部一律使用相對路徑，絕不寫入 file:///。

Usage:
  py 1.devtools/tools/doc_cross_ref.py --audit                     # 全域死鏈審計 (Exit 0/1)
  py 1.devtools/tools/doc_cross_ref.py --dir 0.doc_mg --dry-run   # 指定目錄預覽審計
  py 1.devtools/tools/doc_cross_ref.py --fix --dry-run            # 倒排索引修復預覽
  py 1.devtools/tools/doc_cross_ref.py --fix                      # 實際應用倒排修復
  py 1.devtools/tools/doc_cross_ref.py --clean-redundant          # 清理冗餘語法
  py 1.devtools/tools/doc_cross_ref.py --fix --clean-redundant    # 同步修復死鏈並清理冗餘
  py 1.devtools/tools/doc_cross_ref.py --target GEMINI.md --dry-run # 單一檔案測試
"""

import os
import sys
import re
import json
import argparse
import urllib.parse
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Any

# Windows 控制台 UTF-8 相容防護
try:
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
except AttributeError:
    pass

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# 忽略目錄
IGNORE_DIRS = {
    'archive', 'node_modules', '.git', 'dist', 'vendor',
    'tmp', 'used', 'scratch', '.pytest_cache', '.vscode', '.gemini'
}

# Markdown 連結正則（排除圖片 !）
LINK_PATTERN = re.compile(r'(?<!\!)\[(`?)([^\]`]+)\1\]\(([^)]+)\)')

# 程式碼區塊檢測
FENCE_PATTERN = re.compile(r'^\s*```')


class RepoIndexer:
    """全倉庫檔案倒排索引器"""
    def __init__(self, root: Path):
        self.root = root
        self.files_by_name: Dict[str, List[Path]] = {}
        self.archive_tasks: Dict[str, List[Path]] = {}
        self.all_files: Set[Path] = set()
        self._build_index()

    def _build_index(self):
        # 1. 獨立索引 0.doc_mg/tasks/archive 中的任務檔（避免被 IGNORE_DIRS 截斷）
        archive_dir = self.root / '0.doc_mg' / 'tasks' / 'archive'
        if archive_dir.exists():
            for root_dir, _, fnames in os.walk(archive_dir):
                for fname in fnames:
                    if fname.startswith('task_') and fname.endswith('.md'):
                        lower_name = fname.lower()
                        full_p = Path(root_dir) / fname
                        if lower_name not in self.archive_tasks:
                            self.archive_tasks[lower_name] = []
                        self.archive_tasks[lower_name].append(full_p)

        # 2. 索引全倉庫工作檔案
        for dirpath, dirnames, filenames in os.walk(self.root):
            # 原地過濾忽略目錄
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
            for fname in filenames:
                full_path = Path(dirpath) / fname
                self.all_files.add(full_path)
                lower_name = fname.lower()
                if lower_name not in self.files_by_name:
                    self.files_by_name[lower_name] = []
                self.files_by_name[lower_name].append(full_path)

    def find_target(self, target_filename: str) -> List[Path]:
        """根據檔名查找倉庫中的可能檔案路徑"""
        return self.files_by_name.get(target_filename.lower(), [])

    def find_best_target(self, target_path_str: str, current_file: Optional[Path] = None) -> Optional[Path]:
        """
        智慧解析最佳修復目標：
        1. 檔名檢索與任務封存庫反查
        2. 目標子路徑後綴匹配 (如 a/b/README.md)
        3. 插件目錄親和性分析 (最長共同祖先目錄)
        """
        target_clean = target_path_str.replace('\\', '/').split('#')[0].strip()
        target_filename = Path(target_clean).name.lower()
        if not target_filename:
            return None

        candidates = list(self.files_by_name.get(target_filename, []))
        if not candidates and target_filename.startswith('task_'):
            candidates = list(self.archive_tasks.get(target_filename, []))

        if not candidates:
            return None

        if len(candidates) == 1:
            return candidates[0]

        # 策略 1: 目標子路徑後綴匹配（排除 .. 與 .）
        meaningful_parts = [p for p in target_clean.split('/') if p and p != '..']
        if len(meaningful_parts) > 1:
            subpath = '/'.join(meaningful_parts).lower()
            filtered = [c for c in candidates if c.as_posix().lower().endswith(subpath)]
            if len(filtered) == 1:
                return filtered[0]
            if len(filtered) > 1:
                candidates = filtered

        # 策略 2: 插件與目錄親和性（最長共同前綴）
        if current_file and len(candidates) > 1:
            root_res = str(self.root.resolve())
            curr_res = current_file.resolve()
            scored = []
            for c in candidates:
                try:
                    common = os.path.commonpath([curr_res, c.resolve()])
                    # 共同深度必須大於倉庫根目錄
                    if len(common) > len(root_res):
                        scored.append((len(common), c))
                except Exception:
                    continue
            scored.sort(key=lambda x: x[0], reverse=True)
            if scored:
                if len(scored) == 1 or scored[0][0] > scored[1][0]:
                    return scored[0][1]

        return None



class CrossRefAuditor:
    """文檔交叉引用審計與自動修復核心"""
    def __init__(self, repo_root: Path, dry_run: bool = False):
        self.repo_root = repo_root
        self.dry_run = dry_run
        self.indexer = RepoIndexer(repo_root)

    def resolve_link_target(self, current_file: Path, raw_link: str) -> Tuple[bool, Optional[Path], str]:
        """
        解析連結目標路徑與錨點。
        回傳: (is_valid, resolved_path, anchor)
        """
        clean_link = raw_link.strip()
        anchor = ""
        if '#' in clean_link:
            parts = clean_link.split('#', 1)
            clean_link = parts[0].strip()
            anchor = '#' + parts[1].strip()

        # 空路徑（如純錨點 #section）
        if not clean_link:
            return True, current_file, anchor

        # 處理 file:/// 協議
        if clean_link.startswith('file:///'):
            unquoted = urllib.parse.unquote(clean_link[8:])
            if len(unquoted) > 3 and unquoted[0] == '/' and unquoted[2] == ':':
                unquoted = unquoted[1:]
            p = Path(unquoted)
            return p.exists(), p if p.exists() else None, anchor

        # 相對於當前檔案所在目錄解析
        rel_to_file = (current_file.parent / clean_link).resolve()
        if rel_to_file.exists():
            return True, rel_to_file, anchor

        # 相對於專案根目錄解析
        rel_to_root = (self.repo_root / clean_link).resolve()
        if rel_to_root.exists():
            return True, rel_to_root, anchor

        # 檔案不存在，屬於死鏈
        return False, None, anchor

    def calculate_relative_path(self, from_file: Path, to_file: Path) -> str:
        """計算 from_file 到 to_file 的標準化相對路徑 (使用 forward slash)"""
        try:
            rel = os.path.relpath(to_file, from_file.parent).replace('\\', '/')
            return rel
        except Exception:
            return to_file.name

    def audit_and_process_file(
        self,
        file_path: Path,
        fix: bool = False,
        clean_redundant: bool = False
    ) -> Dict[str, Any]:
        """審計並處理單一 Markdown 檔案"""
        try:
            content = file_path.read_text(encoding='utf-8')
        except Exception as e:
            return {
                "file": str(file_path),
                "error": str(e),
                "dead_links": [],
                "fixed_links": [],
                "redundant_links": [],
                "modified": False
            }

        lines = content.splitlines(keepends=True)
        modified_lines = []
        file_modified = False
        in_code_block = False

        dead_links = []
        fixed_links = []
        redundant_links = []

        for line_idx, line in enumerate(lines, 1):
            stripped = line.strip()
            if FENCE_PATTERN.match(stripped):
                in_code_block = not in_code_block
                modified_lines.append(line)
                continue

            if in_code_block:
                modified_lines.append(line)
                continue

            def link_replacer(match: re.Match) -> str:
                nonlocal file_modified
                full_match = match.group(0)
                text = match.group(2).strip()
                target = match.group(3).strip()

                # 略過行內程式碼包裹中的匹配（如 `[foo](bar)`）
                line_prefix = line[:match.start()]
                if line_prefix.count('`') % 2 == 1:
                    return full_match

                # 略過外部協議與純頁內錨點
                if target.startswith(('http://', 'https://', 'mailto:', 'ftp://', 'javascript:')):
                    return full_match
                if target.startswith('#'):
                    return full_match

                # 1. 檢驗目標有效性
                is_valid, resolved_path, anchor = self.resolve_link_target(file_path, target)
                
                # 2. 檢驗冗餘格式 (鏡像路徑或 file:/// 等)
                clean_target = target.split('#')[0].strip()
                clean_text = text.replace('\\', '/').strip().strip('`')
                is_mirror = (
                    clean_text == clean_target
                    or 'file:///' in target
                )

                if is_mirror:
                    redundant_links.append({
                        "line": line_idx,
                        "text": text,
                        "target": target
                    })

                # 3. 處理死鏈與自動修復
                if not is_valid:
                    dead_links.append({
                        "line": line_idx,
                        "text": text,
                        "target": target,
                        "anchor": anchor
                    })

                    if fix:
                        # 嘗試由倒排索引與親和性分析智慧反查
                        real_target = self.indexer.find_best_target(clean_target, file_path)
                        if real_target:
                            new_rel_path = self.calculate_relative_path(file_path, real_target)
                            new_target = f"{new_rel_path}{anchor}"
                            
                            fixed_links.append({
                                "line": line_idx,
                                "old": target,
                                "new": new_target,
                                "resolved": str(real_target)
                            })
                            file_modified = True

                            # 若啟用 clean_redundant 且文字屬於純路徑，同時簡化
                            target_filename = Path(clean_target).name
                            if clean_redundant and (clean_text == clean_target or clean_text == target_filename):
                                return f"`{new_target}`"
                            return f"[{text}]({new_target})"

                # 4. 處理非死鏈之冗餘語法清理 (--clean-redundant)
                if is_valid and clean_redundant and is_mirror:
                    target_filename = Path(clean_target).name
                    if 'file:///' in target and resolved_path:
                        # 將 file:/// 替換為規範相對路徑
                        file_modified = True
                        new_rel_path = self.calculate_relative_path(file_path, resolved_path)
                        return f"[{text}]({new_rel_path}{anchor})"
                    elif clean_text == clean_target or clean_text == target_filename or clean_text.endswith(('.md', '.py', '.ts', '.json')):
                        # 如果文字純粹是路徑或檔名，轉換為行內代碼
                        file_modified = True
                        rel_standard = self.calculate_relative_path(file_path, resolved_path) if resolved_path else clean_target
                        return f"`{rel_standard}{anchor}`"

                return full_match

            new_line = LINK_PATTERN.sub(link_replacer, line)
            modified_lines.append(new_line)

        # 寫入或預覽
        if file_modified and not self.dry_run:
            file_path.write_text("".join(modified_lines), encoding='utf-8')

        try:
            rel_path_str = file_path.relative_to(self.repo_root).as_posix()
        except Exception:
            rel_path_str = str(file_path)

        return {
            "file": rel_path_str,
            "dead_links": dead_links,
            "fixed_links": fixed_links,
            "redundant_links": redundant_links,
            "modified": file_modified
        }


def collect_target_files(repo_root: Path, target_dir: Optional[str] = None, targets: Optional[List[str]] = None) -> List[Path]:
    """收集待掃描之 Markdown 檔案"""
    files: Set[Path] = set()

    if targets:
        for t in targets:
            tp = (repo_root / t).resolve() if not Path(t).is_absolute() else Path(t)
            if tp.is_file() and tp.suffix.lower() == '.md':
                files.add(tp)
            elif tp.is_dir():
                for dp, dn, fns in os.walk(tp):
                    dn[:] = [d for d in dn if d not in IGNORE_DIRS]
                    for fn in fns:
                        if fn.lower().endswith('.md'):
                            files.add(Path(dp) / fn)
        return sorted(list(files))

    base_path = (repo_root / target_dir).resolve() if target_dir else repo_root

    if base_path.is_file() and base_path.suffix.lower() == '.md':
        return [base_path]

    for dp, dn, fns in os.walk(base_path):
        dn[:] = [d for d in dn if d not in IGNORE_DIRS]
        for fn in fns:
            if fn.lower().endswith('.md'):
                files.add(Path(dp) / fn)

    return sorted(list(files))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Chrome Plus - 文件交叉引用、死鏈審計與倒排自動修復工具 (doc_cross_ref.py)"
    )
    parser.add_argument("--dir", default=None, help="指定掃描目錄（預設為全工作區）")
    parser.add_argument("--target", nargs="*", default=None, help="指定一或多個目標 Markdown 檔案")
    parser.add_argument("--audit", action="store_true", help="死鏈審計模式 (有死鏈退出碼 1，無死鏈退出碼 0)")
    parser.add_argument("--fix", action="store_true", help="自動修復死鏈 (利用倉庫倒排索引重定位目標)")
    parser.add_argument("--clean-redundant", action="store_true", help="清理冗餘格式 (如鏡像路徑、file:/// 等)")
    parser.add_argument("--dry-run", action="store_true", help="預覽模式 (不寫入磁碟)")
    parser.add_argument("--apply", action="store_true", help="寫入模式 (相容參數，非 dry-run)")
    parser.add_argument("--quiet", action="store_true", help="緊湊輸出模式")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式輸出")

    args = parser.parse_args()

    # apply 參數覆寫 dry_run
    dry_run = args.dry_run
    if args.apply:
        dry_run = False

    files = collect_target_files(REPO_ROOT, target_dir=args.dir, targets=args.target)
    auditor = CrossRefAuditor(REPO_ROOT, dry_run=dry_run)

    total_scanned = len(files)
    total_dead = 0
    total_fixed = 0
    total_redundant = 0
    modified_files_count = 0
    results = []

    for fp in files:
        res = auditor.audit_and_process_file(
            fp,
            fix=args.fix,
            clean_redundant=args.clean_redundant
        )
        dead_cnt = len(res["dead_links"])
        fixed_cnt = len(res["fixed_links"])
        red_cnt = len(res["redundant_links"])

        total_dead += dead_cnt
        total_fixed += fixed_cnt
        total_redundant += red_cnt

        if res["modified"]:
            modified_files_count += 1

        if dead_cnt > 0 or fixed_cnt > 0 or red_cnt > 0:
            results.append(res)

    # 輸出 JSON
    if args.json:
        report = {
            "total_files": total_scanned,
            "total_dead": total_dead,
            "total_fixed": total_fixed,
            "total_redundant": total_redundant,
            "modified_files": modified_files_count,
            "dry_run": dry_run,
            "details": results
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1 if (args.audit and (total_dead - total_fixed) > 0) else 0

    # 人類可讀輸出
    if not args.quiet:
        print("=" * 72)
        print("📄 Chrome Plus - 文件交叉引用與死鏈審計 (doc_cross_ref.py)")
        print("=" * 72)
        print(f"📂 掃描檔案數: {total_scanned} 檔")
        print(f"🔗 發現死鏈數: {total_dead} 處")
        if args.fix:
            print(f"🛠️ 已重定位修復: {total_fixed} 處")
        print(f"🧹 冗餘語法數: {total_redundant} 處")
        mode_str = "預覽 (DRY-RUN)" if dry_run else "寫入 (APPLIED)"
        if args.fix or args.clean_redundant:
            print(f"📝 變更狀態: [{mode_str}] 共 {modified_files_count} 個檔案{'將被' if dry_run else '已'}更新")
        print("-" * 72)

        for item in results[:15]:
            print(f"\n[文檔] {item['file']}")
            for d in item["dead_links"][:3]:
                print(f"  ❌ Line {d['line']}: 死鏈 `{d['target']}`")
            for f in item["fixed_links"][:3]:
                print(f"  ✅ Line {f['line']}: 修復 `{f['old']}` -> `{f['new']}`")
            for r in item["redundant_links"][:2]:
                print(f"  💡 Line {r['line']}: 冗餘格式 `{r['text']}` -> `{r['target']}`")

        if len(results) > 15:
            print(f"\n... 另有 {len(results) - 15} 個文檔包含需要檢視的連結。")
        print("=" * 72)

    # 兼容 audit_suite.py 的結算摘要行
    unresolved_dead = total_dead - total_fixed
    if unresolved_dead == 0:
        summary_line = f"✅ [CROSS-REF AUDIT] 共掃描 {total_scanned} 個檔案，0 處未解決死鏈，文件交叉引用正常。"
    else:
        summary_line = f"⚠️ [CROSS-REF AUDIT] 共掃描 {total_scanned} 個檔案，尚有 {unresolved_dead} 處死鏈待修復。"

    print(summary_line)

    # 如果有 --audit 門禁要求，若仍有未解決死鏈則回傳 Exit 1
    if args.audit and unresolved_dead > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
