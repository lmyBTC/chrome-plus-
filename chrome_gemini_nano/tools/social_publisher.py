# -*- coding: utf-8 -*-
"""
Social Publisher - X (Twitter) API v2 與 Meta Threads Graph API 發布代理
支援本機環境變數配置、發布防護、憑證不足時自動降級 Dry-Run 以及歷史發文自動存證

@related ../chrome_gemini_nano_README.md  (核心模組導航)
@related ./main_dispatcher.py            (上游: 路由閘道 publish_x / publish_threads)
@related ./local_dedup.py                (協作: 發布前防重比對)
"""

import os
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional

try:
    import requests
except ImportError:
    requests = None

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
ENV_FILE = BASE_DIR / ".env"

logger = logging.getLogger("SocialPublisher")

# 嘗試讀取本機 .env 檔案 (若未安裝 python-dotenv 則手動讀取)
if ENV_FILE.exists():
    try:
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))
    except Exception as e:
        logger.warning(f"讀取 .env 失敗: {e}")

def _record_post_history(text: str, platform: str, url: str = "") -> None:
    """自動調用 local_dedup.py 紀錄歷史發文庫以供後續去重比對"""
    try:
        from local_dedup import record_history
        record_history(text=text, platform=platform, url=url)
    except Exception as e:
        logger.warning(f"紀錄歷史發文失敗 (非致命): {e}")

def post_to_x(text: str, url: str = "") -> Dict[str, Any]:
    """
    調用 X API v2 發布推文 (POST https://api.twitter.com/2/tweets)
    若未配置憑證則自動進入 Dry-Run 模式，安全返回模擬發布結果
    """
    if not text or not text.strip():
        return {"status": "error", "message": "推文內容不可為空"}

    clean_text = text.strip()
    bearer_token = os.getenv("TWITTER_BEARER_TOKEN")
    api_key = os.getenv("TWITTER_API_KEY")
    api_secret = os.getenv("TWITTER_API_SECRET")
    access_token = os.getenv("TWITTER_ACCESS_TOKEN")
    access_secret = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")

    # 若缺少必要憑證，自動進入 Dry-run 模擬模式
    if not (bearer_token or (api_key and access_token)):
        logger.info("ℹ️ 未偵測到 TWITTER API 憑證，以 Dry-Run 模式執行")
        _record_post_history(clean_text, platform="X (Dry-Run)", url=url)
        return {
            "status": "dry_run",
            "platform": "X",
            "message": "⚠️ 未配置 TWITTER 憑證，已記錄至本地歷史庫並模擬發布成功",
            "character_count": len(clean_text),
            "preview": clean_text[:140] + ("..." if len(clean_text) > 140 else ""),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    if not requests:
        return {"status": "error", "message": "缺少 requests 依賴，請執行 pip install requests"}

    endpoint = "https://api.twitter.com/2/tweets"
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(endpoint, json={"text": clean_text}, headers=headers, timeout=10)
        res_data = response.json()

        if response.status_code in (200, 201):
            tweet_id = res_data.get("data", {}).get("id", "")
            tweet_url = f"https://x.com/i/web/status/{tweet_id}" if tweet_id else ""
            _record_post_history(clean_text, platform="X", url=tweet_url)
            return {
                "status": "success",
                "platform": "X",
                "tweet_id": tweet_id,
                "tweet_url": tweet_url,
                "message": "✅ X 貼文直發成功"
            }
        else:
            logger.error(f"X API 回傳錯誤 [{response.status_code}]: {res_data}")
            return {
                "status": "error",
                "platform": "X",
                "status_code": response.status_code,
                "detail": res_data
            }
    except Exception as e:
        logger.error(f"呼叫 X API 失敗: {e}", exc_info=True)
        return {"status": "error", "platform": "X", "message": str(e)}

def post_to_threads(text: str, url: str = "") -> Dict[str, Any]:
    """
    調用 Meta Threads Graph API 兩階段發布：
    1. 建立 Media Container (media_type=TEXT)
    2. 發布 Container 獲得正式 Post ID
    """
    if not text or not text.strip():
        return {"status": "error", "message": "Threads 貼文內容不可為空"}

    clean_text = text.strip()
    access_token = os.getenv("THREADS_ACCESS_TOKEN")
    user_id = os.getenv("THREADS_USER_ID")

    if not access_token or not user_id:
        logger.info("ℹ️️ 未偵測到 THREADS_ACCESS_TOKEN 或 THREADS_USER_ID，以 Dry-Run 模式執行")
        _record_post_history(clean_text, platform="Threads (Dry-Run)", url=url)
        return {
            "status": "dry_run",
            "platform": "Threads",
            "message": "⚠️ 未配置 Threads 憑證，已記錄至本地歷史庫並模擬發布成功",
            "character_count": len(clean_text),
            "preview": clean_text[:140] + ("..." if len(clean_text) > 140 else ""),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    if not requests:
        return {"status": "error", "message": "缺少 requests 依賴，請執行 pip install requests"}

    try:
        container_url = f"https://graph.threads.net/v1.0/{user_id}/threads"
        container_payload = {
            "media_type": "TEXT",
            "text": clean_text,
            "access_token": access_token
        }
        c_res = requests.post(container_url, data=container_payload, timeout=10)
        c_data = c_res.json()
        creation_id = c_data.get("id")

        if not creation_id:
            logger.error(f"建立 Threads Container 失敗: {c_data}")
            return {"status": "error", "platform": "Threads", "step": "container_creation", "detail": c_data}

        publish_url = f"https://graph.threads.net/v1.0/{user_id}/threads_publish"
        publish_payload = {
            "creation_id": creation_id,
            "access_token": access_token
        }
        p_res = requests.post(publish_url, data=publish_payload, timeout=10)
        p_data = p_res.json()
        published_post_id = p_data.get("id")

        if published_post_id:
            threads_url = f"https://www.threads.net/post/{published_post_id}"
            _record_post_history(clean_text, platform="Threads", url=threads_url)
            return {
                "status": "success",
                "platform": "Threads",
                "post_id": published_post_id,
                "url": threads_url,
                "message": "✅ Threads 貼文發布成功"
            }
        else:
            logger.error(f"發布 Threads Container 失敗: {p_data}")
            return {"status": "error", "platform": "Threads", "step": "container_publish", "detail": p_data}

    except Exception as e:
        logger.error(f"呼叫 Threads API 失敗: {e}", exc_info=True)
        return {"status": "error", "platform": "Threads", "message": str(e)}

if __name__ == "__main__":
    test_tweet = "Testing local social publisher agent pipeline with dry-run fallback."
    print("Testing X:", post_to_x(test_tweet))
    print("Testing Threads:", post_to_threads("測試本機 Threads 直發代理管線。"))
