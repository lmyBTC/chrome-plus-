#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1.devtools/tools/scaffold_tool.py
---------------------------------
微工具一鍵鷹架生成器 (Micro-Tool Scaffolding Engine)

功能：
1. 依據輸入參數，一鍵生成合規標準微工具 4 件套（manifest/View/index/types）。
2. 自動更新並掛載至 toolbox/registry.ts。
3. 支援 --dry-run 模擬預覽與 --remove 安全卸載清理。

用法範例：
  py 1.devtools/tools/scaffold_tool.py --id sample-tool --name "範例測試工具"
  py 1.devtools/tools/scaffold_tool.py --id sample-tool --remove
  py 1.devtools/tools/scaffold_tool.py --id json-formatter --name "JSON 格式化" --category dev --icon "🧩"
"""

import os
import re
import sys
import shutil
import argparse
from pathlib import Path

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from lib.common import setup_utf8_output, get_repo_root, REPO_ROOT

setup_utf8_output()


def to_camel_case(snake_or_kebab: str) -> str:
    """轉換 kebab-case 或 snake_case 為 camelCase"""
    parts = re.split(r'[-_]', snake_or_kebab)
    return parts[0].lower() + ''.join(p.capitalize() for p in parts[1:])


def to_pascal_case(snake_or_kebab: str) -> str:
    """轉換 kebab-case 或 snake_case 為 PascalCase"""
    parts = re.split(r'[-_]', snake_or_kebab)
    return ''.join(p.capitalize() for p in parts)


def get_toolbox_dir(plugin_name: str) -> Path:
    """獲取指定插件之 toolbox 模組路徑"""
    return REPO_ROOT / plugin_name / "src" / "features" / "toolbox"


def mount_registry(registry_file: Path, tool_id: str, camel_name: str, dry_run: bool = False) -> bool:
    """將微工具掛載至 registry.ts"""
    if not registry_file.exists():
        print(f"[ERROR] 找不到註冊檔: {registry_file}")
        return False

    content = registry_file.read_text(encoding='utf-8')
    manifest_name = f"{camel_name}Manifest"
    import_stmt = f"import {{ {manifest_name} }} from './tools/{tool_id}';"

    # 1. 檢查是否已經掛載
    if import_stmt in content or f" {manifest_name}," in content:
        print(f"[INFO] {manifest_name} 已存在於 registry.ts，略過掛載。")
        return True

    lines = content.splitlines()

    # 2. 尋找最後一個 tools import 的位置
    last_import_idx = -1
    for idx, line in enumerate(lines):
        if line.startswith("import ") and "./tools/" in line:
            last_import_idx = idx

    if last_import_idx != -1:
        lines.insert(last_import_idx + 1, import_stmt)
    else:
        # 若找不到 tools import，插在 types import 後
        insert_idx = 0
        for idx, line in enumerate(lines):
            if "types" in line:
                insert_idx = idx + 1
                break
        lines.insert(insert_idx, import_stmt)

    # 3. 尋找 TOOL_REGISTRY 陣列並插入項目
    content_updated = "\n".join(lines)
    registry_pattern = r"(export\s+const\s+TOOL_REGISTRY\s*:\s*IToolManifest\[\]\s*=\s*\[)([\s\S]*?)(\];)"
    match = re.search(registry_pattern, content_updated)

    if not match:
        print("[ERROR] 無法在 registry.ts 中辨識 TOOL_REGISTRY 陣列結構。")
        return False

    prefix, body, suffix = match.groups()
    # 確保結尾有逗號與換行
    clean_body = body.rstrip()
    if clean_body and not clean_body.endswith(","):
        clean_body += ","

    new_body = f"{clean_body}\n  {manifest_name},"
    new_content = (
        content_updated[:match.start()]
        + f"{prefix}{new_body}\n{suffix}"
        + content_updated[match.end():]
    )

    if not new_content.endswith("\n"):
        new_content += "\n"

    if dry_run:
        print(f"[DRY-RUN] 將於 registry.ts 追加 import: {import_stmt}")
        print(f"[DRY-RUN] 將於 TOOL_REGISTRY 追加:   {manifest_name},")
        return True

    registry_file.write_text(new_content, encoding='utf-8')
    print(f"[OK] 已成功掛載微工具至 {registry_file.name}")
    return True


def unmount_registry(registry_file: Path, tool_id: str, camel_name: str, dry_run: bool = False) -> bool:
    """從 registry.ts 移除微工具掛載"""
    if not registry_file.exists():
        return False

    content = registry_file.read_text(encoding='utf-8')
    manifest_name = f"{camel_name}Manifest"

    # 移除 import 語句
    lines = [
        line for line in content.splitlines()
        if not (line.startswith("import ") and f"./tools/{tool_id}" in line)
    ]
    content_without_import = "\n".join(lines)

    # 移除 TOOL_REGISTRY 陣列中的項目
    item_pattern = rf"^\s*{re.escape(manifest_name)},?\s*$"
    cleaned_lines = []
    for line in content_without_import.splitlines():
        if re.match(item_pattern, line):
            continue
        cleaned_lines.append(line)

    new_content = "\n".join(cleaned_lines)
    if not new_content.endswith("\n"):
        new_content += "\n"

    if dry_run:
        print(f"[DRY-RUN] 將從 registry.ts 移除 {manifest_name} 的 import 與陣列引用。")
        return True

    registry_file.write_text(new_content, encoding='utf-8')
    print(f"[OK] 已從 registry.ts 移除 {manifest_name}")
    return True


def generate_scaffold(
    plugin: str,
    tool_id: str,
    name: str,
    short_name: str,
    desc: str,
    category: str,
    icon: str,
    badge: str,
    permissions: list[str],
    dry_run: bool = False,
    force: bool = False,
) -> bool:
    """生成微工具目錄與 4 件套標準代碼"""
    toolbox_dir = get_toolbox_dir(plugin)
    if not toolbox_dir.exists():
        print(f"[ERROR] 插件目錄不存在或缺少 toolbox 模組: {toolbox_dir}")
        return False

    target_dir = toolbox_dir / "tools" / tool_id
    if target_dir.exists() and not force and not dry_run:
        print(f"[ERROR] 微工具目錄已存在: {target_dir}")
        print("  若需覆寫請加上 --force 參數。")
        return False

    camel_name = to_camel_case(tool_id)
    pascal_name = to_pascal_case(tool_id)
    view_name = f"{pascal_name}View"
    manifest_name = f"{camel_name}Manifest"
    state_interface = f"{pascal_name}State"

    perm_str = "[" + ", ".join(f"'{p.strip()}'" for p in permissions if p.strip()) + "]"

    # 1. manifest.ts
    manifest_code = f"""import {{ IToolManifest }} from '../../types';
