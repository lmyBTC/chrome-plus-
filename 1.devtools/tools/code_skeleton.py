#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
code_skeleton.py - 程式碼骨架與簽名提煉器 (Token Saver)
專門用於向 AI 展示代碼架構與呼叫介面，自動掏空函數與方法實作內容，
將大型代碼檔案壓縮為僅含型別宣告、介面與簽名的「骨架 (Skeleton)」，
Token 節省率達 85% ~ 95%。
"""

import os
import re
import sys
import argparse
from pathlib import Path
from typing import List, Tuple

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent


def extract_typescript_skeleton(content: str) -> str:
    """
    從 TypeScript / TSX / JavaScript 代碼中提煉出 imports, export, interface, type,
    enum 與函式/類別簽名，掏空複雜的 JSX 與函數內部具體實作。
    """
    lines = content.splitlines()
    output_lines: List[str] = []
    in_block_comment = False
    in_interface_or_type = False
    brace_depth = 0
    skipping_function_body = False
    skip_start_depth = 0

    # 函數或方法宣告正則
    func_class_pattern = re.compile(
        r'^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|class|abstract\s+class)\s+([a-zA-Z0-9_$]+)?'
    )
    const_func_pattern = re.compile(
        r'^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>'
    )
    method_pattern = re.compile(
        r'^\s*(?:public|private|protected|static|async|override|readonly)*\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[^\{]+)?\s*\{'
    )

    for line in lines:
        stripped = line.strip()

        # 1. 區塊註解處理
        if "/*" in stripped:
            in_block_comment = True
        if in_block_comment:
            output_lines.append(line)
            if "*/" in stripped:
                in_block_comment = False
            continue

        # 2. 保留單行註解 (往往含重要業務規格)
        if stripped.startswith("//") or stripped.startswith("*"):
            output_lines.append(line)
            continue

        # 3. 略過空行
        if not stripped:
            if not skipping_function_body:
                output_lines.append("")
            continue

        # 4. 保留 import 語句
        if stripped.startswith("import ") or stripped.startswith("import{") or stripped.startswith("} from "):
            output_lines.append(line)
            continue

        # 5. 保留 type、interface 與 enum 定義
        if re.match(r'^\s*(?:export\s+)?(?:type|interface|enum)\s+', line):
            in_interface_or_type = True
            output_lines.append(line)
            continue

        if in_interface_or_type:
            output_lines.append(line)
            if stripped.endswith("}") or stripped.endswith("};"):
                in_interface_or_type = False
            continue

        # 6. 處理函式跳過狀態 (掏空實作)
        if skipping_function_body:
            # 統計括號變化
            open_braces = line.count("{")
            close_braces = line.count("}")
            brace_depth += (open_braces - close_braces)
            if brace_depth <= skip_start_depth:
                skipping_function_body = False
                brace_depth = skip_start_depth
                # 結尾補上空殼標記或閉合括號
                if stripped in {"}", "};", "});"}:
                    output_lines.append(line)
            continue

        # 7. 匹配 const 箭頭函式: export const foo = (...) => { ... }
        if const_func_pattern.search(line):
            if "{" in line:
                sig = line.split("{")[0].rstrip() + " { /* ... implementation hidden ... */ };"
                output_lines.append(sig)
                # 檢查是否為同一行閉合
                if line.count("{") > line.count("}"):
                    skipping_function_body = True
                    skip_start_depth = brace_depth
                    brace_depth += (line.count("{") - line.count("}"))
            elif "=>" in line:
                sig = line.split("=>")[0].rstrip() + "=> { /* ... implementation hidden ... */ };"
                output_lines.append(sig)
            else:
                output_lines.append(line)
            continue

        # 8. 匹配 function / class 宣告: export function foo(...) {
        if func_class_pattern.search(line):
            if "class" in line:
                # Class 定義保留開頭
                output_lines.append(line)
                open_braces = line.count("{")
                close_braces = line.count("}")
                brace_depth += (open_braces - close_braces)
            else:
                # Function 定義
                if "{" in line:
                    sig = line.split("{")[0].rstrip() + " { /* ... implementation hidden ... */ }"
                    output_lines.append(sig)
                    if line.count("{") > line.count("}"):
                        skipping_function_body = True
                        skip_start_depth = brace_depth
                        brace_depth += (line.count("{") - line.count("}"))
                else:
                    output_lines.append(line)
            continue

        # 9. 匹配類別方法或物件屬性函式
        if method_pattern.search(line) and ("function" not in line) and ("class" not in line):
            sig = line.split("{")[0].rstrip() + " { /* ... implementation hidden ... */ }"
            output_lines.append(sig)
            if line.count("{") > line.count("}"):
                skipping_function_body = True
                skip_start_depth = brace_depth
                brace_depth += (line.count("{") - line.count("}"))
            continue

        # 10. 保留常數/變數匯出宣告 (例如 export const API_KEY = ...)
        if re.match(r'^\s*export\s+(?:const|let|var|default)\s+', line):
            # 若為長物件實作，簡化表示
            if "{" in line and "}" not in line:
                output_lines.append(line.split("{")[0].rstrip() + " { /* ... object properties ... */ };")
                skipping_function_body = True
                skip_start_depth = brace_depth
                brace_depth += (line.count("{") - line.count("}"))
            else:
                output_lines.append(line)
            continue

        # 11. 保留外層結構性閉合符號
        if stripped in {"}", "};", "});"}:
            output_lines.append(line)
            open_braces = line.count("{")
            close_braces = line.count("}")
            brace_depth += (open_braces - close_braces)
            continue

    return "\n".join(output_lines)


def extract_python_skeleton(content: str) -> str:
    """
    從 Python 代碼中提煉出 imports, class, def 簽名與 docstrings，掏空內部實作。
    """
    lines = content.splitlines()
    output_lines: List[str] = []
    in_docstring = False
    docstring_delimiter = ""

    for line in lines:
        stripped = line.strip()

        # Docstring 處理
        if not in_docstring:
            if stripped.startswith('"""') or stripped.startswith("'''"):
                docstring_delimiter = stripped[:3]
                in_docstring = True
                output_lines.append(line)
                if len(stripped) > 3 and stripped.endswith(docstring_delimiter):
                    in_docstring = False
                continue
        else:
            output_lines.append(line)
            if stripped.endswith(docstring_delimiter):
                in_docstring = False
            continue

        # 註解
        if stripped.startswith("#"):
            output_lines.append(line)
            continue

        # 匯入
        if stripped.startswith("import ") or stripped.startswith("from "):
            output_lines.append(line)
            continue

        # 類別與函式定義
        if re.match(r'^\s*(?:async\s+)?def\s+', line) or re.match(r'^\s*class\s+', line):
            indent = len(line) - len(line.lstrip())
            output_lines.append(line)
            if line.rstrip().endswith(":"):
                output_lines.append(" " * (indent + 4) + "...  # implementation hidden")
            continue

        # 模組級變數或常數 (大寫)
        if re.match(r'^[A-Z0-9_]+\s*=', line):
            output_lines.append(line)
            continue

    return "\n".join(output_lines)


