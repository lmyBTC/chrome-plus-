# -*- coding: utf-8 -*-
"""
Google Sync Worker - 本地微服務與 Google 雲端同步橋接模組
支援向 Google Apps Script (GAS) 發送結構化資料，並內建離線佇列與故障重試機制

@related ./main_dispatcher.py (上游: 路由閘道 sync_google)
@related ../../0.doc_mg/docs/gas_deployment_guide.md (GAS 部署規範)
"""

import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import urllib.request
import urllib.error

logger = logging.getLogger("GoogleSyncWorker")

CURRENT_DIR = Path(__file__).resolve().parent
QUEUE_FILE = CURRENT_DIR / "google_sync_queue.json"


def _read_queue() -> List[Dict[str, Any]]:
    """讀取本地離線重試佇列"""
    if not QUEUE_FILE.exists():
        return []
    try:
        with open(QUEUE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.warning(f"讀取離線佇列檔案失敗: {e}")
        return []


def _write_queue(items: List[Dict[str, Any]]) -> None:
    """寫入本地離線重試佇列"""
    try:
        with open(QUEUE_FILE, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"寫入離線佇列檔案失敗: {e}")


def _send_request(gas_url: str, req_body: Dict[str, Any], timeout: int = 10) -> Dict[str, Any]:
    """
    使用 Python 原生 urllib 發送 HTTP POST 請求至 GAS Web App
    原生實作避免額外相依 requests 套件，提升相容性
    """
    json_bytes = json.dumps(req_body).encode("utf-8")
    req = urllib.request.Request(
        gas_url,
        data=json_bytes,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=timeout) as response:
        resp_data = response.read().decode("utf-8")
        try:
            return json.loads(resp_data)
        except json.JSONDecodeError:
            return {"status": "success", "raw_response": resp_data}


def flush_offline_queue(gas_url: str) -> Dict[str, Any]:
    """重試並清空本地離線佇列中積壓的同步任務"""
    queue = _read_queue()
    if not queue:
        return {"status": "success", "flushed_count": 0, "remaining_count": 0}

    logger.info(f"🔄 開始清理本機離線重試佇列 (共 {len(queue)} 筆)...")
    remaining: List[Dict[str, Any]] = []
    flushed_count = 0

    for item in queue:
        action = item.get("action")
        payload = item.get("payload")
        retries = item.get("retries", 0)

        # 超過 5 次重試則放棄，避免毒丸任務阻塞
        if retries >= 5:
            logger.warning(f"⚠️ 任務超過最大重試次數 (5 次)，已捨棄: {item.get('id')}")
            continue

        try:
            res = _send_request(gas_url, {"action": action, "payload": payload}, timeout=10)
            if res.get("status") == "success":
                flushed_count += 1
                logger.info(f"✅ 離線任務補送成功: [{action}]")
            else:
                item["retries"] = retries + 1
                remaining.append(item)
        except Exception as e:
            logger.warning(f"離線任務重試失敗 [{action}]: {e}")
            item["retries"] = retries + 1
            remaining.append(item)

    _write_queue(remaining)
    return {
        "status": "success",
        "flushed_count": flushed_count,
        "remaining_count": len(remaining)
    }


def sync_to_google(
    gas_url: str,
    action: str,
    payload: Dict[str, Any],
    auto_flush: bool = True
) -> Dict[str, Any]:
    """
    向 Google Apps Script 發送同步請求
    若發生網路中斷或超時，自動加入本地離線重試佇列
    """
    if not gas_url or not gas_url.strip():
        return {
            "status": "error",
            "message": "未配置有效的 gas_webhook_url"
        }

    gas_url = gas_url.strip()
    req_body = {
        "action": action,
        "payload": payload
    }

    try:
        # 1. 嘗試直接發送
        res = _send_request(gas_url, req_body, timeout=10)
        
        # 2. 發送成功後，嘗試補送積壓的離線任務
        if auto_flush and res.get("status") == "success":
            flush_res = flush_offline_queue(gas_url)
            res["offline_queue_flushed"] = flush_res.get("flushed_count", 0)

        return res

    except (urllib.error.URLError, TimeoutError, Exception) as net_err:
        logger.warning(f"連線至 Google 雲端失敗，轉入離線佇列: {net_err}")
        
        # 3. 失敗轉入本機離線佇列
        queue = _read_queue()
        queue_item = {
            "id": f"sync-{int(time.time() * 1000)}",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "action": action,
            "payload": payload,
            "retries": 0,
            "last_error": str(net_err)
        }
        queue.append(queue_item)
        _write_queue(queue)

        return {
            "status": "queued",
            "message": f"雲端連線失敗 ({net_err})，任務已暫存至本機離線重試佇列",
            "queue_id": queue_item["id"],
            "queue_len": len(queue)
        }
