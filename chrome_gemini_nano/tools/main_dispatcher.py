# -*- coding: utf-8 -*-
"""
Local Nano Tool Hub - 本地輕量微服務調度閘道
常駐於 127.0.0.1:8765，為 Chrome 擴充功能中台提供系統層執行肌肉 (檔案 I/O、RSS、API 分發)

@related ../chrome_gemini_nano_README.md       (核心模組導航)
@related ./rss_generator.py                    (下游工具: append_rss)
@related ./local_dedup.py                      (下游工具: check_dedup)
@related ./social_publisher.py                 (下游工具: publish_x / publish_threads)
@related ./markdown_archiver.py                (下游工具: save_markdown)
@related ../../0.doc_mg/docs/cross_plugin_contract.md (契約: LOCAL_TOOL_PROXY)
"""

import sys
import logging
from pathlib import Path
from typing import Any, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# 確保可正確引用同目錄工具腳本
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("NanoDispatcher")

app = FastAPI(
    title="Chrome Plus Local Nano Dispatcher",
    description="Local execution bridge for Chrome Extension & Gemini Nano",
    version="1.0.0"
)

# 允許本機 Chrome Extension (chrome-extension://*) 跨域通訊
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ToolRequest(BaseModel):
    tool_name: str
    payload: Dict[str, Any]

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "main_dispatcher",
        "port": 8765,
        "supported_tools": [
            "append_rss",
            "check_dedup",
            "publish_x",
            "publish_threads",
            "save_markdown",
            "sync_google",
            "flush_google_queue"
        ]
    }

@app.post("/exec")
async def execute_tool(req: ToolRequest):
    name = req.tool_name
    data = req.payload
    logger.info(f"⚡ 收到工具調度請求: [{name}]")

    try:
        if name == "append_rss":
            from rss_generator import append_rss_item
            title = data.get("title", "")
            summary = data.get("summary", "")
            url = data.get("url", "")
            return append_rss_item(title, summary, url)

        elif name == "check_dedup":
            from local_dedup import check_duplicate
            text = data.get("text", "")
            threshold = float(data.get("threshold", 0.65))
            return check_duplicate(text, threshold)

        elif name == "publish_x":
            from social_publisher import post_to_x
            text = data.get("text", "")
            return post_to_x(text)

        elif name == "publish_threads":
            from social_publisher import post_to_threads
            text = data.get("text", "")
            return post_to_threads(text)

        elif name == "save_markdown":
            from markdown_archiver import save_markdown_note
            return save_markdown_note(
                title=data.get("title", "Untitled"),
                content=data.get("content", ""),
                url=data.get("url", ""),
                tags=data.get("tags", [])
            )

        elif name == "sync_google":
            from google_sync_worker import sync_to_google
            gas_url = data.get("gas_webhook_url", "")
            action = data.get("action", "")
            payload = data.get("payload", {})
            auto_flush = data.get("auto_flush", True)
            return sync_to_google(gas_url, action, payload, auto_flush=auto_flush)

        elif name == "flush_google_queue":
            from google_sync_worker import flush_offline_queue
            gas_url = data.get("gas_webhook_url", "")
            return flush_offline_queue(gas_url)

        else:
            logger.warning(f"⚠️ 未知的工具指令: {name}")
            raise HTTPException(status_code=400, detail=f"未知的工具指令: {name}")

    except ImportError as ie:
        logger.warning(f"工具模組尚未載入或檔案建立中: {ie}")
        return {
            "status": "warning",
            "message": f"工具模組尚未載入或檔案建立中: {ie}",
            "tool": name
        }
    except Exception as e:
        logger.error(f"工具執行失敗 [{name}]: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"工具執行失敗 [{name}]: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 啟動 Chrome Plus 本機工具中樞: http://127.0.0.1:8765")
    uvicorn.run(app, host="127.0.0.1", port=8765)
