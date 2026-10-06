# 🧠 Gemini Nano 驅動本機 Python 工具箱：架構設計與腳本規格書

> **核心定位**：以 Chrome 內建「Gemini Nano」作為前端輕量決策大腦（Edge Intent & Text Engine），本機「Python 微服務」作為執行肌肉（Execution Engine），構建 0 成本、高隱私的自動化工作流閉環。

---

## 一、 系統協同架構 (Communication Architecture)

```
┌────────────────────────────────────────────────────────┐
│ Chrome 擴充功能中台 (ScrumClock Side Panel)             │
│                                                        │
│ 1. 抓取當前頁面 (DOM / 選取文字 / pulse.html)          │
│ 2. 呼叫本地 window.ai.languageModel (Gemini Nano)      │
│    - 提取意圖 (Intent Routing)                         │
│    - 結構化生成參數 JSON: { tool, action, payload }   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP POST http://127.0.0.1:8765/exec
                            ▼
┌────────────────────────────────────────────────────────┐
│ 本機 Python 輕量服務端 (FastAPI Dispatcher)            │
│                                                        │
│ 根據 Nano 輸出的 Tool 名稱路由分發至專屬工具腳本：    │
│ ├─ 工具 1: rss_generator.py (自動產出 feed.xml)        │
│ ├─ 工具 2: social_publisher.py (X & Threads 發布代理)   │
│ ├─ 工具 3: local_vector_dedup.py (歷史貼文去重比對)    │
│ └─ 工具 4: notion_sync.py (個人知識庫持久化)          │
└────────────────────────────────────────────────────────┘
```

---

## 二、 4 大核心 Python 工具腳本設計

### 工具 1：靜態 RSS Feed 自動維護器 (`rss_generator.py`)
* **作用**：當你在 `pulse.html` 發布了新的觀點或快訊，Nano 萃取出 `{ title, summary, date, url }` 後，Python 自動維護部落格根目錄的 `feed.xml`。
* **腳本特點**：讀取現有 XML、追加新項目、保留最新 20 則、自動格式化輸出。

```python
# tools/rss_generator.py
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

RSS_PATH = Path("dist/feed.xml")

def append_rss_item(title: str, summary: str, url: str) -> dict:
    now_rfc822 = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S +0000")
    
    # 若檔案不存在則初始化基礎框架
    if not RSS_PATH.exists():
        RSS_PATH.parent.mkdir(parents=True, exist_ok=True)
        root = ET.Element("rss", version="2.0")
        channel = ET.SubElement(root, "channel")
        ET.SubElement(channel, "title").text = "Mason Yang Pulse & Research"
        ET.SubElement(channel, "link").text = "https://masonyang-blog.github.io/"
        ET.SubElement(channel, "description").text = "Tech, Quant & Macro Insights"
        tree = ET.ElementTree(root)
    else:
        tree = ET.parse(RSS_PATH)
        channel = tree.find("channel")

    # 建立新 item
    item = ET.Element("item")
    ET.SubElement(item, "title").text = title
    ET.SubElement(item, "link").text = url
    ET.SubElement(item, "guid").text = url
    ET.SubElement(item, "pubDate").text = now_rfc822
    ET.SubElement(item, "description").text = summary

    # 插入到最前頭（保持最新）
    channel.insert(3, item)

    # 限制最多保留 30 則
    items = channel.findall("item")
    if len(items) > 30:
        for old_item in items[30:]:
            channel.remove(old_item)

    tree.write(RSS_PATH, encoding="utf-8", xml_declaration=True)
    return {"status": "success", "message": f"RSS updated with: {title}"}
```

---

### 工具 2：跨平台社群直接發布器 (`social_publisher.py`)
* **作用**：Nano 產出高品質的 `x_en` 與 `threads_zh` 文案，經由你在 Side Panel 確認（或全自動）後，Python 負責處理帶有簽名機制的 API 直發（或寫入排程資料庫）。

