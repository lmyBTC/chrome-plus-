#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import re
import argparse
from datetime import datetime

# 取得專案根目錄 (此腳本放在 tools/ 下，因此其上一層即為根目錄)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_FILE_PATH = os.path.join(ROOT_DIR, "doc", "doc_task", "issue_details", "issue_tracker_log.md")
DETAILS_DIR_PATH = os.path.join(ROOT_DIR, "doc", "doc_task", "issue_details")
ARCHIVE_DIR_PATH = os.path.join(DETAILS_DIR_PATH, "archive")

def parse_args():
    parser = argparse.ArgumentParser(description="Mason Yang Blog - Issue Tracker 自動化登錄與結案工具")
    
    # 模式切換：登錄模式 vs 結案模式
    subparsers = parser.add_subparsers(dest="action", help="執行動作")
    
    # 1. 登錄模式 (log)
    parser_log = subparsers.add_parser("log", help="登錄新問題")
    parser_log.add_argument("--type", required=True, choices=["Bug", "Optimize", "Refactor"], help="問題分類")
    parser_log.add_argument("--priority", required=True, choices=["P0", "P1", "P2", "P3"], help="優先權級別")
    parser_log.add_argument("--location", required=True, help="發生問題的檔案路徑、函式或模組名稱")
    parser_log.add_argument("--desc", required=True, help="簡短問題描述")
    parser_log.add_argument("--detail", help="詳細錯誤資訊或 Stack Trace (若有，則自動建立詳細日誌)")

    # 2. 結案模式 (resolve)
    parser_res = subparsers.add_parser("resolve", help="關閉/結案現有問題")
    parser_res.add_argument("--id", required=True, help="要結案的 Issue ID (如 B-20260527-01)")
    parser_res.add_argument("--resolution", required=True, help="修復結果或解決方案描述")
    
    # 為了向下相容既有調用 (不帶 subcommand 的情況)
    if len(sys.argv) > 1 and sys.argv[1] not in ["log", "resolve", "-h", "--help"]:
        # 建立一個虛擬的 Namespace 模仿 argparse
        # 注意：這裡不呼叫 parser.parse_args 以免報錯，直接分析
        temp_parser = argparse.ArgumentParser()
        temp_parser.add_argument("--type")
        temp_parser.add_argument("--priority")
        temp_parser.add_argument("--location")
        temp_parser.add_argument("--desc")
        temp_parser.add_argument("--detail")
        temp_args, _ = temp_parser.parse_known_args(sys.argv[1:])
        
        # 將其封裝為符合期待的結構
        class Args: pass
        args = Args()
        args.action = "log"
        args.type = temp_args.type
        args.priority = temp_args.priority
        args.location = temp_args.location
        args.desc = temp_args.desc
        args.detail = temp_args.detail
        return args
        
    return parser.parse_args()

def init_log_file():
    """若總表不存在，則自動初始化它"""
    if not os.path.exists(LOG_FILE_PATH):
        os.makedirs(os.path.dirname(LOG_FILE_PATH), exist_ok=True)
        content = (
            "# Issue Tracker Log (問題追蹤與優化清單)\n\n"
            "> **說明**：\n"
            "> 本檔案由 `issue-tracker` 技能與 `tools/log_issue.py` 自動化維護。\n"
            "> 為極致節省 Context 與 Token，本主檔**僅保留當前活躍 (`Open` / `In Progress`)** 之問題。\n"
            "> 當問題狀態更新為 `Resolved` 時，將**自動移出主表並下沉至下層歸檔目錄** [`archive/`](archive/)。\n"
            "> 歷史已結案紀錄請參閱：[`archive/issue_tracker_archive_2026.md`](archive/issue_tracker_archive_2026.md)。\n\n"
            "## 狀態、分類與優先級定義\n"
            "* **狀態 (Status)**: `Open` (待處理) / `In Progress` (處理中) / `Resolved` (已解決，自動歸檔至下層)\n"
            "* **分類 (Type)**: `Bug` (錯誤) / `Optimize` (優化) / `Refactor` (重構)\n"
            "* **優先級 (Priority)**: \n"
            "  * `P0`: 阻斷性致命錯誤、系統崩潰、關鍵 SEO 或數據遺失。\n"
            "  * `P1`: 核心功能異常，但有降級或繞過方案。\n"
            "  * `P2`: 一般性錯誤、部分 UI 跑版。\n"
            "  * `P3`: 寫作潤色、純程式碼重構、未來優化項目。\n\n"
            "---\n\n"
            "## 活躍問題清單 (Active Issues - Open / In Progress)\n\n"
            "| ID | 分類 | 優先級 | 狀態 | 發生位置 | 詳細描述 | 發現日期 |\n"
            "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
        )
        with open(LOG_FILE_PATH, "w", encoding="utf-8") as f:
            f.write(content)