import {{ {view_name} }} from './{view_name}';

export const {manifest_name}: IToolManifest = {{
  id: '{tool_id}',
  title: '{name}',
  name: '{name}',
  shortName: '{short_name}',
  description: '{desc}',
  icon: '{icon}',
  category: '{category}',
  badge: '{badge}',
  permissions: {perm_str},
  component: {view_name},
}};
"""

    badge_jsx = (
        f'<span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full font-medium">{badge}</span>'
        if badge else ''
    )

    # 2. View.tsx
    view_code = f"""import React, {{ useState }} from 'react';
import {{ {state_interface} }} from './types';

export const {view_name}: React.FC<{{ isSidebar?: boolean }}> = ({{ isSidebar }}) => {{
  const [count, setCount] = useState<number>(0);

  return (
    <div className={{"p-4 " + (isSidebar ? "text-xs" : "text-sm")}}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>{icon}</span>
          <span>{name}</span>
        </h3>
        {badge_jsx}
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-4">
        {desc}
      </p>
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">範本互動計數器：</p>
        <button
          type="button"
          onClick={{() => setCount((c) => c + 1)}}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition font-medium"
        >
          點擊次數: {{count}}
        </button>
      </div>
    </div>
  );
}};
"""

    # 3. types.ts
    types_code = f"""export interface {state_interface} {{
  enabled: boolean;
  lastUpdated?: number;
}}
"""

    # 4. index.ts
    index_code = f"""export * from './types';
