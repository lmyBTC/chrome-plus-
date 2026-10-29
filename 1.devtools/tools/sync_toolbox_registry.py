#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1.devtools/tools/sync_toolbox_registry.py
Chrome Plus - 微工具清冊自動審驗與同步器 (Toolbox Registry Consistency Auditor & Synchronizer)

核心職責:
1. 實體目錄與註冊清冊一致性稽核 (Audit):
   - 掃描 chrome_pk/src/features/toolbox/tools/ 實體微工具目錄。
   - 稽核 registry.ts 匯入與 TOOL_REGISTRY 清單。
   - 偵測孤兒工具 (Orphans)、幽靈工具 (Ghosts)、命名不一致 (Mismatch) 與重複註冊。
   - 驗證微工具 manifest.ts 協議完整性 (id, name, description, component 等)。
2. 一鍵修復與清冊同步 (--fix):
   - 根據合法微工具自動重新生成乾淨、標準的 registry.ts，保留原有 helper 邏輯。
   - 支援 --dry-run 預覽模式。
3. 門禁整合 (Gate 2/3):
   - 支援 --compact, --strict, --json 與 --test 自我單元測試。

Usage:
  py 1.devtools/tools/sync_toolbox_registry.py                     # 預設執行清冊稽核
  py 1.devtools/tools/sync_toolbox_registry.py --compact           # 緊湊脫水報告
  py 1.devtools/tools/sync_toolbox_registry.py --fix               # 自動修復 registry.ts
  py 1.devtools/tools/sync_toolbox_registry.py --fix --dry-run     # 預覽修復結果
  py 1.devtools/tools/sync_toolbox_registry.py --test              # 執行內建自我驗證