def extract_skeleton(filepath: Path, content: str) -> Tuple[str, str]:
    ext = filepath.suffix.lower()
    if ext in {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}:
        return extract_typescript_skeleton(content), "typescript"
    elif ext in {".py"}:
        return extract_python_skeleton(content), "python"
    else:
        # 其他檔案退回通用骨架（提取註解、定義）
        return extract_typescript_skeleton(content), "generic"


def resolve_target_file(raw_path: str) -> Path:
    p = Path(raw_path)
    if p.is_absolute():
        return p
    # 優先從工作區根目錄解析
    repo_path = REPO_ROOT / p
    if repo_path.exists():
        return repo_path
    # 其次當前工作目錄
    cwd_path = Path.cwd() / p
    if cwd_path.exists():
        return cwd_path
    return repo_path


def main():
    parser = argparse.ArgumentParser(
        description="Code Skeleton Extractor - 掏空實作僅保留簽名與介面，節省 85%~95% Token",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("file", type=str, help="目標程式碼檔案路徑 (支援相對或絕對路徑)")
    parser.add_argument("--save", "-s", type=str, default=None, help="可選：將骨架結果輸出至指定檔案")
    args = parser.parse_args()

    target_path = resolve_target_file(args.file)

    if not target_path.exists():
        print(f"❌ 檔案不存在: {target_path}", file=sys.stderr)
        sys.exit(1)

    try:
        raw_text = target_path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        print(f"❌ 讀取檔案失敗: {e}", file=sys.stderr)
        sys.exit(1)

    skeleton, lang_type = extract_skeleton(target_path, raw_text)

    orig_lines = len(raw_text.splitlines())
    skel_lines = len(skeleton.splitlines())
    savings = (1 - (skel_lines / max(1, orig_lines))) * 100

    try:
        rel_display = target_path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        rel_display = target_path.as_posix()

    header = (
        f"/* 📄 骨架代碼 ({lang_type}): {rel_display}\n"
        f" * 原始: {orig_lines} 行 ➔ 骨架: {skel_lines} 行 | 減少 ~{savings:.1f}% 上下文雜訊 */\n"
    )

    full_output = header + skeleton

    if args.save:
        save_path = Path(args.save)
        if not save_path.is_absolute():
            save_path = REPO_ROOT / save_path
        save_path.parent.mkdir(parents=True, exist_ok=True)
        save_path.write_text(full_output, encoding="utf-8")
        print(f"✅ 骨架已輸出至: {save_path.as_posix()}")
    else:
        print(full_output)


if __name__ == "__main__":
    main()
