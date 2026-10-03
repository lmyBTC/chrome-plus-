#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
0.doc_mg/tests/test_cross_plugin_e2e.py
跨插件通訊、UniversalTaskPayload v2.3 與 Service Worker 休眠 Outbox 佇列端對端模擬驗證
"""

import sys
import time
from typing import Dict, Any, List, Optional

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

HUB_EXTENSION_ID = "ahiihabnbjeoeneahcgbdcofncjoclcp"
FINANCE_CLIPPER_ID = "imnnkgiglcbjknfbkdfocdhoookkipji"

class MockChromeStorage:
    def __init__(self):
        self._data: Dict[str, Any] = {}

    def get(self, keys: List[str]) -> Dict[str, Any]:
        return {k: self._data.get(k) for k in keys}

    def set(self, items: Dict[str, Any]):
        self._data.update(items)

    def clear(self):
        self._data.clear()

class MockHubWorker:
    """模擬 ScrumClock Hub Background Service Worker"""
    def __init__(self, storage: MockChromeStorage):
        self.storage = storage
        self.is_alive = True
        self.received_tasks = []

    def set_awake_state(self, is_alive: bool):
        self.is_alive = is_alive

    def handle_external_message(self, sender_id: str, message: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_alive:
            raise ConnectionError("Receiving end does not exist. (Service Worker Sleeping)")

        msg_type = message.get("type")
        if msg_type == "PING_HUB":
            return {
                "success": True,
                "ack": True,
                "hub": "ScrumClock",
                "version": "2.3.0",
                "extensionId": HUB_EXTENSION_ID,
                "capabilities": ["AI_SUMMARY", "CREATE_TASK", "COLLECT_NOTE", "POMODORO_LOOP", "WORKSPACE_SYNC", "GTD_CAPTURE"],
                "supportedProtocols": [1, 2],
                "aiAvailable": True,
                "timestamp": int(time.time() * 1000)
            }

        if msg_type == "CREATE_TASK":
            payload = message.get("payload", {})
            title = payload.get("title")
            ticker = payload.get("ticker")
            if not title and not ticker:
                return {"success": False, "ack": False, "error": "缺少任務標題"}

            task_id = f"mission-{int(time.time() * 1000)}"
            new_mission = {
                "id": task_id,
                "text": title,
                "ticker": ticker,
                "gtdContext": payload.get("gtdContext", "@Focus"),
                "priority": payload.get("priority", "P1"),
                "sourcePlugin": payload.get("sourcePlugin", "FINANCE_CLIPPER"),
                "workspaceSync": payload.get("workspaceSync"),
                "notes": payload.get("notes", ""),
                "estimatedPomodoros": payload.get("estimatedPomodoros", 2)
            }
            self.received_tasks.append(new_mission)
            return {
                "success": True,
                "ack": True,
                "taskId": task_id,
                "duplicate": False
            }

        return {"success": False, "ack": False, "error": f"不支援的協議類型: {msg_type}"}

class MockSpokeOutboxClient:
    """模擬 Spoke 插件 (FinanceClipper / VideoSpeedPlus) 之 Outbox 佇列調度器"""
    STORAGE_KEY_OUTBOX = "outbox_queue"
    STORAGE_KEY_DEAD_LETTER = "dead_letter_queue"

    def __init__(self, storage: MockChromeStorage, hub: MockHubWorker):
        self.storage = storage
        self.hub = hub
        self.max_retries = 3
        self.ttl_ms = 86400000

    def sanitize_task_payload(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """實作與 aiClient.js 相同之防腐層"""
        ticker = str(raw.get("ticker", "")).strip().upper() if raw.get("ticker") else None
        title = str(raw.get("title", "")).strip() if raw.get("title") else (f"{ticker} 投資研報分析" if ticker else "未命名任務")
        valid_gtd = {"@Focus", "@Meeting", "@Review", "@Waiting-For", "@Blocked"}
        gtd_context = raw.get("gtdContext") if raw.get("gtdContext") in valid_gtd else "@Focus"
        valid_p = {"P1", "P2", "P3"}
        priority = raw.get("priority") if raw.get("priority") in valid_p else "P1"

        deep_link = raw.get("deepLinkUrl") or (f"chrome-extension://{FINANCE_CLIPPER_ID}/dashboard.html?ticker={ticker}" if ticker else None)
        return {
            "protocolVersion": 2,
            "ticker": ticker,
            "title": title,
            "notes": raw.get("notes", ""),
            "tags": raw.get("tags", ["#投資研究"]),
            "estimatedPomodoros": raw.get("estimatedPomodoros", 2),
            "url": raw.get("url") or deep_link,
            "deepLinkUrl": deep_link,
            "gtdContext": gtd_context,
            "priority": priority,
            "sourcePlugin": raw.get("sourcePlugin", "FINANCE_CLIPPER"),
            "workspaceSync": raw.get("workspaceSync"),
            "createdAt": raw.get("createdAt", int(time.time() * 1000))
        }

    def enqueue_outbox(self, payload: Dict[str, Any], target_id: str, error_msg: str) -> Dict[str, Any]:
        data = self.storage.get([self.STORAGE_KEY_OUTBOX])
        queue = data.get(self.STORAGE_KEY_OUTBOX) or []
        item = {
            "id": f"outbox-{int(time.time() * 1000)}",
            "targetExtensionId": target_id,
            "type": "CREATE_TASK",
            "payload": payload,
            "protocolVersion": 2,
            "retryCount": 0,
            "maxRetries": self.max_retries,
            "createdAt": int(time.time() * 1000),
            "lastAttemptAt": int(time.time() * 1000),
            "lastError": error_msg,
            "ttlMs": self.ttl_ms
        }
        queue.append(item)
        self.storage.set({self.STORAGE_KEY_OUTBOX: queue})
        return item

    def send_task(self, raw_task: Dict[str, Any]) -> Dict[str, Any]:
        payload = self.sanitize_task_payload(raw_task)
        try:
            res = self.hub.handle_external_message(
                FINANCE_CLIPPER_ID,
                {"protocolVersion": 2, "type": "CREATE_TASK", "payload": payload}
            )
            if not res or not res.get("ack"):
                self.enqueue_outbox(payload, HUB_EXTENSION_ID, "中樞未回傳 ACK")
                return {"success": False, "ack": False, "queued": True}
            return res
        except ConnectionError as e:
            self.enqueue_outbox(payload, HUB_EXTENSION_ID, str(e))
            return {"success": False, "ack": False, "queued": True, "error": str(e)}

    def process_outbox_retry(self) -> int:
        """模擬 chrome.alarms 與 tabs.onActivated 觸發之重試調度器"""
        data = self.storage.get([self.STORAGE_KEY_OUTBOX, self.STORAGE_KEY_DEAD_LETTER])
        queue: List[Dict[str, Any]] = data.get(self.STORAGE_KEY_OUTBOX) or []
        dead_letter: List[Dict[str, Any]] = data.get(self.STORAGE_KEY_DEAD_LETTER) or []

        remaining = []
        sent_count = 0
        now = int(time.time() * 1000)

        for item in queue:
            # 檢查 TTL
            if (now - item["createdAt"]) > item["ttlMs"]:
                dead_letter.append({
                    "id": f"dead-{now}",
                    "originalMessage": item,
                    "failedAt": now,
                    "reason": "TTL 存活時間已逾期",
                    "retryCount": item["retryCount"]
                })
                continue

            # 嘗試發送
            try:
                res = self.hub.handle_external_message(
                    FINANCE_CLIPPER_ID,
                    {"protocolVersion": item["protocolVersion"], "type": item["type"], "payload": item["payload"]}
                )
                if res and res.get("ack"):
                    sent_count += 1
                    continue  # 成功收悉，自隊列中移除
            except ConnectionError as e:
                item["lastError"] = str(e)

            # 發送失敗，遞增重試計數
            item["retryCount"] += 1
            item["lastAttemptAt"] = now

            if item["retryCount"] >= item["maxRetries"]:
                dead_letter.append({
                    "id": f"dead-{now}",
                    "originalMessage": item,
                    "failedAt": now,
                    "reason": f"超過最大重試次數 ({item['maxRetries']})",
                    "retryCount": item["retryCount"]
                })
            else:
                remaining.append(item)

        self.storage.set({
            self.STORAGE_KEY_OUTBOX: remaining,
            self.STORAGE_KEY_DEAD_LETTER: dead_letter
        })
        return sent_count

def run_e2e_tests():
    print("[E2E 測試 1/4] 測試 PING_HUB 自動握手協議...")
    storage = MockChromeStorage()
    hub = MockHubWorker(storage)
    handshake = hub.handle_external_message(FINANCE_CLIPPER_ID, {"type": "PING_HUB"})
    assert handshake["success"] is True and handshake["ack"] is True
    assert "CREATE_TASK" in handshake["capabilities"]
    assert "GTD_CAPTURE" in handshake["capabilities"]
    assert "WORKSPACE_SYNC" in handshake["capabilities"]
    print("  -> PING_HUB 握手與 Capability 發現成功 PASS")

    print("[E2E 測試 2/4] 測試 UniversalTaskPayload v2.3 資料防腐層與即時派送...")
    client = MockSpokeOutboxClient(storage, hub)
    task_input = {
        "ticker": "nvda",
        "title": "NVDA 深度投研",
        "notes": "Blackwell 供應鏈進展",
        "gtdContext": "@Focus",
        "priority": "P1",
        "sourcePlugin": "FINANCE_CLIPPER",
        "workspaceSync": {
            "googleTaskId": "gtask-999",
            "syncStatus": "synced"
        }
    }
    res = client.send_task(task_input)
    assert res["success"] is True and res["ack"] is True
    assert len(hub.received_tasks) == 1
    created_task = hub.received_tasks[0]
    assert created_task["ticker"] == "NVDA"
    assert created_task["gtdContext"] == "@Focus"
    assert created_task["priority"] == "P1"
    assert created_task["workspaceSync"]["googleTaskId"] == "gtask-999"
    print("  -> UniversalTaskPayload v2.3 即時派送與 Hub 解析成功 PASS")

    print("[E2E 測試 3/4] 測試 Service Worker 休眠時寫入 Outbox 佇列與喚醒後自動重試補發...")
    # 模擬 Service Worker 休眠
    hub.set_awake_state(False)
    offline_task = {
        "ticker": "tsm",
        "title": "TSM 資本支出與先進製程追蹤",
        "gtdContext": "@Meeting",
        "priority": "P2"
    }
    offline_res = client.send_task(offline_task)
    assert offline_res["success"] is False
    assert offline_res["queued"] is True

    # 檢查 Outbox 佇列是否正確暫存該筆任務
    outbox_data = storage.get(["outbox_queue"])["outbox_queue"]
    assert len(outbox_data) == 1
    assert outbox_data[0]["payload"]["ticker"] == "TSM"
    assert outbox_data[0]["payload"]["gtdContext"] == "@Meeting"
    print("  -> Service Worker 休眠時無縫降級暫存至 Outbox PASS")

    # 模擬重試但 Hub 仍休眠
    sent = client.process_outbox_retry()
    assert sent == 0
    assert storage.get(["outbox_queue"])["outbox_queue"][0]["retryCount"] == 1

    # 模擬 Service Worker 喚醒
    hub.set_awake_state(True)
    sent = client.process_outbox_retry()
    assert sent == 1
    assert len(storage.get(["outbox_queue"])["outbox_queue"]) == 0
    assert any(t["ticker"] == "TSM" for t in hub.received_tasks)
    print("  -> Service Worker 喚醒後 Outbox 重試派發與收悉 ACK 清除佇列 PASS")

    print("[E2E 測試 4/4] 測試超過最大重試次數轉入 Dead-Letter 隊列...")
    hub.set_awake_state(False)
    client.send_task({"ticker": "aapl", "title": "AAPL Vision Pro 分析"})
    # 連續失敗重試直至上限
    for _ in range(client.max_retries):
        client.process_outbox_retry()

    dead_letter_data = storage.get(["dead_letter_queue"])["dead_letter_queue"]
    assert len(dead_letter_data) >= 1
    assert dead_letter_data[0]["originalMessage"]["payload"]["ticker"] == "AAPL"
    assert "超過最大重試次數" in dead_letter_data[0]["reason"]
    print("  -> Dead-Letter 隊列隔離保護機制 PASS")

if __name__ == "__main__":
    print("================ 開始執行跨插件端對端通訊與 Outbox 重試模擬 ================")
    run_e2e_tests()
    print("================ 端對端通訊與 Outbox 防丟驗證全數通過 (ALL PASS) ================")