```python
# tools/social_publisher.py
import os
import requests

def post_to_x(text: str) -> dict:
    """調用 X API v2 發布推文 (需配置 Token)"""
    bearer_token = os.getenv("TWITTER_BEARER_TOKEN")
    if not bearer_token:
        return {"status": "dry_run", "platform": "X", "text": text}
    
    url = "https://api.twitter.com/2/tweets"
    headers = {"Authorization": f"Bearer {bearer_token}", "Content-Type": "application/json"}
    resp = requests.post(url, json={"text": text}, headers=headers)
    return resp.json()

def post_to_threads(text: str) -> dict:
    """調用 Meta Threads Graph API 兩階段容器發布"""
    access_token = os.getenv("THREADS_ACCESS_TOKEN")
    user_id = os.getenv("THREADS_USER_ID")
    if not access_token or not user_id:
        return {"status": "dry_run", "platform": "Threads", "text": text}
    
    # 步驟 1: 建立 Media Container
    container_url = f"https://graph.threads.net/v1.0/{user_id}/threads"
    c_res = requests.post(container_url, data={
        "media_type": "TEXT",
        "text": text,
        "access_token": access_token
    }).json()
    
    creation_id = c_res.get("id")
    if not creation_id:
        return {"status": "error", "detail": c_res}
    
    # 步驟 2: 發布 Container
    publish_url = f"https://graph.threads.net/v1.0/{user_id}/threads_publish"
    pub_res = requests.post(publish_url, data={
        "creation_id": creation_id,
        "access_token": access_token
    }).json()
    return {"status": "success", "platform": "Threads", "post_id": pub_res.get("id")}
```

---

### 工具 3：本機貼文相似度防重器 (`local_dedup.py`)
* **作用**：防止同一天或短期內發布過多重複論點。使用純本機輕量文字距離或 TF-IDF，秒級比對歷史發文庫。

```python
# tools/local_dedup.py
import json
from pathlib import Path
from difflib import SequenceMatcher

HISTORY_FILE = Path("data/social_history.json")

def check_duplicate(new_text: str, threshold: float = 0.65) -> dict:
    if not HISTORY_FILE.exists():
        HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        HISTORY_FILE.write_text("[]", encoding="utf-8")
        return {"is_duplicate": False, "max_similarity": 0.0}

    history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    max_sim = 0.0
    matched_entry = ""

    for item in history[-50:]:  # 僅比對近 50 則
        past_text = item.get("content", "")
        sim = SequenceMatcher(None, new_text, past_text).ratio()
        if sim > max_sim:
            max_sim = sim
            matched_entry = past_text

    is_dup = max_sim >= threshold
    return {
        "is_duplicate": is_dup,
        "similarity": round(max_sim, 2),
        "similar_sample": matched_entry[:100] if is_dup else None
    }
```

---

### 工具 4：本機總度排程與統一分發閘道 (`main_dispatcher.py`)
* 使用極簡的 **FastAPI** 架構，在 `127.0.0.1:8765` 開放給 Chrome 擴充功能呼叫。

```python
# main_dispatcher.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

from tools.rss_generator import append_rss_item
from tools.social_publisher import post_to_x, post_to_threads
from tools.local_dedup import check_duplicate

app = FastAPI(title="Local Nano Tool Hub")

# 允許本機 Chrome Extension 跨域請求
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

@app.post("/exec")
async def execute_tool(req: ToolRequest):
    name = req.tool_name
    data = req.payload

    if name == "append_rss":
        return append_rss_item(data["title"], data["summary"], data["url"])
    elif name == "check_dedup":
        return check_duplicate(data["text"])
    elif name == "publish_x":
        return post_to_x(data["text"])
    elif name == "publish_threads":
        return post_to_threads(data["text"])
    else:
        raise HTTPException(status_code=400, detail=f"未知的工具指令: {name}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765)
```

---

## 三、 Chrome 插件中 Gemini Nano 的調度流程 (Workflow)

```
[使用者在 pulse.html 點擊卡片「智能分發」]
                 │
                 ▼
1. Content Script 抓取標題與內容
                 │
                 ▼
2. ScrumClock 調用本地 Gemini Nano
   - Session 1: 判定操作類型與去重檢查
     `await session.prompt("這則快訊是否需要更新 RSS？輸出 JSON")`
                 │
                 ▼
3. 呼叫本機 Python POST /exec (工具 3: check_dedup)
   - 若重複度過高 ➔ 側欄即時標註「⚠️ 歷史觀點重複」
   - 若通過 ➔ 進入文案生成
                 │
                 ▼
4. Gemini Nano Session 2: 雙軌文案翻譯
   - 產出 X 英文版 & Threads 中文版
                 │
                 ▼
5. 側欄渲染讓使用者確認 (HITL)
   - 點擊「一鍵直發」 ➔ 呼叫本機 Python POST /exec (工具 1, 2)
```

---

## 四、 啟動與測試指引

1. **安裝本機 Python 依賴**：
   ```bash
   pip install fastapi uvicorn requests
   ```
2. **啟動後端調度服務**：
   ```bash
   python main_dispatcher.py
   ```
3. **在 Chrome 插件測試連線**：
   在 DevTools Console 執行：
   ```javascript
   fetch("http://127.0.0.1:8765/exec", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       tool_name: "check_dedup",
       payload: { text: "Coinbase 估值重估與代幣化金融" }
     })
   }).then(r => r.json()).then(console.log);
   ```