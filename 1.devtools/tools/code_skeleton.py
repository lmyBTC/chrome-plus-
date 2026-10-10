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


JS_CONTROL_KEYWORDS = {
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
    'try', 'catch', 'finally', 'with', 'return', 'throw', 'yield',
    'await', 'break', 'continue', 'debugger', 'import', 'export',
    'function', 'class', 'interface', 'type', 'enum', 'typeof', 'instanceof'
}


def find_body_brace_index(sig_text: str) -> int:
    """
    在 TypeScript / JavaScript 宣告字串中尋找函式體或回呼體開頭的 '{' 位置。
    規則：
    1. 若已看過 '=>'，則其後的第一個 '{' 即為函式體開頭。
    2. 若已看過 function 關鍵字及其參數列表閉合 ')'，則其後的第一個 '{' 即為函式體開頭。
    3. 若已看過頂層參數列表 ')'，則其後的第一個 '{' 即為函式體開頭。
    """
    paren_depth = 0
    in_string = False
    quote_char = ''
    has_seen_arrow = False
    top_paren_closed = False
    has_seen_open_paren = False

    # 追蹤 function 關鍵字及其參數括號
    in_func_decl = False
    func_paren_depth = 0
    func_paren_closed = False

    i = 0
    n = len(sig_text)
    while i < n:
        ch = sig_text[i]

        # 字串處理
        if in_string:
            if ch == '\\':
                i += 2
                continue
            if ch == quote_char:
                in_string = False
            i += 1
            continue
        elif ch in ("'", '"', '`'):
            in_string = True
            quote_char = ch
            i += 1
            continue

        # 檢查 function 關鍵字
        if not in_func_decl and (sig_text[i:i+8] == 'function' or sig_text[i:i+9] == 'function*'):
            in_func_decl = True
            i += 8
            continue

        # 檢查箭頭
        if i + 1 < n and sig_text[i:i+2] == '=>':
            has_seen_arrow = True
            i += 2
            continue

        # 追蹤小括號
        if ch == '(':
            paren_depth += 1
            has_seen_open_paren = True
            if in_func_decl:
                func_paren_depth += 1
        elif ch == ')':
            if paren_depth > 0:
                paren_depth -= 1
                if paren_depth == 0 and has_seen_open_paren:
                    top_paren_closed = True
            if in_func_decl and func_paren_depth > 0:
                func_paren_depth -= 1
                if func_paren_depth == 0:
                    func_paren_closed = True

        # 檢查大括號
        if ch == '{':
            if has_seen_arrow:
                return i
            if in_func_decl and func_paren_closed:
                return i
            if paren_depth == 0 and top_paren_closed:
                return i

        i += 1

    return -1


