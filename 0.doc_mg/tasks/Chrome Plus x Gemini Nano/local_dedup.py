# -*- coding: utf-8 -*-
"""
Local Deduplication Checker - 本機歷史貼文語意防重比對器
讀取 data/social_history.json，利用 SequenceMatcher 計算與近 50 篇發文的重合度
門檻 >= 0.65 時判定為重複並發出預警

@related ./chrome_plus_x_gemini_nano.md  (核心任務看板 Phase 2.5)
@related ./main_dispatcher.py            (上游: 路由閘道 check_dedup)
@related ./social_publisher.py           (協作: 發布前調用防重)
@related ./SocialDispatcher.tsx           (前端: UI 顯示防重結果)
"""

import json
import logging
from difflib import SequenceMatcher
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any

BASE_DIR = Path(__file__).resolve().parent.parent
HISTORY_FILE = BASE_DIR / "data" / "social_history.json"

logger = logging.getLogger("LocalDedup")

def check_duplicate(text: str, threshold: float = 0.65) -> Dict[str, Any]:
    """
    計算新草稿與歷史貼文之相似度
    """
    if not text or not text.strip():
        return {"is_duplicate": False, "similarity": 0.0, "message": "空白文字跳過比對"}

    if not HISTORY_FILE.exists():
        HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        HISTORY_FILE.write_text("[]", encoding="utf-8")
        return {"is_duplicate": False, "similarity": 0.0}

    try:
        raw = HISTORY_FILE.read_text(encoding="utf-8")
        history = json.loads(raw)
    except Exception as e:
        logger.warning(f"歷史記錄讀取失敗，重建空列表: {e}")
        history = []

    clean_new = text.strip()
    max_sim = 0.0
    matched_entry = ""

    # 比對近 50 則歷史貼文
    for item in history[-50:]:
        past_text = item.get("content", "").strip()
        if not past_text:
            continue
        sim = SequenceMatcher(None, clean_new, past_text).ratio()
        if sim > max_sim:
            max_sim = sim
            matched_entry = past_text

    is_dup = max_sim >= threshold
    return {
        "is_duplicate": is_dup,
        "similarity": round(max_sim, 3),
        "matched_sample": matched_entry[:120] if is_dup else None,
        "threshold": threshold,
        "message": f"檢測完成，最高重合度: {round(max_sim * 100, 1)}%"
    }

def record_history(text: str, platform: str = "X", url: str = "") -> Dict[str, Any]:
    """
    將新發布成功的貼文記錄至歷史庫
    """
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    history = []
    if HISTORY_FILE.exists():
        try:
            history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except Exception:
            history = []

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "platform": platform,
        "content": text.strip(),
        "url": url
    }
    history.append(entry)

    # 保留最近 100 篇
    if len(history) > 100:
        history = history[-100:]

    HISTORY_FILE.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"status": "success", "total_records": len(history)}

if __name__ == "__main__":
    test_text = "Stablecoins aren't just crypto collateral—they've become Washington's global sponge for deficit financing."
    record_history(test_text, "X")
    print(check_duplicate(test_text))