def generate_id(category_char, today_str):
    """讀取總表與歸檔以獲取今天最大的 ID 流水號，自動遞增"""
    pattern = rf"({category_char}-{today_str}-\d+)"
    matches = []

    # 1. 檢查主檔
    if os.path.exists(LOG_FILE_PATH):
        with open(LOG_FILE_PATH, "r", encoding="utf-8") as f:
            matches.extend(re.findall(pattern, f.read()))

    # 2. 檢查下層歸檔檔
    year = today_str[:4]
    archive_file = os.path.join(ARCHIVE_DIR_PATH, f"issue_tracker_archive_{year}.md")
    if os.path.exists(archive_file):
        with open(archive_file, "r", encoding="utf-8") as f:
            matches.extend(re.findall(pattern, f.read()))

    if not matches:
        return f"{category_char}-{today_str}-01"

    # 提取流水號並找出最大值
    serial_numbers = []
    for match in matches:
        try:
            parts = match.split("-")
            serial_numbers.append(int(parts[2]))
        except (ValueError, IndexError):
            continue

    if not serial_numbers:
        return f"{category_char}-{today_str}-01"

    next_serial = max(serial_numbers) + 1
    return f"{category_char}-{today_str}-{next_serial:02d}"

def parse_line_numbers(text):
    """從文字 (如 detail 或 location) 中解析出所有出錯行號"""
    if not text:
        return []
    lines = []
    # 模式 1: [Line 465, 469...]
    m1 = re.findall(r'\[Line\s*([\d\s,]+)(?:\.\.\.)?\]', text, re.IGNORECASE)
    for match in m1:
        for num_str in match.split(','):
            num_str = num_str.strip()
            if num_str.isdigit():
                lines.append(int(num_str))
                
    # 模式 2: Line 465
    m2 = re.findall(r'(?:^|\s)Line\s+(\d+)\b', text, re.IGNORECASE)
    for match in m2:
        lines.append(int(match))

    # 模式 3: at line 465 或 line 465:
    m3 = re.findall(r'\bline\s+(\d+)\b', text, re.IGNORECASE)
    for match in m3:
        lines.append(int(match))
        
    # 模式 4: #L465 或 :465:
    m4 = re.findall(r'(?:#L|:)(\d+)(?::|\b)', text)
    for match in m4:
        lines.append(int(match))

    return sorted(list(set(lines)))

def extract_code_snippet(location_str, detail_text, context=3):
    """
    根據 location 與 detail 解析行號與檔案路徑，提取出錯行及其前後上下文代碼片段。
    回傳 (lang, snippet_content, detected_lines)
    """
    loc_clean = location_str.split('(')[0].split('[')[0].strip()
    loc_clean = loc_clean.strip('`"\' ')
    
    target_path = loc_clean
    if not os.path.isabs(target_path):
        target_path = os.path.join(ROOT_DIR, target_path)

    line_numbers = parse_line_numbers(detail_text) + parse_line_numbers(location_str)
    line_numbers = sorted(list(set(line_numbers)))

    ext = os.path.splitext(target_path)[1].lower()
    lang_map = {
        '.html': 'html',
        '.htm': 'html',
        '.js': 'javascript',
        '.json': 'json',
        '.py': 'python',
        '.css': 'css',
        '.md': 'markdown'
    }
    lang = lang_map.get(ext, 'text')

    if not os.path.exists(target_path) or not os.path.isfile(target_path):
        return lang, "// [Notice] 目標檔案不存在或未指定具體檔案路徑，無法自動提取代碼切片。", line_numbers

    if not line_numbers:
        return lang, "// [Notice] 未偵測到具體行號，請參考上方錯誤日誌進行排查。", []

    try:
        with open(target_path, 'r', encoding='utf-8', errors='replace') as f:
            file_lines = f.readlines()
    except Exception as e:
        return lang, f"// [Error] 讀取檔案失敗: {e}", line_numbers

    total_lines = len(file_lines)
    snippets = []
    
    sample_lines = line_numbers[:2]
    for target_line in sample_lines:
        if target_line < 1 or target_line > total_lines:
            continue
        start_idx = max(1, target_line - context)
        end_idx = min(total_lines, target_line + context)
        
        block = []
        block.append(f"// --- Context around Line {target_line} ---")
        for curr_idx in range(start_idx, end_idx + 1):
            line_content = file_lines[curr_idx - 1].rstrip('\r\n')
            prefix = " > " if curr_idx == target_line else "   "
            block.append(f"{prefix}{curr_idx:4d}: {line_content}")
        snippets.append("\n".join(block))

    if not snippets:
        return lang, "// [Notice] 出錯行號超出檔案範圍，無法提取切片。", line_numbers

    return lang, "\n\n".join(snippets), line_numbers