def extract_typescript_skeleton(content: str) -> str:
    """
    從 TypeScript / TSX / JavaScript 代碼中提煉出 imports, export, interface, type,
    enum、監聽器與函式/類別簽名，掏空複雜的 JSX 與函數內部具體實作。
    """
    lines = content.splitlines()
    output_lines: List[str] = []
    in_block_comment = False
    in_interface_or_type = False
    in_import = False
    brace_depth = 0
    skipping_function_body = False
    skip_start_depth = 0

    # 函數或方法宣告正則 (支援泛型 <...>)
    func_class_pattern = re.compile(
        r'^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|class|abstract\s+class)(?:\s+([a-zA-Z0-9_$]+))?(?:\s*<[^>]*>)?'
    )
    # 箭頭函式宣告正則 (支援泛型與解構，單行或多行起始)
    const_func_start_pattern = re.compile(
        r'^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)(?:\s*:\s*[^=]+)?\s*='
    )
    # 方法正則 (排除關鍵字，支援泛型)
    method_pattern = re.compile(
        r'^\s*(?:(?:public|private|protected|static|async|override|readonly|get|set)\s+)*([a-zA-Z0-9_$]+)\s*(?:<[^>]+>)?\s*\('
    )
    # 監聽器與事件訂閱模式
    listener_pattern = re.compile(
        r'^\s*([a-zA-Z0-9_$.]+(?:\.addListener|\.addEventListener|\.on|\.subscribe))\s*\('
    )

    # 多行簽名收集器緩衝區
    pending_sig: List[str] = []
    pending_type: str = ""

    def process_collected_signature(sig_lines: List[str], sig_kind: str) -> Tuple[List[str], bool, int]:
        """處理收集完成的簽名，回傳 (要輸出的行, 是否進入 skipping, 新增的括號深度)"""
        full_sig_text = "\n".join(sig_lines)
        brace_idx = find_body_brace_index(full_sig_text)

        # 決定閉合與掏空後置符號
        suffix = " { /* ... implementation hidden ... */ }"
        if sig_kind == 'const_func':
            suffix = " { /* ... implementation hidden ... */ };"
        elif sig_kind == 'listener':
            suffix = " { /* ... implementation hidden ... */ });"

        if brace_idx != -1:
            header_part = full_sig_text[:brace_idx].rstrip()
            open_count = full_sig_text.count("{")
            close_count = full_sig_text.count("}")
            net_depth = open_count - close_count

            cleaned_sig = re.sub(r'\s+', ' ', header_part).strip()
            indent = re.match(r'^\s*', sig_lines[0]).group(0)
            return [f"{indent}{cleaned_sig}{suffix}"], True, net_depth
        else:
            if "=>" in full_sig_text:
                parts = full_sig_text.split("=>")
                header_part = parts[0].rstrip()
                indent = re.match(r'^\s*', sig_lines[0]).group(0)
                cleaned_sig = re.sub(r'\s+', ' ', header_part).strip()
                return [f"{indent}{cleaned_sig}=> {{ /* ... expression ... */ }};"], False, 0
            else:
                return sig_lines, False, 0

    for line in lines:
        stripped = line.strip()

        # 1. 區塊註解處理
        if "/*" in stripped:
            in_block_comment = True
        if in_block_comment:
            if not skipping_function_body and not pending_sig:
                output_lines.append(line)
            if "*/" in stripped:
                in_block_comment = False
            continue

        # 2. 保留單行註解 (往往含重要業務規格)
        if stripped.startswith("//") or stripped.startswith("*"):
            if not skipping_function_body and not pending_sig:
                output_lines.append(line)
            continue

        # 3. 略過空行
        if not stripped:
            if not skipping_function_body and not pending_sig:
                output_lines.append("")
            continue

        # 4. 保留 import 語句 (支援多行 import)
        if stripped.startswith("import ") or stripped.startswith("import{") or stripped.startswith("import type"):
            if not skipping_function_body:
                output_lines.append(line)
                if ("from " not in stripped and not stripped.endswith(";")):
                    in_import = True
            continue

        if in_import:
            if not skipping_function_body:
                output_lines.append(line)
                if "from " in stripped or stripped.endswith(";"):
                    in_import = False
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
            open_braces = line.count("{")
            close_braces = line.count("}")
            brace_depth += (open_braces - close_braces)
            if brace_depth <= skip_start_depth:
                skipping_function_body = False
                brace_depth = skip_start_depth
                # 關鍵修復：掏空在開頭已給予閉合括號，結尾嚴禁重複 append！
            continue

        # 7. 多行簽名收集處理中
        if pending_sig:
            pending_sig.append(line)
            combined = "\n".join(pending_sig)
            brace_idx = find_body_brace_index(combined)
            if brace_idx != -1 or (pending_type == 'const_func' and "=>" in combined and ";" in combined):
                res_lines, need_skip, net_depth = process_collected_signature(pending_sig, pending_type)
                output_lines.extend(res_lines)
                if need_skip and net_depth > 0:
                    skipping_function_body = True
                    skip_start_depth = brace_depth
                    brace_depth += net_depth
                pending_sig = []
                pending_type = ""
            elif pending_type == 'const_func' and stripped.endswith(";") and "=>" not in combined and "function" not in combined:
                # 非函式語句收集完畢 (安全防禦)
                output_lines.extend(pending_sig)
                pending_sig = []
                pending_type = ""
            continue

        # 8. 匹配事件監聽器 (chrome.*.addListener / addEventListener 等)
        if listener_pattern.match(line):
            if stripped.endswith(";") and "{" not in line and "=>" not in line:
                output_lines.append(line)
                continue
            brace_idx = find_body_brace_index(line)
            if brace_idx != -1:
                res_lines, need_skip, net_depth = process_collected_signature([line], 'listener')
                output_lines.extend(res_lines)
                if need_skip and net_depth > 0:
                    skipping_function_body = True
                    skip_start_depth = brace_depth
                    brace_depth += net_depth
            else:
                pending_sig = [line]
                pending_type = 'listener'
            continue

        # 9. 匹配 function / class 宣告
        func_match = func_class_pattern.match(line)
        if func_match:
            if "class " in line:
                output_lines.append(line)
                open_braces = line.count("{")
                close_braces = line.count("}")
                brace_depth += (open_braces - close_braces)
            else:
                brace_idx = find_body_brace_index(line)
                if brace_idx != -1:
                    res_lines, need_skip, net_depth = process_collected_signature([line], 'func')
                    output_lines.extend(res_lines)
                    if need_skip and net_depth > 0:
                        skipping_function_body = True
                        skip_start_depth = brace_depth
                        brace_depth += net_depth
                else:
                    pending_sig = [line]
                    pending_type = 'func'
            continue

        # 10. 匹配 const / let / var 宣告 (箭頭函式、物件或一般變數)
        if const_func_start_pattern.match(line):
            # 檢查是否為一般單行語句 (以 ; 結尾且非函式)
            if stripped.endswith(";") and "=>" not in line and "function" not in line:
                if "{" in line and "}" in line:
                    # 單行物件字面量，簡化掏空
                    obj_header = line.split("{")[0].rstrip()
                    output_lines.append(f"{obj_header} {{ /* ... object properties ... */ }};")
                else:
                    # 一般常數/變數 (如 const X = 1; 或 const arr = ['a', 'b'];)
                    output_lines.append(line)
                continue

            # 檢查是否為物件字面量開頭 (例如 const config = {)
            if re.match(r'^\s*(?:export\s+)?(?:const|let|var)\s+[a-zA-Z0-9_$]+(?:\s*:\s*[^=]+)?\s*=\s*\{', line):
                output_lines.append(line.split("{")[0].rstrip() + " { /* ... object properties ... */ };")
                if line.count("{") > line.count("}"):
                    skipping_function_body = True
                    skip_start_depth = brace_depth
                    brace_depth += (line.count("{") - line.count("}"))
                continue

            # 檢查是否含有函式指標 (=>, function, async, 或換行參數括號)
            has_func_indicator = (
                "=>" in line or 
                "function" in line or 
                re.search(r'=\s*(?:async\s*)?(?:<[^>]+>\s*)?\(', line) or
                line.rstrip().endswith("(") or 
                line.rstrip().endswith("({")
            )

            if has_func_indicator:
                brace_idx = find_body_brace_index(line)
                if brace_idx != -1 or "=>" in line:
                    res_lines, need_skip, net_depth = process_collected_signature([line], 'const_func')
                    output_lines.extend(res_lines)
                    if need_skip and net_depth > 0:
                        skipping_function_body = True
                        skip_start_depth = brace_depth
                        brace_depth += net_depth
                else:
                    pending_sig = [line]
                    pending_type = 'const_func'
                continue
            else:
                # 一般非函式宣告 (例如多行陣列或一般表達式)
                output_lines.append(line)
                continue

        # 11. 匹配類別方法或物件方法 (必須在類別內部 brace_depth > 0，或具備存取修飾詞)
        method_match = method_pattern.match(line)
        if method_match and not stripped.endswith(";"):
            method_name = method_match.group(1)
            has_modifier = any(line.strip().startswith(kw + " ") for kw in ('public', 'private', 'protected', 'static', 'async', 'override', 'readonly', 'get', 'set'))
            if (brace_depth > 0 or has_modifier) and method_name not in JS_CONTROL_KEYWORDS and "function" not in line and "class" not in line:
                brace_idx = find_body_brace_index(line)
                if brace_idx != -1:
                    res_lines, need_skip, net_depth = process_collected_signature([line], 'method')
                    output_lines.extend(res_lines)
                    if need_skip and net_depth > 0:
                        skipping_function_body = True
                        skip_start_depth = brace_depth
                        brace_depth += net_depth
                elif line.rstrip().endswith("{") or "(" in line:
                    pending_sig = [line]
                    pending_type = 'method'
                continue

        # 12. 保留常數/變數匯出宣告 (例如 export const API_KEY = ...)
        if re.match(r'^\s*export\s+(?:const|let|var|default)\s+', line):
            if "{" in line and "}" not in line:
                output_lines.append(line.split("{")[0].rstrip() + " { /* ... object properties ... */ };")
                skipping_function_body = True
                skip_start_depth = brace_depth
                brace_depth += (line.count("{") - line.count("}"))
            else:
                output_lines.append(line)
            continue

        # 13. 保留外層結構控制語句 (例如頂層 if (typeof chrome !== 'undefined') { )
        if any(line.strip().startswith(kw + " ") or line.strip().startswith(kw + "(") for kw in ('if', 'else if', 'else')):
            output_lines.append(line)
            brace_depth += (line.count("{") - line.count("}"))
            continue

        # 14. 保留外層結構性閉合符號 (Class 結尾、外層 if 結尾等)
        if stripped in {"}", "};", "});"}:
            output_lines.append(line)
            brace_depth += (line.count("{") - line.count("}"))
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
        epilog="""範例:
  py 1.devtools/tools/code_skeleton.py chrome_scrumclock/src/background.ts
  npm run skeleton -- chrome_scrumclock/src/background.ts
  py 1.devtools/tools/code_skeleton.py chrome_scrumclock/src/background.ts --save scratch/bg_skel.ts
""",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("file", nargs="?", default=None, help="目標程式碼檔案路徑 (支援相對或絕對路徑)")
    parser.add_argument("--save", "-s", type=str, default=None, help="可選：將骨架結果輸出至指定檔案")
    args = parser.parse_args()

    if not args.file:
        print("❌ 未提供目標檔案路徑！\n", file=sys.stderr)
        parser.print_help(sys.stderr)
        sys.exit(1)

    target_path = resolve_target_file(args.file)

    if not target_path.exists():
        print(f"❌ 檔案不存在: {target_path}\n   (請確認路徑是否正確，支援相對工作區根目錄或當前目錄)", file=sys.stderr)
        sys.exit(1)

    if target_path.is_dir():
        print(f"❌ 指定路徑為目錄而非檔案: {target_path}\n   (請指定具體程式碼檔案，如 .ts, .tsx, .js, .py)", file=sys.stderr)
        sys.exit(1)

    try:
        raw_text = target_path.read_text(encoding="utf-8")
    except UnicodeDecodeError as ude:
        print(f"⚠️ 警告: 檔案包含非 UTF-8 字元編碼 ({ude.reason})，已自動切換容錯替換模式 (errors='replace') 讀取。", file=sys.stderr)
        try:
            raw_text = target_path.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            print(f"❌ 容錯讀取檔案仍失敗: {e}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"❌ 讀取檔案失敗: {e}", file=sys.stderr)
        sys.exit(1)

    if not raw_text.strip():
        print(f"⚠️ 提示: 目標檔案為空檔案: {target_path}")
        print("/* 📄 骨架代碼: 目標檔案為空檔案 */")
        return

    try:
        skeleton, lang_type = extract_skeleton(target_path, raw_text)
    except Exception as e:
        print(f"❌ 骨架提煉失敗 (語法解析異常): {e}", file=sys.stderr)
        sys.exit(1)

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
        try:
            save_path.parent.mkdir(parents=True, exist_ok=True)
            save_path.write_text(full_output, encoding="utf-8")
            print(f"✅ 骨架已輸出至: {save_path.as_posix()}")
        except Exception as e:
            print(f"❌ 儲存骨架檔案失敗: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print(full_output)


if __name__ == "__main__":
    main()
