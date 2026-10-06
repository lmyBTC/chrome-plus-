#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1.devtools/tools/validate_contract.py
Chrome 多插件工作區：跨插件通訊合約與快照 JSON Schema 自動校驗器 (SSOT Validator)

規範來源: 0.doc_mg/docs/cross_plugin_contract.md
支援協議類型:
  - AI_GENERATE_FINANCE_SUMMARY (FinanceClipper -> ScrumClock)
  - CREATE_TASK (FinanceClipper -> ScrumClock)
  - FOCUS_STARTED (ScrumClock -> FinanceClipper)
  - COLLECT_NOTE (VideoSpeedPlus -> ScrumClock)
  - CLIPPER_SNAPSHOT / MINER_SCHEMA (FinanceClipper 數據快照)
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, List, Tuple, Optional

# UTF-8 輸出防亂碼相容性處理
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

class ValidationError:
    def __init__(self, path: str, message: str, is_warning: bool = False):
        self.path = path
        self.message = message
        self.is_warning = is_warning

    def __str__(self):
        prefix = "[WARN]" if self.is_warning else "[ERROR]"
        return f"{prefix} {self.path}: {self.message}"

class ContractValidator:
    """依據 cross_plugin_contract.md 執行純資料協議防禦性檢驗"""

    @staticmethod
    def detect_schema_type(data: Dict[str, Any]) -> str:
        """自動偵測 JSON 結構所屬協議或快照類型"""
        if not isinstance(data, dict):
            return "UNKNOWN"

        msg_type = data.get("type")
        if msg_type in ("AI_GENERATE_FINANCE_SUMMARY", "CREATE_TASK", "FOCUS_STARTED", "COLLECT_NOTE"):
            return msg_type

        # 快照格式判斷
        payload = data.get("payload", data)
        if isinstance(payload, dict):
            if "ticker" in payload and any(k in payload for k in ("price", "targetPrice", "target_price_median", "targetPriceStats", "stats")):
                return "CLIPPER_SNAPSHOT"

        return "UNKNOWN"

    @classmethod
    def validate(cls, data: Any, schema_type: Optional[str] = None, strict: bool = False) -> Tuple[bool, List[ValidationError]]:
        errors: List[ValidationError] = []

        if not isinstance(data, dict):
            errors.append(ValidationError("root", "JSON 根節點必須為物件 (Object/Dict)"))
            return False, errors

        if not schema_type or schema_type == "AUTO":
            schema_type = cls.detect_schema_type(data)

        if schema_type == "UNKNOWN":
            errors.append(ValidationError("root", "無法識別的協議訊息或快照類型，請確認包含合法 type 或欄位結構"))
            return False, errors

        # 協議訊息通則驗證 (含 protocolVersion)
        if schema_type in ("AI_GENERATE_FINANCE_SUMMARY", "CREATE_TASK", "FOCUS_STARTED", "COLLECT_NOTE"):
            pv = data.get("protocolVersion")
            if pv is None:
                errors.append(ValidationError("protocolVersion", "缺少協議版本號 (protocolVersion 應為整數，如 1)"))
            elif not isinstance(pv, int):
                errors.append(ValidationError("protocolVersion", f"協議版本號應為整數，收到: {type(pv).__name__}"))

            if "payload" not in data or not isinstance(data["payload"], dict):
                errors.append(ValidationError("payload", "缺少有效的 payload 物件"))
                return False, errors

            payload = data["payload"]
        else:
            payload = data.get("payload", data)

        # 分流具體規格校驗
        if schema_type == "AI_GENERATE_FINANCE_SUMMARY":
            cls._validate_finance_summary(payload, errors, strict)
        elif schema_type == "CREATE_TASK":
            cls._validate_create_task(payload, errors, strict)
        elif schema_type == "FOCUS_STARTED":
            cls._validate_focus_started(payload, errors, strict)
        elif schema_type == "COLLECT_NOTE":
            cls._validate_collect_note(payload, errors, strict)
        elif schema_type == "CLIPPER_SNAPSHOT":
            cls._validate_clipper_snapshot(payload, errors, strict)

        has_fatal = any(not e.is_warning for e in errors)
        return not has_fatal, errors

    @classmethod
    def _validate_finance_summary(cls, payload: Dict[str, Any], errors: List[ValidationError], strict: bool):
        allowed_keys = {"ticker", "name", "price", "stats", "analyst", "earnings", "note", "protocolVersion"}
        if strict:
            cls._check_extra_keys(payload, allowed_keys, errors, "payload")

        ticker = payload.get("ticker")
        if not ticker or not isinstance(ticker, str) or not ticker.strip():
            errors.append(ValidationError("payload.ticker", "必填欄位 ticker 缺失或非合法非空字串"))

        if "price" in payload and payload["price"] is not None and not isinstance(payload["price"], (str, int, float)):
            errors.append(ValidationError("payload.price", "price 必須為字串或數字"))

        if "stats" in payload and payload["stats"] is not None:
            if not isinstance(payload["stats"], dict):
                errors.append(ValidationError("payload.stats", "stats 必須為鍵值字典物件"))
            else:
                for k, v in payload["stats"].items():
                    if not isinstance(v, (str, int, float, bool)):
                        errors.append(ValidationError(f"payload.stats.{k}", f"統計指標值應為純量字串或數值，收到: {type(v).__name__}"))

        if "analyst" in payload and payload["analyst"] is not None:
            if not isinstance(payload["analyst"], dict):
                errors.append(ValidationError("payload.analyst", "analyst 必須為物件"))
            else:
                for target_key in ("targetLow", "targetMedian", "targetHigh"):
                    if target_key in payload["analyst"] and payload["analyst"][target_key] is not None:
                        val = payload["analyst"][target_key]
                        if not isinstance(val, (str, int, float)):
                            errors.append(ValidationError(f"payload.analyst.{target_key}", f"目標價必須為字串或數值"))

        if "earnings" in payload and payload["earnings"] is not None:
            if not isinstance(payload["earnings"], dict):
                errors.append(ValidationError("payload.earnings", "earnings 必須為物件"))

    @classmethod
    def _validate_create_task(cls, payload: Dict[str, Any], errors: List[ValidationError], strict: bool):
        allowed_keys = {
            "id", "ticker", "title", "notes", "tags", "estimatedPomodoros",
            "url", "deepLinkUrl", "protocolVersion", "gtdContext", "priority",
            "workspaceSync", "sourcePlugin", "createdAt"
        }
        if strict:
            cls._check_extra_keys(payload, allowed_keys, errors, "payload")

        title = payload.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            errors.append(ValidationError("payload.title", "必填欄位 title 缺失或為空"))

        if "deepLinkUrl" in payload and payload["deepLinkUrl"] is not None:
            if not isinstance(payload["deepLinkUrl"], str) or not payload["deepLinkUrl"].strip():
                errors.append(ValidationError("payload.deepLinkUrl", "deepLinkUrl 必須為合法非空字串"))

        if "estimatedPomodoros" in payload and payload["estimatedPomodoros"] is not None:
            pomodoro = payload["estimatedPomodoros"]
            if not isinstance(pomodoro, int) or pomodoro <= 0:
                errors.append(ValidationError("payload.estimatedPomodoros", "estimatedPomodoros 應為大於 0 之整數"))

        if "tags" in payload and payload["tags"] is not None:
            if not isinstance(payload["tags"], list):
                errors.append(ValidationError("payload.tags", "tags 必須為字串陣列 (list of strings)"))
            else:
                for idx, t in enumerate(payload["tags"]):
                    if not isinstance(t, str):
                        errors.append(ValidationError(f"payload.tags[{idx}]", "tag 標籤項目必須為字串"))

        # v2.3 GTD Context 規範校驗
        if "gtdContext" in payload and payload["gtdContext"] is not None:
            valid_gtd = {"@Focus", "@Meeting", "@Review", "@Waiting-For", "@Blocked"}
            if payload["gtdContext"] not in valid_gtd:
                errors.append(ValidationError("payload.gtdContext", f"gtdContext 必須為 {valid_gtd} 其中之一，收到: {payload['gtdContext']}"))

        # v2.3 Priority 規範校驗
        if "priority" in payload and payload["priority"] is not None:
            valid_p = {"P1", "P2", "P3"}
            if payload["priority"] not in valid_p:
                errors.append(ValidationError("payload.priority", f"priority 必須為 {valid_p} 其中之一，收到: {payload['priority']}"))

        # v2.3 來源插件校驗
        if "sourcePlugin" in payload and payload["sourcePlugin"] is not None:
            if not isinstance(payload["sourcePlugin"], str) or not payload["sourcePlugin"].strip():
                errors.append(ValidationError("payload.sourcePlugin", "sourcePlugin 應為非空字串"))

        # v2.3 Google Workspace 同步結構校驗
        if "workspaceSync" in payload and payload["workspaceSync"] is not None:
            if not isinstance(payload["workspaceSync"], dict):
                errors.append(ValidationError("payload.workspaceSync", "workspaceSync 必須為物件 (dict)"))
            else:
                ws = payload["workspaceSync"]
                if "syncStatus" in ws and ws["syncStatus"] is not None:
                    valid_status = {"synced", "pending", "failed", "idle"}
                    if ws["syncStatus"] not in valid_status:
                        errors.append(ValidationError("payload.workspaceSync.syncStatus", f"syncStatus 應為 {valid_status} 之一"))
                if "lastSyncedAt" in ws and ws["lastSyncedAt"] is not None:
                    if not isinstance(ws["lastSyncedAt"], (int, float)):
                        errors.append(ValidationError("payload.workspaceSync.lastSyncedAt", "lastSyncedAt 應為時間戳數值"))

    @classmethod
    def _validate_focus_started(cls, payload: Dict[str, Any], errors: List[ValidationError], strict: bool):
        allowed_keys = {"ticker", "missionText", "tags", "protocolVersion"}
        if strict:
            cls._check_extra_keys(payload, allowed_keys, errors, "payload")

        ticker = payload.get("ticker")
        if not ticker or not isinstance(ticker, str) or not ticker.strip():
            errors.append(ValidationError("payload.ticker", "必填欄位 ticker 缺失或為空"))

        mission = payload.get("missionText")
        if not mission or not isinstance(mission, str) or not mission.strip():
            errors.append(ValidationError("payload.missionText", "必填欄位 missionText 缺失或為空"))

        if "tags" in payload and payload["tags"] is not None:
            if not isinstance(payload["tags"], list):
                errors.append(ValidationError("payload.tags", "tags 必須為字串陣列"))

    @classmethod
    def _validate_collect_note(cls, payload: Dict[str, Any], errors: List[ValidationError], strict: bool):
        allowed_keys = {"source", "title", "url", "currentTime", "text", "tags", "type", "protocolVersion"}
        if strict:
            cls._check_extra_keys(payload, allowed_keys, errors, "payload")

        for req in ("source", "title", "url", "currentTime", "text"):
            val = payload.get(req)
            if not val or not isinstance(val, str) or not val.strip():
                errors.append(ValidationError(f"payload.{req}", f"必填欄位 {req} 缺失或為空字串"))

        if "tags" in payload and payload["tags"] is not None and not isinstance(payload["tags"], list):
            errors.append(ValidationError("payload.tags", "tags 必須為陣列"))

    @classmethod
    def _validate_clipper_snapshot(cls, payload: Dict[str, Any], errors: List[ValidationError], strict: bool):
        ticker = payload.get("ticker") or payload.get("symbol")
        if not ticker or not isinstance(ticker, str) or not ticker.strip():
            errors.append(ValidationError("ticker", "快照缺少標的代號 ticker / symbol"))

        price = payload.get("price")
        if price is None:
            errors.append(ValidationError("price", "快照缺少現價 price 欄位"))
        elif not isinstance(price, (int, float, str)):
            errors.append(ValidationError("price", f"現價 price 型別不正確: {type(price).__name__}"))

        # 檢驗目標價統計物件 (如有提供)
        target_stats = payload.get("targetPriceStats")
        if target_stats is not None:
            if not isinstance(target_stats, dict):
                errors.append(ValidationError("targetPriceStats", "targetPriceStats 必須為字典物件"))
            else:
                for num_key in ("mean", "median", "high", "low", "upsidePercent", "stdDev", "cv"):
                    if num_key in target_stats and not isinstance(target_stats[num_key], (int, float)):
                        errors.append(ValidationError(f"targetPriceStats.{num_key}", f"數值統計量 {num_key} 應為數值"))

    @staticmethod
    def _check_extra_keys(obj: Dict[str, Any], allowed_keys: set, errors: List[ValidationError], prefix: str):
        extra = set(obj.keys()) - allowed_keys
        for k in extra:
            errors.append(ValidationError(f"{prefix}.{k}", f"未宣告的額外欄位 '{k}' (寬容讀者模式下將被忽略)", is_warning=True))