def write_detail_log(issue_id, args, today_str):
    """建立詳細日誌快照檔"""
    os.makedirs(DETAILS_DIR_PATH, exist_ok=True)
    detail_file_path = os.path.join(DETAILS_DIR_PATH, f"{issue_id}.md")

    # 轉換詳細內容中的換行字元
    detail_content = args.detail.replace("\\n", "\n").replace("\\r", "") if args.detail else ""

    # 自動解析代碼切片與行號
    lang, snippet, line_numbers = extract_code_snippet(args.location, detail_content)
    
    # 若有解析出行號，美化發生位置
    display_location = args.location
    if line_numbers and not any(p in display_location for p in ['Line', '#L', ':']):
        lines_str = ", ".join(str(l) for l in line_numbers[:5])
        display_location = f"{args.location} (Line {lines_str})"

    content = (
        f"# Issue {issue_id}: {args.desc}\n\n"
        f"## 1. 問題背景 (Context)\n"
        f"* **發現日期**: {today_str}\n"
        f"* **發生位置**: {display_location}\n"
        f"* **優先級**: {args.priority}\n"
        f"* **狀態**: Open\n\n"
        f"## 2. 錯誤重現與日誌 (Logs & Repro)\n"
        f"* **重現步驟**: \n"
        f"  1. [手動/自動執行觸發]\n"
        f"* **原始錯誤輸出 (Stack Trace)**:\n"
        f"  ```text\n"
        f"  {detail_content}\n"
        f"  ```\n\n"
        f"## 3. 程式碼分析 (Code Snippet)\n"
        f"* **受影響程式碼片段**:\n"
        f"  ```{lang}\n"
        f"{snippet}\n"
        f"  ```\n\n"
        f"## 4. 建議修復策略 (Mitigation Plan)\n"
        f"* [請在此記錄修復或改善方向]\n"
    )

    with open(detail_file_path, "w", encoding="utf-8") as f:
        f.write(content)

