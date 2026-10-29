#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/analyze_task_tokens.py
-----------------------------
任務對話日誌 Token 深度剖析與 Context 膨脹分析 CLI 工具 (Task Token Usage Analyzer)。

支援：
- 自動從 Task Markdown 文件中提取對話 ID 分析 (--task-file)
- 直接指定對話 ID 分析 (--conversation-id)
- 串流解析 transcript_full.jsonl / transcript.jsonl，防範記憶體溢出
- 跨平台 UTF-8 容錯輸出
- 匯出 JSON 報表 (--export-json)
- 重型步驟檢索 (--top-heavy)
"""

import os
import sys
import io
import json
import re
import argparse
from typing import List, Dict, Any, Optional, Tuple

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from lib.common import setup_utf8_output, REPO_ROOT, get_active_task, TASKS_DIR

# 強制標準輸出為 UTF-8，解決 Windows 控制台下的編碼報錯問題
setup_utf8_output()

# 引用全域統一 Token 估算器 (SSOT)
try:
    from tools.token_estimator import estimate_tokens
except ModuleNotFoundError:
    try:
        from token_estimator import estimate_tokens
    except ModuleNotFoundError:
        _project_root = str(REPO_ROOT)
        if _project_root not in sys.path:
            sys.path.insert(0, _project_root)
        try:
            from tools.token_estimator import estimate_tokens
        except ModuleNotFoundError:
            from token_estimator import estimate_tokens


class TokenUsageAnalyzer:
    """任務對話日誌 Token 分析引擎"""

    DEFAULT_BASE_CONTEXT = 10000

    def __init__(self, base_context: int = DEFAULT_BASE_CONTEXT):
        self.base_context = base_context

    @staticmethod
    def get_brain_base_dirs() -> List[str]:
        user_home = os.path.expanduser('~')
        return [
            os.path.join(user_home, '.gemini', 'antigravity', 'brain'),
            os.path.join(user_home, '.gemini', 'antigravity-ide', 'brain'),
            os.path.join(user_home, '.gemini', 'brain'),
            os.path.join('.gemini', 'antigravity-ide', 'brain')
        ]

    @classmethod
    def find_latest_conversation(cls) -> Optional[Tuple[str, str]]:
        """
        尋找 brain 目錄下最近修改的對話 ID 與 transcript 路徑。
        回傳 (conversation_id, transcript_path) 或 None。
        """
        candidates = []
        for base_dir in cls.get_brain_base_dirs():
            if not os.path.isdir(base_dir):
                continue
            try:
                subdirs = os.listdir(base_dir)
            except OSError:
                continue
            for item in subdirs:
                item_dir = os.path.join(base_dir, item)
                if not os.path.isdir(item_dir):
                    continue
                log_dir = os.path.join(item_dir, '.system_generated', 'logs')
                if os.path.isdir(log_dir):
                    # 優先檢查 transcript.jsonl（體積較小讀取較快），其次 transcript_full.jsonl
                    for filename in ['transcript.jsonl', 'transcript_full.jsonl']:
                        filepath = os.path.join(log_dir, filename)
                        if os.path.isfile(filepath):
                            try:
                                mtime = os.path.getmtime(filepath)
                                candidates.append((mtime, item, filepath))
                            except OSError:
                                pass
        if not candidates:
            return None
        candidates.sort(key=lambda x: x[0], reverse=True)
        latest = candidates[0]
        return latest[1], latest[2]

    @classmethod
    def locate_transcript_file(cls, conversation_id: str) -> Optional[str]:
        """
        定位指定對話 ID 的 transcript 日誌檔路徑。
        優先尋找 transcript_full.jsonl，其次降級為 transcript.jsonl。
        若傳入為前綴（例如 8 碼），自動匹配 brain 目錄下對應資料夾。
        """
        brain_base_dirs = cls.get_brain_base_dirs()
        target_conv_id = conversation_id.strip()

        # 若非完整 36 字元 UUID，嘗試進行前綴搜尋
        matched_conv_id = target_conv_id
        if len(target_conv_id) < 36:
            for base_dir in brain_base_dirs:
                if os.path.isdir(base_dir):
                    matches = [d for d in os.listdir(base_dir) if d.startswith(target_conv_id)]
                    if matches:
                        matched_conv_id = matches[0]
                        break

        search_dirs = [
            os.path.join(base, matched_conv_id, '.system_generated', 'logs')
            for base in brain_base_dirs
        ]

        for log_dir in search_dirs:
            if os.path.isdir(log_dir):
                full_path = os.path.join(log_dir, 'transcript_full.jsonl')
                if os.path.isfile(full_path):
                    return full_path
                compact_path = os.path.join(log_dir, 'transcript.jsonl')
                if os.path.isfile(compact_path):
                    return compact_path
        return None

    def quick_check(self, transcript_path: str) -> Dict[str, Any]:
        """
        高速水位探針：串流累計 steps Token，極速計算當前 Context 水位 (< 50ms)。
        """
        if not os.path.isfile(transcript_path):
            raise FileNotFoundError(f"日誌檔案不存在: {transcript_path}")

        total_step_tokens = 0
        step_count = 0
        last_step_type = ""
        user_turn_count = 0

        with open(transcript_path, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    s = json.loads(line)
                    content = s.get('content', '') or ''
                    thinking = s.get('thinking', '') or ''
                    tcalls = s.get('tool_calls', [])
                    tcall_str = json.dumps(tcalls, ensure_ascii=False) if tcalls else ''
                    total_text = content + ('\n' + thinking if thinking else '') + ('\n' + tcall_str if tcall_str else '')
                    total_step_tokens += estimate_tokens(total_text)
                    step_count += 1
                    last_step_type = s.get('type', '')
                    if s.get('type') == 'USER_INPUT':
                        user_turn_count += 1
                except json.JSONDecodeError:
                    continue

        current_context = self.base_context + total_step_tokens
        return {
            "transcript_path": transcript_path,
            "step_count": step_count,
            "user_turn_count": user_turn_count,
            "current_context": current_context,
            "is_alert": current_context > 45000,
            "last_step_type": last_step_type
        }

    @staticmethod
    def extract_conversation_ids_from_task(task_file_path: str) -> List[str]:
        """
        從 Task Markdown 文件中解析參與對話 ID。
        依據 SSOT 簽到區或對話紀錄段落中的 UUID 格式。
        """
        if not os.path.isfile(task_file_path):
            raise FileNotFoundError(f"找不到指定的 Task 檔案: {task_file_path}")

        uuid_pattern = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
        found_ids = []

        with open(task_file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                # 優先抓取簽到區或對話紀錄行
                if 'ID:' in line or '對話' in line or 'conversation' in line.lower():
                    matches = re.findall(uuid_pattern, line, re.IGNORECASE)
                    for m in matches:
                        if m not in found_ids:
                            found_ids.append(m)

        # 若簽到區未明確標註，對全檔做保守正則掃描
        if not found_ids:
            with open(task_file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                matches = re.findall(uuid_pattern, content, re.IGNORECASE)
                for m in matches:
                    if m not in found_ids:
                        found_ids.append(m)

        return found_ids

    def analyze_transcript(self, transcript_path: str, top_heavy_limit: int = 5) -> Dict[str, Any]:
        """
        串流解析 transcript 檔案並計算詳細 Token 指標。
        """
        if not os.path.isfile(transcript_path):
            raise FileNotFoundError(f"日誌檔案不存在: {transcript_path}")

        # 串流讀取 steps
        steps = []
        with open(transcript_path, 'r', encoding='utf-8', errors='replace') as f:
            for line_idx, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                try:
                    step_obj = json.loads(line)
                    steps.append(step_obj)
                except json.JSONDecodeError:
                    continue

        if not steps:
            return {
                "total_steps": 0,
                "error": "日誌檔案無有效步驟數據"
            }

        # 第一輪：計算各步自身產生的 Token
        step_tokens = []
        for s in steps:
            content = s.get('content', '') or ''
            thinking = s.get('thinking', '') or ''
            tcalls = s.get('tool_calls', [])
            tcall_str = json.dumps(tcalls, ensure_ascii=False) if tcalls else ''
            total_text = content + ('\n' + thinking if thinking else '') + ('\n' + tcall_str if tcall_str else '')
            step_tokens.append(estimate_tokens(total_text))

        # 識別使用者輸入輪次
        user_turns: List[Tuple[int, str]] = []
        for idx, s in enumerate(steps):
            if s.get('type') == 'USER_INPUT':
                u_content = s.get('content', '') or ''
                match = re.search(r'<USER_REQUEST>(.*?)</USER_REQUEST>', u_content, re.DOTALL)
                req_text = match.group(1).strip() if match else u_content.strip()
                first_line = req_text.split('\n')[0][:80] if req_text else "（空輸入）"
                user_turns.append((idx, first_line))

        # 若無明確 USER_INPUT，以整份對話為單一 Turn
        if not user_turns:
            user_turns.append((0, "全對話執行流程"))

        phase_data = []
        for i in range(len(user_turns)):
            start_step = user_turns[i][0]
            end_step = user_turns[i+1][0] if i + 1 < len(user_turns) else len(steps)

            turn_input_tokens = 0
            turn_output_tokens = 0
            turn_thinking_tokens = 0
            model_calls = 0
            tool_counts: Dict[str, int] = {}
            tool_tokens: Dict[str, int] = {}
            top_heavy_steps: List[Tuple[str, int]] = []

            for s_idx in range(start_step, end_step):
                s = steps[s_idx]
                source = s.get('source')
                stype = s.get('type')
                content = s.get('content', '') or ''
                thinking = s.get('thinking', '') or ''
                tcalls = s.get('tool_calls', [])

                c_tokens = estimate_tokens(content)
                th_tokens = estimate_tokens(thinking)
                tc_tokens = estimate_tokens(json.dumps(tcalls, ensure_ascii=False)) if tcalls else 0

                if source == 'MODEL':
                    model_calls += 1
                    # 當前累積的 Context 即為此次模型 API 調用之 Input
                    current_context = self.base_context + sum(step_tokens[:s_idx])
                    turn_input_tokens += current_context

                    out_tok = c_tokens + tc_tokens
                    turn_output_tokens += out_tok
                    turn_thinking_tokens += th_tokens

                    if tcalls:
                        for tc in tcalls:
                            fname = tc.get('name', 'unknown')
                            tool_counts[fname] = tool_counts.get(fname, 0) + 1
                            args = tc.get('args', {})
                            arg_str = json.dumps(args, ensure_ascii=False)
                            arg_tok = estimate_tokens(arg_str)
                            if arg_tok > 500:
                                top_heavy_steps.append((f"Tool Call: {fname}", arg_tok))
                else:
                    if stype in ['RUN_COMMAND', 'VIEW_FILE', 'GREP_SEARCH', 'LIST_DIRECTORY', 'CODE_ACTION']:
                        tool_tokens[stype] = tool_tokens.get(stype, 0) + c_tokens
                        if c_tokens > 1000:
                            preview = content[:80].replace('\n', ' ')
                            top_heavy_steps.append((f"{stype} output ({preview}...)", c_tokens))

            phase_data.append({
                'turn': i,
                'title': user_turns[i][1],
                'start_step': start_step,
                'end_step': end_step,
                'step_count': end_step - start_step,
                'model_calls': model_calls,
                'input_tokens': turn_input_tokens,
                'output_tokens': turn_output_tokens,
                'thinking_tokens': turn_thinking_tokens,
                'total_tokens': turn_input_tokens + turn_output_tokens + turn_thinking_tokens,
                'context_at_end': self.base_context + sum(step_tokens[:end_step]),
                'tool_counts': tool_counts,
                'tool_tokens': tool_tokens,
                'top_heavy_steps': sorted(top_heavy_steps, key=lambda x: x[1], reverse=True)[:top_heavy_limit]
            })

        total_input = sum(p['input_tokens'] for p in phase_data)
        total_output = sum(p['output_tokens'] for p in phase_data)
        total_thinking = sum(p['thinking_tokens'] for p in phase_data)
        total_all = total_input + total_output + total_thinking
        peak_context = max((p['context_at_end'] for p in phase_data), default=self.base_context)

        return {
            "transcript_path": transcript_path,
            "total_steps": len(steps),
            "total_model_calls": sum(p['model_calls'] for p in phase_data),
            "peak_context": peak_context,
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_thinking_tokens": total_thinking,
            "total_tokens": total_all,
            "input_ratio": (total_input / total_all) if total_all > 0 else 0.0,
            "phases": phase_data
        }


def format_cli_report(data: Dict[str, Any], conversation_id: str, quiet: bool = False) -> str:
    """將分析數據格式化為人類可讀的終端 ASCII 報表"""
    lines = []
    lines.append("=" * 80)
    lines.append(f" 🚀 TASK TOKEN USAGE ANALYZER — 對話日誌 Context 膨脹深度剖析")
    lines.append(f" 對話 ID: {conversation_id}")
    lines.append(f" 日誌來源: {data.get('transcript_path')}")
    lines.append("=" * 80)

    total_tokens = data.get('total_tokens', 0)
    total_input = data.get('total_input_tokens', 0)
    total_output = data.get('total_output_tokens', 0)
    total_thinking = data.get('total_thinking_tokens', 0)
    total_calls = data.get('total_model_calls', 0)
    total_steps = data.get('total_steps', 0)
    peak_context = data.get('peak_context', 0)
    input_ratio = data.get('input_ratio', 0.0) * 100

    lines.append("【核心量化總覽 (Executive Summary)】")
    lines.append(f"  • 總消耗 Tokens: {total_tokens:,} Tokens")
    lines.append(f"  • 累積 Context (Input): {total_input:,} Tokens ({input_ratio:.1f}%)")
    lines.append(f"  • 模型回傳 (Output): {total_output:,} Tokens ({(total_output/total_tokens*100) if total_tokens else 0:.1f}%)")
    lines.append(f"  • 思考鏈 (Thinking): {total_thinking:,} Tokens ({(total_thinking/total_tokens*100) if total_tokens else 0:.1f}%)")
    lines.append(f"  • 峰值 Context 水位: {peak_context:,} Tokens")
    lines.append(f"  • 總步驟 Steps: {total_steps} 步 | 模型調用: {total_calls} 次")
    lines.append("-" * 80)

    # 智能診斷建議
    rules_alert = []
    if peak_context >= 80000:
        rules_alert.append("🔴 [Rule 1 警告] 峰值 Context 已達 80k+，建議在主要 Phase 之間執行【Session 強制隔離】，重啟新對話。")
    phases = data.get('phases', [])
    if phases and phases[0].get('context_at_end', 0) > 30000:
        rules_alert.append(f"🟠 [Rule 2 警告] Turn 0 規劃期 Context 末值達 {phases[0].get('context_at_end', 0):,}，建議落實【規劃精簡化 SOP】限制僅讀 3 份文件。")

    if rules_alert:
        lines.append("【優化診斷提示 (Optimization Insights)】")
        for alert in rules_alert:
            lines.append(f"  {alert}")
        lines.append("-" * 80)

    if not quiet and phases:
        lines.append("【各輪次詳細消耗分解 (Turn Breakdown)】")
        for p in phases:
            pct = (p['total_tokens'] / total_tokens * 100) if total_tokens > 0 else 0.0
            lines.append(f"\n[Turn {p['turn']}] {p['title']}")
            lines.append(f"  - 步驟區間: Step {p['start_step']} ~ {p['end_step']} ({p['step_count']} 步, {p['model_calls']} 次調用)")
            lines.append(f"  - 當期消耗: Input={p['input_tokens']:,} | Output={p['output_tokens']:,} | Thinking={p['thinking_tokens']:,} | 當期合計={p['total_tokens']:,} ({pct:.1f}%)")
            lines.append(f"  - 階段結束 Context 水位: {p['context_at_end']:,} Tokens")
            if p['tool_counts']:
                sorted_tools = sorted(p['tool_counts'].items(), key=lambda x: x[1], reverse=True)
                tool_summary = ", ".join([f"{k}: {v}" for k, v in sorted_tools[:5]])
                lines.append(f"  - 工具呼叫分佈: {tool_summary}")

            if p['top_heavy_steps']:
                lines.append("  - 重型步驟 Top-Heavy:")
                for item, tok in p['top_heavy_steps'][:3]:
                    lines.append(f"    • {item} -> {tok:,} Tokens")
        lines.append("=" * 80)

    return "\n".join(lines)


def format_quick_check_report(data: Dict[str, Any], conversation_id: str, elapsed_ms: float) -> str:
    """將高速探針數據格式化為緊湊的終端警報與狀態輸出"""
    ctx = data.get("current_context", 0)
    steps = data.get("step_count", 0)
    turns = data.get("user_turn_count", 0)
    path = data.get("transcript_path", "")

    lines = []
    lines.append("-" * 75)
    if ctx > 45000:
        lines.append(f"🔴 [CONTEXT_ALERT] Current Context is {ctx:,} Tokens (> 45,000 水位警戒線)")
        lines.append(f"   建議立即執行【Session 強制換場】，以維持高品質推論並節省 Token！")
    elif ctx > 30000:
        lines.append(f"🟡 [CONTEXT_WARN] Current Context is {ctx:,} Tokens (已達中高水位 30k~45k)")
        lines.append(f"   注意避免在對話中呼叫巨型檔案檢索，建議於當前 Phase 結束後換場。")
    else:
        lines.append(f"🟢 [CONTEXT_OK] Current Context is {ctx:,} Tokens (健康水位，<= 30k)")

    lines.append(f"   對話 ID: {conversation_id} | 總步數: {steps} 步 | 輪次: {turns} 輪 | 探針耗時: {elapsed_ms:.1f}ms")
    lines.append(f"   日誌來源: {path}")
    lines.append("-" * 75)
    return "\n".join(lines)


def main():
    import time
    start_time = time.perf_counter()

    parser = argparse.ArgumentParser(
        description="任務對話日誌 Token 深度剖析與 Context 膨脹分析工具 (TokenUsageAnalyzer)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""範例:
  python tools/analyze_task_tokens.py --quick-check                     # 一鍵秒查當前對話 Context 水位 (< 50ms)
  python tools/analyze_task_tokens.py --current                         # 完整分析當前最新對話
  python tools/analyze_task_tokens.py --conversation-id a37b1243-0122   # 分析指定對話
  python tools/analyze_task_tokens.py --task-file doc/doc_task/task.md  # 分析 Task 文件中標註的對話
        """
    )
    parser.add_argument("target", nargs="?", default="", help="位置參數：可直接傳入 Task Markdown 檔案路徑或對話 ID (UUID/前綴)")
    parser.add_argument("--conversation-id", "-c", type=str, default="", help="指定 Antigravity 對話 ID (UUID 或前綴)")
    parser.add_argument("--task-file", "-t", type=str, default="", help="指定 Task Markdown 檔案路徑，自動萃取對話 ID 進行分析")
    parser.add_argument("--current", "-u", action="store_true", help="自動定位最新修改之當前對話 Session 進行分析")
    parser.add_argument("--quick-check", "-k", action="store_true", help="高速水位探針模式 (<100ms)，僅輸出當前 Context 水位與健康警報")

    parser.add_argument("--top-heavy", type=int, default=5, help="列出各輪次前 N 個重型步驟/工具調用（預設: 5）")
    parser.add_argument("--export-json", type=str, default="", help="將結構化分析數據匯出至指定的 JSON 檔案路徑")
    parser.add_argument("--base-context", type=int, default=TokenUsageAnalyzer.DEFAULT_BASE_CONTEXT,
                        help=f"自訂 Base System Prompt 預估 Tokens (預設: {TokenUsageAnalyzer.DEFAULT_BASE_CONTEXT})")
    parser.add_argument("--quiet", "-q", action="store_true", help="簡潔模式，僅輸出總結，不輸出輪次明細")

    args = parser.parse_args()

    # 自動推導位置參數 target 為 task_file 或 conversation_id
    if args.target and not args.task_file and not args.conversation_id:
        target_str = args.target.strip()
        candidate_path = target_str if os.path.isabs(target_str) else os.path.join(REPO_ROOT, target_str)
        if os.path.isfile(target_str) or os.path.isfile(candidate_path) or target_str.endswith(".md") or "/" in target_str or "\\" in target_str:
            args.task_file = target_str if os.path.isfile(target_str) else candidate_path
        else:
            args.conversation_id = target_str

    analyzer = TokenUsageAnalyzer(base_context=args.base_context)

    # 1. 處理高速探針模式 (--quick-check)
    if args.quick_check:
        target_conv_id = args.conversation_id.strip() if args.conversation_id else ""
        target_file = None

        if target_conv_id:
            target_file = analyzer.locate_transcript_file(target_conv_id)
        elif args.task_file:
            task_ids = analyzer.extract_conversation_ids_from_task(args.task_file)
            if task_ids:
                target_conv_id = task_ids[-1]
                target_file = analyzer.locate_transcript_file(target_conv_id)
        else:
            # 預設自動定位最新對話
            latest = analyzer.find_latest_conversation()
            if latest:
                target_conv_id, target_file = latest

        if not target_file:
            print("[錯誤] 無法定位任何可用的對話 transcript 日誌檔。請指定 --conversation-id。")
            sys.exit(1)

        data = analyzer.quick_check(target_file)
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        print(format_quick_check_report(data, target_conv_id, elapsed_ms))
        sys.exit(0)

    # 2. 處理完整分析模式
    conversation_ids = []

    if args.task_file:
        task_path = args.task_file
        try:
            conversation_ids = analyzer.extract_conversation_ids_from_task(task_path)
            if not conversation_ids:
                print(f"[錯誤] 在 Task 檔案 {task_path} 中未找到合規的對話 ID (UUID)。請改用 --conversation-id 直接指定。")
                sys.exit(1)
            print(f"[*] 自 Task 檔案萃取到 {len(conversation_ids)} 個對話 ID: {', '.join(conversation_ids)}")
        except Exception as e:
            print(f"[錯誤] 讀取 Task 檔案失敗: {e}")
            sys.exit(1)
    elif args.conversation_id:
        conversation_ids = [args.conversation_id.strip()]
    elif args.current:
        latest = analyzer.find_latest_conversation()
        if latest:
            conversation_ids = [latest[0]]
            print(f"[*] 自動鎖定當前最新對話 Session: {latest[0]}")
        else:
            print("[錯誤] 在本機未找到任何對話日誌。")
            sys.exit(1)
    else:
        # 若未提供任何定位參數，預設提示說明
        parser.print_help()
        sys.exit(0)

    all_reports = []
    for conv_id in conversation_ids:
        transcript_file = analyzer.locate_transcript_file(conv_id)
        if not transcript_file:
            print(f"[警告] 找不到對話 ID {conv_id} 的日誌檔案 (transcript_full.jsonl / transcript.jsonl)。")
            continue

        analysis = analyzer.analyze_transcript(transcript_file, top_heavy_limit=args.top_heavy)
        analysis['conversation_id'] = conv_id
        all_reports.append(analysis)

        report_text = format_cli_report(analysis, conv_id, quiet=args.quiet)
        print(report_text)
        print("\n")

    if not all_reports:
        print("[錯誤] 未能成功分析任何對話日誌。")
        sys.exit(1)

    if args.export_json:
        export_path = args.export_json
        export_dir = os.path.dirname(export_path)
        if export_dir and not os.path.exists(export_dir):
            os.makedirs(export_dir, exist_ok=True)
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(all_reports if len(all_reports) > 1 else all_reports[0], f, ensure_ascii=False, indent=2)
        print(f"[SUCCESS] 分析數據已成功匯出至: {export_path}")


if __name__ == "__main__":
    main()
