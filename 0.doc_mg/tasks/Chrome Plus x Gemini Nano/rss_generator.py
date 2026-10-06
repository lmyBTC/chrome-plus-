# -*- coding: utf-8 -*-
"""
RSS Generator - 部落格 feed.xml 自動追加與滾動維護器
接收文章標題、摘要與 URL，寫入標準 RSS 2.0 格式並保持最新 30 則滾動淘汰

@related ./chrome_plus_x_gemini_nano.md  (核心任務看板 Phase 2.4)
@related ./main_dispatcher.py            (上游: 路由閘道 append_rss)
"""

import os
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

# 定義部落格輸出路徑 (預設為當前專案或上層 dist 目錄)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
RSS_PATH = BASE_DIR / "dist" / "feed.xml"

def _init_default_rss_tree() -> ET.ElementTree:
    """初始化標準 RSS 2.0 XML 結構樹"""
    root = ET.Element("rss", version="2.0")
    channel = ET.SubElement(root, "channel")
    
    ET.SubElement(channel, "title").text = "Mason Yang Pulse & Research"
    ET.SubElement(channel, "link").text = "https://masonyang-blog.github.io/"
    ET.SubElement(channel, "description").text = "Tech, Quant & Macro Insights"
    ET.SubElement(channel, "language").text = "zh-TW"
    ET.SubElement(channel, "lastBuildDate").text = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    
    return ET.ElementTree(root)

def append_rss_item(title: str, summary: str, url: str, max_items: int = 30) -> Dict[str, Any]:
    """
    動態追加新項目至 feed.xml
    """
    if not title or not url:
        return {"status": "error", "message": "標題與網址為必填欄位"}

    # 確保父目錄存在
    RSS_PATH.parent.mkdir(parents=True, exist_ok=True)

    if not RSS_PATH.exists():
        tree = _init_default_rss_tree()
        channel = tree.find("channel")
    else:
        try:
            tree = ET.parse(RSS_PATH)
            channel = tree.find("channel")
            if channel is None:
                tree = _init_default_rss_tree()
                channel = tree.find("channel")
        except ET.ParseError:
            tree = _init_default_rss_tree()
            channel = tree.find("channel")

    now_rfc822 = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")

    # 檢查是否已存在相同 link，若存在則先移除該舊項目進行更新
    existing_items = channel.findall("item")
    for old_item in existing_items:
        link_node = old_item.find("link")
        if link_node is not None and link_node.text == url:
            channel.remove(old_item)

    # 建立新 item
    new_item = ET.Element("item")
    ET.SubElement(new_item, "title").text = title.strip()
    ET.SubElement(new_item, "link").text = url.strip()
    ET.SubElement(new_item, "guid").text = url.strip()
    ET.SubElement(new_item, "pubDate").text = now_rfc822
    ET.SubElement(new_item, "description").text = summary.strip()

    # 插入到最頂部 (保持最新排序，channel 前面有 title, link, description 等屬性)
    insert_pos = 5
    channel.insert(insert_pos, new_item)

    # 自動修剪：保留最新 max_items 篇
    current_items = channel.findall("item")
    if len(current_items) > max_items:
        for excess in current_items[max_items:]:
            channel.remove(excess)

    # 更新最後建置時間
    last_build = channel.find("lastBuildDate")
    if last_build is not None:
        last_build.text = now_rfc822

    # 寫入檔案
    try:
        ET.indent(tree, space="  ", level=0)
    except AttributeError:
        pass  # Python 3.9+ 支援 indent

    tree.write(RSS_PATH, encoding="utf-8", xml_declaration=True)
    return {
        "status": "success",
        "message": f"✅ RSS feed.xml 已更新，成功追加: {title[:30]}...",
        "item_title": title,
        "rss_path": str(RSS_PATH)
    }

if __name__ == "__main__":
    res = append_rss_item(
        title="Coinbase 2026 估值重估與代幣化金融測試",
        summary="本文深入剖析代幣化金融如何藉由 100% 短債儲備吸收離岸流動性...",
        url="https://masonyang-blog.github.io/news/20261003-coinbase-tokenized-finance-ousd.html"
    )
    print(res)