def append_to_log_table(issue_id, args, location_col, today_str):
    """將記錄追加至總表表格的最後一列"""
    row = f"| {issue_id} | {args.type} | {args.priority} | Open | {location_col} | {args.desc} | {today_str} |\n"
    
    with open(LOG_FILE_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # 確保最後一行有換行，避免追加在同一行
    if lines and not lines[-1].endswith("\n"):
        lines[-1] = lines[-1] + "\n"

    lines.append(row)

    with open(LOG_FILE_PATH, "w", encoding="utf-8") as f:
        f.writelines(lines)

def resolve_issue(issue_id, resolution_text):
    """執行結案流程：更新為 Resolved 並自動移往下層歸檔 (archive/)，同時清理詳細日誌快照"""
    if not os.path.exists(LOG_FILE_PATH):
        print(f"[ERROR] Issue log file not found at: {LOG_FILE_PATH}")
        return False

    with open(LOG_FILE_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    target_line_idx = -1
    target_row = ""
    for idx, line in enumerate(lines):
        if re.search(rf"\|\s*{re.escape(issue_id)}\s*\|", line):
            target_line_idx = idx
            target_row = line
            break

    if target_line_idx == -1:
        print(f"[WARNING] Could not find Issue ID '{issue_id}' in active log table: {LOG_FILE_PATH}")
        return False

    # 1. 將狀態更新為 Resolved
    updated_row = re.sub(r"(\|\s*)(Open|In Progress)(\s*\|)", r"\1Resolved\3", target_row)

    # 2. 如果該列有指向詳細日誌的連結，在下層歸檔目錄中與詳細日誌檔案同層，統一保持 [詳細日誌](issue_id.md)
    archive_row = updated_row.replace(f"(issue_details/{issue_id}.md)", f"({issue_id}.md)")
    archive_row = archive_row.replace(f"(../{issue_id}.md)", f"({issue_id}.md)")
    if not archive_row.endswith("\n"):
        archive_row += "\n"

    # 3. 自主表移除此列（下層丟，不占空間！）
    lines.pop(target_line_idx)
    with open(LOG_FILE_PATH, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"[SUCCESS] Removed resolved issue {issue_id} from active table {LOG_FILE_PATH}")

    # 4. 追加至下層歸檔檔 archive/issue_tracker_archive_{year}.md
    m_year = re.search(r"[B|O|R]-(\d{4})\d{4}-\d+", issue_id)
    year = m_year.group(1) if m_year else datetime.now().strftime("%Y")
    os.makedirs(ARCHIVE_DIR_PATH, exist_ok=True)
    archive_file_path = os.path.join(ARCHIVE_DIR_PATH, f"issue_tracker_archive_{year}.md")

    if not os.path.exists(archive_file_path):
        header = (
            f"# Issue Tracker Archive ({year} 歷史已結案存檔)\n\n"
            f"> **說明**：\n"
            f"> 本檔案為 `doc/doc_task/issue_details/issue_tracker_log.md` 之歷史已結案 (Resolved) 存檔。\n"
            f"> 當前進行中與活躍問題請參閱主文件：[`issue_tracker_log.md`](../issue_tracker_log.md)。\n\n"
            f"## {year} 已結案清單 (Resolved Archive)\n\n"
            f"| ID | 分類 | 優先級 | 狀態 | 發生位置 | 詳細描述 | 發現日期 |\n"
            f"| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
        )
        with open(archive_file_path, "w", encoding="utf-8") as f:
            f.write(header + archive_row)
    else:
        with open(archive_file_path, "a", encoding="utf-8") as f:
            f.write(archive_row)
    print(f"[SUCCESS] Archived resolved issue {issue_id} to {archive_file_path}")

    # 5. 自動將已解決的詳細日誌快照檔遷移至下層封存目錄 (Auto Move Resolved Details to Archive)
    detail_file_path = os.path.join(DETAILS_DIR_PATH, f"{issue_id}.md")
    if os.path.exists(detail_file_path):
        try:
            import shutil
            target_detail_path = os.path.join(ARCHIVE_DIR_PATH, f"{issue_id}.md")
            shutil.move(detail_file_path, target_detail_path)
            print(f"[SUCCESS] Automatically moved resolved details file to archive: {target_detail_path}")
        except Exception as move_ex:
            print(f"[WARN] Failed to move details file to archive {detail_file_path}: {move_ex}")
    else:
        print(f"[INFO] No active detailed log file found for {issue_id}. Skipping details archive move.")

    return True

def main():
    args = parse_args()
    
    if hasattr(args, 'action') and args.action == "resolve":
        success = resolve_issue(args.id, args.resolution)
        if success:
            print(f"Successfully resolved issue: {args.id}")
        sys.exit(0 if success else 1)

    # Logging mode
    init_log_file()
    category_map = {"Bug": "B", "Optimize": "O", "Refactor": "R"}
    category_char = category_map[args.type]
    today_str = datetime.now().strftime("%Y%m%d")
    today_dash_str = datetime.now().strftime("%Y-%m-%d")
    issue_id = generate_id(category_char, today_str)

    if args.detail:
        write_detail_log(issue_id, args, today_dash_str)
        location_col = f"[詳細日誌]({issue_id}.md)"
    else:
        location_col = args.location

    append_to_log_table(issue_id, args, location_col, today_dash_str)
    print(f"Successfully logged issue: {issue_id}")

if __name__ == "__main__":
    main()