export * from './{view_name}';
export * from './manifest';
"""

    files_to_create = {
        target_dir / "manifest.ts": manifest_code,
        target_dir / f"{view_name}.tsx": view_code,
        target_dir / "types.ts": types_code,
        target_dir / "index.ts": index_code,
    }

    if dry_run:
        print(f"\n[DRY-RUN] 預計生成目錄: {target_dir}")
        for file_path in files_to_create:
            print(f"  + {file_path.name}")
        print("\n--- manifest.ts 預覽 ---")
        print(manifest_code)
    else:
        target_dir.mkdir(parents=True, exist_ok=True)
        for file_path, content in files_to_create.items():
            file_path.write_text(content, encoding='utf-8')
            print(f"[CREATE] {file_path.relative_to(REPO_ROOT)}")

    # 掛載至 registry.ts
    registry_file = toolbox_dir / "registry.ts"
    return mount_registry(registry_file, tool_id, camel_name, dry_run=dry_run)


def remove_tool(plugin: str, tool_id: str, dry_run: bool = False) -> bool:
    """清理/卸載微工具"""
    toolbox_dir = get_toolbox_dir(plugin)
    target_dir = toolbox_dir / "tools" / tool_id
    registry_file = toolbox_dir / "registry.ts"
    camel_name = to_camel_case(tool_id)

    if dry_run:
        print(f"[DRY-RUN] 預計刪除目錄: {target_dir}")
    elif target_dir.exists():
        shutil.rmtree(target_dir)
        print(f"[REMOVE] 目錄已刪除: {target_dir.relative_to(REPO_ROOT)}")
    else:
        print(f"[WARN] 微工具目錄不存在: {target_dir}")

    return unmount_registry(registry_file, tool_id, camel_name, dry_run=dry_run)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="微工具一鍵鷹架生成器 (chrome_pk Toolbox Scaffolding Engine)"
    )
    parser.add_argument("--plugin", default="chrome_pk", help="目標插件名稱 (預設: chrome_pk)")
    parser.add_argument("--id", required=True, help="微工具 ID，需為 kebab-case (如 sample-tool)")
    parser.add_argument("--name", default="", help="微工具中文名稱 (如 '測試範例工具')")
    parser.add_argument("--short-name", default="", help="微工具簡短名稱 (預設取 name 前 4 字)")
    parser.add_argument("--desc", default="", help="微工具功能描述")
    parser.add_argument(
        "--category",
        default="productivity",
        choices=["productivity", "dev", "media", "security", "finance"],
        help="分類 (預設: productivity)",
    )
    parser.add_argument("--icon", default="🔧", help="圖示 Emoji 或識別元 (預設: 🔧)")
    parser.add_argument("--badge", default="新功能", help="標籤 (預設: 新功能)")
    parser.add_argument("--permissions", default="", help="權限清單，以逗號分隔 (如 'storage,tabs')")
    parser.add_argument("--dry-run", action="store_true", help="模擬執行，不實際寫入檔案")
    parser.add_argument("--force", action="store_true", help="強制覆寫已存在的微工具目錄")
    parser.add_argument("--remove", action="store_true", help="卸載模式：從 registry 移除並刪除目錄")

    args = parser.parse_args()

    # 驗證 ID 格式 (kebab-case)
    if not re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$', args.id):
        print(f"[ERROR] 微工具 ID '{args.id}' 不符合 kebab-case 規範 (僅限小寫字母、數字與減號)！")
        return 1

    if args.remove:
        ok = remove_tool(args.plugin, args.id, dry_run=args.dry_run)
        return 0 if ok else 1

    if not args.name:
        print("[ERROR] 建立微工具時必須指定 --name 參數！")
        return 1

    short_name = args.short_name or args.name[:4]
    desc = args.desc or f"提供 {args.name} 功能的微工具模組。"
    perms = [p.strip() for p in args.permissions.split(",") if p.strip()]

    print(f"=== 啟動微工具鷹架生成器 ({args.plugin}) ===")
    print(f"  ID:          {args.id}")
    print(f"  名稱:        {args.name}")
    print(f"  簡稱:        {short_name}")
    print(f"  分類:        {args.category}")
    print(f"  圖示:        {args.icon}")
    print(f"  標籤:        {args.badge}")
    print(f"  權限:        {perms}")
    print(f"  Dry-Run:     {args.dry_run}")
    print(f"  Force:       {args.force}")

    success = generate_scaffold(
        plugin=args.plugin,
        tool_id=args.id,
        name=args.name,
        short_name=short_name,
        desc=desc,
        category=args.category,
        icon=args.icon,
        badge=args.badge,
        permissions=perms,
        dry_run=args.dry_run,
        force=args.force,
    )

    if success:
        print("=== 微工具鷹架處理完成 (Exit 0) ===")
        return 0
    else:
        print("=== 微工具鷹架處理失敗 (Exit 1) ===")
        return 1


if __name__ == "__main__":
    sys.exit(main())
