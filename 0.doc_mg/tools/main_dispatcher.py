# -*- coding: utf-8 -*-
"""
0.doc_mg/tools/main_dispatcher.py - 全域微服務調度中樞入口
統一轉發並代理至 chrome_gemini_nano/tools/main_dispatcher.py

@related ../../chrome_gemini_nano/tools/main_dispatcher.py
@related ../../0.doc_mg/docs/cross_plugin_contract.md
"""

import sys
import importlib.util
from pathlib import Path

NANO_DISPATCHER_PATH = Path(__file__).resolve().parent.parent.parent / "chrome_gemini_nano" / "tools" / "main_dispatcher.py"

# 將 chrome_gemini_nano/tools 加入 sys.path 確保其同層依賴正常
NANO_TOOLS_DIR = str(NANO_DISPATCHER_PATH.parent)
if NANO_TOOLS_DIR not in sys.path:
    sys.path.insert(0, NANO_TOOLS_DIR)

spec = importlib.util.spec_from_file_location("nano_main_dispatcher", str(NANO_DISPATCHER_PATH))
if spec is None or spec.loader is None:
    raise ImportError(f"無法載入目標模組: {NANO_DISPATCHER_PATH}")

nano_dispatcher = importlib.util.module_from_spec(spec)
sys.modules["nano_main_dispatcher"] = nano_dispatcher
spec.loader.exec_module(nano_dispatcher)

app = nano_dispatcher.app
execute_tool = nano_dispatcher.execute_tool
health_check = nano_dispatcher.health_check

if __name__ == "__main__":
    import uvicorn
    print("🚀 啟動 Chrome Plus 全域工具中樞: http://127.0.0.1:8765")
    uvicorn.run(app, host="127.0.0.1", port=8765)