"""

import os
import sys
import re
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Set

# UTF-8 終端防護
try:
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
except AttributeError:
    pass

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


class ToolManifestInfo:
    def __init__(self, dir_name: str, path: Path):
        self.dir_name = dir_name
        self.path = path
        self.manifest_file = path / "manifest.ts"
        self.index_file = path / "index.ts"
        self.is_valid_dir = self.manifest_file.is_file()
        self.manifest_var_name: Optional[str] = None
        self.tool_id: Optional[str] = None
        self.name: Optional[str] = None
        self.description: Optional[str] = None
        self.has_component: bool = False
        self.issues: List[str] = []
        self.warnings: List[str] = []

        if self.is_valid_dir:
            self._parse_manifest()
            self._check_index()
        else:
            self.issues.append(f"目錄缺少 manifest.ts: {dir_name}")

    def _parse_manifest(self) -> None:
        try:
            content = self.manifest_file.read_text(encoding='utf-8')
        except Exception as e:
            self.issues.append(f"讀取 manifest.ts 失敗: {e}")
            return

        # 1. 萃取 manifest 匯出變數名稱 (例如 export const scriptRunnerManifest: IToolManifest)
        var_match = re.search(r"export\s+const\s+(\w+Manifest)\b", content)
        if var_match:
            self.manifest_var_name = var_match.group(1)
        else:
            # 寬鬆比對 export const xxx =
            loose_var = re.search(r"export\s+const\s+(\w+)\s*(?::\s*\w+)?\s*=\s*\{", content)
            if loose_var:
                self.manifest_var_name = loose_var.group(1)
            else:
                self.issues.append("未在 manifest.ts 中找到 export const 變數")

        # 2. 萃取 id 欄位
        id_match = re.search(r"id\s*:\s*['\"]([^'\"]+)['\"]", content)
        if id_match:
            self.tool_id = id_match.group(1)
            if self.tool_id != self.dir_name:
                self.warnings.append(f"工具 ID ('{self.tool_id}') 與目錄名稱 ('{self.dir_name}') 不一致")
        else:
            self.issues.append("manifest.ts 缺少必要欄位 'id'")

        # 3. 萃取 name / title 欄位
        name_match = re.search(r"(?:name|title)\s*:\s*['\"]([^'\"]+)['\"]", content)
        if name_match:
            self.name = name_match.group(1)
        else:
            self.issues.append("manifest.ts 缺少 'name' 或 'title' 欄位")

        # 4. 萃取 description
        desc_match = re.search(r"description\s*:\s*['\"]([^'\"]+)['\"]", content)
        if desc_match:
            self.description = desc_match.group(1)
        else:
            self.warnings.append("manifest.ts 缺少 'description' 欄位")

        # 5. 檢查是否有 component 欄位
        if re.search(r"component\s*:", content):
            self.has_component = True
        else:
            self.issues.append("manifest.ts 缺少 'component' 視圖綁定")

    def _check_index(self) -> None:
        if not self.index_file.is_file():
            self.warnings.append(f"微工具缺少標準 Barrel 入口 index.ts: {self.dir_name}")
            return

        try:
            content = self.index_file.read_text(encoding='utf-8')
            # 檢查是否有匯出 manifest
            if "manifest" not in content:
                self.warnings.append("index.ts 未再導出 (re-export) manifest")
        except Exception as e:
            self.warnings.append(f"讀取 index.ts 失敗: {e}")


class ToolboxRegistryAuditor:
    def __init__(self, plugin_dir: Path):
        self.plugin_dir = plugin_dir
        self.toolbox_dir = plugin_dir / "src" / "features" / "toolbox"
        self.tools_dir = self.toolbox_dir / "tools"
        self.registry_file = self.toolbox_dir / "registry.ts"

    def is_applicable(self) -> bool:
        """判斷插件是否具備微工具架構"""
        return self.toolbox_dir.is_dir() and self.tools_dir.is_dir() and self.registry_file.is_file()

    def discover_disk_tools(self) -> Dict[str, ToolManifestInfo]:
        """掃描 tools 目錄下所有微工具"""
        tools: Dict[str, ToolManifestInfo] = {}
        if not self.tools_dir.is_dir():
            return tools

        for item in sorted(self.tools_dir.iterdir()):
            if item.is_dir() and not item.name.startswith(('.', '_')):
                tools[item.name] = ToolManifestInfo(item.name, item)
        return tools

    def parse_registry(self) -> Tuple[Dict[str, str], List[str], str]:
        """
        解析 registry.ts
        Returns:
            imports: { tool_subpath_or_id: imported_var_name }
            registered_array: [ var1, var2, ... ]
            raw_content: 原檔完整字串
        """
        if not self.registry_file.is_file():
            return {}, [], ""

        content = self.registry_file.read_text(encoding='utf-8')

        # 1. 解析 imports: import { xxx } from './tools/yyy';
        import_pattern = re.compile(r"import\s*\{\s*(\w+)\s*\}\s*from\s*['\"](?:\./)?tools/([^'\"]+)['\"];?")
        imports: Dict[str, str] = {}
        for m in import_pattern.finditer(content):
            var_name = m.group(1)
            raw_path = m.group(2).rstrip('/')
            # 若為 'script-runner/index' 轉為 'script-runner'
            tool_id = raw_path.replace('/index', '').replace('.ts', '')
            imports[tool_id] = var_name

        # 2. 解析 TOOL_REGISTRY 陣列中的項目
        array_match = re.search(r"export\s+const\s+TOOL_REGISTRY\s*(?::\s*IToolManifest\[\])?\s*=\s*\[([\s\S]*?)\];", content)
        registered_vars: List[str] = []
        if array_match:
            raw_body = array_match.group(1)
            # 移除註解 // ... 與 /* ... */
            clean_body = re.sub(r"//.*$", "", raw_body, flags=re.MULTILINE)
            clean_body = re.sub(r"/\*[\s\S]*?\*/", "", clean_body)
            for token in clean_body.split(','):
                token = token.strip()
                if token and re.match(r"^\w+$", token):
                    registered_vars.append(token)

        return imports, registered_vars, content

    def audit(self) -> Dict[str, Any]:
        """執行完整一致性稽核"""
        if not self.is_applicable():
            return {
                "applicable": False,
                "status": "SKIP",
                "message": f"目錄非標準微工具架構或未找到 registry.ts ({self.toolbox_dir})"
            }

        disk_tools = self.discover_disk_tools()
        imports, registered_vars, _ = self.parse_registry()

        errors: List[str] = []
        warnings: List[str] = []
        info: List[str] = []

        # 1. 檢視實體工具之 Manifest 協議規範
        for tool_id, tool_info in disk_tools.items():
            for err in tool_info.issues:
                errors.append(f"[{tool_id}] 協議錯誤: {err}")
            for warn in tool_info.warnings:
                warnings.append(f"[{tool_id}] 協議警告: {warn}")

        # 2. 檢查孤兒工具 (Orphans: 磁碟存在但未在 registry 匯入或註冊)
        for tool_id, tool_info in disk_tools.items():
            if not tool_info.is_valid_dir or not tool_info.manifest_var_name:
                continue

            var_name = tool_info.manifest_var_name
            is_imported = (tool_id in imports)
            is_in_registry = (var_name in registered_vars)

            if not is_imported and not is_in_registry:
                errors.append(f"孤兒工具 (Orphan): '{tool_id}' 存在於目錄但完全未註冊於 registry.ts")
            elif not is_imported:
                errors.append(f"遺漏 Import: '{tool_id}' 未在 registry.ts 中 import")
            elif not is_in_registry:
                errors.append(f"未加入清冊陣列: '{var_name}' 已 import 但未收錄於 TOOL_REGISTRY 陣列")
            else:
                # 檢查 import 的變數名與實體宣告是否吻合
                imported_var = imports.get(tool_id)
                if imported_var != var_name:
                    errors.append(
                        f"匯入名稱不符: '{tool_id}' 匯入名稱為 '{imported_var}'，但實體宣告為 '{var_name}'"
                    )

        # 3. 檢查幽靈工具 (Ghosts: registry 中有宣告但磁碟不存在)
        for tool_id, imported_var in imports.items():
            if tool_id not in disk_tools:
                errors.append(f"幽靈匯入 (Ghost Import): registry.ts 匯入了不存在的工具目錄 './tools/{tool_id}'")

        # 4. 檢查 TOOL_REGISTRY 陣列元素有效性與重複項
        seen_vars: Set[str] = set()
        registered_set = set(imports.values())
        for var in registered_vars:
            if var in seen_vars:
                warnings.append(f"重複註冊: '{var}' 在 TOOL_REGISTRY 中出現多次")
            seen_vars.add(var)

            if var not in registered_set:
                errors.append(f"幽靈註冊項 (Ghost Entry): TOOL_REGISTRY 中的 '{var}' 未經由 tools 匯入")

        status = "PASS" if not errors else "FAIL"
        if status == "PASS" and warnings:
            status = "WARN"

        return {
            "applicable": True,
            "status": status,
            "plugin": self.plugin_dir.name,
            "total_disk_tools": len(disk_tools),
            "total_registered": len(registered_vars),
            "errors": errors,
            "warnings": warnings,
            "disk_tools": {k: v.manifest_var_name for k, v in disk_tools.items()}
        }

    def generate_fixed_registry(self) -> str:
        """根據磁碟上的有效微工具重新生成乾淨的 registry.ts"""
        disk_tools = self.discover_disk_tools()
        valid_tools = [
            t for t in disk_tools.values()
            if t.is_valid_dir and t.manifest_var_name and not t.issues
        ]
        # 按照目錄名稱排序，保證確定性
        valid_tools.sort(key=lambda t: t.dir_name)

        _, _, raw_content = self.parse_registry()

        # 提取保留段落 (例如 getToolManifest 及附帶的 helper 邏輯)
        helper_code = ""
        helper_match = re.search(r"(export\s+const\s+getToolManifest[\s\S]*)$", raw_content)
        if helper_match:
            helper_code = helper_match.group(1).strip()
        else:
            helper_code = (
                "export const getToolManifest = (id: string): IToolManifest | undefined => {\n"
                "  // 兼容舊版 ID (如 'finance-research' -> 'finance-watchlist')\n"
                "  const resolvedId = id === 'finance-research' ? 'finance-watchlist' : id;\n"
                "  return TOOL_REGISTRY.find((tool) => tool.id === resolvedId);\n"
                "};"
            )

        # 生成 imports
        import_lines = ["import { IToolManifest } from './types';"]
        for t in valid_tools:
            import_lines.append(f"import {{ {t.manifest_var_name} }} from './tools/{t.dir_name}';")

        # 生成 TOOL_REGISTRY 陣列
        registry_lines = [
            "export const TOOL_REGISTRY: IToolManifest[] = ["
        ]
        for t in valid_tools:
            registry_lines.append(f"  {t.manifest_var_name},")
        registry_lines.append("];")

        fixed_content = (
            "\n".join(import_lines)
            + "\n\n"
            + "\n".join(registry_lines)
            + "\n\n"
            + helper_code
            + "\n"
        )
        return fixed_content

    def fix(self, dry_run: bool = False) -> Tuple[bool, str]:
        """執行修復寫入"""
        if not self.is_applicable():
            return False, "目錄非標準微工具架構，無法執行修復"

        new_content = self.generate_fixed_registry()

        if dry_run:
            return True, f"[DRY-RUN 預覽]\n{new_content}"

        try:
            self.registry_file.write_text(new_content, encoding='utf-8')
            return True, f"已成功重新同步並寫入 {self.registry_file}"
        except Exception as e:
            return False, f"寫入 registry.ts 失敗: {e}"


def run_self_test() -> int:
    """自我驗證模式：在臨時環境中建立各種邊界案例進行檢核"""
    import tempfile
    import shutil

    print("[INFO] 啟動 sync_toolbox_registry.py 內建自我驗證...")
    temp_dir = Path(tempfile.mkdtemp(prefix="test_sync_toolbox_"))
    try:
        plugin_dir = temp_dir / "chrome_pk"
        toolbox_dir = plugin_dir / "src" / "features" / "toolbox"
        tools_dir = toolbox_dir / "tools"
        tools_dir.mkdir(parents=True)

        # 1. 建立合法的工具 A
        tool_a = tools_dir / "tool-a"
        tool_a.mkdir()
        (tool_a / "manifest.ts").write_text(
            "import { IToolManifest } from '../../types';\n"
            "export const toolAManifest: IToolManifest = {\n"
            "  id: 'tool-a',\n"
            "  name: '工具 A',\n"
            "  description: '說明 A',\n"
            "  icon: '⚡',\n"
            "  component: () => null,\n"
            "};\n",
            encoding='utf-8'
        )
        (tool_a / "index.ts").write_text("export * from './manifest';\n", encoding='utf-8')

        # 2. 建立孤兒工具 B (尚未在 registry 註冊)
        tool_b = tools_dir / "tool-b"
        tool_b.mkdir()
        (tool_b / "manifest.ts").write_text(
            "import { IToolManifest } from '../../types';\n"
            "export const toolBManifest: IToolManifest = {\n"
            "  id: 'tool-b',\n"
            "  name: '工具 B',\n"
            "  description: '說明 B',\n"
            "  icon: '📦',\n"
            "  component: () => null,\n"
            "};\n",
            encoding='utf-8'
        )
        (tool_b / "index.ts").write_text("export * from './manifest';\n", encoding='utf-8')

        # 3. 建立初始 registry.ts (僅註冊 A，且含有幽靈工具 ghost-tool)
        registry_file = toolbox_dir / "registry.ts"
        registry_file.write_text(
            "import { IToolManifest } from './types';\n"
            "import { toolAManifest } from './tools/tool-a';\n"
            "import { ghostManifest } from './tools/ghost-tool';\n\n"
            "export const TOOL_REGISTRY: IToolManifest[] = [\n"
            "  toolAManifest,\n"
            "  ghostManifest,\n"
            "];\n\n"
            "export const getToolManifest = (id: string) => undefined;\n",
            encoding='utf-8'
        )

        auditor = ToolboxRegistryAuditor(plugin_dir)

        # 測試 1: 預期稽核 FAIL (偵測到 orphan tool-b 與 ghost ghostManifest)
        res1 = auditor.audit()
        assert res1["status"] == "FAIL", f"預期 FAIL 但得到 {res1['status']}"
        assert any("tool-b" in e for e in res1["errors"]), "未偵測到孤兒 tool-b"
        assert any("ghost-tool" in e for e in res1["errors"]), "未偵測到幽靈 ghost-tool"
        print("  [PASS] 案例 1: 正確攔截孤兒工具與幽靈工具。")

        # 測試 2: 執行 --fix 修復
        success, msg = auditor.fix(dry_run=False)
        assert success, f"修復失敗: {msg}"
        print("  [PASS] 案例 2: 一鍵同步修復完成。")

        # 測試 3: 修復後再次稽核，預期 PASS (A 與 B 皆註冊，幽靈排除)
        res2 = auditor.audit()
        assert res2["status"] == "PASS", f"修復後應為 PASS 但得到 {res2['status']} (Errors: {res2['errors']})"
        assert res2["total_registered"] == 2
        print("  [PASS] 案例 3: 修復後審驗 100% 合規通過。")

        print("[OK] sync_toolbox_registry.py 所有內建驗證通過 (Exit 0)。")
        return 0
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Chrome Plus - 微工具清冊自動審驗與同步器")
    parser.add_argument("--plugin", default="chrome_pk", help="指定目標插件名稱 (預設: chrome_pk)")
    parser.add_argument("--compact", action="store_true", help="啟用緊湊脫水報告輸出")
    parser.add_argument("--strict", action="store_true", help="嚴格模式 (遇任何 WARN 即報錯 Exit 1)")
    parser.add_argument("--json", action="store_true", help="以 JSON 格式輸出")
    parser.add_argument("--fix", action="store_true", help="自動重新同步並修復 registry.ts")
    parser.add_argument("--dry-run", action="store_true", help="修復模式時僅預覽變更，不實際寫入")
    parser.add_argument("--test", action="store_true", help="執行內建單元自我驗證測試")

    args = parser.parse_args()

    if args.test:
        return run_self_test()

    plugin_dir = REPO_ROOT / args.plugin
    if not plugin_dir.is_dir():
        print(f"[ERROR] 找不到插件目錄: {plugin_dir}")
        return 1

    auditor = ToolboxRegistryAuditor(plugin_dir)

    if not auditor.is_applicable():
        if args.json:
            print(json.dumps({"status": "SKIP", "message": "此插件無微工具架構"}, ensure_ascii=False))
        else:
            print(f"[SKIP] 插件 {args.plugin} 無 toolbox/tools 架構，略過檢驗。")
        return 0

    if args.fix:
        # 修復模式
        success, msg = auditor.fix(dry_run=args.dry_run)
        if not success:
            print(f"[FAIL] {msg}")
            return 1
        print(f"[OK] {msg}")
        if args.dry_run:
            return 0

        # 修復後再跑一次 audit
        audit_res = auditor.audit()
        if audit_res["status"] == "FAIL":
            print(f"[FAIL] 修復後稽核仍有錯誤: {audit_res['errors']}")
            return 1
        print(f"[PASS] 修復後清冊已 100% 同步 (共 {audit_res['total_registered']} 個微工具)。")
        return 0

    # 稽核模式
    res = auditor.audit()

    if args.json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
        return 0 if res["status"] in ("PASS", "SKIP") or (res["status"] == "WARN" and not args.strict) else 1

    if args.compact:
        # 緊湊輸出
        tag = f"[{res['status']}]"
        detail = f"{res['total_registered']}/{res['total_disk_tools']} 微工具同步"
        if res['errors']:
            detail += f" | 錯誤: {len(res['errors'])} 處 ({res['errors'][0]})"
        elif res['warnings']:
            detail += f" | 警告: {len(res['warnings'])} 處"
        print(f"Toolbox Registry: {tag} {detail}")
    else:
        print(f"=== 微工具清冊一致性稽核: {args.plugin} ===")
        print(f"狀態: [{res['status']}]")
        print(f"磁碟實體工具數: {res['total_disk_tools']}")
        print(f"清冊已註冊數:   {res['total_registered']}")

        if res["errors"]:
            print("\n[阻斷性錯誤 (ERRORS)]:")
            for err in res["errors"]:
                print(f"  - {err}")

        if res["warnings"]:
            print("\n[建議修復警告 (WARNINGS)]:")
            for warn in res["warnings"]:
                print(f"  - {warn}")

        if res["status"] == "PASS":
            print("\n[OK] 所有微工具與 registry.ts 100% 對齊且協議合規。")

    if res["status"] == "FAIL" or (res["status"] == "WARN" and args.strict):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