def process_file(file_path: str, schema_type: Optional[str] = None, strict: bool = False) -> Tuple[bool, List[ValidationError]]:
    if not os.path.exists(file_path):
        return False, [ValidationError(file_path, "檔案不存在")]

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as err:
        return False, [ValidationError(file_path, f"JSON 語法解析失敗: {err}")]
    except Exception as err:
        return False, [ValidationError(file_path, f"讀取異常: {err}")]

    return ContractValidator.validate(data, schema_type=schema_type, strict=strict)

def main():
    parser = argparse.ArgumentParser(description="Chrome 多插件跨通訊合約與快照 JSON 驗證器")
    parser.add_argument("paths", nargs="*", help="要校驗的 JSON 檔案路徑或目錄")
    parser.add_argument("--dir", "-d", help="批次掃描指定目錄下的所有 .json 檔案")
    parser.add_argument("--schema", "-s", default="AUTO", choices=["AUTO", "AI_GENERATE_FINANCE_SUMMARY", "CREATE_TASK", "FOCUS_STARTED", "COLLECT_NOTE", "CLIPPER_SNAPSHOT"], help="指定協議類型 (預設: AUTO 自動偵測)")
    parser.add_argument("--strict", action="store_true", help="啟用嚴格模式 (未宣告之多餘欄位視為警告/錯誤)")

    args = parser.parse_args()

    files_to_check: List[str] = []

    if args.dir:
        if not os.path.isdir(args.dir):
            print(f"[錯誤] 指定目錄不存在: {args.dir}")
            sys.exit(1)
        for root, _, files in os.walk(args.dir):
            for file in files:
                if file.endswith(".json"):
                    files_to_check.append(os.path.join(root, file))

    if args.paths:
        for p in args.paths:
            if os.path.isdir(p):
                for root, _, files in os.walk(p):
                    for file in files:
                        if file.endswith(".json"):
                            files_to_check.append(os.path.join(root, file))
            elif os.path.isfile(p):
                files_to_check.append(p)
            else:
                print(f"[警告] 路徑不存在或無法存取: {p}")

    if not files_to_check:
        print("[資訊] 未提供檔案或目錄，使用範例合約自我測試...")
        # 內建模擬合約自我測試
        sample_task = {
            "protocolVersion": 1,
            "type": "CREATE_TASK",
            "payload": {
                "ticker": "NVDA",
                "title": "深入研究 NVDA 財報與估值",
                "notes": "# 投資研報：NVDA ...",
                "tags": ["#投資研究", "#美股"],
                "estimatedPomodoros": 2,
                "url": "https://www.google.com/finance/quote/NVDA:NASDAQ"
            }
        }
        ok, errs = ContractValidator.validate(sample_task, strict=args.strict)
        print(f"自我測試結果: {'[通過 PASS]' if ok else '[失敗 FAIL]'}")
        for e in errs:
            print(f"  {e}")
        sys.exit(0 if ok else 1)

    total_count = len(files_to_check)
    passed_count = 0
    failed_count = 0

    print(f"\n================ 跨插件合約驗證器 (SSOT Validator) ================")
    print(f"檢查檔案數量: {total_count} | 嚴格模式: {args.strict} | 規格選擇: {args.schema}\n")

    for file_path in files_to_check:
        ok, errors = process_file(file_path, schema_type=args.schema, strict=args.strict)
        rel_path = os.path.relpath(file_path, os.getcwd()) if file_path.startswith(os.getcwd()) else file_path

        if ok:
            passed_count += 1
            warnings = [e for e in errors if e.is_warning]
            if warnings:
                print(f"[通過 PASS*] {rel_path} ({len(warnings)} 個警告)")
                for w in warnings:
                    print(f"    {w}")
            else:
                print(f"[通過 PASS]  {rel_path}")
        else:
            failed_count += 1
            print(f"[失敗 FAIL]  {rel_path}")
            for e in errors:
                print(f"    {e}")

    print(f"\n驗證統計: 總共 {total_count}，通過 {passed_count}，失敗 {failed_count}")
    print(f"===================================================================\n")

    sys.exit(0 if failed_count == 0 else 1)

if __name__ == "__main__":
    main()
