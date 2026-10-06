# -*- coding: utf-8 -*-
"""
Markdown Archiver - 本地研報與網頁剪藏歸檔器
將 Gemini Nano 或前端傳入的標題、內文、標籤與來源 URL
自動格式化為帶有 YAML Frontmatter 的標準 Markdown 筆記，落盤儲存至指定目錄

@related ../chrome_gemini_nano_README.md  (核心模組導航)
@related ./main_dispatcher.py            (上游: 路由閘道 save_markdown)
"""

import re
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_VAULT_DIR = BASE_DIR / "data" / "clippings"

logger = logging.getLogger("MarkdownArchiver")

def sanitize_filename(name: str, max_length: int = 80) -> str:
    """過濾作業系統不允許的檔案名稱非法字元，避免路徑注入與寫檔錯誤"""
    # 移除 Windows / Unix 保留非法字元: \ / : * ? " < > |
    clean = re.sub(r'[\\/*?:"<>|]', "", name)
    # 將多重空白替換為單一空格或連字號
    clean = re.sub(r'\s+', "-", clean).strip(" -.")
    if not clean:
        clean = "Untitled-Note"
    return clean[:max_length]

def save_markdown_note(
    title: str,
    content: str,
    url: str = "",
    tags: Optional[List[str]] = None,
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    將內容包裝為帶有 YAML Frontmatter 的 Markdown 檔案並寫入磁碟
    """
    if not content or not content.strip():
        return {"status": "error", "message": "正文內容不可為空"}

    # 決定儲存目標目錄
    target_dir = Path(output_dir) if output_dir else DEFAULT_VAULT_DIR
    target_dir.mkdir(parents=True, exist_ok=True)

    # 準備元資料
    now_utc = datetime.now(timezone.utc)
    date_str = now_utc.strftime("%Y-%m-%d %H:%M:%S UTC")
    date_prefix = now_utc.strftime("%Y%m%d")

    clean_title = (title or "Untitled Note").strip()
    safe_name = sanitize_filename(clean_title)
    filename = f"{date_prefix}-{safe_name}.md"
    file_path = target_dir / filename

    # 標籤整理
    tag_list = tags if tags and isinstance(tags, list) else []
    if "#Macro" not in tag_list and "Macro" not in tag_list:
        tag_list.append("Research")
    
    # 格式化標籤列表為 YAML 陣列
    yaml_tags = "\n".join([f"  - {t.replace('#', '')}" for t in tag_list])

    frontmatter = f"""---
title: "{clean_title.replace('"', '\\"')}"
date: "{date_str}"
source_url: "{url.strip()}"
tags:
{yaml_tags}
archived_by: "Gemini Nano Chrome Plus"
---

# {clean_title}

> **來源連結**：[{url}]({url})  
> **歸檔時間**：{date_str}

---

## 📑 核心研究與剪藏內容

{content.strip()}
"""

    try:
        file_path.write_text(frontmatter, encoding="utf-8")
        logger.info(f"✅ Markdown 筆記落盤成功: {file_path}")
        return {
            "status": "success",
            "message": f"✅ 筆記已成功歸檔至 {filename}",
            "filename": filename,
            "filepath": str(file_path),
            "size_bytes": len(frontmatter.encode("utf-8"))
        }
    except Exception as e:
        logger.error(f"寫入 Markdown 失敗: {e}", exc_info=True)
        return {"status": "error", "message": f"寫入失敗: {str(e)}"}

if __name__ == "__main__":
    res = save_markdown_note(
        title="Coinbase 2026 代幣化金融與 OUSD 估值研究",
        content="代幣化金融藉由 100% 短債儲備吸收離岸流動性，並為財政部提供穩定之美元吸水海綿。",
        url="https://masonyang-blog.github.io/news/20261003-coinbase-tokenized-finance-ousd.html",
        tags=["Crypto", "Fintech", "Valuation"]
    )
    print(res)
