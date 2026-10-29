#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/token_estimator.py
-------------------------
全域輕量化 Token 估算器 (Single Source of Truth, SSOT)。

提供無第三方套件依賴 (Zero-Dependency) 的純 Python Token 數量估算。
依據 CJK（中日韓）字符與 ASCII/其他語言之經驗加權常數進行高精度計算。

支援兩種模式：
1. 標準模式 (Default):
   - CJK 字符: 1 字 ≈ 1.5 Tokens
   - 其他字符 (英數字、標點、空白): 3.5 字 ≈ 1 Token
   適用於日常對話日誌分析、Context 膨脹追蹤 (如 analyze_task_tokens.py)。

2. 保守審計模式 (conservative=True):
   - 非 ASCII / CJK: 1 字 ≈ 2.0 Tokens
   - ASCII 字符: 4.0 字 ≈ 1 Token
   適用於靜態門禁防禦、規則檔 Token 上限安全審計 (如 audit_token_usage.py)。
"""

import sys
import os
import io
import json
import re
from typing import Any

# 強制標準輸出為 UTF-8，解決 Windows 控制台下的編碼報錯問題
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
elif sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except Exception:
        pass

# CJK 統一表意文字、擴充集與中文全形標點符號範圍
CJK_PATTERN = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff01-\uff60]')


def estimate_tokens(text: Any, conservative: bool = False) -> int:
    """
    估算輸入文字或物件之 Token 數量。

    :param text: 欲估算的文字內容或可序列化之物件 (若非字串則自動 JSON 序列化)
    :param conservative: 是否啟用保守審計加權 (保留更大安全餘裕)
    :return: 預估 Token 數 (整數)
    """
    if not text:
        return 0

    if not isinstance(text, str):
        try:
            text = json.dumps(text, ensure_ascii=False)
        except Exception:
            text = str(text)

    if conservative:
        # 保守審計模式：直接依 ASCII 與非 ASCII 劃分，嚴格防禦
        ascii_count = 0
        non_ascii_count = 0
        for char in text:
            if ord(char) < 128:
                ascii_count += 1
            else:
                non_ascii_count += 1
        return int((ascii_count / 4.0) + (non_ascii_count * 2.0))
    else:
        # 標準精準模式：識別 CJK 漢字標點與英數
        cjk_chars = len(CJK_PATTERN.findall(text))
        other_chars = len(text) - cjk_chars
        return int(cjk_chars * 1.5 + (other_chars / 3.5))


def estimate_tokens_conservative(text: Any) -> int:
    """
    保守審計模式之快捷估算函式 (等同於 estimate_tokens(text, conservative=True))。
    
    加權基準：
    - 非 ASCII (含 CJK 字符): 1 字 ≈ 2.0 Tokens
    - ASCII 字符: 4.0 字 ≈ 1 Token
    適用於靜態門禁防禦與規範檔 Token 上限安全審計 (如 audit_token_usage.py)。
    """
    return estimate_tokens(text, conservative=True)


__all__ = ["estimate_tokens", "estimate_tokens_conservative"]


if __name__ == '__main__':
    if len(sys.argv) > 1:
        input_text = " ".join(sys.argv[1:])
        std_tokens = estimate_tokens(input_text, conservative=False)
        cons_tokens = estimate_tokens(input_text, conservative=True)
        print(f"輸入字元數: {len(input_text)}")
        print(f"標準估算 (Standard):   {std_tokens} tokens")
        print(f"保守審計 (Conservative): {cons_tokens} tokens")
    else:
        # 若有管線輸入
        if not sys.stdin.isatty():
            content = sys.stdin.read()
            std_tokens = estimate_tokens(content, conservative=False)
            cons_tokens = estimate_tokens(content, conservative=True)
            print(f"標準估算: {std_tokens} | 保守審計: {cons_tokens}")
        else:
            print("用法: python tools/token_estimator.py <文字內容>")
