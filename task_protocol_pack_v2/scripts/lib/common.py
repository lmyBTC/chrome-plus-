# -*- coding: utf-8 -*-
"""
1.devtools/tools/lib/common.py
------------------------------
Chrome Plus Project 工具鏈共用微庫 (Common Library)

提供：
1. 專案根目錄精確解析 (get_repo_root, REPO_ROOT)
2. 跨平台 UTF-8 輸出安全設置 (setup_utf8_output)
3. 活躍任務偵測 (get_active_task)
4. 輕量 Frontmatter 解析 (parse_frontmatter)
"""

import os
import re
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List, Union


def setup_utf8_output() -> None:
    """跨平台設置 sys.stdout 與 sys.stderr 為 UTF-8，解決 Windows 控制台亂碼或崩潰問題"""
    for stream_name in ('stdout', 'stderr'):
        stream = getattr(sys, stream_name, None)
        if stream is None:
            continue
        if hasattr(stream, 'reconfigure'):
            try:
                stream.reconfigure(encoding='utf-8')
            except Exception:
                pass
        elif hasattr(stream, 'buffer'):
            current_encoding = getattr(stream, 'encoding', '') or ''
            if current_encoding.lower() != 'utf-8':
                try:
                    import io
                    setattr(sys, stream_name, io.TextIOWrapper(stream.buffer, encoding='utf-8', errors='replace'))
                except Exception:
                    pass


# 初始化時立即調用一次
setup_utf8_output()


def get_repo_root(start: Optional[Union[Path, str]] = None) -> Path:
    """
    向上搜尋單一真理源定位專案根目錄。
    判定標記：存在 .git 目錄、0.doc_mg 目錄 或 GEMINI.md 檔案。
    """
    if start is None:
        curr = Path(__file__).resolve().parent
    else:
        curr = Path(start).resolve()
        if curr.is_file():
            curr = curr.parent

    # 最多向上搜尋 6 層
    for _ in range(6):
        if (curr / ".git").exists() or (curr / "0.doc_mg").exists() or (curr / "GEMINI.md").exists():
            return curr
        if curr.parent == curr:
            break
        curr = curr.parent

    # 回退策略：本檔位於 1.devtools/tools/lib/common.py，向上 3 層即為根目錄
    fallback = Path(__file__).resolve().parent.parent.parent.parent
    return fallback


# 全域常用路徑常量
REPO_ROOT: Path = get_repo_root()
TASKS_DIR: Path = REPO_ROOT / "0.doc_mg" / "tasks"
ARCHIVE_DIR: Path = TASKS_DIR / "archive"
TEMPLATE_PATH: Path = REPO_ROOT / "0.doc_mg" / "task_template_v2.md"


def parse_frontmatter(file_path: Union[Path, str]) -> Dict[str, Any]:
    """
    解析 Markdown 檔案頂部 YAML Frontmatter。
    無需外部 yaml 依賴，採用精準輕量正則解析。
    """
    path = Path(file_path)
    if not path.is_file():
        return {}

    try:
        content = path.read_text(encoding='utf-8')
    except Exception:
        try:
            content = path.read_text(encoding='utf-8-sig')
        except Exception:
            return {}

    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not match:
        return {}

    frontmatter_text = match.group(1)
    metadata: Dict[str, Any] = {}
    for line in frontmatter_text.splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if ':' in line:
            parts = line.split(':', 1)
            key = parts[0].strip()
            val = parts[1].strip()
            # 移除行尾註解
            if '#' in val:
                val = val.split('#')[0].strip()
            # 去除引號
            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                val = val[1:-1]
            metadata[key] = val
    return metadata


def get_active_tasks(tasks_dir: Optional[Union[Path, str]] = None) -> List[Path]:
    """取得 tasks 目錄下所有進行中/未結案的任務檔案清單"""
    base_dir = Path(tasks_dir) if tasks_dir else TASKS_DIR
    if not base_dir.is_dir():
        return []

    active_tasks = []
    for item in sorted(base_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if item.is_file() and item.name.startswith("task_") and item.suffix == ".md":
            meta = parse_frontmatter(item)
            status = meta.get("status", "")
            # 若狀態不是「已完成」，視為活躍中
            if status != "已完成":
                active_tasks.append(item)

    return active_tasks


def get_active_task(tasks_dir: Optional[Union[Path, str]] = None) -> Optional[Path]:
    """
    取得當前最活躍的任務檔案。
    優先順序：
    1. 最新修改且 status != '已完成' 的 task_*.md
    2. 若皆完成，回傳最新修改之 task_*.md
    """
    base_dir = Path(tasks_dir) if tasks_dir else TASKS_DIR
    if not base_dir.is_dir():
        return None

    actives = get_active_tasks(base_dir)
    if actives:
        return actives[0]

    # 回退：尋找 tasks 目錄下修改時間最新者
    all_tasks = [
        item for item in base_dir.iterdir()
        if item.is_file() and item.name.startswith("task_") and item.suffix == ".md"
    ]
    if not all_tasks:
        return None

    all_tasks.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return all_tasks[0]

